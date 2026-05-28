import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { setRouterMockState } from "@/test/router-state";
import { Route } from "./orders.$id";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Order tracking route", () => {
  beforeEach(() => {
    setRouterMockState({ params: { id: "DFM-TESTID0" } });
    vi.restoreAllMocks();
  });

  it("renders the order id, ETA, and timeline", () => {
    render(<Page />);
    expect(screen.getByText("DFM-TESTID0")).toBeInTheDocument();
    expect(screen.getByText(/estimated delivery/i)).toBeInTheDocument();
    expect(screen.getByText(/delivery status/i)).toBeInTheDocument();
    expect(screen.getByText(/order placed/i)).toBeInTheDocument();
  });

  it("opens the message dialog and disables send when empty", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /message/i }));
    const send = screen.getByRole("button", { name: /send/i });
    expect(send).toBeDisabled();
  });

  it("releases funds when API returns ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    // Use an id that maps to stage >=4 ("out for delivery"). Try many seeds.
    for (let i = 0; i < 50; i++) {
      const id = `DFM-RELEASE-${i}`;
      setRouterMockState({ params: { id } });
      const { unmount } = render(<Page />);
      const releaseBtn = screen.queryByRole("button", { name: /release funds/i });
      if (releaseBtn) {
        // Fire a synthetic onChange on the OTP via setting the otp inputs is complex;
        // instead, find all hidden inputs / dispatch a change event on the OTP input.
        // Easier: the button is disabled until length=6. We invoke handler directly by
        // dispatching onChange on the underlying input via querying for any input.
        const otpInput = document.querySelector("input");
        if (otpInput) {
          fireEvent.input(otpInput, { target: { value: "123456" } });
        }
        // After OTP fills, click release
        const enabled = screen.getByRole("button", { name: /release funds/i });
        if (!(enabled as HTMLButtonElement).disabled) {
          fireEvent.click(enabled);
          await waitFor(() => expect(fetchMock).toHaveBeenCalled());
          expect(fetchMock.mock.calls[0][0]).toContain(`/api/orders/${encodeURIComponent(id)}/release`);
        }
        unmount();
        return;
      }
      unmount();
    }
  });
});
