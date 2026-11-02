import Anthropic from "@anthropic-ai/sdk";
import { classifyLead, type Classification } from "./classify";
import { INPUT_PROPERTIES, OUTPUT_PROPERTIES, REVIEW_THRESHOLD } from "./config";
import { HubSpotClient } from "./hubspot";
import { verifyHubSpotSignature } from "./signature";

export interface Env {
  HUBSPOT_ACCESS_TOKEN: string;
  HUBSPOT_CLIENT_SECRET: string;
  ANTHROPIC_API_KEY: string;
}

type WebhookEvent = {
  eventId: number;
  subscriptionType: string;
  objectId: number;
  objectTypeId?: string;
  portalId: number;
};

const CONTACT_OBJECT_TYPE_ID = "0-1";

// Classic subscriptions send "contact.creation"; the newer format sends "object.creation" with an objectTypeId.
export function isContactCreation(e: WebhookEvent): boolean {
  return (
    e.subscriptionType === "contact.creation" ||
    (e.subscriptionType === "object.creation" && e.objectTypeId === CONTACT_OBJECT_TYPE_ID)
  );
}

export type Deps = {
  hubspot: HubSpotClient;
  classify: (properties: Record<string, string | null>) => Promise<Classification>;
};

function log(level: "info" | "warn" | "error", msg: string, data: Record<string, unknown> = {}) {
  console[level === "info" ? "log" : level](JSON.stringify({ level, msg, ...data }));
}

export function toHubSpotProperties(result: Classification): Record<string, string> {
  return {
    [OUTPUT_PROPERTIES.segment]: result.segment,
    [OUTPUT_PROPERTIES.reason]: result.reason,
    [OUTPUT_PROPERTIES.confidence]: result.confidence.toFixed(2),
    [OUTPUT_PROPERTIES.needsReview]: String(result.confidence < REVIEW_THRESHOLD),
  };
}

export async function processContact(contactId: string, deps: Deps): Promise<"classified" | "skipped"> {
  const contact = await deps.hubspot.getContact(contactId, [...INPUT_PROPERTIES, OUTPUT_PROPERTIES.segment]);

  // Idempotent: HubSpot may deliver the same event more than once.
  if (contact.properties[OUTPUT_PROPERTIES.segment]) {
    log("info", "already classified, skipping", { contactId });
    return "skipped";
  }

  const input = Object.fromEntries(INPUT_PROPERTIES.map((p) => [p, contact.properties[p] ?? null]));
  const result = await deps.classify(input);
  await deps.hubspot.updateContact(contactId, toHubSpotProperties(result));
  log("info", "classified", { contactId, segment: result.segment, confidence: result.confidence });
  return "classified";
}

async function processEvents(events: WebhookEvent[], deps: Deps) {
  const contactIds = [...new Set(events.filter(isContactCreation).map((e) => String(e.objectId)))];
  const results = await Promise.allSettled(contactIds.map((id) => processContact(id, deps)));
  results.forEach((r, i) => {
    if (r.status === "rejected") log("error", "failed to classify contact", { contactId: contactIds[i], error: String(r.reason) });
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return new Response("ok");
    if (request.method !== "POST" || url.pathname !== "/webhooks/hubspot") return new Response("Not found", { status: 404 });

    const body = await request.text();
    const valid = await verifyHubSpotSignature(
      env.HUBSPOT_CLIENT_SECRET,
      request.method,
      request.url,
      body,
      request.headers.get("X-HubSpot-Signature-v3"),
      request.headers.get("X-HubSpot-Request-Timestamp"),
    );
    if (!valid) {
      log("warn", "rejected webhook with invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    let events: WebhookEvent[];
    try {
      events = JSON.parse(body);
      if (!Array.isArray(events)) throw new Error("not an array");
    } catch {
      return new Response("Bad payload", { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const deps: Deps = {
      hubspot: new HubSpotClient(env.HUBSPOT_ACCESS_TOKEN),
      classify: (props) => classifyLead(anthropic, props),
    };

    // HubSpot expects a fast 2xx; the classification runs after the response is sent.
    ctx.waitUntil(processEvents(events, deps));
    return new Response(null, { status: 204 });
  },
};
