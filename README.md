# HubSpot AI Lead Classifier

Every new HubSpot contact is classified automatically by Claude into a sales segment
(Enterprise / SMB / Partner / Spam), with a one-line reason and a confidence score
written back to the CRM. Low-confidence leads are flagged for human review.

```
HubSpot (contact.creation webhook)
        │  signed request (v3 signature)
        ▼
Cloudflare Worker ── verify signature ── respond 204 immediately
        │  (background)
        ├─ GET contact properties            (HubSpot CRM v3)
        ├─ classify → {segment, reason, confidence}   (Claude API, JSON schema output)
        └─ PATCH ai_segment, ai_reason, ai_confidence, ai_needs_review
```

## Features

- **Secure**: verifies HubSpot's `X-HubSpot-Signature-v3` (HMAC-SHA256, 5-minute replay window, constant-time compare).
- **Fast acknowledgement**: returns `204` right away and processes in the background (`ctx.waitUntil`), so HubSpot never times out.
- **Idempotent**: contacts that already have `ai_segment` are skipped, so duplicate webhook deliveries are harmless.
- **Resilient**: retries HubSpot `429`/`5xx` with exponential backoff, honouring `Retry-After`.
- **Reliable output**: Claude returns schema-validated JSON (`output_config.format`), validated again in code. Refusals and truncation are handled explicitly; server-side fallback is enabled so a false-positive safety decline doesn't drop a lead.
- **Prompt-injection aware**: form data is passed as delimited data, never as instructions.
- **Configurable**: segments, review threshold and input fields live in [`src/config.ts`](src/config.ts).
- **Structured logs** (JSON) visible in Cloudflare's dashboard.

## Setup

Requirements: Node 20+, a free Cloudflare account, a HubSpot **developer test account**, a Claude API key.

1. **Install**
   ```bash
   npm install
   cp .dev.vars.example .dev.vars   # then fill in the values
   ```

2. **Create a HubSpot app** on the developer platform (legacy private apps can no longer be created since Oct 2026):
   ```bash
   npm install -g @hubspot/cli@latest
   hs account auth
   hs project create        # App · private distribution · static auth · features: Webhooks
   ```
   In `src/app/app-hsmeta.json` add the scopes `crm.objects.contacts.read`, `crm.objects.contacts.write`,
   `crm.schemas.contacts.write`, then `hs project upload` and install it in your developer test account
   (Development → Projects → your app → Distribution → Add test install).
   Copy the app's **access token** and **client secret** into `.dev.vars`.

3. **Create the custom properties**
   ```bash
   npm run setup:properties
   ```

4. **Deploy the Worker and set secrets**
   ```bash
   npx wrangler deploy
   npx wrangler secret put HUBSPOT_ACCESS_TOKEN
   npx wrangler secret put HUBSPOT_CLIENT_SECRET
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

5. **Subscribe the webhook**: in the HubSpot project's `src/app/webhooks/*-hsmeta.json`, set `targetUrl` to
   `https://<your-worker>.workers.dev/webhooks/hubspot` and add an active `contact.creation` subscription
   (classic, in `legacyCrmObjects`) — or `object.creation` for `contact` in `crmObjects`; the Worker accepts both.
   Then run `hs project upload` again.

6. **Demo it**
   ```bash
   npm run seed
   ```
   Creates 30 fictional leads (enterprise, SMB, partner, spam and deliberately ambiguous ones).
   Add the *AI segment*, *AI reason*, *AI confidence* and *AI needs review* columns to the contacts view and watch them fill in.
   Live logs: `npx wrangler tail`.

## Customising

| Want to… | Change |
|---|---|
| Use different segments | `SEGMENTS` in `src/config.ts`, then re-run `npm run setup:properties` (add new options in HubSpot if the property already exists) |
| Send more data to the model | `INPUT_PROPERTIES` in `src/config.ts` |
| Flag more / fewer leads for review | `REVIEW_THRESHOLD` |
| Change model or effort | `MODEL` and `output_config.effort` in `src/classify.ts` |

## Development

```bash
npm run typecheck
npm test
```

## Cost

One short classification call per new contact (low effort, ~1–2K tokens). Run a sample of real leads and check usage in the Claude Console to estimate monthly cost for a given lead volume.
