import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "./auth";
import { setRouterMockState } from "@/test/router-state";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Auth route", () => {
  it("defaults to the Sign Up tab and shows the role picker", () => {
    setRouterMockState({ search: { tab: "signup" } });
    render(<Page />);
    expect(screen.getByText(/i am a/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buyer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /farmer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^create account$/i })).toBeInTheDocument();
  });

  it("hides the role picker on the Sign In tab", () => {
    setRouterMockState({ search: { tab: "signin" } });
    render(<Page />);
    expect(screen.queryByText(/^i am a$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("renders email + password fields on sign-in; adds phone on sign-up", () => {
    setRouterMockState({ search: { tab: "signin" } });
    const { unmount } = render(<Page />);
    expect(screen.getByPlaceholderText(/you@farm.com/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/123-4567/)).not.toBeInTheDocument();
    unmount();

    setRouterMockState({ search: { tab: "signup" } });
    render(<Page />);
    expect(screen.getByPlaceholderText(/123-4567/)).toBeInTheDocument();
  });

  it("lets users toggle role pills", async () => {
    setRouterMockState({ search: { tab: "signup" } });
    const user = userEvent.setup();
    render(<Page />);
    const farmer = screen.getByRole("button", { name: /farmer/i });
    await user.click(farmer);
    // active state adds glow-ring class to the picked pill
    expect(farmer.className).toContain("glow-ring");
  });

  it("renders Google sign-in entry", () => {
    setRouterMockState({ search: { tab: "signup" } });
    render(<Page />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("exposes a back link to the splash", () => {
    setRouterMockState({ search: { tab: "signup" } });
    render(<Page />);
    expect(screen.getByRole("link", { name: /back to splash/i })).toHaveAttribute("href", "/");
  });
});
