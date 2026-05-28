import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Recharts uses ResponsiveContainer which doesn't measure in jsdom — stub it.
vi.mock("recharts", async () => {
  const React = await import("react");
  const Pass = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "chart" }, children);
  return {
    ResponsiveContainer: Pass,
    BarChart: Pass,
    LineChart: Pass,
    AreaChart: Pass,
    PieChart: Pass,
    Bar: () => null,
    Line: () => null,
    Area: () => null,
    Pie: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    CartesianGrid: () => null,
    Legend: () => null,
    Cell: () => null,
  };
});

import { Route } from "./dashboard.buyer";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Buyer dashboard", () => {
  it("renders without crashing and shows order section headings", () => {
    render(<Page />);
    // Page contains the two open orders by id
    expect(screen.getByText("DFM-3K9A2X")).toBeInTheDocument();
    expect(screen.getByText("DFM-7P1Z44")).toBeInTheDocument();
  });

  it("renders the recharts spend chart placeholder", () => {
    render(<Page />);
    expect(screen.getAllByTestId("chart").length).toBeGreaterThan(0);
  });

  it("greets a saved buyer name from localStorage", () => {
    localStorage.setItem("buyerProfile", JSON.stringify({ fullName: "Alex Rivera" }));
    render(<Page />);
    expect(screen.getByText(/alex/i)).toBeInTheDocument();
    localStorage.removeItem("buyerProfile");
  });
});
