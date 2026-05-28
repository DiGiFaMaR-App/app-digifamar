import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  DashboardSkeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
} from "./LoadingSkeletons";

describe("LoadingSkeletons", () => {
  it("renders a single product card skeleton", () => {
    const { container } = render(<ProductCardSkeleton />);
    expect(container.querySelectorAll("[data-slot='skeleton'], .animate-pulse").length)
      .toBeGreaterThan(0);
  });

  it("renders the requested number of grid items", () => {
    const { container } = render(<ProductGridSkeleton count={8} />);
    // Each card has multiple skeleton lines; assert grid wrapper has 8 children.
    const grid = container.firstChild as HTMLElement;
    expect(grid.children).toHaveLength(8);
  });

  it("renders dashboard layout with stat cards and grid", () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });
});
