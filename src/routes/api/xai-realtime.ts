import { createFileRoute } from "@tanstack/react-router";

/**
 * WebSocket proxy to xAI Realtime API.
 *
 * Client connects to:  wss://<origin>/api/xai-realtime?agent_id=agent_xxx
 * We forward to:       wss://api.x.ai/v1/realtime?agent_id=agent_xxx
 * with a server-side `Authorization: Bearer <XAI_API_KEY>` header so the key
 * never touches the browser.
 *
 * Implemented for Cloudflare Workers, which is what TanStack Start server
 * routes run on in this project. `WebSocketPair` and `Response` with a
 * `webSocket` init are Cloudflare-specific runtime APIs.
 */

const XAI_REALTIME_URL = "wss://api.x.ai/v1/realtime";

// Restrict which query params we forward upstream. Everything else is dropped.
const ALLOWED_QUERY_PARAMS = new Set(["agent_id", "model", "voice"]);

// Rough guard: only accept realistic agent ids (`agent_` + base62-ish, up to 128 chars).
const AGENT_ID_PATTERN = /^agent_[A-Za-z0-9_-]{1,128}$/;

export const Route = createFileRoute("/api/xai-realtime")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
          return new Response("Expected WebSocket upgrade", { status: 426 });
        }

        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
          return new Response("XAI_API_KEY is not configured", { status: 500 });
        }

        const url = new URL(request.url);
        const agentId = url.searchParams.get("agent_id");
        if (!agentId || !AGENT_ID_PATTERN.test(agentId)) {
          return new Response("Missing or invalid agent_id", { status: 400 });
        }

        // Build upstream URL with a filtered query string.
        const upstreamUrl = new URL(XAI_REALTIME_URL);
        for (const [key, value] of url.searchParams) {
          if (ALLOWED_QUERY_PARAMS.has(key)) upstreamUrl.searchParams.set(key, value);
        }

        // Open the upstream WebSocket. On Cloudflare Workers, an outbound
        // `fetch` with `Upgrade: websocket` returns a `webSocket` on the
        // Response that we can then wire to the client socket.
        let upstreamResp: Response;
        try {
          upstreamResp = await fetch(upstreamUrl.toString(), {
            headers: {
              Upgrade: "websocket",
              Authorization: `Bearer ${apiKey}`,
            },
          });
        } catch (err) {
          console.error("[xai-realtime] upstream connect error", err);
          return new Response("Failed to reach xAI realtime", { status: 502 });
        }

        const upstream = (upstreamResp as unknown as { webSocket: WebSocket | null }).webSocket;
        if (upstreamResp.status !== 101 || !upstream) {
          const body = await upstreamResp.text().catch(() => "");
          console.error("[xai-realtime] upstream refused upgrade", upstreamResp.status, body);
          return new Response(`Upstream refused WebSocket (${upstreamResp.status})`, {
            status: 502,
          });
        }

        // Create the client-facing socket pair.
        const WSPair = (globalThis as unknown as { WebSocketPair: new () => Record<string, WebSocket> })
          .WebSocketPair;
        if (!WSPair) {
          console.error("[xai-realtime] WebSocketPair unavailable in this runtime");
          upstream.close(1011, "server runtime missing WebSocketPair");
          return new Response("WebSocket proxy unsupported in this runtime", { status: 500 });
        }

        const pair = new WSPair();
        const clientSocket = pair[0];
        const serverSocket = pair[1];

        // `accept()` is Cloudflare-specific.
        (serverSocket as unknown as { accept: () => void }).accept();
        (upstream as unknown as { accept: () => void }).accept();

        const closeBoth = (code = 1000, reason = "") => {
          try {
            serverSocket.close(code, reason);
          } catch {
            /* noop */
          }
          try {
            upstream.close(code, reason);
          } catch {
            /* noop */
          }
        };

        // Pipe client -> upstream
        serverSocket.addEventListener("message", (evt: MessageEvent) => {
          try {
            upstream.send(evt.data as string | ArrayBuffer);
          } catch (err) {
            console.error("[xai-realtime] failed forwarding client->upstream", err);
            closeBoth(1011, "forward error");
          }
        });
        serverSocket.addEventListener("close", (evt: CloseEvent) => {
          try {
            upstream.close(evt.code || 1000, evt.reason || "");
          } catch {
            /* noop */
          }
        });
        serverSocket.addEventListener("error", (err) => {
          console.error("[xai-realtime] client socket error", err);
          closeBoth(1011, "client error");
        });

        // Pipe upstream -> client
        upstream.addEventListener("message", (evt: MessageEvent) => {
          try {
            serverSocket.send(evt.data as string | ArrayBuffer);
          } catch (err) {
            console.error("[xai-realtime] failed forwarding upstream->client", err);
            closeBoth(1011, "forward error");
          }
        });
        upstream.addEventListener("close", (evt: CloseEvent) => {
          try {
            serverSocket.close(evt.code || 1000, evt.reason || "");
          } catch {
            /* noop */
          }
        });
        upstream.addEventListener("error", (err) => {
          console.error("[xai-realtime] upstream socket error", err);
          closeBoth(1011, "upstream error");
        });

        return new Response(null, {
          status: 101,
          // `webSocket` is a Cloudflare Workers-specific ResponseInit field.
          webSocket: clientSocket,
        } as ResponseInit & { webSocket: WebSocket });
      },
    },
  },
});
