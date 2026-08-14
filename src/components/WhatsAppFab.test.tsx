import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WhatsAppFab } from "./WhatsAppFab";

describe("WhatsAppFab", () => {
  it("renders a WhatsApp link", () => {
    render(<WhatsAppFab />);
    expect(screen.getByRole("link", { name: /whatsapp/i })).toBeInTheDocument();
  });

  it("points at the support WhatsApp chat", () => {
    render(<WhatsAppFab />);
    const link = screen.getByRole("link", { name: /whatsapp/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me/19294919491"));
    expect(link.getAttribute("href")).toContain(
      encodeURIComponent("Hi, I'd like help with DiGiFaMaR"),
    );
    expect(link).toHaveAttribute("target", "_top");
  });
});
