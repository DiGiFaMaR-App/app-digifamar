import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { listAllOrdersFn } from "@/lib/admin/admin.functions";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Admin · Orders" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <Body />
      </AdminGate>
    </RequireAuth>
  ),
});

function Body() {
  const fn = useServerFn(listAllOrdersFn);
  const { data } = useQuery({ queryKey: ["admin", "orders"], queryFn: () => fn({ data: {} }) });
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 py-10 text-[#F0FFF0]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">All orders</h1>
          <Link to="/admin" className="text-sm underline">← Admin hub</Link>
        </div>
        <div className="overflow-x-auto border border-white/10 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left">
              <tr>
                <th className="p-2">Order</th><th className="p-2">Buyer</th><th className="p-2">Farmer</th>
                <th className="p-2">Qty</th><th className="p-2">Total</th><th className="p-2">Status</th><th className="p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((o) => (
                <tr key={o.id} className="border-t border-white/10">
                  <td className="p-2"><Link to="/orders/$id" params={{ id: o.id }} className="underline">{o.id.slice(0, 8)}…</Link></td>
                  <td className="p-2">{o.buyer_id.slice(0, 8)}…</td>
                  <td className="p-2">{o.farmer_id.slice(0, 8)}…</td>
                  <td className="p-2">{o.qty}</td>
                  <td className="p-2">${(o.total_cents / 100).toFixed(2)}</td>
                  <td className="p-2">{o.status}</td>
                  <td className="p-2">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SiteLayout>
  );
}
