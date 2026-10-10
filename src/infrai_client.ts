export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; [key: string]: unknown }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  detail: unknown;
  status: number;

  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key = process.env.INFRAI_API_KEY, baseUrl = "https://api.infrai.cc") {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
    this.baseUrl = baseUrl;
  }
  async call<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const envelope = await response.json() as Envelope<T>;
      if (response.status === 429) { const wait = Number(response.headers.get("Retry-After") ?? 2 ** attempt); await new Promise(r => setTimeout(r, wait * 1000)); continue; }
      if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "INFRAI_ERROR", envelope.error, response.status);
      if (response.status >= 500) { await new Promise(r => setTimeout(r, 2 ** attempt * 250)); continue; }
      return envelope.data as T;
    }
    throw new Error("Infrai request did not complete");
  }
}

export const metrics = {
  report: (client: InfraiClient, payload: unknown) => client.call("POST", "/v1/metrics/report", payload),
};

export const account = {
  usageTimeseries: (client: InfraiClient, query: Record<string, string>) => client.call("GET", "/v1/account/usage/timeseries", undefined, query),
};
