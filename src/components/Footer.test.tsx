import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("renders the tagline and copyright", () => {
    render(<Footer />);
    expect(screen.getByText(/from american farms/i)).toBeInTheDocument();
    expect(screen.getByText(/© 2026 DiGiFaMaR/)).toBeInTheDocument();
  });

  it("renders all three navigation columns", () => {
    render(<Footer />);
    expect(screen.getByRole("heading", { name: "For Buyers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "For Farmers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company" })).toBeInTheDocument();
  });

  it("links to key buyer pages", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /browse farms/i })).toHaveAttribute("href", "/browse");
    expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute("href", "/how-it-works");
    expect(screen.getByRole("link", { name: /buyer protection/i })).toHaveAttribute("href", "/buyer-protection");
  });

  it("includes a WhatsApp contact link", () => {
    render(<Footer />);
    const wa = screen.getByRole("link", { name: /whatsapp/i });
    expect(wa).toHaveAttribute("href", expect.stringContaining("web.whatsapp.com/send"));
    expect(wa).toHaveAttribute("target", "_blank");
    expect(wa).toHaveAttribute("rel", "noreferrer");
  });

  it("renders trust badges (USDA + SSL)", () => {
    render(<Footer />);
    expect(screen.getByText(/usda compliant/i)).toBeInTheDocument();
    expect(screen.getByText(/ssl secure/i)).toBeInTheDocument();
  });
});
