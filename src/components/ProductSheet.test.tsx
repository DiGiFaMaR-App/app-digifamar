import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductSheet } from "./ProductSheet";
import { products } from "@/lib/mock-data";

describe("ProductSheet", () => {
  it("renders nothing when product is null", () => {
    const { container } = render(
      <ProductSheet product={null} open={false} onOpenChange={() => {}} />,
    );
    expect(container.textContent).toBe("");
  });

  it("renders product details when open", () => {
    const product = products[0];
    render(<ProductSheet product={product} open={true} onOpenChange={() => {}} />);
    expect(screen.getAllByText(product.name).length).toBeGreaterThan(0);
  });
});
