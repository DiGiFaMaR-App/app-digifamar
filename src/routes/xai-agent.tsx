import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, RotateCcw, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const XAI_AGENT_ID = "agent_YGyHDLhxx5wjz34t";

type ChatStatus = "idle" | "connecting" | "streaming" | "error";
type ConnState = "closed" | "connecting" | "open";

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
  const [connState, setConnState] = useState<ConnState>("closed");

  const wsRef = useRef<WebSocket | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);

  // --- realtime event handling -----------------------------------------

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case "response.created": {
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
      case "response.done":
      case "response.cancelled": {
        activeAssistantIdRef.current = null;
        setStatus("idle");
        break;
      }
      case "error": {
        const msg =
          event.error && typeof event.error === "object" && "message" in event.error
            ? String((event.error as { message?: unknown }).message ?? "Realtime error")
            : "Realtime error";
        toast.error(msg);
        setStatus("error");
        break;
      }
      default:
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) return wsRef.current;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/api/xai-realtime?agent_id=${encodeURIComponent(XAI_AGENT_ID)}`;

    setConnState("connecting");
    setStatus((prev) => (prev === "idle" ? "connecting" : prev));
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnState("open");
      setStatus((prev) => (prev === "connecting" ? "idle" : prev));
    };

    ws.onerror = () => {
      setStatus("error");
      toast.error("Realtime connection error");
    };

    ws.onclose = (evt) => {
      wsRef.current = null;
      activeAssistantIdRef.current = null;
      setConnState("closed");
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
  }, [handleRealtimeEvent]);

  useEffect(() => {
    return () => {
      wsRef.current?.close(1000, "unmount");
      wsRef.current = null;
    };
  }, []);

  // --- send / stop / retry / clear -------------------------------------

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

  const stopStreaming = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type: "response.cancel" }));
    } catch {
      /* noop */
    }
    activeAssistantIdRef.current = null;
    setStatus("idle");
  }, []);

  const lastUserText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].text;
    }
    return "";
  }, [messages]);

  const canRetry = status !== "streaming" && status !== "connecting" && lastUserText.length > 0;

  const retryLastMessage = useCallback(() => {
    if (!lastUserText || status === "streaming") return;
    // Drop the trailing assistant message (if any) so the retry replaces it,
    // but keep the last user turn as-is and re-request a response.
    setMessages((prev) => {
      const trimmed = [...prev];
      while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") {
        trimmed.pop();
      }
      return trimmed;
    });

    const ws = connect();
    const doSend = () => {
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
  }, [connect, lastUserText, status]);

  const clearConversation = useCallback(() => {
    // If a response is in flight, cancel it first.
    if (status === "streaming") {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "response.cancel" }));
        } catch {
          /* noop */
        }
      }
    }
    setMessages([]);
    activeAssistantIdRef.current = null;
    if (status === "streaming") setStatus("idle");
    toast.success("Conversation cleared");
    // Note: local state is reset; the WebSocket stays open. The upstream
    // agent's conversation memory persists until the socket is closed or
    // the user resets the session.
  }, [status]);

  const resetSession = useCallback(() => {
    // Full reset: drop the WebSocket so xAI starts a brand-new session on
    // the next send, and wipe local state.
    wsRef.current?.close(1000, "reset");
    wsRef.current = null;
    activeAssistantIdRef.current = null;
    setMessages([]);
    setStatus("idle");
    setConnState("closed");
    toast.success("Session reset");
  }, []);

  // --- form wiring -----------------------------------------------------

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

  const connLabel =
    connState === "open" ? "Connected" : connState === "connecting" ? "Connecting…" : "Idle";
  const connDot =
    connState === "open"
      ? "bg-emerald-500"
      : connState === "connecting"
        ? "bg-amber-500 animate-pulse"
        : "bg-muted-foreground/50";

  return (
    <AppShell role={shellRole}>
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col px-4 pt-6 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-3 pb-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">xAI Realtime Agent</h1>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`inline-block h-2 w-2 rounded-full ${connDot}`} aria-hidden />
              <span>{connLabel}</span>
              <span aria-hidden>·</span>
              <span>agent {XAI_AGENT_ID}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={retryLastMessage}
              disabled={!canRetry}
              title="Regenerate the last response"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearConversation}
              disabled={messages.length === 0 && status !== "streaming"}
              title="Clear messages (keeps WebSocket open)"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetSession}
              disabled={connState === "closed" && messages.length === 0}
              title="Close and reopen the WebSocket, resetting the agent's memory"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset session
            </Button>
          </div>
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
                <MessageContent>
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
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={submitStatus}
              onStop={stopStreaming}
              disabled={!isBusy && !input.trim()}
            />
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
  | { type: "response.cancelled" }
  | { type: "error"; error?: unknown }
  | { type: string; [key: string]: unknown };
