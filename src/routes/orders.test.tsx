import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { setRouterMockState } from "@/test/router-state";

const ORDER = {
  id: "abcdef12-3456-7890-abcd-ef1234567890",
  buyer_id: "buyer-1",
  farmer_id: "farmer-1",
  listing_id: "listing-1",
  qty: 2,
  total_cents: 1224,
  subtotal_cents: 1100,
  platform_fee_cents: 88,
  escrow_fee_cents: 36,
  status: "pending",
  created_at: "2026-01-01T00:00:00.000Z",
  delivery_deadline: null,
};

// Buyer who owns the order is signed in.
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { id: ORDER.buyer_id },
    session: {},
    role: "buyer",
  }),
}));

// Server functions are network-bound; keep them inert for the unit test.
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
}));
vi.mock("@/lib/escrow-v2/escrow.functions", () => ({
  fundEscrowFn: vi.fn(),
  generateDeliveryOtpFn: vi.fn(),
  confirmDeliveryFn: vi.fn(),
  releaseEscrowFn: vi.fn(),
  raiseDisputeFn: vi.fn(),
}));

// Chainable Supabase query stub whose terminal maybeSingle() resolves per table.
function makeQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  q.select = () => q;
  q.eq = () => q;
  q.maybeSingle = () => Promise.resolve(result);
  return q;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "orders") return makeQuery({ data: ORDER, error: null });
      if (table === "listings")
        return makeQuery({
          data: { id: "listing-1", title: "Heirloom Tomatoes", unit: "lb", images: [] },
          error: null,
        });
      return makeQuery({ data: null, error: null }); // inspection_windows
    },
    channel: () => {
      const ch: Record<string, unknown> = {};
      ch.on = () => ch;
      ch.subscribe = () => ch;
      return ch;
    },
    removeChannel: () => {},
  },
}));

import { Route } from "./orders.$id";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Order detail route", () => {
  beforeEach(() => {
    setRouterMockState({ params: { id: ORDER.id } });
    vi.restoreAllMocks();
  });

  it("renders the order id, status label, and escrow protection panel", async () => {
    render(<Page />);
    await waitFor(() =>
      expect(screen.getByText(new RegExp(ORDER.id.slice(0, 8)))).toBeInTheDocument(),
    );
    expect(screen.getByText(/awaiting payment/i)).toBeInTheDocument();
    expect(screen.getByText(/escrow protection/i)).toBeInTheDocument();
    expect(screen.getByText(/Heirloom Tomatoes/i)).toBeInTheDocument();
  });

  it("shows the buyer a fund-escrow action while the order is pending", async () => {
    render(<Page />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /fund escrow/i })).toBeInTheDocument(),
    );
  });
});
