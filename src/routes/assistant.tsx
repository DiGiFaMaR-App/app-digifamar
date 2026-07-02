import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/Cards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { respond, type AssistantResult } from "@/lib/assistant/engine";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — DiGiFaMaR" },
      {
        name: "description",
        content:
          "Ask the DiGiFaMaR assistant to find fresh produce, compare prices, or explain escrow-protected ordering.",
      },
    ],
  }),
  component: AssistantPage,
});

type ChatMessage =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; result: AssistantResult };

function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 0, role: "assistant", result: respond("") },
  ]);
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: nextId.current++, role: "user", text };
    const botMsg: ChatMessage = {
      id: nextId.current++,
      role: "assistant",
      result: respond(text),
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  return (
    <AppShell role="buyer">
      <div className="mx-auto flex max-w-3xl flex-col px-4 pt-6 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">DiGiFaMaR Assistant</h1>
            <p className="text-xs text-muted-foreground">
              Find fresh produce and get answers — instantly.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  {m.text}
                </p>
              </div>
            ) : (
              <AssistantBubble key={m.id} result={m.result} onSuggestion={send} />
            ),
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="sticky bottom-20 z-20 mt-6 flex items-center gap-2 rounded-2xl border border-border bg-background/95 p-2 backdrop-blur md:bottom-4"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for produce, prices, or how it works…"
            aria-label="Message the assistant"
            className="h-11 border-0 bg-transparent focus-visible:ring-0"
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            aria-label="Send"
            disabled={!input.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

function AssistantBubble({
  result,
  onSuggestion,
}: {
  result: AssistantResult;
  onSuggestion: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex max-w-[92%] items-start gap-2">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-2.5 text-sm leading-relaxed">
          {result.reply}
        </p>
      </div>

      {result.products.length > 0 && (
        <div className="grid w-full grid-cols-2 gap-3 pl-9 sm:grid-cols-3">
          {result.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {result.links.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-9">
          {result.links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
            >
              {l.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-9">
          {result.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestion(s)}
              className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
