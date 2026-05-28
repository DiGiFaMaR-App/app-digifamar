import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MobileBottomNav } from "./MobileBottomNav";

describe("MobileBottomNav", () => {
  it("renders all five tabs", () => {
    render(<MobileBottomNav />);
    const nav = screen.getByRole("navigation");
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    ["Home", "Browse", "Cart", "Chat", "Profile"].forEach((label) => {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    });
  });

  it("wires links to their target routes", () => {
    render(<MobileBottomNav />);
    expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/");
    expect(screen.getByText("Browse").closest("a")).toHaveAttribute("href", "/browse");
    expect(screen.getByText("Chat").closest("a")).toHaveAttribute("href", "/contact");
  });

  it("is hidden on md+ via Tailwind utility", () => {
    render(<MobileBottomNav />);
    expect(screen.getByRole("navigation").className).toContain("md:hidden");
  });
});
