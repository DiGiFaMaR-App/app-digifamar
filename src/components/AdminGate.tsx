/**
 * Client-side gate: shows children only when useAuth() reports the admin role.
 * This is UX only — every admin server function re-checks the role server-side
 * via assertAdminRole(). See src/lib/admin/authorization.ts.
 */
import type { ReactNode } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";

export function AdminGate({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) {
    return (
      <SiteLayout>
        <div className="p-8 text-[#F0FFF0]" role="status">
          Loading…
        </div>
      </SiteLayout>
    );
  }
  if (role !== "admin") {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-5 py-16 text-[#F0FFF0]">
          <h1 className="text-2xl font-bold mb-2">Admin access required</h1>
          <p className="text-[#F0FFF0]/70">Your account does not have admin privileges.</p>
        </div>
      </SiteLayout>
    );
  }
  return <>{children}</>;
}
