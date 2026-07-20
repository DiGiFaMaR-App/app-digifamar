import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("recharts", async () => {
  const R = await import("react");
  const Pass = ({ children }: { children?: React.ReactNode }) =>
    R.createElement("div", { "data-testid": "chart" }, children);
  return {
    ResponsiveContainer: Pass,
    AreaChart: Pass,
    BarChart: Pass,
    Area: () => null,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    CartesianGrid: () => null,
  };
});

// Mutable verification state so tests can exercise approved vs pending gating.
const h = vi.hoisted(() => ({ verification: "approved" as string }));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "farmer-1" }, isAuthenticated: true, loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const profile = () => ({
    farm_name: "Test Farm",
    description: null,
    state: "CA",
    farm_type: null,
    verification_status: h.verification,
    rejection_reason: h.verification === "rejected" ? "Incomplete documents" : null,
  });
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      update: () => chain,
      insert: () => chain,
      maybeSingle: () => Promise.resolve({ data: profile(), error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      then: (onF: (v: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(onF),
    });
    return chain;
  };
  const channelStub: Record<string, unknown> = {};
  Object.assign(channelStub, { on: () => channelStub, subscribe: () => channelStub });
  return {
    supabase: {
      from: () => makeChain(),
      channel: () => channelStub,
      removeChannel: () => {},
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "farmer-1" } }, error: null }) },
      functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});

import { Route } from "./dashboard.farmer";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

// Smoke tests for the Supabase-backed farmer dashboard. Product listing is now
// gated on admin approval (Phase 1), so the create flow is only available to an
// approved farmer.
describe("Farmer dashboard", () => {
  beforeEach(() => {
    h.verification = "approved";
  });

  it("renders the dashboard shell and listings section", async () => {
    render(<Page />);
    expect(screen.getByText(/farmer dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/active listings/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /create new listing/i })).toBeInTheDocument();
  });

  it("opens the create-listing form when an approved farmer clicks create", async () => {
    render(<Page />);
    fireEvent.click(await screen.findByRole("button", { name: /create new listing/i }));
    expect(screen.getByPlaceholderText(/heirloom tomatoes/i)).toBeInTheDocument();
  });

  it("hides the create action and shows a pending banner for an unapproved farmer", async () => {
    h.verification = "pending";
    render(<Page />);
    expect(await screen.findByText(/pending verification/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create new listing/i }),
    ).not.toBeInTheDocument();
  });
});
