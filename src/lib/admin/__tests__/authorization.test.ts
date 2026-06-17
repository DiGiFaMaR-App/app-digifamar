/**
 * Admin authorization unit tests.
 *
 * Verifies that `assertAdminRole` — the shared helper called by every
 * protected admin server function — rejects non-admins with "Forbidden"
 * and resolves for admins.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { assertAdminRole } from "@/lib/admin/authorization";

afterEach(() => {
  rpcMock.mockReset();
});

describe("assertAdminRole", () => {
  it("throws Forbidden when has_role returns false (non-admin)", async () => {
    rpcMock.mockResolvedValueOnce({ data: false, error: null });
    await expect(assertAdminRole("non-admin-uuid")).rejects.toThrow("Forbidden");
    expect(rpcMock).toHaveBeenCalledWith("has_role", {
      _user_id: "non-admin-uuid",
      _role: "admin",
    });
  });

  it("throws Forbidden when has_role returns null", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await expect(assertAdminRole("ghost-uuid")).rejects.toThrow("Forbidden");
  });

  it("throws Forbidden when userId is empty (defense in depth)", async () => {
    await expect(assertAdminRole("")).rejects.toThrow("Forbidden");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("surfaces the RPC error message when has_role errors", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    await expect(assertAdminRole("any")).rejects.toThrow("db down");
  });

  it("resolves silently when has_role returns true (admin)", async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    await expect(assertAdminRole("admin-uuid")).resolves.toBeUndefined();
  });
});
