import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminGate } from "@/components/AdminGate";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { listAllConversationsFn, listMessagesForConversationFn } from "@/lib/admin/admin.functions";

export const Route = createFileRoute("/admin/chats")({
  head: () => ({ meta: [{ title: "Admin · Chats" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <Body />
      </AdminGate>
    </RequireAuth>
  ),
});

function Body() {
  const convFn = useServerFn(listAllConversationsFn);
  const msgFn = useServerFn(listMessagesForConversationFn);
  const [active, setActive] = useState<string | null>(null);
  const { data: convs } = useQuery({ queryKey: ["admin", "conversations"], queryFn: () => convFn() });
  const { data: msgs } = useQuery({
    queryKey: ["admin", "messages", active],
    queryFn: () => msgFn({ data: { conversationId: active! } }),
    enabled: !!active,
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 py-10 text-[#F0FFF0]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">All chats (moderation)</h1>
          <Link to="/admin" className="text-sm underline">← Admin hub</Link>
        </div>
        <div className="grid md:grid-cols-[320px_1fr] gap-4">
          <ul className="border border-white/10 rounded-lg divide-y divide-white/10 max-h-[70vh] overflow-y-auto">
            {(convs ?? []).map((c) => (
              <li key={c.id}>
                <button onClick={() => setActive(c.id)}
                        className={`w-full text-left p-3 text-sm hover:bg-white/5 ${active === c.id ? "bg-white/10" : ""}`}>
                  <div className="font-semibold">{c.product_id || "Direct"}</div>
                  <div className="text-xs text-[#F0FFF0]/60">
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : "—"}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="border border-white/10 rounded-lg p-4 min-h-[70vh]">
            {!active && <p className="text-[#F0FFF0]/60">Select a conversation</p>}
            {active && (
              <ul className="space-y-2">
                {(msgs ?? []).map((m) => (
                  <li key={m.id} className={`text-sm p-2 rounded ${m.flagged ? "bg-red-500/10 border border-red-500/30" : "bg-white/5"}`}>
                    <div className="text-xs text-[#F0FFF0]/60 mb-0.5">
                      {m.sender_id.slice(0, 8)}… · {new Date(m.created_at).toLocaleString()}
                    </div>
                    <div>{m.body}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
