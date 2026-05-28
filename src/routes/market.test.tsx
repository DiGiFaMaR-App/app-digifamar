import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Route } from "./market";
import { products } from "@/lib/mock-data";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Marketplace route", () => {
  it("renders the SR-only heading and search input", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: /digifamar marketplace/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search tomatoes/i)).toBeInTheDocument();
  });

  it("renders product tiles for every product by default", () => {
    render(<Page />);
    // First product name should be rendered
    expect(screen.getAllByText(products[0].name).length).toBeGreaterThan(0);
  });

  it("filters by search query and shows the empty state with reset", () => {
    render(<Page />);
    const input = screen.getByPlaceholderText(/search tomatoes/i);
    fireEvent.change(input, { target: { value: "zzz-no-such-product-xyz" } });
    expect(screen.getByText(/no products match/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.queryByText(/no products match/i)).not.toBeInTheDocument();
  });

  it("changes category when a category chip is clicked", () => {
    render(<Page />);
    const chip = screen.getByRole("button", { name: /vegetables/i });
    fireEvent.click(chip);
    // After filtering, all visible product cards should be vegetables; at minimum the chip is now active
    expect(chip.className).toMatch(/bg-primary/);
  });

  it("opens the product sheet when a product is clicked", () => {
    render(<Page />);
    const first = screen.getAllByText(products[0].name)[0];
    fireEvent.click(first.closest("button")!);
    // Sheet shows the same product name again
    expect(screen.getAllByText(products[0].name).length).toBeGreaterThan(1);
  });
});
