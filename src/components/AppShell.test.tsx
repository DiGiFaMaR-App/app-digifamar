import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { setRouterMockState } from "@/test/router-state";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders buyer nav by default", () => {
    setRouterMockState({ pathname: "/market" });
    render(
      <AppShell>
        <div>child-content</div>
      </AppShell>,
    );
    expect(screen.getByText("child-content")).toBeInTheDocument();
    expect(screen.getAllByText(/shop/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/orders/i).length).toBeGreaterThan(0);
  });

  it("renders farmer nav when role='farmer'", () => {
    setRouterMockState({ pathname: "/dashboard/farmer" });
    render(
      <AppShell role="farmer">
        <div>farmer-child</div>
      </AppShell>,
    );
    expect(screen.getByText("farmer-child")).toBeInTheDocument();
    expect(screen.getAllByText(/dashboard/i).length).toBeGreaterThan(0);
  });

  it("exposes a WhatsApp support button", () => {
    setRouterMockState({ pathname: "/" });
    render(
      <AppShell>
        <div />
      </AppShell>,
    );
    const btn = screen.getByLabelText(/whatsapp support/i);
    expect(btn.tagName).toBe("BUTTON");
  });
});
