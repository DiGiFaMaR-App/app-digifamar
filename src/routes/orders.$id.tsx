import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  KeyRound,
  Package,
  ShieldCheck,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  confirmDeliveryFn,
  fundEscrowFn,
  generateDeliveryOtpFn,
  raiseDisputeFn,
  releaseEscrowFn,
} from "@/lib/escrow-v2/escrow.functions";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Track Order — DiGiFaMaR" },
      {
        name: "description",
        content: "Escrow-protected order tracking, delivery OTP, and release.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <OrderDetailPage />
    </RequireAuth>
  ),
});

type OrderRow = {
  id: string;
  buyer_id: string;
  farmer_id: string;
  listing_id: string;
  qty: number;
  total_cents: number;
  subtotal_cents: number;
  platform_fee_cents: number;
  escrow_fee_cents: number;
  status: string;
  created_at: string;
  delivery_deadline: string | null;
};

type ListingRow = { id: string; title: string; unit: string; images: string[] };
type InspectionRow = { auto_release_at: string; released_at: string | null };

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  negotiating: "Negotiating",
  escrow_funded: "Funds in escrow",
  awaiting_delivery: "OTP issued — awaiting delivery",
  shipped: "Shipped",
  delivered: "Delivered",
  inspection: "In inspection window",
  released: "Released to farmer",
  refunded: "Refunded",
  disputed: "Disputed",
  penalized: "Farmer penalized",
  cancelled: "Cancelled",
  paid: "Paid",
};

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [listing, setListing] = useState<ListingRow | null>(null);
  const [inspection, setInspection] = useState<InspectionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // OTP state
  const [codeIssued, setCodeIssued] = useState(false);
  const [otpShown, setOtpShown] = useState<string | null>(null);
  const [smsMasked, setSmsMasked] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const fund = fundEscrowFn;
  const genOtp = generateDeliveryOtpFn;
  const confirmDelivery = confirmDeliveryFn;
  const release = releaseEscrowFn;
  const dispute = raiseDisputeFn;

  const load = async () => {
    setLoading(true);
    const { data: o, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    if (error || !o) {
      toast.error("Order not found");
      setLoading(false);
      return;
    }
    setOrder(o as OrderRow);
    const [{ data: l }, { data: w }] = await Promise.all([
      supabase.from("listings").select("id,title,unit,images").eq("id", o.listing_id).maybeSingle(),
      supabase
        .from("inspection_windows")
        .select("auto_release_at, released_at")
        .eq("order_id", id)
        .maybeSingle(),
    ]);
    if (l) setListing(l as ListingRow);
    if (w) setInspection(w as InspectionRow);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // realtime
    const ch = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const role = useMemo(() => {
    if (!order || !user) return null;
    if (order.buyer_id === user.id) return "buyer" as const;
    if (order.farmer_id === user.id) return "farmer" as const;
    return null;
  }, [order, user]);

  const wrap = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="buyer">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
          Loading order…
        </div>
      </AppShell>
    );
  }
  if (!order) {
    return (
      <AppShell role="buyer">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
          Order not found.
        </div>
      </AppShell>
    );
  }
  if (!role) {
    return (
      <AppShell role="buyer">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
          You don't have access to this order.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role === "farmer" ? "farmer" : "buyer"}>
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <Link
          to={role === "farmer" ? "/dashboard/farmer" : "/dashboard/buyer"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>

        {/* Header */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Order</p>
              <h1 className="font-mono text-lg font-bold sm:text-xl">{order.id.slice(0, 8)}…</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Placed {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>

          {listing && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
              {listing.images?.[0] && (
                <img src={listing.images[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold">{listing.title}</p>
                <p className="text-xs text-muted-foreground">
                  {order.qty} {listing.unit}
                </p>
              </div>
              <div className="text-right text-sm font-bold text-primary">
                {dollars(order.total_cents)}
              </div>
            </div>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right">{dollars(order.subtotal_cents)}</dd>
            <dt className="text-muted-foreground">Platform fee (5%)</dt>
            <dd className="text-right">{dollars(order.platform_fee_cents)}</dd>
            <dt className="text-muted-foreground">Escrow fee (2.5%)</dt>
            <dd className="text-right">{dollars(order.escrow_fee_cents)}</dd>
            <dt className="font-semibold">Total</dt>
            <dd className="text-right font-semibold">{dollars(order.total_cents)}</dd>
          </dl>
        </div>

        {/* Escrow actions */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Escrow protection
            </h2>
          </div>

          {/* BUYER · pending → fund */}
          {role === "buyer" && ["pending", "negotiating"].includes(order.status) && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Move {dollars(order.total_cents)} into escrow. The farmer cannot withdraw funds
                until you confirm delivery — or 48h after delivery if you take no action.
              </p>
              <Button
                disabled={busy}
                onClick={() =>
                  wrap(() => fund({ data: { orderId: order.id } }), "Funds placed in escrow")
                }
                className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                <ShieldCheck className="mr-2 h-4 w-4" /> Fund escrow {dollars(order.total_cents)}
              </Button>
            </div>
          )}

          {/* FARMER · funded → request OTP */}
          {role === "farmer" &&
            ["escrow_funded", "awaiting_delivery", "shipped"].includes(order.status) && (
              <div className="mt-4 space-y-3">
                {!codeIssued ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Generate the 6-digit delivery code. We text it to the buyer, who reads it back
                      to you at handover so you can confirm delivery.
                    </p>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        wrap(async () => {
                          const r = await genOtp({ data: { orderId: order.id } });
                          setCodeIssued(true);
                          setOtpShown(r.otp);
                          setSmsMasked(r.smsDelivered ? r.maskedPhone : null);
                        }, "Delivery code issued")
                      }
                      className="w-full"
                    >
                      <KeyRound className="mr-2 h-4 w-4" /> Generate delivery code
                    </Button>
                  </>
                ) : (
                  <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-center">
                    {smsMasked ? (
                      <>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Delivery code texted to the buyer
                        </p>
                        <div className="my-2 font-mono text-lg font-semibold text-primary">
                          {smsMasked}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Ask the buyer for the code at handover and enter it below.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          SMS unavailable — show this code to the buyer at delivery
                        </p>
                        <div className="my-2 font-mono text-3xl font-bold tracking-[0.4em] text-primary">
                          {otpShown}
                        </div>
                        {otpShown && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(otpShown);
                              toast.success("Copied");
                            }}
                          >
                            <Copy className="mr-1 h-3 w-3" /> Copy
                          </Button>
                        )}
                      </>
                    )}
                    <div className="mt-4">
                      <p className="mb-2 text-xs text-muted-foreground">
                        Enter the code to confirm delivery
                      </p>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otpInput} onChange={setOtpInput}>
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot key={i} index={i} className="h-11 w-11 text-base" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <Button
                        disabled={busy || otpInput.length !== 6}
                        onClick={() =>
                          wrap(
                            () => confirmDelivery({ data: { orderId: order.id, otp: otpInput } }),
                            "Delivery confirmed — inspection window open",
                          )
                        }
                        className="mt-3 w-full"
                      >
                        Confirm delivery
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* BUYER · inspection → accept or dispute */}
          {role === "buyer" && order.status === "inspection" && (
            <div className="mt-4 space-y-3">
              {inspection?.auto_release_at && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                  <Clock className="h-4 w-4" />
                  Funds auto-release {new Date(inspection.auto_release_at).toLocaleString()} if you
                  take no action.
                </div>
              )}
              <Button
                disabled={busy}
                onClick={() =>
                  wrap(() => release({ data: { orderId: order.id } }), "Funds released to farmer")
                }
                className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept & release funds
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => setDisputeOpen(true)}
                className="w-full"
              >
                <AlertTriangle className="mr-2 h-4 w-4" /> Open dispute
              </Button>
            </div>
          )}

          {/* TERMINAL states */}
          {order.status === "released" && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-primary">Funds released</p>
                <p className="text-xs text-muted-foreground">
                  {dollars(order.total_cents)} has been credited to the farmer's wallet.
                </p>
              </div>
            </div>
          )}
          {order.status === "refunded" && (
            <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm">
              Refunded to buyer wallet.
            </div>
          )}
          {order.status === "disputed" && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              Dispute under review by DiGiFaMaR admins.
            </div>
          )}
          {order.status === "penalized" && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
              Farmer ghosted — buyer refunded, penalty applied to escrow.
            </div>
          )}
        </div>

        {/* Chat link */}
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/chat">
              <Package className="mr-1 h-4 w-4" /> Open chat
            </Link>
          </Button>
        </div>
      </div>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open dispute</DialogTitle>
            <DialogDescription>
              Describe what's wrong. An admin will review and decide how the escrowed funds are
              split.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="What was wrong with the delivery? (min 10 characters)"
            rows={5}
          />
          <Input
            placeholder="Optional evidence URL (photo / video)"
            id="evidence"
            className="mt-2"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || disputeReason.trim().length < 10}
              onClick={async () => {
                const ev = (
                  document.getElementById("evidence") as HTMLInputElement | null
                )?.value?.trim();
                await wrap(
                  () =>
                    dispute({
                      data: {
                        orderId: order.id,
                        reason: disputeReason.trim(),
                        evidenceUrls: ev ? [ev] : [],
                      },
                    }),
                  "Dispute filed",
                );
                setDisputeOpen(false);
                setDisputeReason("");
              }}
            >
              File dispute
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
