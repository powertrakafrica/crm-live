"use client";

import { useEffect, useRef } from "react";

import type { Message } from "@/lib/api";
import { subscribeMessagesStream, type MessageStreamEvent } from "@/lib/realtime";

// Subscribe to the singleton message stream + filter to the open thread. The
// `onMessage` callback is captured in a ref so the subscribe effect's deps are
// just `[selectedThreadId]` (no re-subscribe on every parent render). The ref is
// updated in a dedicated effect (the "latest ref" pattern) rather than during
// render, to satisfy `react-hooks/refs`. `onMessage` runs inside the EventSource
// event handler (event-driven), NOT synchronously in an effect body — so
// `react-hooks/set-state-in-effect` is not triggered (refs are not state).
export function useRealtimeThread(
    selectedThreadId: number | null,
    onMessage: (m: Message) => void,
): void {
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    });

    useEffect(() => {
        if (selectedThreadId == null) return; // no thread open — skip
        const handler = (e: MessageStreamEvent) => {
            if (e.threadId === selectedThreadId) onMessageRef.current(e.message);
        };
        return subscribeMessagesStream(handler);
    }, [selectedThreadId]);
}