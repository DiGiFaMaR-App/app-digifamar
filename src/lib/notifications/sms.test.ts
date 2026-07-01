import { afterEach, describe, expect, it, vi } from "vitest";
import { isSmsConfigured, maskPhone, sendSms } from "./sms.server";

const CONFIG = {
  VONAGE_API_KEY: "test-key",
  VONAGE_API_SECRET: "test-secret",
  VONAGE_FROM: "14155550123",
};

function stubConfig() {
  for (const [k, v] of Object.entries(CONFIG)) vi.stubEnv(k, v);
}

function okResponse(payload: unknown) {
  return { ok: true, json: async () => payload } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendSms", () => {
  it("skips (not_configured) when Vonage env vars are missing", async () => {
    vi.stubEnv("VONAGE_API_KEY", "");
    vi.stubEnv("VONAGE_API_SECRET", "");
    vi.stubEnv("VONAGE_FROM", "");
    const fetchImpl = vi.fn();
    const res = await sendSms("+16673619136", "hi", fetchImpl as unknown as typeof fetch);
    expect(res).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports invalid_number for an unparseable recipient", async () => {
    stubConfig();
    const fetchImpl = vi.fn();
    const res = await sendSms("not-a-phone", "hi", fetchImpl as unknown as typeof fetch);
    expect(res).toEqual({ sent: false, reason: "invalid_number" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts to Vonage and returns the message id on success", async () => {
    stubConfig();
    const fetchImpl = vi.fn(async () =>
      okResponse({ messages: [{ status: "0", "message-id": "SM123" }] }),
    ) as unknown as typeof fetch;

    const res = await sendSms("(667) 361-9136", "your code is 123456", fetchImpl);
    expect(res).toEqual({ sent: true, sid: "SM123", to: "+16673619136" });

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe("https://rest.nexmo.com/sms/json");
    const body = String(init.body);
    expect(body).toContain("api_key=test-key");
    expect(body).toContain("api_secret=test-secret");
    expect(body).toContain("from=14155550123");
    // Destination is international format without the leading "+".
    expect(body).toContain("to=16673619136");
  });

  it("reports provider_error on a non-zero Vonage message status", async () => {
    stubConfig();
    const fetchImpl = vi.fn(async () =>
      okResponse({ messages: [{ status: "4", "error-text": "bad credentials" }] }),
    ) as unknown as typeof fetch;
    const res = await sendSms("+16673619136", "hi", fetchImpl);
    expect(res).toEqual({ sent: false, reason: "provider_error", detail: "bad credentials" });
  });

  it("reports provider_error on a non-2xx HTTP response", async () => {
    stubConfig();
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    })) as unknown as typeof fetch;
    const res = await sendSms("+16673619136", "hi", fetchImpl);
    expect(res).toEqual({ sent: false, reason: "provider_error", detail: "HTTP 401" });
  });

  it("never throws when fetch rejects", async () => {
    stubConfig();
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const res = await sendSms("+16673619136", "hi", fetchImpl);
    expect(res).toMatchObject({ sent: false, reason: "provider_error" });
  });
});

describe("isSmsConfigured", () => {
  it("is false without env, true with env", async () => {
    vi.stubEnv("VONAGE_API_KEY", "");
    vi.stubEnv("VONAGE_API_SECRET", "");
    vi.stubEnv("VONAGE_FROM", "");
    expect(isSmsConfigured()).toBe(false);
    stubConfig();
    expect(isSmsConfigured()).toBe(true);
  });
});

describe("maskPhone", () => {
  it("masks to the last 4 digits", () => {
    expect(maskPhone("+16673619136")).toBe("•••• 9136");
  });
  it("falls back for invalid input", () => {
    expect(maskPhone("garbage")).toBe("the buyer's phone");
  });
});
