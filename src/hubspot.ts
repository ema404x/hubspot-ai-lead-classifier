// Minimal HubSpot CRM v3 client with retry/backoff on 429 and 5xx.

const BASE_URL = "https://api.hubapi.com";
const MAX_ATTEMPTS = 4;

export class HubSpotError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type HubSpotContact = {
  id: string;
  properties: Record<string, string | null>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HubSpotClient {
  constructor(private token: string, private fetchImpl: typeof fetch = fetch) {}

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      const res = await this.fetchImpl(`${BASE_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;

      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= MAX_ATTEMPTS) {
        throw new HubSpotError(res.status, `HubSpot ${method} ${path} failed: ${res.status} ${await res.text()}`);
      }
      const retryAfter = Number(res.headers.get("Retry-After"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250);
    }
  }

  getContact(id: string, properties: string[]): Promise<HubSpotContact> {
    const qs = new URLSearchParams({ properties: properties.join(",") });
    return this.request("GET", `/crm/v3/objects/contacts/${encodeURIComponent(id)}?${qs}`);
  }

  updateContact(id: string, properties: Record<string, string>): Promise<HubSpotContact> {
    return this.request("PATCH", `/crm/v3/objects/contacts/${encodeURIComponent(id)}`, { properties });
  }

  createContact(properties: Record<string, string>): Promise<HubSpotContact> {
    return this.request("POST", "/crm/v3/objects/contacts", { properties });
  }

  async propertyExists(name: string): Promise<boolean> {
    try {
      await this.request("GET", `/crm/v3/properties/contacts/${encodeURIComponent(name)}`);
      return true;
    } catch (err) {
      if (err instanceof HubSpotError && err.status === 404) return false;
      throw err;
    }
  }

  createProperty(definition: Record<string, unknown>): Promise<unknown> {
    return this.request("POST", "/crm/v3/properties/contacts", definition);
  }
}
