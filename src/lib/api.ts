// Thin fetch wrapper that targets this app's own server routes.
// Uses relative URLs so it works in dev, preview, and production without config.

const API_BASE = "/api";

async function request<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const errField =
      data && typeof data === "object" && "error" in data
        ? (data as { error?: unknown }).error
        : undefined;
    const message =
      typeof errField === "string" ? errField : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type SendOtpResponse = { success: boolean; phone: string };
export type VerifyOtpResponse = { success: boolean; token?: string };
export type CreateOrderResponse = {
  success: boolean;
  orderId: string;
  status: "held" | "released" | "refunded";
  amount: number;
};
export type ReleaseOrderResponse = {
  success: boolean;
  orderId: string;
  status: "released";
  releasedAt: string;
};

export const api = {
  sendOTP(phone: string) {
    return request<SendOtpResponse>("/auth/otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  verifyOTP(phone: string, code: string) {
    return request<VerifyOtpResponse>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
  },

  createOrder(orderData: {
    productId?: string;
    amount: number;
    buyerPhone?: string;
  }) {
    return request<CreateOrderResponse>("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  },

  releaseOrder(orderId: string, code: string) {
    return request<ReleaseOrderResponse>(`/orders/${encodeURIComponent(orderId)}/release`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
};
