import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "./payment-success";
import { setRouterMockState } from "@/test/router-state";

const Page = Route.component as () => JSX.Element;

describe("PaymentSuccess route", () => {
  it("renders the success state with the provided order id and amount", () => {
    setRouterMockState({
      search: { id: "heirloom-tomatoes", orderId: "DFM-ABC123", amount: 12.5 },
    });
    render(<Page />);
    expect(screen.getByRole("heading", { name: /payment successful/i })).toBeInTheDocument();
    expect(screen.getByText("DFM-ABC123")).toBeInTheDocument();
    expect(screen.getByText("$12.50")).toBeInTheDocument();
    expect(screen.getByText(/heirloom tomato/i)).toBeInTheDocument();
  });

  it("falls back to a generated order id when none is passed", () => {
    setRouterMockState({ search: {} });
    render(<Page />);
    expect(screen.getByText(/^DFM-/)).toBeInTheDocument();
  });

  it("offers track-order and continue-shopping CTAs", () => {
    setRouterMockState({ search: { id: "heirloom-tomatoes", orderId: "DFM-X" } });
    render(<Page />);
    const track = screen.getByRole("link", { name: /track my order/i });
    expect(track).toHaveAttribute("href", "/orders/$id");
    expect(screen.getByRole("link", { name: /continue shopping/i })).toHaveAttribute(
      "href",
      "/market",
    );
  });

  it("triggers window.print when the download-receipt button is clicked", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    setRouterMockState({ search: {} });
    render(<Page />);
    screen.getByRole("button", { name: /download receipt/i }).click();
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it("sets a noindex meta entry", () => {
    expect(Route.head?.().meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "robots", content: "noindex" }),
      ]),
    );
  });
});
