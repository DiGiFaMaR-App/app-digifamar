import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatsAppFab } from "./WhatsAppFab";

describe("WhatsAppFab", () => {
  it("renders a WhatsApp button", () => {
    render(<WhatsAppFab />);
    expect(
      screen.getByRole("button", { name: /whatsapp/i }),
    ).toBeInTheDocument();
  });

  it("opens WhatsApp when clicked", async () => {
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue({} as unknown as Window);
    render(<WhatsAppFab />);
    await userEvent.click(screen.getByRole("button", { name: /whatsapp/i }));
    // On desktop user agent (jsdom), it should call window.open with WhatsApp Web.
    const calledWith = openSpy.mock.calls.map((c) => c[0]).join(" ");
    expect(calledWith).toContain("web.whatsapp.com/send?phone=19294919491");
    expect(calledWith).toContain(encodeURIComponent("Hi, I'd like help with DiGiFaMaR"));
    openSpy.mockRestore();
  });
});
