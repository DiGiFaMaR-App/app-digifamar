import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Route } from "./assistant";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Assistant route", () => {
  it("greets the user on load", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: /digifamar assistant/i })).toBeInTheDocument();
    expect(screen.getByText(/i'm your digifamar assistant/i)).toBeInTheDocument();
  });

  it("answers a help question with the escrow explanation", () => {
    render(<Page />);
    const input = screen.getByLabelText(/message the assistant/i);
    fireEvent.change(input, { target: { value: "how does escrow work?" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText(/6-digit code/i)).toBeInTheDocument();
    // The user's message is echoed back.
    expect(screen.getByText("how does escrow work?")).toBeInTheDocument();
  });

  it("runs a product search and shows matches", () => {
    render(<Page />);
    const input = screen.getByLabelText(/message the assistant/i);
    fireEvent.change(input, { target: { value: "find organic tomatoes" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText(/found \d+ match/i)).toBeInTheDocument();
  });
});
