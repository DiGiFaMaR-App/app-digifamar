import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "./chat.$productId";
import { setRouterMockState } from "@/test/router-state";

const Page = Route.component as () => JSX.Element;

describe("ChatRoom route", () => {
  it("renders an unavailable state when the product id is unknown", () => {
    setRouterMockState({ params: { productId: "nope" } });
    render(<Page />);
    expect(screen.getByRole("heading", { name: /conversation unavailable/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to market/i })).toHaveAttribute("href", "/market");
  });

  it("renders the farmer header, initial system + farmer messages, and starting price", () => {
    setRouterMockState({ params: { productId: "heirloom-tomatoes" } });
    render(<Page />);
    expect(screen.getByText(/river bend produce/i)).toBeInTheDocument();
    expect(screen.getByText(/distance:/i)).toBeInTheDocument();
    expect(screen.getByText(/ready to ship/i)).toBeInTheDocument();
    expect(screen.getByText("$5.50")).toBeInTheDocument();
  });

  it("appends the buyer message when Send is clicked", async () => {
    setRouterMockState({ params: { productId: "heirloom-tomatoes" } });
    const user = userEvent.setup();
    render(<Page />);
    await user.type(screen.getByPlaceholderText(/negotiate/i), "hello there");
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(screen.getByText("hello there")).toBeInTheDocument();
  });

  it("updates the negotiated price when a buyer sends a $ offer", async () => {
    setRouterMockState({ params: { productId: "heirloom-tomatoes" } });
    const user = userEvent.setup();
    render(<Page />);
    await user.type(screen.getByPlaceholderText(/negotiate/i), "Can you do $4.25?");
    await user.keyboard("{Enter}");
    expect(screen.getByText("$4.25")).toBeInTheDocument();
    expect(screen.getByText(/i can do \$4\.25/i)).toBeInTheDocument();
  });

  it("ignores wildly out-of-range offers (>= 2x base price)", async () => {
    setRouterMockState({ params: { productId: "heirloom-tomatoes" } });
    const user = userEvent.setup();
    render(<Page />);
    await user.type(screen.getByPlaceholderText(/negotiate/i), "I'll give you $999");
    await user.keyboard("{Enter}");
    // Negotiated price should still be the original $5.50
    expect(screen.getByText("$5.50")).toBeInTheDocument();
  });

  it("navigates to /payment-success when escrow CTA is tapped", async () => {
    const navigate = vi.fn();
    setRouterMockState({ params: { productId: "heirloom-tomatoes" }, navigate });
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Page />);
    await user.click(screen.getByRole("button", { name: /pay into escrow/i }));
    vi.runAllTimers();
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/payment-success",
        search: expect.objectContaining({ id: "heirloom-tomatoes" }),
      }),
    );
    vi.useRealTimers();
  });
});
