import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShoppingCart,
  Minus,
  Plus,
  X,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Your Cart — DiGiFaMaR" }],
  }),
  component: CartPage,
});

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const PLATFORM_FEE_RATE = 0.08;
const ESCROW_FEE_RATE = 0.0325;

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `DFM-${code}`;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6)
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface Address {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

const emptyAddress: Address = {
  fullName: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
};

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────

function CartPage() {
  const { user } = useAuth();
  const { cartItems, cartTotal, cartCount, updateQuantity, removeFromCart, clearCart } =
    useCart();

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [addressErrors, setAddressErrors] = useState<Partial<Address>>({});
  const [orderNumber, setOrderNumber] = useState("");
  const [placing, setPlacing] = useState(false);

  const subtotal = cartTotal;
  const platformFee = subtotal * PLATFORM_FEE_RATE;
  const escrowFee = subtotal * ESCROW_FEE_RATE;
  const total = subtotal + platformFee + escrowFee;

  const setAddr = <K extends keyof Address>(k: K, v: Address[K]) => {
    setAddress((a) => ({ ...a, [k]: v }));
    setAddressErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validateAddress = (): boolean => {
    const errs: Partial<Address> = {};
    if (!address.fullName.trim()) errs.fullName = "Required";
    if (!address.street.trim()) errs.street = "Required";
    if (!address.city.trim()) errs.city = "Required";
    if (!address.state) errs.state = "Required";
    if (!/^\d{5}(-\d{4})?$/.test(address.zip)) errs.zip = "Enter a valid ZIP";
    if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(address.phone))
      errs.phone = "Enter a valid US phone";
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinueToPayment = () => {
    if (!validateAddress()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setStep(2);
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const num = generateOrderNumber();
      const sb = supabase as any;
      await sb.from("orders").insert({
        buyer_id: user?.id ?? null,
        items: JSON.stringify(cartItems),
        subtotal,
        platform_fee: platformFee,
        escrow_fee: escrowFee,
        total,
        delivery_address: JSON.stringify(address),
        status: "payment_pending",
      });
      clearCart();
      setOrderNumber(num);
      setStep(3);
    } catch {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-[#060F06] text-[#F0FFF0]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

          {/* Step indicator (shown on steps 1-3) */}
          {step > 0 && step < 3 && (
            <CheckoutStepBar current={step} />
          )}

          {/* ── Step 0: Cart ── */}
          {step === 0 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <ShoppingCart className="h-6 w-6 text-[#4ADE80]" />
                <h1 className="text-2xl font-extrabold">
                  Your Cart
                  {cartCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-[#7AAB7A]">
                      ({cartCount} item{cartCount !== 1 ? "s" : ""})
                    </span>
                  )}
                </h1>
              </div>

              {cartItems.length === 0 ? (
                <EmptyCart />
              ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                  {/* Item list */}
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-4 rounded-2xl border border-[#1E3A1E] bg-[#132013] p-4"
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#1E3A1E]">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-[#7AAB7A]" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#F0FFF0] truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-[#7AAB7A]">
                            {item.farmName}
                          </p>
                          <p className="text-sm text-[#4ADE80] font-semibold mt-0.5">
                            ${item.price.toFixed(2)}/{item.unit}
                          </p>
                        </div>

                        {/* Quantity stepper */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            className="w-7 h-7 rounded-lg border border-[#1E3A1E] bg-[#060F06] flex items-center justify-center text-[#7AAB7A] hover:text-[#4ADE80] hover:border-[#4ADE80] transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-[#F0FFF0]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            className="w-7 h-7 rounded-lg border border-[#1E3A1E] bg-[#060F06] flex items-center justify-center text-[#7AAB7A] hover:text-[#4ADE80] hover:border-[#4ADE80] transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Line total */}
                        <p className="w-16 text-right text-sm font-bold text-[#F0FFF0] shrink-0">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>

                        {/* Remove */}
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="ml-1 text-[#7AAB7A] hover:text-red-400 transition-colors"
                          aria-label="Remove item"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Order summary */}
                  <OrderSummaryCard
                    subtotal={subtotal}
                    platformFee={platformFee}
                    escrowFee={escrowFee}
                    total={total}
                    onProceed={() => setStep(1)}
                  />
                </div>
              )}
            </>
          )}

          {/* ── Step 1: Delivery ── */}
          {step === 1 && (
            <div className="max-w-lg mx-auto">
              <button
                onClick={() => setStep(0)}
                className="inline-flex items-center gap-1.5 text-xs text-[#7AAB7A] hover:text-[#4ADE80] mb-6"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to cart
              </button>
              <h2 className="text-xl font-extrabold mb-6">Delivery Address</h2>

              <div className="space-y-4">
                <FormField label="Full Name" error={addressErrors.fullName}>
                  <Input
                    value={address.fullName}
                    onChange={(e) => setAddr("fullName", e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    className={inputCls}
                  />
                </FormField>

                <FormField label="Street Address" error={addressErrors.street}>
                  <Input
                    value={address.street}
                    onChange={(e) => setAddr("street", e.target.value)}
                    placeholder="123 Main St, Apt 4"
                    autoComplete="street-address"
                    className={inputCls}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="City" error={addressErrors.city}>
                    <Input
                      value={address.city}
                      onChange={(e) => setAddr("city", e.target.value)}
                      placeholder="Chicago"
                      autoComplete="address-level2"
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="State" error={addressErrors.state}>
                    <Select
                      value={address.state}
                      onValueChange={(v) => setAddr("state", v)}
                    >
                      <SelectTrigger className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] focus:ring-[#4ADE80]/20">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 bg-[#132013] border-[#1E3A1E]">
                        {US_STATES.map((s) => (
                          <SelectItem
                            key={s.code}
                            value={s.code}
                            className="text-[#F0FFF0] focus:bg-[#1E3A1E] focus:text-[#F0FFF0]"
                          >
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="ZIP Code" error={addressErrors.zip}>
                    <Input
                      value={address.zip}
                      onChange={(e) => setAddr("zip", e.target.value)}
                      placeholder="60601"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      maxLength={10}
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="Phone" error={addressErrors.phone}>
                    <Input
                      type="tel"
                      value={address.phone}
                      onChange={(e) =>
                        setAddr("phone", formatPhone(e.target.value))
                      }
                      placeholder="(555) 123-4567"
                      autoComplete="tel"
                      inputMode="numeric"
                      maxLength={14}
                      className={inputCls}
                    />
                  </FormField>
                </div>
              </div>

              <Button
                onClick={handleContinueToPayment}
                className="w-full mt-8 h-12 bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold rounded-2xl"
              >
                Continue to Payment
              </Button>
            </div>
          )}

          {/* ── Step 2: Payment ── */}
          {step === 2 && (
            <div className="max-w-lg mx-auto">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-xs text-[#7AAB7A] hover:text-[#4ADE80] mb-6"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to delivery
              </button>
              <h2 className="text-xl font-extrabold mb-6">Payment</h2>

              {/* Order summary recap */}
              <div className="rounded-2xl border border-[#1E3A1E] bg-[#132013] p-4 mb-4 space-y-2 text-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-[#7AAB7A] mb-3">
                  Order Summary
                </p>
                {cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between text-[#F0FFF0]"
                  >
                    <span className="truncate max-w-[200px]">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-[#1E3A1E] my-2 pt-2 space-y-1">
                  <div className="flex justify-between text-[#7AAB7A]">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#7AAB7A]">
                    <span>DiGiFaMaR fee 8%</span>
                    <span>${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#7AAB7A]">
                    <span>Escrow.com fee 3.25%</span>
                    <span>${escrowFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#F0FFF0] pt-1 border-t border-[#1E3A1E]">
                    <span>Total</span>
                    <span className="text-[#4ADE80]">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment card placeholder */}
              <div className="rounded-2xl border border-[#4ADE80]/20 bg-[#132013] p-6 mb-6 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-[#4ADE80] mb-3" />
                <p className="font-semibold text-[#F0FFF0] mb-1">
                  Payments processed securely via Escrow.com
                </p>
                <p className="text-xs text-[#7AAB7A]">
                  Your payment is held in escrow until you confirm delivery.
                  Full refund guaranteed within 72 hours if anything's wrong.
                </p>
                <div className="mt-4 rounded-xl border border-[#1E3A1E] bg-[#060F06] px-4 py-3 text-left text-xs text-[#7AAB7A]">
                  Card details collected by Escrow.com at secure checkout
                </div>
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="w-full h-12 bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold rounded-2xl disabled:opacity-50"
              >
                {placing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Place Order & Escrow Funds"
                )}
              </Button>
            </div>
          )}

          {/* ── Step 3: Confirmation ── */}
          {step === 3 && (
            <div className="max-w-md mx-auto text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[#4ADE80]/15 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-[#4ADE80]" />
              </div>

              <h1 className="text-2xl font-extrabold mb-2 text-[#F0FFF0]">
                Order Confirmed!
              </h1>
              <p className="text-[#7AAB7A] text-sm mb-1">Order number</p>
              <p className="text-2xl font-mono font-bold text-[#4ADE80] mb-6">
                {orderNumber}
              </p>

              <div className="rounded-2xl border border-[#4ADE80]/20 bg-[#132013] p-5 text-left mb-8">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#4ADE80] shrink-0 mt-0.5" />
                  <p className="text-sm text-[#F0FFF0] leading-relaxed">
                    Your 6-digit escrow code will be sent to your phone when
                    the farmer ships your order. Use it to confirm delivery and
                    release payment to the farmer.
                  </p>
                </div>
              </div>

              <Link to="/dashboard/buyer">
                <Button className="w-full h-12 bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold rounded-2xl">
                  Track Order
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────
// EMPTY CART
// ─────────────────────────────────────────────────────────────────

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-[#132013] border border-[#1E3A1E] flex items-center justify-center mb-5">
        <ShoppingCart className="h-9 w-9 text-[#7AAB7A]" />
      </div>
      <h2 className="text-xl font-bold text-[#F0FFF0] mb-2">
        Your cart is empty
      </h2>
      <p className="text-sm text-[#7AAB7A] mb-6">
        Add items from the marketplace to get started.
      </p>
      <Link to="/market">
        <Button className="bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold px-6">
          Browse Marketplace
        </Button>
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ORDER SUMMARY CARD
// ─────────────────────────────────────────────────────────────────

function OrderSummaryCard({
  subtotal,
  platformFee,
  escrowFee,
  total,
  onProceed,
}: {
  subtotal: number;
  platformFee: number;
  escrowFee: number;
  total: number;
  onProceed: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#1E3A1E] bg-[#132013] p-5 h-fit lg:sticky lg:top-20">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#7AAB7A] mb-4">
        Order Summary
      </h3>

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between text-[#7AAB7A]">
          <span>Subtotal</span>
          <span className="text-[#F0FFF0]">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[#7AAB7A]">
          <span>DiGiFaMaR fee 8%</span>
          <span className="text-[#F0FFF0]">${platformFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[#7AAB7A]">
          <span>Escrow.com fee 3.25%</span>
          <span className="text-[#F0FFF0]">${escrowFee.toFixed(2)}</span>
        </div>
        <div className="border-t border-[#1E3A1E] pt-2.5 flex justify-between font-bold">
          <span className="text-[#F0FFF0]">Total</span>
          <span className="text-[#4ADE80] text-lg">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Escrow trust note */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#4ADE80]/20 bg-[#4ADE80]/5 p-3">
        <ShieldCheck className="h-4 w-4 text-[#4ADE80] shrink-0 mt-0.5" />
        <p className="text-xs text-[#7AAB7A] leading-relaxed">
          Your payment is held safely in escrow until you confirm delivery.
        </p>
      </div>

      <Button
        onClick={onProceed}
        className="w-full mt-5 h-12 bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold rounded-2xl"
      >
        Proceed to Checkout
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CHECKOUT STEP BAR
// ─────────────────────────────────────────────────────────────────

function CheckoutStepBar({ current }: { current: number }) {
  const steps = ["Delivery", "Payment", "Confirmed"];
  return (
    <div className="max-w-lg mx-auto mb-8">
      <div className="flex items-center">
        {steps.map((label, i) => {
          const idx = i + 1;
          const done = current > idx;
          const active = current === idx;
          return (
            <div
              key={label}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    done
                      ? "bg-[#4ADE80] text-black"
                      : active
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/40"
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx}
                </div>
                <span
                  className={`mt-1 text-[10px] whitespace-nowrap ${
                    active
                      ? "text-[#F0FFF0]"
                      : done
                        ? "text-[#4ADE80]"
                        : "text-[#7AAB7A]/50"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="flex-1 h-px mx-2 mb-4 transition-all"
                  style={{
                    background: done
                      ? "#4ADE80"
                      : "rgba(255,255,255,0.1)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────

const inputCls =
  "bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] placeholder:text-[#7AAB7A]/50 focus:border-[#4ADE80]";

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#7AAB7A] uppercase tracking-wide">
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs font-medium text-red-400">{error}</p>
      )}
    </div>
  );
}
