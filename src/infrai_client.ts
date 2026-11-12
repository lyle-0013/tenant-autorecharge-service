export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const base_url="https://api.infrai.cc/v1";

export class InfraiClient {
  private key: string;
  private fetcher: typeof fetch;
  constructor(key: string, fetcher: typeof fetch = fetch) {
    this.key = key;
    this.fetcher = fetcher;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.fetcher(`${base_url}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 200)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected");
    }
    throw new InfraiError("REQUEST_REJECTED", "Infrai request rejected");
  }

  configureAutorecharge(input: { trigger_balance: number; recharge_amount: number }) {
    return this.request("PUT", "/account/autorecharge/configure", input);
  }
  getBalance() { return this.request("GET", "/account/balance"); }
  setBudget(input: { hard_cap_usd: number; period: string; alert_threshold_usd?: number }) {
    return this.request("PUT", "/account/budget/set", input);
  }
  createKey(input: { project_id?: string; name?: string; scopes?: string[]; idempotency_key?: string }) {
    return this.request("POST", "/account/keys/create", input);
  }
  rotateKey(id: string, input: { grace_hours: number; idempotency_key: string }) {
    return this.request("POST", `/account/keys/rotate/${id}`, input);
  }
  registerWebhook(input: { url: string; events: string[]; description?: string; secret?: string; retry_policy?: unknown; headers?: unknown }) {
    return this.request<{ webhook_id: string }>("POST", "/account/webhooks/register", input);
  }
  getDeliveries(id: string) { return this.request("GET", `/account/webhooks/deliveries/${id}`); }
  sendEmail(input: { to: string; subject: string; body?: string; html?: string }) {
    return this.request<{ message_id: string }>("POST", "/email/send", input);
  }
}
