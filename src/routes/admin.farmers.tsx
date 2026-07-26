import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { listFarmerProfilesFn, setFarmerVerificationFn } from "@/lib/admin/admin.functions";

export const Route = createFileRoute("/admin/farmers")({
  head: () => ({ meta: [{ title: "Admin · Farmers" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <Body />
      </AdminGate>
    </RequireAuth>
  ),
});

type StatusFilter = "pending" | "under_review" | "approved" | "rejected" | "all";

const FILTERS: StatusFilter[] = ["pending", "under_review", "approved", "rejected", "all"];

function Body() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "farmers", filter],
    queryFn: () => listFarmerProfilesFn({ data: filter === "all" ? {} : { status: filter } }),
  });

  const act = async (
    userId: string,
    status: "approved" | "rejected" | "under_review",
    farm: string,
  ) => {
    try {
      let reason: string | undefined;
      if (status === "rejected") {
        reason = window.prompt(`Reason for rejecting ${farm}? (shown to the farmer)`) ?? undefined;
        if (reason === undefined) return; // cancelled
      }
      await setFarmerVerificationFn({ data: { userId, status, reason } });
      toast.success(`Farmer ${status}`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 py-10 text-[#F0FFF0]">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Farmer verification</h1>
          <Link to="/admin" className="text-sm underline">
            ← Admin hub
          </Link>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-sm capitalize ${
                filter === f
                  ? "bg-[#22C55E] text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-white/50">Loading…</p>}

        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left">
              <tr>
                <th className="p-2">Farm</th>
                <th className="p-2">Owner</th>
                <th className="p-2">Location</th>
                <th className="p-2">Produce</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((f) => (
                <tr key={f.user_id} className="border-t border-white/10 align-top">
                  <td className="p-2 font-medium">{f.farm_name}</td>
                  <td className="p-2">
                    <div>{f.full_name ?? "—"}</div>
                    <div className="text-white/40">{f.email ?? f.phone ?? ""}</div>
                  </td>
                  <td className="p-2">{[f.city, f.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="p-2 max-w-[16rem]">{(f.products ?? []).join(", ") || "—"}</td>
                  <td className="p-2">
                    <span className="capitalize">{f.verification_status.replace("_", " ")}</span>
                    {f.verification_status === "rejected" && f.rejection_reason && (
                      <div className="text-xs text-red-300/80">{f.rejection_reason}</div>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      {f.verification_status !== "approved" && (
                        <Button
                          size="sm"
                          onClick={() => act(f.user_id, "approved", f.farm_name)}
                          className="bg-[#22C55E] text-black hover:bg-[#16A34A]"
                        >
                          Approve
                        </Button>
                      )}
                      {f.verification_status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => act(f.user_id, "rejected", f.farm_name)}
                          className="border-red-400/40 text-red-300 hover:bg-red-500/10"
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && (data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-white/40">
                    No farmers in “{filter.replace("_", " ")}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SiteLayout>
  );
}
