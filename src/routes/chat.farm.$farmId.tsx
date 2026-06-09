import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  Send,
  ShieldCheck,
  Truck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getFarm, getProduct } from "@/lib/mock-data";
import { haversineDistance, useGeolocation } from "@/hooks/use-geolocation";

// ─────────────────────────────────────────────────────────────────
// ROUTE
// ─────────────────────────────────────────────────────────────────

const searchSchema = z.object({
  productId: z.string().optional(),
  qty: z.coerce.number().int().min(1).max(999).optional(),
});

export const Route = createFileRoute("/chat/farm/$farmId")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Chat with farmer — DiGiFaMaR" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FarmChatPage,
});

// ─────────────────────────────────────────────────────────────────
// LOCAL STORAGE STORE (demo / Phase 1 only)
// ─────────────────────────────────────────────────────────────────

type Role = "buyer" | "farmer";

interface ChatMsg {
  id: string;
  role: Role;
  text: string;
  ts: number;
  /** "prefill" for the auto product/qty card, otherwise plain text */
  kind?: "prefill" | "text" | "system";
  meta?: { productId?: string; qty?: number; productName?: string; unitPrice?: number };
}

type EscrowStatus = "none" | "held";

interface EscrowState {
  status: EscrowStatus;
  orderId: string;
  total: number;
  method: "card" | "bank";
  otp: string; // visible to buyer only
  paidAt: number;
}

const storageKey = (farmId: string, productId?: string) =>
  `digifamar.chat.${farmId}.${productId ?? "general"}`;
const escrowKey = (farmId: string, productId?: string) =>
  `digifamar.escrow.${farmId}.${productId ?? "general"}`;

function loadMessages(farmId: string, productId?: string): ChatMsg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(farmId, productId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMsg[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(farmId: string, productId: string | undefined, msgs: ChatMsg[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(farmId, productId), JSON.stringify(msgs));
  } catch {
    /* quota or private mode — ignore */
  }
}

function loadEscrow(farmId: string, productId?: string): EscrowState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(escrowKey(farmId, productId));
    return raw ? (JSON.parse(raw) as EscrowState) : null;
  } catch {
    return null;
  }
}

function saveEscrow(farmId: string, productId: string | undefined, e: EscrowState | null) {
  if (typeof window === "undefined") return;
  try {
    if (e) window.localStorage.setItem(escrowKey(farmId, productId), JSON.stringify(e));
    else window.localStorage.removeItem(escrowKey(farmId, productId));
  } catch {
    /* ignore */
  }
}

function generateOtp(): string {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return String(buf[0] % 1_000_000).padStart(6, "0");
  }
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

// ─────────────────────────────────────────────────────────────────
// FEE CALC
// ─────────────────────────────────────────────────────────────────

const DELIVERY_RATE_PER_MILE = 1.5;
const DELIVERY_MIN = 5;
const DELIVERY_BASE = 2.99;

function computeDelivery(distanceMi: number | null) {
  if (distanceMi == null || !Number.isFinite(distanceMi))
    return { distance: null as number | null, fee: DELIVERY_MIN };
  const fee = Math.max(DELIVERY_MIN, DELIVERY_BASE + distanceMi * DELIVERY_RATE_PER_MILE);
  return { distance: distanceMi, fee: Math.round(fee * 100) / 100 };
}

// ─────────────────────────────────────────────────────────────────
// FORMAT
// ─────────────────────────────────────────────────────────────────

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

function FarmChatPage() {
  const { farmId } = Route.useParams();
  const { productId, qty } = Route.useSearch();
  

  const farm = getFarm(farmId);
  const product = productId ? getProduct(productId) : undefined;
  const quantity = qty ?? 1;

  const geo = useGeolocation();
  const [messages, setMessages] = useState<ChatMsg[]>(() =>
    loadMessages(farmId, productId),
  );
  const [input, setInput] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [showAccept, setShowAccept] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [escrow, setEscrow] = useState<EscrowState | null>(() =>
    loadEscrow(farmId, productId),
  );
  const [showPay, setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "bank">("card");
  const [paying, setPaying] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill the very first message when a product context is present
  useEffect(() => {
    if (!farm) return;
    if (messages.length > 0) return;
    const seed: ChatMsg[] = [];
    if (product) {
      seed.push({
        id: `prefill-${Date.now()}`,
        role: "buyer",
        kind: "prefill",
        text: `Hi! I'd like to buy ${quantity} × ${product.name} at $${product.price.toFixed(
          2,
        )}/${product.unit}. Can we agree on a price?`,
        ts: Date.now(),
        meta: {
          productId: product.id,
          qty: quantity,
          productName: product.name,
          unitPrice: product.price,
        },
      });
      seed.push({
        id: `farmer-greeting-${Date.now() + 1}`,
        role: "farmer",
        kind: "text",
        text: `Hi! Thanks for reaching out about the ${product.name}. ${quantity} ${product.unit}${quantity > 1 ? "s" : ""} is no problem — happy to discuss price.`,
        ts: Date.now() + 1,
      });
    } else {
      seed.push({
        id: `greeting-${Date.now()}`,
        role: "farmer",
        kind: "text",
        text: `Hi! Welcome to ${farm.name}. How can I help you today?`,
        ts: Date.now(),
      });
    }
    setMessages(seed);
    saveMessages(farmId, productId, seed);
  }, [farm, product, quantity, farmId, productId, messages.length]);

  // Persist whenever messages change
  useEffect(() => {
    saveMessages(farmId, productId, messages);
  }, [messages, farmId, productId]);

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Keep input focused
  useEffect(() => {
    inputRef.current?.focus();
  }, [role]);

  const distanceMi = useMemo(() => {
    if (!farm || geo.lat == null || geo.lng == null) return null;
    return haversineDistance(geo.lat, geo.lng, farm.lat, farm.lng);
  }, [farm, geo.lat, geo.lng]);

  const subtotal = product ? product.price * quantity : 0;
  const delivery = computeDelivery(distanceMi);
  const total = subtotal + delivery.fee;

  if (!farm) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">
          Farm not found.{" "}
          <Link to="/browse" className="text-primary underline">
            Browse farms
          </Link>
        </div>
      </AppShell>
    );
  }

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}`, role, text, ts: Date.now(), kind: "text" },
    ]);
    setInput("");
    inputRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const quickReplies =
    role === "buyer"
      ? [
          "Could you do a small discount for this quantity?",
          "What's your earliest delivery?",
          "Is this freshly harvested?",
        ]
      : [
          `I can do $${product ? (product.price * 0.95).toFixed(2) : "—"}/${product?.unit ?? "unit"} for that quantity.`,
          "Fresh-picked this morning — ready to ship.",
          "Sure, that works. Lock it in?",
        ];

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-2xl flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur shrink-0">
            <Link
              to="/farm/$id"
              params={{ id: farm.id }}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Back to farm"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {initials(farm.name)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate flex items-center gap-1">
                {farm.name}
                {farm.verified && (
                  <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {farm.location}
              </span>
            </div>

            {/* Role toggle so you can demo both sides */}
            <button
              onClick={() => setRole((r) => (r === "buyer" ? "farmer" : "buyer"))}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/50 transition-colors"
              title="Switch view (demo)"
            >
              <UserCog className="h-3.5 w-3.5" />
              {role === "buyer" ? "You: Buyer" : "You: Farmer"}
            </button>
          </div>

          {/* Order context strip */}
          {product && (
            <div className="shrink-0 border-b border-border bg-leaf-soft/40 px-4 py-2.5 flex items-center gap-3">
              <img
                src={product.image}
                alt=""
                className="h-10 w-10 rounded-md object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Negotiating</p>
                <p className="text-sm font-semibold truncate">
                  {quantity} × {product.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    · ${product.price.toFixed(2)}/{product.unit}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wide">
                  Subtotal
                </p>
                <p className="text-sm font-bold text-primary">
                  ${subtotal.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m) => {
              const mine = m.role === role;
              if (m.kind === "prefill" && m.meta?.productName) {
                return (
                  <div key={m.id} className="flex justify-center">
                    <div className="max-w-[85%] rounded-2xl border border-primary/30 bg-primary/5 p-3 text-center">
                      <p className="text-[11px] uppercase tracking-wide text-primary font-bold mb-1">
                        Product inquiry
                      </p>
                      <p className="text-sm">
                        <strong>{m.meta.qty} × {m.meta.productName}</strong>
                        {m.meta.unitPrice != null && (
                          <span className="text-muted-foreground">
                            {" "}· ${m.meta.unitPrice.toFixed(2)} ea
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{m.text}</p>
                    </div>
                  </div>
                );
              }
              if (m.kind === "system") {
                return (
                  <div key={m.id} className="flex justify-center">
                    <div className="max-w-[90%] rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-center text-xs text-primary font-medium">
                      {m.text}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="mt-0.5 text-[10px] text-muted-foreground px-1">
                    {m.role === "farmer" ? farm.name.split(" ")[0] : "You"} ·{" "}
                    {formatTime(m.ts)}
                  </span>
                </div>
              );
            })}
          </div>


          {/* Quick replies */}
          <div className="shrink-0 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
            {quickReplies.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Accept price bar (buyer only) */}
          {role === "buyer" && product && !accepted && (
            <div className="shrink-0 border-t border-border bg-card px-4 py-3">
              <Button
                onClick={() => setShowAccept(true)}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Accept Price · ${subtotal.toFixed(2)}
              </Button>
            </div>
          )}

          {/* Escrow status banner — visible to both roles once funds are held */}
          {escrow?.status === "held" && (
            <div className="shrink-0 border-t border-primary/30 bg-primary/10 px-4 py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Lock className="h-4 w-4" />
                  Funds Secured in Escrow
                  <span className="text-xs text-muted-foreground font-normal">
                    · ${escrow.total.toFixed(2)} · {escrow.method === "card" ? "Card" : "Bank transfer"}
                  </span>
                </div>
                {role === "buyer" && (
                  <button
                    onClick={() => setShowOtp((v) => !v)}
                    className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-background px-3 py-1 text-xs font-mono font-bold text-primary hover:bg-primary/5"
                    aria-label={showOtp ? "Hide release code" : "Reveal release code"}
                  >
                    {showOtp ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showOtp ? escrow.otp : "•• •• ••"}
                  </button>
                )}
              </div>
              {role === "buyer" && showOtp && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Share this 6-digit code with the farmer ONLY when your order is delivered. This releases the funds.
                </p>
              )}
            </div>
          )}

          {/* Pay into escrow CTA (buyer only, post price-accept, pre-payment) */}
          {role === "buyer" && accepted && !escrow && (
            <div className="shrink-0 border-t border-border bg-card px-4 py-3">
              <Button
                onClick={() => setShowPay(true)}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
              >
                <Lock className="h-4 w-4 mr-2" />
                Pay into Escrow · ${total.toFixed(2)}
              </Button>
              <p className="mt-1.5 text-[11px] text-center text-muted-foreground">
                Funds are held safely until you confirm delivery.
              </p>
            </div>
          )}

          {/* Input bar */}
          <div className="shrink-0 border-t border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={`Message as ${role}…`}
                className="flex-1 h-11 rounded-2xl"
              />
              <Button
                onClick={send}
                disabled={!input.trim()}
                size="icon"
                className="h-11 w-11 rounded-2xl"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Accept Price → distance + delivery + total sheet */}
      <Sheet open={showAccept} onOpenChange={setShowAccept}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Confirm order total
            </SheetTitle>
            <SheetDescription>
              Delivery fee is calculated from your current location to the farm.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            {/* Distance card */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Truck className="h-4 w-4 text-primary" />
                Delivery distance
              </div>
              {geo.loading && (
                <p className="text-sm text-muted-foreground">
                  Detecting your location…
                </p>
              )}
              {!geo.loading && distanceMi != null && (
                <p className="text-sm">
                  <strong>{distanceMi.toFixed(1)} mi</strong>
                  <span className="text-muted-foreground">
                    {" "}from {farm.location} to you
                  </span>
                </p>
              )}
              {!geo.loading && distanceMi == null && (
                <p className="text-sm text-muted-foreground">
                  Couldn't detect your location — using minimum delivery fee.
                </p>
              )}
            </div>

            {/* Line items */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
              {product && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {quantity} × {product.name}
                  </span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Delivery
                  {distanceMi != null && (
                    <span className="text-xs">
                      {" "}({distanceMi.toFixed(1)} mi × ${DELIVERY_RATE_PER_MILE}/mi)
                    </span>
                  )}
                </span>
                <span>${delivery.fee.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Next: escrow payment + 6-digit release code (coming in Phase 2).
            </p>
          </div>

          <SheetFooter className="mt-5 flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAccept(false)}
              className="flex-1"
            >
              Keep negotiating
            </Button>
            <Button
              onClick={() => {
                setAccepted(true);
                setShowAccept(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `system-${Date.now()}`,
                    role: "buyer",
                    kind: "system",
                    text: `✓ Price accepted. Order total: $${total.toFixed(2)} (${distanceMi != null ? `${distanceMi.toFixed(1)} mi delivery` : "min delivery"}).`,
                    ts: Date.now(),
                  },
                ]);
              }}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              Accept · ${total.toFixed(2)}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Pay into Escrow sheet */}
      <Sheet open={showPay} onOpenChange={(o) => !paying && setShowPay(o)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Escrow payment
            </SheetTitle>
            <SheetDescription>
              Choose a payment method. Funds are held by DiGiFaMaR until you confirm delivery.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayMethod("card")}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  payMethod === "card"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <CreditCard className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm font-semibold">Pay with Card</p>
                <p className="text-[11px] text-muted-foreground">Visa, Mastercard, Verve</p>
              </button>
              <button
                type="button"
                onClick={() => setPayMethod("bank")}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  payMethod === "bank"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <Building2 className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm font-semibold">Bank Transfer</p>
                <p className="text-[11px] text-muted-foreground">Direct bank deposit</p>
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span>${delivery.fee.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 mt-1 flex justify-between font-bold text-base">
                <span>Held in escrow</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[11px] text-center text-muted-foreground">
              A 6-digit release code will be sent to your phone after payment. Demo only — no real charge.
            </p>
          </div>

          <SheetFooter className="mt-5 flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPay(false)}
              disabled={paying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              disabled={paying}
              onClick={async () => {
                setPaying(true);
                await new Promise((r) => setTimeout(r, 1200));
                const otp = generateOtp();
                const orderId = `DFM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
                const next: EscrowState = {
                  status: "held",
                  orderId,
                  total,
                  method: payMethod,
                  otp,
                  paidAt: Date.now(),
                };
                setEscrow(next);
                saveEscrow(farmId, productId, next);
                const now = Date.now();
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `sys-paid-${now}`,
                    role: "buyer",
                    kind: "system",
                    text: `🔒 Payment has been received into escrow ($${total.toFixed(2)}). Waiting for farmer to start delivery.`,
                    ts: now,
                  },
                  {
                    id: `sys-farmer-${now + 1}`,
                    role: "farmer",
                    kind: "system",
                    text: `💰 Payment received into escrow. Ready to start delivery. Order #${orderId}.`,
                    ts: now + 1,
                  },
                ]);
                setPaying(false);
                setShowPay(false);
                setShowOtp(true);
                toast.success("Payment held in escrow", {
                  description: `SMS sent to your phone with release code ${otp}.`,
                });
              }}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing…
                </>
              ) : (
                <>Pay ${total.toFixed(2)}</>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </AppShell>
  );
}
