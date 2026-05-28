import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError } from "./api";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string>) },
  });
}

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs JSON to /api/orders and returns the parsed body", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ success: true, orderId: "DFM-1", status: "held", amount: 42 }),
    );
    const result = await api.createOrder({
      buyerId: "b1",
      listingId: "l1",
      amount: 42,
      paymentMethodId: "pm1",
    });
    expect(result).toEqual({ success: true, orderId: "DFM-1", status: "held", amount: 42 });
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      buyerId: "b1",
      listingId: "l1",
      amount: 42,
      paymentMethodId: "pm1",
    });
  });

  it("encodes path params for releaseOrder", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({
        success: true,
        orderId: "DFM/Z 1",
        status: "released",
        releasedAt: "now",
      }),
    );
    await api.releaseOrder("DFM/Z 1", "123456");
    const [url] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`/api/orders/${encodeURIComponent("DFM/Z 1")}/release`);
  });

  it("throws ApiError carrying the server's error message on non-2xx", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ error: "Invalid release code" }, { status: 400 }),
    );
    await expect(api.releaseOrder("DFM-1", "000000")).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Invalid release code",
    });
  });

  it("falls back to a generic message when the body lacks an error field", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({}, { status: 500 }),
    );
    await expect(api.sendOTP("+15550000")).rejects.toMatchObject({
      status: 500,
      message: /request failed \(500\)/i,
    });
  });

  it("ApiError exposes status and original data", () => {
    const err = new ApiError("nope", 418, { teapot: true });
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(418);
    expect(err.data).toEqual({ teapot: true });
  });
});
