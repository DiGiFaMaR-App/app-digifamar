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

describe("Farmer dashboard", () => {
  it("renders KPI stats and listings section", () => {
    render(<Page />);
    expect(screen.getByText(/earnings \(30d\)/i)).toBeInTheDocument();
    expect(screen.getByText(/orders \(30d\)/i)).toBeInTheDocument();
    expect(screen.getByText(/your listings/i)).toBeInTheDocument();
  });

  it("opens the new-listing dialog when 'List a new product' is clicked", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /list a new product/i }));
    expect(screen.getByRole("heading", { name: /list a new product/i })).toBeInTheDocument();
  });

  it("creates a new listing via the dialog form", () => {
    render(<Page />);
    fireEvent.click(screen.getAllByRole("button", { name: /list a new product/i })[0]);

    fireEvent.change(screen.getByPlaceholderText(/heirloom tomatoes/i), {
      target: { value: "Test Berries" },
    });
    fireEvent.change(screen.getByPlaceholderText(/5\.50/i), { target: { value: "9.99" } });

    const submits = screen.getAllByRole("button", { name: /save|publish|add listing|^list/i });
    // Find the actual form submit (label likely "Publish" / "Save"). Submit form directly:
    const form = document.querySelector("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(screen.getByText("Test Berries")).toBeInTheDocument();
  });
});
