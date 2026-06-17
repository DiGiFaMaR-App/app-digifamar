/**
 * AdminGate component tests.
 *
 * Verifies that the client-side gate (used by /admin and /admin/maps) hides
 * children from non-admin users and shows an "Admin access required" message.
 * Server-side admin enforcement is covered separately in
 * src/lib/admin/__tests__/authorization.test.ts.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// useAuth() is the only source of role state the gate consumes.
const useAuthMock = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => useAuthMock(),
}));

// SiteLayout pulls in the router/header/footer chain; replace with a passthrough.
vi.mock("@/components/SiteLayout", () => ({
  SiteLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { AdminGate } from "@/components/AdminGate";

function renderGate() {
  return render(
    <AdminGate>
      <div data-testid="admin-only">SECRET ADMIN UI</div>
    </AdminGate>,
  );
}

describe("AdminGate", () => {
  it("shows loading and hides children while auth resolves", () => {
    useAuthMock.mockReturnValue({ role: null, loading: true });
    renderGate();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByTestId("admin-only")).not.toBeInTheDocument();
  });

  it("blocks anonymous (no role) users", () => {
    useAuthMock.mockReturnValue({ role: null, loading: false });
    renderGate();
    expect(screen.getByText("Admin access required")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-only")).not.toBeInTheDocument();
  });

  it("blocks signed-in buyers", () => {
    useAuthMock.mockReturnValue({ role: "buyer", loading: false });
    renderGate();
    expect(screen.getByText("Admin access required")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-only")).not.toBeInTheDocument();
  });

  it("blocks signed-in farmers", () => {
    useAuthMock.mockReturnValue({ role: "farmer", loading: false });
    renderGate();
    expect(screen.getByText("Admin access required")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-only")).not.toBeInTheDocument();
  });

  it("renders children for admins", () => {
    useAuthMock.mockReturnValue({ role: "admin", loading: false });
    renderGate();
    expect(screen.getByTestId("admin-only")).toBeInTheDocument();
    expect(screen.queryByText("Admin access required")).not.toBeInTheDocument();
  });
});
