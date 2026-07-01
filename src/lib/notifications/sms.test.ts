import { afterEach, describe, expect, it, vi } from "vitest";
import { isSmsConfigured, maskPhone, sendSms } from "./sms.server";

const CONFIG = {
  TWILIO_ACCOUNT_SID: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  TWILIO_AUTH_TOKEN: "test-token",
  TWILIO_FROM_NUMBER: "+14155550123",
};

function stubConfig() {
  for (const [k, v] of Object.entries(CONFIG)) vi.stubEnv(k, v);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendSms", () => {
  it("skips (not_configured) when Twilio env vars are missing", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    vi.stubEnv("TWILIO_FROM_NUMBER", "");
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

  it("posts to Twilio and returns the message sid on success", async () => {
    stubConfig();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ sid: "SM123" }),
    })) as unknown as typeof fetch;

    const res = await sendSms("(667) 361-9136", "your code is 123456", fetchImpl);
    expect(res).toEqual({ sent: true, sid: "SM123", to: "+16673619136" });

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const [url, init] = call as [string, RequestInit];
    expect(url).toContain(`/Accounts/${CONFIG.TWILIO_ACCOUNT_SID}/Messages.json`);
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
    const body = String(init.body);
    expect(body).toContain("To=%2B16673619136");
    expect(body).toContain("From=%2B14155550123");
  });

  it("reports provider_error on a non-2xx response", async () => {
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
    vi.stubEnv("TWILIO_ACCOUNT_SID", "");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    vi.stubEnv("TWILIO_FROM_NUMBER", "");
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
