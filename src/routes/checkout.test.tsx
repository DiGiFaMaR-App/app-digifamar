import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { setRouterMockState } from "@/test/router-state";
import { cartStore } from "@/lib/cart/store";

// Buyer is signed in for these tests.
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: null,
    session: null,
    role: "buyer",
  }),
}));

// Stub the client-side order creation (direct Supabase insert).
const createOrdersFromCart = vi.fn();
vi.mock("@/lib/orders/orders.queries", () => ({
  createOrdersFromCart: (...args: unknown[]) => createOrdersFromCart(...args),
}));

import { Route } from "./checkout";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

function seedCart() {
  cartStore.clear();
  cartStore.add(
    {
      productId: "heirloom-tomatoes",
      name: "Heirloom Tomato Mix",
      unitPrice: 5.5,
      unit: "lb",
      image: "tomato.jpg",
      farmId: "river-bend",
    },
    2,
  ); // 2 × $5.50 = $11.00 subtotal
}

describe("Checkout route", () => {
  beforeEach(() => {
    window.localStorage.clear();
    createOrdersFromCart.mockReset();
    setRouterMockState({ navigate: vi.fn() });
  });

  it("shows the 8% platform fee, 3.25% escrow fee, and total breakdown", () => {
    seedCart();
    render(<Page />);

    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    // $11.00 shows twice: the item line total and the subtotal row.
    expect(screen.getAllByText("$11.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Platform fee (8%)")).toBeInTheDocument();
    expect(screen.getByText("$0.88")).toBeInTheDocument(); // 8% of $11.00
    expect(screen.getByText("Escrow fee (3.25%)")).toBeInTheDocument();
    expect(screen.getByText("$0.36")).toBeInTheDocument(); // round(3.25% of $11.00)
    // No geolocation in jsdom → standard delivery falls back to its flat fee.
    expect(screen.getByText("Delivery (Standard delivery)")).toBeInTheDocument();
    expect(screen.getByText("Total due")).toBeInTheDocument();
    expect(screen.getByText("$21.23")).toBeInTheDocument(); // 1100 + 88 + 36 + 899
  });

  it("recomputes the total when a different delivery method is chosen", () => {
    seedCart();
    render(<Page />);
    // Switch to farm pickup → delivery is free.
    fireEvent.click(screen.getByRole("button", { name: /farm pickup/i }));
    expect(screen.getByText("$12.24")).toBeInTheDocument(); // 1100 + 88 + 36 + 0
  });

  it("creates orders from the cart lines and clears the cart on success", async () => {
    seedCart();
    createOrdersFromCart.mockResolvedValue([
      { id: "ord-123", total_cents: 1224, status: "pending" },
    ]);

    render(<Page />);
    fireEvent.change(screen.getByLabelText(/delivery address/i), {
      target: { value: "123 Market St, Austin, TX 78701" },
    });
    fireEvent.click(screen.getByRole("button", { name: /pay with escrow\.com/i }));

    await waitFor(() => expect(createOrdersFromCart).toHaveBeenCalledTimes(1));
    expect(createOrdersFromCart).toHaveBeenCalledWith(
      [{ slug: "heirloom-tomatoes", qty: 2 }],
      "123 Market St, Austin, TX 78701",
    );
    await waitFor(() => expect(cartStore.getItems()).toEqual([]));
  });

  it("does not create orders when the address is too short", () => {
    seedCart();
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /pay with escrow\.com/i }));
    expect(createOrdersFromCart).not.toHaveBeenCalled();
  });
});
