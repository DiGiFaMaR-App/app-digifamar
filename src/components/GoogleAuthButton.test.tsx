import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

describe("GoogleAuthButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the default label and the Google logo", () => {
    render(<GoogleAuthButton />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("renders a custom label when provided", () => {
    render(<GoogleAuthButton label="Continue with Google as buyer" />);
    expect(
      screen.getByRole("button", { name: /continue with google as buyer/i }),
    ).toBeInTheDocument();
  });

  it("invokes Lovable OAuth with the current origin on click", async () => {
    const user = userEvent.setup();
    render(<GoogleAuthButton />);
    await user.click(screen.getByRole("button"));
    expect(lovable.auth.signInWithOAuth).toHaveBeenCalledWith("google", {
      redirect_uri: window.location.origin,
    });
  });

  it("shows an error toast when OAuth returns an error", async () => {
    (lovable.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      error: new Error("popup blocked"),
    });
    const user = userEvent.setup();
    render(<GoogleAuthButton />);
    await user.click(screen.getByRole("button"));
    expect(toast.error).toHaveBeenCalledWith(
      "Google sign-in failed",
      expect.objectContaining({ description: "popup blocked" }),
    );
  });

  it("shows an error toast when OAuth throws", async () => {
    (lovable.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network down"),
    );
    const user = userEvent.setup();
    render(<GoogleAuthButton />);
    await user.click(screen.getByRole("button"));
    expect(toast.error).toHaveBeenCalledWith(
      "Google sign-in failed",
      expect.objectContaining({ description: "network down" }),
    );
  });

  it("disables the button while loading", async () => {
    let resolve!: (v: unknown) => void;
    (lovable.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((r) => { resolve = r; }),
    );
    const user = userEvent.setup();
    render(<GoogleAuthButton />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    expect(btn).toBeDisabled();
    resolve({ redirected: true });
  });
});
