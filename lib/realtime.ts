// Minimal EventSource realtime client for in-app message push. teps-web has no
// realtime infra before this — a single module-level EventSource is shared across
// components (one connection per browser tab). Auth is the HttpOnly cookie; the
// `streamPing` preflight (via fetchJson, which refreshes on 401) runs before opening
// the EventSource so a stale cookie is refreshed first (EventSource itself cannot
// refresh on 401). Cross-origin cookies are already supported by the backend CORS
// config (credentials: true + the Next dev origin allow-listed), the same pattern
// the CRM uses for /api/whatsapp/stream.

import { API_BASE, messageApi, type Message } from "./api";

// The backend SSE wire shape for an in-app message event. teps-web is a separate
// repo and cannot import the backend's RealtimeEvent type, so this is a local
// minimal mirror. The backend MessagePayload is a superset of Message; extra
// fields are harmless under structural typing (the route strips `type` and sends
// `{ message, threadId }` as the SSE `data:` payload).
export type MessageStreamEvent = {
    message: Message;
    threadId: number;
    type: "messages.message.created";
};

type Handler = (e: MessageStreamEvent) => void;

let es: EventSource | null = null;
let opened = false;
const handlers = new Set<Handler>();

function dispatch(event: MessageStreamEvent): void {
    for (const h of handlers) {
        try {
            h(event);
        } catch {
            /* non-fatal: a throwing handler must not break the stream */
        }
    }
}

function attach(): void {
    es = new EventSource(`${API_BASE}/messages/stream`, { withCredentials: true });
    es.addEventListener("messages.message.created", (ev) => {
        try {
            const payload = JSON.parse((ev as MessageEvent).data) as MessageStreamEvent;
            dispatch(payload);
        } catch {
            /* non-fatal: malformed frame */
        }
    });
    es.onerror = () => {
        // EventSource auto-reconnects natively. If the connection is unrecoverable
        // (e.g. auth lost), the next streamPing on a fresh subscribe will re-preflight.
        // Keep the singleton simple for v1 — do not manually close/reopen here.
    };
}

function open(): void {
    if (opened) return;
    opened = true;
    messageApi
        .streamPing()
        .then(() => attach())
        .catch(() => {
            // Ping failed (unauthenticated or network) — don't open the EventSource.
            opened = false;
        });
}

export function subscribeMessagesStream(handler: Handler): () => void {
    handlers.add(handler);
    if (!opened) open();
    return () => {
        handlers.delete(handler);
        // Singleton stays open for the page lifetime (v1). Closing when the last
        // handler unsubscribes is a future refinement.
    };
}