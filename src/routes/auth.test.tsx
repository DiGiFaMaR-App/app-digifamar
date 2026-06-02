import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "./auth";
import { setRouterMockState } from "@/test/router-state";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Auth route", () => {
  it("shows the two role cards on the Sign Up tab", () => {
    setRouterMockState({ search: { tab: "signup" } });
    render(<Page />);
    expect(screen.getByText(/i'm a farmer/i)).toBeInTheDocument();
    expect(screen.getByText(/i'm a buyer/i)).toBeInTheDocument();
  });

  it("links the Sign Up role cards to the dedicated signup flows", () => {
    setRouterMockState({ search: { tab: "signup" } });
    render(<Page />);
    expect(screen.getByRole("link", { name: /i'm a farmer/i })).toHaveAttribute(
      "href",
      "/signup/farmer",
    );
    expect(screen.getByRole("link", { name: /i'm a buyer/i })).toHaveAttribute(
      "href",
      "/signup/buyer",
    );
  });

  it("renders email + password fields on the Sign In tab and hides the role cards", () => {
    setRouterMockState({ search: { tab: "signin" } });
    render(<Page />);
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    expect(screen.queryByText(/i'm a farmer/i)).not.toBeInTheDocument();
  });

  it("renders a Google sign-in entry", () => {
    setRouterMockState({ search: { tab: "signup" } });
    render(<Page />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("exposes a back link to home", () => {
    setRouterMockState({ search: { tab: "signup" } });
    render(<Page />);
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
