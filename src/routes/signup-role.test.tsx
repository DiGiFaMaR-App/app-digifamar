import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "./signup.index";
import { setRouterMockState } from "@/test/router-state";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Signup role selection", () => {
  it("renders heading, copy, and both role buttons", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: /join digifamar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i am a farmer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i am a buyer/i })).toBeInTheDocument();
  });

  it("routes farmers into the farmer signup flow", async () => {
    const navigate = vi.fn();
    setRouterMockState({ navigate });
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: /i am a farmer/i }));

    expect(navigate).toHaveBeenCalledWith({ to: "/signup/farmer" });
  });

  it("routes buyers into the buyer signup flow", async () => {
    const navigate = vi.fn();
    setRouterMockState({ navigate });
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: /i am a buyer/i }));

    expect(navigate).toHaveBeenCalledWith({ to: "/signup/buyer" });
  });
});
