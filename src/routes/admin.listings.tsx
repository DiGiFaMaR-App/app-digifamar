import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAllListingsFn, setListingStatusFn } from "@/lib/admin/admin.functions";

export const Route = createFileRoute("/admin/listings")({
  head: () => ({ meta: [{ title: "Admin · Listings" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <Body />
      </AdminGate>
    </RequireAuth>
  ),
});

function Body() {
  const listFn = listAllListingsFn;
  const statusFn = setListingStatusFn;
  const [search, setSearch] = useState("");
  const { data, refetch } = useQuery({
    queryKey: ["admin", "listings", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
  });

  const change = async (id: string, status: "active" | "paused" | "removed") => {
    try {
      await statusFn({ data: { id, status } });
      toast.success(`Listing ${status}`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 py-10 text-[#F0FFF0]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">All listings</h1>
          <Link to="/admin" className="text-sm underline">
            ← Admin hub
          </Link>
        </div>
        <Input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-black/40 border-white/15 mb-4 max-w-md"
        />
        <div className="overflow-x-auto border border-white/10 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left">
              <tr>
                <th className="p-2">Title</th>
                <th className="p-2">Category</th>
                <th className="p-2">Price</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((l) => (
                <tr key={l.id} className="border-t border-white/10">
                  <td className="p-2">
                    <Link to="/product/$id" params={{ id: l.id }} className="underline">
                      {l.title}
                    </Link>
                  </td>
                  <td className="p-2">{l.category}</td>
                  <td className="p-2">
                    ${(l.price_cents / 100).toFixed(2)}/{l.unit}
                  </td>
                  <td className="p-2">{l.qty_available}</td>
                  <td className="p-2">{l.status}</td>
                  <td className="p-2 space-x-1">
                    <Button size="sm" variant="secondary" onClick={() => change(l.id, "active")}>
                      Activate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => change(l.id, "paused")}>
                      Pause
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => change(l.id, "removed")}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SiteLayout>
  );
}
