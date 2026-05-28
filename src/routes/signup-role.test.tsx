import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "./signup.index";
import { setRouterMockState } from "@/test/router-state";
import { toast } from "sonner";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

describe("Signup role selection", () => {
  it("renders heading, copy, and both role buttons", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: /join digifamar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i am a farmer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i am a buyer/i })).toBeInTheDocument();
  });

  it("persists role + auth flag and navigates to farmer dashboard", async () => {
    const navigate = vi.fn();
    setRouterMockState({ navigate });
    localStorage.clear();
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: /i am a farmer/i }));

    expect(localStorage.getItem("userRole")).toBe("farmer");
    expect(localStorage.getItem("isAuthenticated")).toBe("true");
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/farmer/i),
      expect.any(Object),
    );
    expect(navigate).toHaveBeenCalledWith({ to: "/dashboard/farmer" });
  });

  it("routes buyers to /market", async () => {
    const navigate = vi.fn();
    setRouterMockState({ navigate });
    localStorage.clear();
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: /i am a buyer/i }));
    expect(localStorage.getItem("userRole")).toBe("buyer");
    expect(navigate).toHaveBeenCalledWith({ to: "/market" });
  });
});
