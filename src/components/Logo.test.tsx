import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders a link to home by default with accessible label", () => {
    render(<Logo />);
    const link = screen.getByRole("link", { name: /home/i });
    expect(link).toHaveAttribute("href", "/");
    expect(screen.getByAltText("DiGiFaMaR")).toBeInTheDocument();
  });

  it("renders a plain span when linked=false", () => {
    render(<Logo linked={false} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByAltText("DiGiFaMaR")).toBeInTheDocument();
  });

  it.each([
    ["sm", "h-8"],
    ["lg", "h-20"],
    ["xl", "h-40"],
  ] as const)("applies size %s -> %s", (size, cls) => {
    render(<Logo size={size} />);
    expect(screen.getByAltText("DiGiFaMaR").className).toContain(cls);
  });

  it("applies glow class when glow=true", () => {
    render(<Logo glow />);
    expect(screen.getByAltText("DiGiFaMaR").className).toContain("glow-logo");
  });

  it("still renders the image when blend=true (legacy prop, no-op)", () => {
    render(<Logo glow blend />);
    expect(screen.getByAltText("DiGiFaMaR")).toBeInTheDocument();
  });
});
