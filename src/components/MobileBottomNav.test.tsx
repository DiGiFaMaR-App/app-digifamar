import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MobileBottomNav } from "./MobileBottomNav";

describe("MobileBottomNav", () => {
  it("renders all six tabs", () => {
    render(<MobileBottomNav />);
    const nav = screen.getByRole("navigation");
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    ["Home", "Shop", "Sell", "Cart", "Orders", "Profile"].forEach((label) => {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    });
  });

  it("wires links to their target routes", () => {
    render(<MobileBottomNav />);
    expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/");
    expect(screen.getByText("Shop").closest("a")).toHaveAttribute("href", "/market");
    expect(screen.getByText("Orders").closest("a")).toHaveAttribute("href", "/orders");
    expect(screen.getByText("Cart").closest("a")).toHaveAttribute("href", "/cart");
  });

  it("is hidden on md+ via Tailwind utility", () => {
    render(<MobileBottomNav />);
    expect(screen.getByRole("navigation").className).toContain("md:hidden");
  });
});
