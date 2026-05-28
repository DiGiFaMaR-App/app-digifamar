import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WhatsAppFab } from "./WhatsAppFab";

describe("WhatsAppFab", () => {
  it("renders a WhatsApp link with the support number and prefilled message", () => {
    render(<WhatsAppFab />);
    const link = screen.getByRole("link", { name: /whatsapp/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("https://wa.me/19294919491"));
    expect(link.getAttribute("href")).toContain(encodeURIComponent("Hi, I'd like help with DiGiFaMaR"));
  });

  it("opens in a new tab", () => {
    render(<WhatsAppFab />);
    const link = screen.getByRole("link", { name: /whatsapp/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});
