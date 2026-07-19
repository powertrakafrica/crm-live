"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { messageApi, type Message, type Thread } from "@/lib/api";
import { useRealtimeThread } from "@/lib/hooks/useRealtimeThread";

function formatThreadTime(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function OwnerMessages() {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
    const [threadMessages, setThreadMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [composerBody, setComposerBody] = useState("");
    const [sending, setSending] = useState(false);
    const [assistantLoading, setAssistantLoading] = useState(false);

    useEffect(() => {
        setThreadsLoading(true);
        messageApi.threads()
            .then((data) => setThreads(data))
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load messages"))
            .finally(() => setThreadsLoading(false));
    }, []);

    // Live in-app message push (M1): append bot/human messages for the open
    // thread as they arrive over the SSE stream (deduped by id — handleSend
    // already appends the sent message optimistically at line 51).
    useRealtimeThread(selectedThreadId, (m) => {
        setThreadMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });

    const openThread = (threadId: number) => {
        setSelectedThreadId(threadId);
        setMessagesLoading(true);
        messageApi.threadMessages(threadId)
            .then((data) => setThreadMessages(data))
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load thread"))
            .finally(() => setMessagesLoading(false));
    };

    const handleSend = async () => {
        if (!selectedThreadId || !composerBody.trim()) return;
        setSending(true);
        try {
            const sent = await messageApi.send(selectedThreadId, composerBody.trim());
            setThreadMessages((m) => [...m, sent]);
            setComposerBody("");
            messageApi.threads().then((data) => setThreads(data)).catch(() => {});
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Send failed");
        } finally {
            setSending(false);
        }
    };

    const handleMessageAssistant = async () => {
        setAssistantLoading(true);
        setError("");
        try {
            const { threadId } = await messageApi.assistant();
            // Refresh the thread list so the new assistant thread appears, then open it.
            const refreshed = await messageApi.threads();
            setThreads(refreshed);
            openThread(threadId);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to start assistant conversation");
        } finally {
            setAssistantLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Messages</h2>
                <p className="text-slate-500 font-medium mt-1">Chat with clients about your listings.</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm font-medium text-red-700">{error}</div>
            )}

            {!selectedThreadId && (
                <div className="flex justify-end">
                    <Button
                        onClick={handleMessageAssistant}
                        disabled={assistantLoading}
                        className="h-9 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shrink-0 disabled:opacity-50"
                    >
                        {assistantLoading
                            ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                        Message the assistant
                    </Button>
                </div>
            )}

            {selectedThreadId ? (
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h4 className="font-bold text-slate-900 text-sm">
                                {threads.find((t) => t.id === selectedThreadId)?.contactName ?? "Conversation"}
                            </h4>
                            <button
                                onClick={() => { setSelectedThreadId(null); setThreadMessages([]); setComposerBody(""); }}
                                className="text-xs text-slate-500 hover:text-slate-900 font-bold"
                            >
                                Back to list
                            </button>
                        </div>
                        {messagesLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                            </div>
                        ) : threadMessages.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-8">No messages yet. Say hello.</p>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {threadMessages.map((m) => (
                                    <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.fromMe ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                                            {m.body}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <textarea
                                value={composerBody}
                                onChange={(e) => setComposerBody(e.target.value)}
                                rows={2}
                                placeholder="Type a message…"
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!composerBody.trim() || sending}
                                className="h-9 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shrink-0 disabled:opacity-50"
                            >
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : threadsLoading ? (
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                    <span className="ml-2 text-slate-600 font-medium">Loading conversations…</span>
                </div>
            ) : threads.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-medium">No conversations yet.</div>
            ) : (
                <div className="space-y-4">
                    {threads.map((thread) => (
                        <Card key={thread.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white">
                            <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-brand-100 rounded-full flex items-center justify-center shrink-0 border-2 border-brand-200">
                                        <MessageSquare className="h-5 w-5 text-brand-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-bold text-slate-900 text-sm">{thread.contactName}</h4>
                                            <span className="text-xs text-slate-400">{formatThreadTime(thread.lastMessageAt)}</span>
                                        </div>
                                        {thread.propertyTitle && (
                                            <p className="text-xs font-medium text-brand-600 mb-1 truncate">{thread.propertyTitle}</p>
                                        )}
                                        <p className="text-sm text-slate-600 truncate">{thread.lastMessage?.body ?? "No messages yet"}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-100">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 text-xs text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
                                        onClick={() => openThread(thread.id)}
                                    >
                                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Open thread
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
