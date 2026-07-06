import { useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCircle2,
  KeyRound,
  Lock,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { getFarm, type Product } from "@/lib/mock-data";

type Step = "details" | "held" | "delivery" | "release" | "success";
const MOCK_CODE = "123456";

export function ProductSheet({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { add } = useCart();
  const [active, setActive] = useState(0);
  const [step, setStep] = useState<Step>("details");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const farm = product ? getFarm(product.farmId) : null;

  // Reset state whenever the sheet opens for a different product
  useEffect(() => {
    if (!open) {
      // Small delay so the closing animation doesn't flash to step 1
      const t = setTimeout(() => {
        setStep("details");
        setCode("");
        setError(null);
        setActive(0);
        setAdded(false);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-advance "held" → "delivery" to simulate the farmer shipping out
  useEffect(() => {
    if (step !== "held") return;
    const t = setTimeout(() => setStep("delivery"), 2200);
    return () => clearTimeout(t);
  }, [step]);

  // Revert the "Added" confirmation label after a short delay (cleaned up on unmount/change)
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(t);
  }, [added]);

  if (!product) return null;
  const gallery = [product.image, farm?.image, product.image].filter(Boolean) as string[];
  const orderId = "DFM-" + (product.id.slice(0, 4) + "K2X").toUpperCase().slice(0, 6);

  const handleAddToCart = () => {
    if (!product) return;
    add({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      unit: product.unit,
      image: product.image,
      farmId: product.farmId,
    });
    setAdded(true);
    toast.success(`${product.name} added to cart`);
  };

  const handleRelease = () => {
    if (code === MOCK_CODE) {
      setError(null);
      setStep("success");
      toast.success("Funds released to farmer");
    } else {
      setError("That code doesn't match. Try 123456.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] overflow-y-auto border-t border-border bg-background p-0 sm:rounded-t-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {step === "details" ? "Product details" : "Escrow checkout"}
          </span>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 sm:px-6">
          {step === "details" && (
            <>
              {/* Gallery */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <img
                  src={gallery[active]}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                />
              </div>
              {gallery.length > 1 && (
                <div className="mt-2 flex gap-2">
                  {gallery.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={`h-14 w-14 overflow-hidden rounded-lg border-2 transition ${
                        i === active
                          ? "border-primary"
                          : "border-border opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {product.delivery === "24h" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                    <Sparkles className="h-3 w-3" /> Fresh today
                  </span>
                )}
                {product.organic && (
                  <span className="rounded-full bg-badge-organic px-2.5 py-0.5 text-[11px] font-bold text-badge-organic-foreground">
                    Organic
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Freshness {product.freshnessScore}/10 · Grade {product.freshnessGrade}
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{product.name}</h2>
              {product.variety && (
                <p className="text-sm text-muted-foreground">{product.variety}</p>
              )}

              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-primary">${product.price.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">/ {product.unit}</p>
                <p className="ml-auto flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-badge-gold text-badge-gold" /> {product.rating}
                  <span className="text-muted-foreground">({product.reviews})</span>
                </p>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{product.description}</p>

              {farm && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
                  <img
                    src={farm.image}
                    alt={farm.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-sm font-semibold">
                      <BadgeCheck className="h-4 w-4 text-primary" /> {farm.name}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {farm.location} · {farm.distance.toFixed(1)} mi
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">★ {farm.rating}</span>
                </div>
              )}

              <EscrowInfo product={product} />

              <div className="mt-5 flex gap-2">
                <Button
                  size="lg"
                  onClick={() => setStep("held")}
                  className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
                >
                  <Lock className="mr-1 h-4 w-4" /> Buy now · ${product.price.toFixed(2)}
                </Button>
                <Button size="lg" variant="outline" className="h-12" onClick={handleAddToCart}>
                  {added ? (
                    <>
                      <CheckCircle2 className="mr-1 h-5 w-5" /> Added
                    </>
                  ) : (
                    "Add to cart"
                  )}
                </Button>
              </div>

              <TrustBadges />
            </>
          )}

          {step !== "details" && <FlowProgress step={step} />}

          {step === "held" && (
            <div className="mt-2 text-center">
              <div className="relative mx-auto inline-flex">
                <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-primary/30 blur-2xl" />
                <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Lock className="h-12 w-12" />
                </div>
              </div>
              <h2 className="mt-5 text-2xl font-extrabold">Payment held in escrow</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your ${product.price.toFixed(2)} is safely locked. The farmer is being notified to
                ship your order.
              </p>
              <SummaryCard orderId={orderId} product={product} status="Awaiting ship-out" />
              <TrustBadges />
            </div>
          )}

          {step === "delivery" && (
            <div className="mt-2 text-center">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Truck className="h-12 w-12" />
              </div>
              <h2 className="mt-5 text-2xl font-extrabold">Out for delivery</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your courier just dropped off the package. Simulate confirming delivery to unlock
                your release code.
              </p>
              <SummaryCard orderId={orderId} product={product} status="At your door" />
              <Button
                size="lg"
                onClick={() => {
                  toast.success("Delivery confirmed. Release code generated.");
                  setStep("release");
                }}
                className="mt-5 h-12 w-full bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                <Package className="mr-1 h-4 w-4" /> Simulate delivery confirmation
              </Button>
              <TrustBadges />
            </div>
          )}

          {step === "release" && (
            <div className="mt-2">
              <div className="text-center">
                <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <KeyRound className="h-12 w-12" />
                </div>
                <h2 className="mt-5 text-2xl font-extrabold">Enter 6-digit release code</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a release code to your phone. Enter it to release escrow to the farmer.
                </p>
              </div>

              <div className="mt-5 flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    setError(null);
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                For this demo, the code is{" "}
                <button
                  type="button"
                  onClick={() => setCode(MOCK_CODE)}
                  className="font-mono font-bold text-primary underline-offset-2 hover:underline"
                >
                  {MOCK_CODE}
                </button>
              </p>
              {error && (
                <p className="mt-2 text-center text-xs font-semibold text-destructive">{error}</p>
              )}

              <Button
                size="lg"
                disabled={code.length !== 6}
                onClick={handleRelease}
                className="mt-5 h-12 w-full bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                <KeyRound className="mr-1 h-4 w-4" /> Release ${product.price.toFixed(2)} to farmer
              </Button>

              <button
                onClick={() => setStep("delivery")}
                className="mt-2 block w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>

              <TrustBadges />
            </div>
          )}

          {step === "success" && (
            <div className="mt-2 text-center">
              <div className="relative inline-flex">
                <div className="absolute inset-0 -z-10 rounded-full bg-primary/40 blur-2xl" />
                <div className="animate-success-pop inline-flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_60px_-10px_color-mix(in_oklab,var(--primary)_70%,transparent)]">
                  <CheckCircle2 className="h-16 w-16" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="mt-5 text-2xl font-extrabold">Funds released — thank you!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                ${product.price.toFixed(2)} just landed with{" "}
                <span className="font-semibold text-foreground">{farm?.name ?? "the farmer"}</span>.
                A receipt is in your inbox.
              </p>
              <SummaryCard orderId={orderId} product={product} status="Completed" />
              <div className="mt-5 flex flex-col gap-2">
                <Button
                  size="lg"
                  onClick={() => {
                    onOpenChange(false);
                    navigate({ to: "/dashboard/buyer" });
                  }}
                  className="h-12 bg-primary text-primary-foreground hover:bg-primary-hover"
                >
                  View my orders
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-12"
                >
                  Continue shopping
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EscrowInfo({ product }: { product: Product }) {
  return (
    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary">
        <ShieldCheck className="h-4 w-4" /> Escrow-protected checkout
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Your payment is held until you confirm delivery with a 6-digit code. Full refund within 72
        hours if anything's off.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Lock className="h-3 w-3 text-primary" /> Stripe-secured
        </span>
        <span className="inline-flex items-center gap-1">
          <Truck className="h-3 w-3 text-primary" />{" "}
          {product.delivery === "24h" ? "24-hour" : "48-hour"} delivery
        </span>
      </div>
    </div>
  );
}

function TrustBadges() {
  const items = [
    { icon: Lock, label: "256-bit SSL" },
    { icon: ShieldCheck, label: "Escrow protected" },
    { icon: BadgeCheck, label: "Verified farm" },
    { icon: Truck, label: "72h refund" },
  ];
  return (
    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-[11px] font-semibold text-muted-foreground"
        >
          <it.icon className="h-3.5 w-3.5 text-primary" /> {it.label}
        </div>
      ))}
    </div>
  );
}

function SummaryCard({
  orderId,
  product,
  status,
}: {
  orderId: string;
  product: Product;
  status: string;
}) {
  return (
    <div className="mt-5 rounded-xl border border-border bg-card/60 p-4 text-left text-sm">
      <Row k="Order ID" v={orderId} mono />
      <Row k="Item" v={`${product.name} · $${product.price.toFixed(2)}`} />
      <Row k="Status" v={<span className="text-primary">{status}</span>} />
    </div>
  );
}

function Row({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-semibold ${mono ? "font-mono text-xs" : ""}`}>{v}</span>
    </div>
  );
}

function FlowProgress({ step }: { step: Step }) {
  const stages: { key: Step; label: string }[] = [
    { key: "held", label: "Escrow" },
    { key: "delivery", label: "Delivery" },
    { key: "release", label: "Release" },
    { key: "success", label: "Done" },
  ];
  const idx = stages.findIndex((s) => s.key === step);
  return (
    <div className="mb-6 flex items-center gap-1.5">
      {stages.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center gap-1.5">
          <div
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= idx ? "bg-primary" : "bg-border"
            }`}
          />
        </div>
      ))}
    </div>
  );
}
