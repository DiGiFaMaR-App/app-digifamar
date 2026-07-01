import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { setRouterMockState, routerMockState } from "@/test/router-state";
import { Route } from "./product.$id";
import { products } from "@/lib/mock-data";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Product detail route", () => {
  it("renders product name, price, and escrow card from loader data", () => {
    const product = products[0];
    setRouterMockState({
      params: { id: product.id },
      loaderData: { product },
    });
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: product.name })).toBeInTheDocument();
    expect(
      screen.getAllByText(new RegExp(`\\$${product.price.toFixed(2)}`)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/escrow-protected checkout/i)).toBeInTheDocument();
  });

  it("chat-farmer navigates to the farm chat with the product prefilled", () => {
    const product = products[1];
    const navigate = vi.fn();
    setRouterMockState({
      params: { id: product.id },
      loaderData: { product },
      navigate,
    });
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /chat farmer/i }));
    expect(navigate).toHaveBeenCalledWith({
      to: "/chat/farm/$farmId",
      params: { farmId: product.farmId },
      search: { productId: product.id, qty: 1 },
    });
    routerMockState.navigate = () => {};
  });

  it("renders the 'Product not found' notFoundComponent shape", () => {
    const NotFound = (Route as unknown as { notFoundComponent: () => React.ReactElement })
      .notFoundComponent;
    render(<NotFound />);
    expect(screen.getByText(/product not found/i)).toBeInTheDocument();
  });
});
