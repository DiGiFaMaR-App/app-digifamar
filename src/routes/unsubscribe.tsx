import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";

type State = "loading" | "confirm" | "already" | "invalid" | "done" | "error";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Unsubscribe · DiGiFaMaR" },
      {
        name: "description",
        content: "Manage your DiGiFaMaR email preferences and unsubscribe from notifications.",
      },
      { property: "og:title", content: "Unsubscribe · DiGiFaMaR" },
      {
        property: "og:description",
        content: "Manage your DiGiFaMaR email preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`);
        const body = (await res.json()) as { valid?: boolean; reason?: string };
        if (cancelled) return;
        if (!res.ok || body.valid === undefined) setState("invalid");
        else if (body.valid) setState("confirm");
        else setState(body.reason === "already_unsubscribed" ? "already" : "invalid");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-5 py-16 text-[#F0FFF0]">
        <h1 className="text-3xl font-bold">Email preferences</h1>

        {state === "loading" && <p className="mt-4 text-white/60">Checking your link…</p>}

        {state === "confirm" && (
          <>
            <p className="mt-4 text-white/70">
              Unsubscribe this address from DiGiFaMaR notification emails? You&apos;ll still receive
              essential account and order security messages.
            </p>
            <Button
              onClick={confirm}
              disabled={busy}
              className="mt-6 w-fit bg-[#22C55E] text-black hover:bg-[#16A34A]"
            >
              {busy ? "Unsubscribing…" : "Confirm unsubscribe"}
            </Button>
          </>
        )}

        {state === "done" && (
          <p className="mt-4 text-white/70">
            You&apos;re unsubscribed. It can take a few minutes for in-flight messages to stop.
          </p>
        )}

        {state === "already" && (
          <p className="mt-4 text-white/70">This address is already unsubscribed.</p>
        )}

        {state === "invalid" && (
          <p className="mt-4 text-white/70">
            This unsubscribe link is invalid or has expired. Email support@digifamar.com and
            we&apos;ll take care of it.
          </p>
        )}

        {state === "error" && (
          <p className="mt-4 text-white/70">
            Something went wrong. Please try again, or email support@digifamar.com.
          </p>
        )}
      </div>
    </SiteLayout>
  );
}
