import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { setRouterMockState } from "@/test/router-state";
import { supabase } from "@/integrations/supabase/client";

// Mock useServerFn -> pass-through to the underlying fn so we can control
// verifyAdminSessionFn directly via its own vi.mock below.
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
  createServerFn: () => ({
    middleware: () => ({
      handler: () => vi.fn(),
      inputValidator: () => ({ handler: () => vi.fn() }),
    }),
  }),
}));

const verifyAdminSessionFn = vi.fn();
vi.mock("@/lib/admin/admin.functions", () => ({
  verifyAdminSessionFn: (...args: unknown[]) => verifyAdminSessionFn(...args),
}));

import { Route } from "./admin.login";
const Page = (Route as unknown as { component: () => React.ReactElement }).component;

const signInWithPassword = supabase.auth.signInWithPassword as unknown as ReturnType<typeof vi.fn>;
const getUser = supabase.auth.getUser as unknown as ReturnType<typeof vi.fn>;
const signOut = supabase.auth.signOut as unknown as ReturnType<typeof vi.fn>;
const navigate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // Ensure supabase.auth has the methods this route calls (setup.ts only stubs some).
  // @ts-expect-error – test mock surface
  supabase.auth.signInWithPassword = vi.fn();
  // @ts-expect-error
  supabase.auth.signOut = vi.fn().mockResolvedValue({ error: null });
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  setRouterMockState({ navigate });
});

function fillCreds(email = "admin@digifamar.com", password = "correct-horse") {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
}

describe("/admin/login", () => {
  it("signs in an admin with the correct password and navigates to /admin", async () => {
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    verifyAdminSessionFn.mockResolvedValue({ ok: true });

    render(<Page />);
    fillCreds();
    fireEvent.click(screen.getByRole("button", { name: /sign in as admin/i }));

    await waitFor(() => expect(verifyAdminSessionFn).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Welcome, admin");
    expect(navigate).toHaveBeenCalledWith({ to: "/admin" });
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it("shows the password error and does not check admin role when credentials are wrong", async () => {
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    render(<Page />);
    fillCreds("admin@digifamar.com", "wrong-password");
    fireEvent.click(screen.getByRole("button", { name: /sign in as admin/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Password sign in failed",
        expect.objectContaining({
          description: expect.stringMatching(/email and password/i),
        }),
      ),
    );
    expect(verifyAdminSessionFn).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("signs out and shows admin-only error when the password is correct but the user is not an admin", async () => {
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "u2" } },
      error: null,
    });
    getUser.mockResolvedValue({ data: { user: { id: "u2" } }, error: null });
    verifyAdminSessionFn.mockRejectedValue(new Error("Forbidden"));

    render(<Page />);
    fillCreds("user@digifamar.com", "correct-horse");
    fireEvent.click(screen.getByRole("button", { name: /sign in as admin/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Not an admin account",
        expect.objectContaining({ description: expect.stringMatching(/admin privileges/i) }),
      ),
    );
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("trims whitespace from the email before signing in", async () => {
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    verifyAdminSessionFn.mockResolvedValue({ ok: true });

    render(<Page />);
    fillCreds("  admin@digifamar.com  ", "correct-horse");
    fireEvent.click(screen.getByRole("button", { name: /sign in as admin/i }));

    await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalled());
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@digifamar.com",
      password: "correct-horse",
    });
  });
});
