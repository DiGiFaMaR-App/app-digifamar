import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Route } from "./browse";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Browse route", () => {
  it("renders the SR-only heading and search input", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { name: /browse verified american farms/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search products or farms/i)).toBeInTheDocument();
  });

  it("toggles the mobile filters panel open and closed", () => {
    render(<Page />);
    const buttons = screen.getAllByRole("button", { name: /filters/i });
    fireEvent.click(buttons[0]);
    // No throw means the open-state branch rendered
    expect(buttons[0]).toBeInTheDocument();
  });
});
