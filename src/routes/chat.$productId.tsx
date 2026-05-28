import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Send, MapPin, ShieldCheck, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProduct, getFarm } from "@/lib/mock-data";

export const Route = createFileRoute("/chat/$productId")({
  head: () => ({
    meta: [
      { title: "Chat with farmer — DiGiFaMaR" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatRoom,
});

type Message = { type: "system" | "farmer" | "buyer"; text: string };

function ChatRoom() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();

  const product = getProduct(productId);
  const farm = product ? getFarm(product.farmId) : undefined;
  const distance = farm?.distance ?? 0;

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      type: "system",
      text: `Distance: ${distance.toFixed(1)} miles • Fresh harvest`,
    },
    {
      type: "farmer",
      text: product
        ? `Hi! I have ${product.stock} ${product.unit} of ${product.name} ready to ship.`
        : "Hi! Let me know how I can help.",
    },
  ]);
  const [input, setInput] = useState("");
  const [negotiatedPrice, setNegotiatedPrice] = useState(product?.price ?? 0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!product || !farm) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <h1 className="text-xl font-bold">Conversation unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">This product no longer exists.</p>
          <Button asChild className="mt-6"><Link to="/market">Back to market</Link></Button>
        </div>
      </AppShell>
    );
  }

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const next: Message[] = [...messages, { type: "buyer", text }];

    // Lightweight price negotiation: any $number in buyer message updates the offer.
    const priceMatch = text.match(/\$?\s?(\d+(?:\.\d{1,2})?)/);
    if (priceMatch) {
      const offered = parseFloat(priceMatch[1]);
      if (offered > 0 && offered < product.price * 2) {
        setNegotiatedPrice(Number(offered.toFixed(2)));
        next.push({
          type: "farmer",
          text: `I can do $${offered.toFixed(2)} ${product.unit}. Tap "Pay into Escrow" when ready.`,
        });
      }
    }
    setMessages(next);
    setInput("");
  };

  const proceedToEscrow = () => {
    const orderId = `DFM-ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    alert(
      `✅ Payment of $${negotiatedPrice.toFixed(2)} has been placed into Dummy Escrow.\n\nRelease Code: 123456\n\nFarmer will be notified.`,
    );
    setTimeout(() => {
      navigate({
        to: "/payment-success",
        search: { id: product.id, orderId, amount: negotiatedPrice },
      });
    }, 800);
  };

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
          <button
            onClick={() => navigate({ to: "/market" })}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img
            src={farm.image}
            alt={farm.name}
            className="h-11 w-11 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{farm.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {distance.toFixed(1)} miles away
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Escrow protected
          </span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
          {messages.map((msg, i) => {
            if (msg.type === "system") {
              return (
                <div key={i} className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {msg.text}
                </div>
              );
            }
            const mine = msg.type === "buyer";
            return (
              <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground border border-border"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Price + escrow CTA */}
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Negotiated price</p>
              <p className="text-2xl font-extrabold text-primary">
                ${negotiatedPrice.toFixed(2)}
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  / {product.unit}
                </span>
              </p>
            </div>
            <Button
              onClick={proceedToEscrow}
              size="lg"
              className="h-12 rounded-2xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              <ShieldCheck className="mr-1 h-5 w-5" />
              Pay into Escrow
            </Button>
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Negotiate price or ask questions…"
              className="h-12 flex-1 rounded-2xl px-4"
            />
            <Button
              onClick={sendMessage}
              size="icon"
              className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover"
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
