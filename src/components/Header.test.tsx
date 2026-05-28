import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./Header";

describe("Header", () => {
  it("renders the logo and primary nav items", () => {
    render(<Header />);
    expect(screen.getByAltText("DiGiFaMaR")).toBeInTheDocument();
    ["Browse", "How It Works", "Pricing", "Lending", "About"].forEach((label) => {
      // Some items appear twice (desktop + mobile when open); use getAllByText.
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });

  it("opens and closes the mobile menu via the toggle", async () => {
    const user = userEvent.setup();
    render(<Header />);
    // Closed initially — only desktop nav links exist (each label once).
    expect(screen.getAllByText("Browse")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /toggle menu/i }));
    expect(screen.getAllByText("Browse").length).toBeGreaterThan(1);

    await user.click(screen.getByRole("button", { name: /toggle menu/i }));
    expect(screen.getAllByText("Browse")).toHaveLength(1);
  });

  it("links sign-in and get-started CTAs", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/signin");
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/signup");
  });
});
