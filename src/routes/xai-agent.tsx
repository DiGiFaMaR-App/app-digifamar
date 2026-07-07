import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useAuth } from "@/hooks/use-auth";

const XAI_AGENT_ID = "agent_YGyHDLhxx5wjz34t";

type ChatStatus = "idle" | "connecting" | "streaming" | "error";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export const Route = createFileRoute("/xai-agent")({
  head: () => ({
    meta: [
      { title: "xAI Realtime Agent — DiGiFaMaR" },
      {
        name: "description",
        content:
          "Chat with the xAI realtime agent. Streams responses live from Grok via a secure server proxy.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: XaiAgentPage,
});

function XaiAgentPage() {
  const { role } = useAuth();
  const shellRole = role === "farmer" ? "farmer" : "buyer";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");

  const wsRef = useRef<WebSocket | null>(null);
  // Tracks which assistant message id is currently receiving deltas.
  const activeAssistantIdRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current) return wsRef.current;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/api/xai-realtime?agent_id=${encodeURIComponent(XAI_AGENT_ID)}`;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("idle");
    };

    ws.onerror = () => {
      setStatus("error");
      toast.error("Realtime connection error");
    };

    ws.onclose = (evt) => {
      wsRef.current = null;
      activeAssistantIdRef.current = null;
      setStatus((prev) => (prev === "streaming" ? "error" : "idle"));
      if (evt.code !== 1000 && evt.code !== 1005) {
        toast.error(`Connection closed (${evt.code})${evt.reason ? `: ${evt.reason}` : ""}`);
      }
    };

    ws.onmessage = (evt) => {
      let event: RealtimeEvent | null = null;
      try {
        event = JSON.parse(typeof evt.data === "string" ? evt.data : "") as RealtimeEvent;
      } catch {
        return;
      }
      handleRealtimeEvent(event);
    };

    return ws;
  }, []);

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case "response.created": {
        // Start a fresh assistant bubble for this response.
        const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        activeAssistantIdRef.current = id;
        setMessages((prev) => [...prev, { id, role: "assistant", text: "" }]);
        setStatus("streaming");
        break;
      }
      case "response.output_text.delta":
      case "response.output_audio_transcript.delta": {
        const delta = typeof event.delta === "string" ? event.delta : "";
        if (!delta) return;
        const id = activeAssistantIdRef.current;
        if (!id) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)),
        );
        break;
      }
      case "response.completed":
      case "response.done": {
        activeAssistantIdRef.current = null;
        setStatus("idle");
        break;
      }
      case "error": {
        const msg =
          (event.error && typeof event.error === "object" && "message" in event.error
            ? String((event.error as { message?: unknown }).message ?? "Realtime error")
            : "Realtime error");
        toast.error(msg);
        setStatus("error");
        break;
      }
      default:
        break;
    }
  }, []);

  // Tear down the socket on unmount.
  useEffect(() => {
    return () => {
      wsRef.current?.close(1000, "unmount");
      wsRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const ws = connect();
      const userMsg: ChatMessage = {
        id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: "user",
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      const doSend = () => {
        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: trimmed }],
            },
          }),
        );
        ws.send(JSON.stringify({ type: "response.create" }));
        setStatus("streaming");
      };

      if (ws.readyState === WebSocket.OPEN) {
        doSend();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener("open", doSend, { once: true });
      } else {
        toast.error("Connection is closed. Please try again.");
        setStatus("error");
      }
    },
    [connect],
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      sendMessage(message.text ?? "");
    },
    [sendMessage],
  );

  const isBusy = status === "connecting" || status === "streaming";

  const submitStatus = useMemo<"submitted" | "streaming" | "error" | "ready">(() => {
    if (status === "connecting") return "submitted";
    if (status === "streaming") return "streaming";
    if (status === "error") return "error";
    return "ready";
  }, [status]);

  return (
    <AppShell role={shellRole}>
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col px-4 pt-6 sm:px-6">
        <header className="pb-4">
          <h1 className="text-lg font-semibold leading-tight">xAI Realtime Agent</h1>
          <p className="text-xs text-muted-foreground">
            Streaming via secure server proxy · agent {XAI_AGENT_ID}
          </p>
        </header>

        <Conversation className="flex-1 rounded-2xl border border-border bg-card/40">
          <ConversationContent>
            {messages.length === 0 && (
              <ConversationEmptyState
                title="Say hello to the xAI agent"
                description="Type a message below to start a live streaming conversation."
              />
            )}

            {messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent variant={m.role === "assistant" ? "flat" : "contained"}>
                  {m.role === "assistant" ? (
                    <MessageResponse>{m.text || " "}</MessageResponse>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.text}</span>
                  )}
                </MessageContent>
              </Message>
            ))}

            {status === "streaming" && !activeAssistantIdRef.current && (
              <Shimmer>Thinking…</Shimmer>
            )}
            {status === "connecting" && <Shimmer>Connecting…</Shimmer>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-3">
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the xAI agent anything…"
            disabled={false}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={submitStatus} disabled={!input.trim() || isBusy} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </AppShell>
  );
}

// --- xAI realtime event shape (partial) ---
type RealtimeEvent =
  | { type: "response.created" }
  | { type: "response.output_text.delta"; delta: string }
  | { type: "response.output_audio_transcript.delta"; delta: string }
  | { type: "response.completed" }
  | { type: "response.done" }
  | { type: "error"; error?: unknown }
  | { type: string; [key: string]: unknown };
