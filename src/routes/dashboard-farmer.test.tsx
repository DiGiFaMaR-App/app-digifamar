import * as React from "react";
import { describe, expect, it, vi } from "vitest";
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

import { Route } from "./dashboard.farmer";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

// Smoke tests for the rebuilt (Supabase-backed) farmer dashboard. The
// farmer-dashboard feature replaced the old static KPI layout, so these assert
// the new shell, listings section, and create-listing form render.
describe("Farmer dashboard", () => {
  it("renders the dashboard shell, listings section, and create action", () => {
    render(<Page />);
    expect(screen.getByText(/farmer dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/active listings/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create new listing/i }),
    ).toBeInTheDocument();
  });

  it("opens the create-listing form when the create button is clicked", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /create new listing/i }));
    expect(screen.getByPlaceholderText(/heirloom tomatoes/i)).toBeInTheDocument();
  });
});
