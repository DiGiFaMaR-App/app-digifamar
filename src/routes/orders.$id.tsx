import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Package,
  Truck,
  Home,
  MessageCircle,
  Phone,
  MapPin,
  Send,
  ArrowLeft,
  Clock,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { products, farms, getFarm } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Track Order — DiGiFaMaR" },
      { name: "description", content: "Real-time updates on your farm-fresh delivery." },
    ],
  }),
  component: OrderTracking,
});

type StageKey = "placed" | "confirmed" | "packed" | "shipped" | "out" | "delivered";

const STAGES: { key: StageKey; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "placed", label: "Order placed", icon: CheckCircle2, desc: "Payment confirmed and escrowed." },
  { key: "confirmed", label: "Farmer confirmed", icon: CheckCircle2, desc: "Farmer accepted your order." },
  { key: "packed", label: "Packed fresh", icon: Package, desc: "Harvested and packed this morning." },
  { key: "shipped", label: "Shipped", icon: Truck, desc: "Picked up by our cold-chain courier." },
  { key: "out", label: "Out for delivery", icon: Truck, desc: "Courier is on the way to you." },
  { key: "delivered", label: "Delivered", icon: Home, desc: "Confirm receipt to release escrow." },
];

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function OrderTracking() {
  const { id } = Route.useParams();
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [released, setReleased] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { product, farm, currentStage, etaDate, placedDate, address } = useMemo(() => {
    const seed = hashSeed(id);
    const product = products[seed % products.length];
    const farm = getFarm(product.farmId) ?? farms[0];
    const currentStage = (seed % 5) + 1; // 1..5 (not auto-delivered)
    const placedDate = new Date(Date.now() - (seed % 36) * 3600 * 1000);
    const etaDate = new Date(Date.now() + ((seed % 30) + 6) * 3600 * 1000);
    const address = "245 Cedar Ln, Brooklyn, NY 11215";
    return { product, farm, currentStage, etaDate, placedDate, address };
  }, [id]);

  const progressPct = (currentStage / (STAGES.length - 1)) * 100;
  const codeAvailable = currentStage >= 4; // Out for delivery or later

  const handleReleaseFunds = async () => {
    if (enteredCode.length !== 6) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: enteredCode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Invalid release code", {
          description: "Check the SMS sent to your phone.",
        });
        return;
      }
      setReleased(true);
      toast.success("Funds released to farmer", { description: "Thanks for confirming delivery!" });
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    toast.success(`Message sent to ${farm.name}`, {
      description: "They typically reply within 2 hours.",
    });
    setMessage("");
    setContactOpen(false);
  };

  return (
    <RequireAuth>
    <AppShell role="buyer">
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <Link
          to="/dashboard/buyer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>

        {/* Header card */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Order</p>
              <h1 className="font-mono text-lg font-bold sm:text-xl">{id}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Placed {placedDate.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {STAGES[currentStage].label}
            </span>
          </div>

          {/* ETA */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
            <Clock className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Estimated delivery</p>
              <p className="text-sm font-bold text-primary">
                {etaDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} ·{" "}
                {etaDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Product */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
            <img src={product.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-semibold">{product.name}</p>
              <p className="text-xs text-muted-foreground">{farm.name}</p>
              <p className="mt-0.5 text-sm font-bold text-primary">${product.price.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {address}
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Delivery status</h2>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <ol className="mt-5 space-y-4">
            {STAGES.map((stage, i) => {
              const done = i < currentStage;
              const active = i === currentStage;
              const Icon = stage.icon;
              return (
                <li key={stage.key} className="flex gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : active
                          ? "border-primary bg-primary/10 text-primary animate-pulse"
                          : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-semibold ${
                          done || active ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {stage.label}
                      </p>
                      {active && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          In progress
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{stage.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Contact farmer */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <img src={farm.image} alt="" className="h-12 w-12 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{farm.name}</p>
              <p className="text-xs text-muted-foreground">★ {farm.rating} · {farm.location}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => setContactOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              <MessageCircle className="mr-1 h-4 w-4" /> Message
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("Calling farmer…", { description: "Mock call placed." })}
            >
              <Phone className="mr-1 h-4 w-4" /> Call
            </Button>
          </div>
        </div>

        {/* Escrow release */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Confirm delivery & release escrow
            </h2>
          </div>

          {released ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-primary">Funds released</p>
                <p className="text-xs text-muted-foreground">
                  Payment has been transferred to {farm.name}. Thanks for shopping local!
                </p>
              </div>
            </div>
          ) : codeAvailable ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                We texted a 6-digit code to your phone. Enter it once your order arrives to release
                payment to the farmer.
              </p>
              <div className="mt-4 flex justify-center">
                <InputOTP maxLength={6} value={enteredCode} onChange={setEnteredCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-11 w-11 text-base" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={handleReleaseFunds}
                disabled={enteredCode.length !== 6 || submitting}
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                <KeyRound className="mr-1 h-4 w-4" /> {submitting ? "Releasing…" : "Release funds"}
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Didn't get the code? Check your SMS or contact support.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Your release code will be sent by SMS once the courier is out for delivery.
            </p>
          )}
        </div>



        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline">
            <Link to="/market">Continue shopping</Link>
          </Button>
        </div>
      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Message {farm.name}</DialogTitle>
            <DialogDescription>
              About order <span className="font-mono">{id}</span>
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Hi! Quick question about my order…"
            className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setContactOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              <Send className="mr-1 h-4 w-4" /> Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
    </RequireAuth>
  );
}
