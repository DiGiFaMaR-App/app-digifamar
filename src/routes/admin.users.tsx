/**
 * Admin · Users — search profiles and grant/revoke roles (admin/farmer/buyer).
 * Server function re-checks admin role and writes audit_logs entries.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listUsersFn, setUserRoleFn } from "@/lib/admin/admin.functions";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Admin · Users — DiGiFaMaR" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <Body />
      </AdminGate>
    </RequireAuth>
  ),
});

type Role = "admin" | "farmer" | "buyer";

function Body() {
  const list = useServerFn(listUsersFn);
  const setRole = useServerFn(setUserRoleFn);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin_users", query],
    queryFn: () => list({ data: { search: query || undefined } }),
  });

  const toggle = async (userId: string, role: Role, has: boolean) => {
    try {
      await setRole({
        data: { userId, role, action: has ? "revoke" : "grant" },
      });
      toast.success(`${has ? "Revoked" : "Granted"} ${role}`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-5 py-10 text-[#F0FFF0] space-y-4">
        <header>
          <h1 className="text-3xl font-bold">Admin · Users</h1>
          <p className="text-sm text-[#F0FFF0]/70">
            Grant or revoke roles. Every change is recorded in the audit log.
          </p>
        </header>

        <Card className="p-4 bg-black/40 border-white/15 flex gap-2">
          <Input
            placeholder="Search by email or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setQuery(search)}
            className="bg-black/40 border-white/15"
          />
          <Button onClick={() => setQuery(search)} disabled={isFetching}>
            {isFetching ? "…" : "Search"}
          </Button>
        </Card>

        <Card className="p-0 bg-black/40 border-white/15 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[#F0FFF0]/70">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Roles</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-[#F0FFF0]/60">Loading…</td></tr>
                )}
                {!isLoading && (data?.length ?? 0) === 0 && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-[#F0FFF0]/60">No users.</td></tr>
                )}
                {data?.map((u) => {
                  const roles = u.roles as string[];
                  return (
                    <tr key={u.id} className="border-b border-white/5 align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium">{u.full_name ?? "—"}</div>
                        <div className="text-xs text-[#F0FFF0]/60">{u.email}</div>
                        <div className="text-[10px] font-mono text-[#F0FFF0]/40">{u.id}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {roles.length === 0 && <span className="text-[#F0FFF0]/50 text-xs">none</span>}
                          {roles.map((r) => (
                            <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {(["admin", "farmer", "buyer"] as Role[]).map((r) => {
                            const has = roles.includes(r);
                            return (
                              <Button
                                key={r}
                                size="sm"
                                variant={has ? "destructive" : "outline"}
                                onClick={() => toggle(u.id, r, has)}
                              >
                                {has ? `Revoke ${r}` : `Grant ${r}`}
                              </Button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </SiteLayout>
  );
}
