import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { askAssistantFn } from "@/lib/assistant/assistant.functions";
import type { AssistantMessageDto } from "@/lib/assistant/dto";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Farm Assistant — DiGiFaMaR" },
      {
        name: "description",
        content: "Ask the DiGiFaMaR AI Farm Assistant about crops, pricing, and escrow.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AssistantPage />
    </RequireAuth>
  ),
});

const GREETING =
  "Hi! I'm your DiGiFaMaR Farm Assistant. Ask me about growing your crops, fair pricing " +
  "during a negotiation, how escrow and delivery work, or a quick daily farm hack.";

const SUGGESTIONS = [
  "How does escrow and the delivery code work?",
  "Suggest a fair price range for my produce",
  "What should I plant this season?",
  "Give me a daily farm hack",
] as const;

function AssistantPage() {
  const { role } = useAuth();
  const askAssistant = askAssistantFn;

  const [messages, setMessages] = useState<AssistantMessageDto[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;

    const next: AssistantMessageDto[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { reply } = await askAssistant({ data: { messages: next } });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The assistant failed to respond.");
      // Roll the failed user turn back so they can retry without duplication.
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <AppShell role={role === "farmer" ? "farmer" : "buyer"}>
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col px-4 pt-6 sm:px-6">
        <header className="flex items-center gap-3 pb-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Farm Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by Claude · personalized to you</p>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card/40 p-4"
        >
          <Bubble role="assistant" content={GREETING} />

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking…
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex items-end gap-2 py-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about crops, pricing, or escrow…"
            rows={1}
            className="max-h-40 min-h-11 resize-none"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0"
            disabled={sending || !input.trim()}
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

function Bubble({ role, content }: { role: AssistantMessageDto["role"]; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <span
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          isUser ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background/70 text-foreground"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
