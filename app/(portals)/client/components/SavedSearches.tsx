"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clientApi, propertiesApi } from "@/lib/api";

interface SavedSearch {
    alertEnabled: boolean;
    id: number;
    lastNotifiedAt: string | null;
    name: string;
    queryJson: Record<string, string>;
}

interface SavedSearchesProps {
    currentQuery: Record<string, string>;
    onApplyResults: (properties: unknown[]) => void;
}

export function SavedSearches({ currentQuery, onApplyResults }: SavedSearchesProps) {
    const [error, setError] = useState("");
    const [name, setName] = useState("");
    const [searches, setSearches] = useState<SavedSearch[]>([]);

    const load = useCallback(() => {
        clientApi.savedSearches
            .list()
            .then((data) => setSearches((data as SavedSearch[]) ?? []))
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load saved searches"));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const save = async () => {
        if (!name.trim()) return;
        try {
            await clientApi.savedSearches.create({ alertEnabled: true, name: name.trim(), queryJson: currentQuery });
            setName("");
            load();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to save search");
        }
    };

    const toggleAlert = async (s: SavedSearch) => {
        try {
            await clientApi.savedSearches.updateAlert(s.id, !s.alertEnabled);
            load();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to update alert");
        }
    };

    const remove = async (id: number) => {
        try {
            await clientApi.savedSearches.delete(id);
            load();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to delete search");
        }
    };

    const viewMatches = async (s: SavedSearch) => {
        try {
            const data = await propertiesApi.list(s.queryJson);
            onApplyResults(((data as { data?: unknown[] } | null)?.data) ?? []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load matches");
        }
    };

    return (
        <div className="bg-white p-4 rounded-sm shadow-sm border border-charcoal-200 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-heading font-bold text-charcoal-900">Saved Searches</h3>
                <span className="text-xs font-bold text-charcoal-400 uppercase tracking-widest">Alerts</span>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Name this search…"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 bg-charcoal-50 border border-charcoal-200 rounded-sm px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-600"
                />
                <Button onClick={save} className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold">
                    Save
                </Button>
            </div>

            {error && <p className="text-xs font-medium text-red-700">{error}</p>}

            {searches.length === 0 ? (
                <p className="text-sm text-charcoal-500 font-medium">No saved searches yet. Save the current filters to get WhatsApp alerts when new matches list.</p>
            ) : (
                <ul className="divide-y divide-charcoal-50">
                    {searches.map((s) => (
                        <li key={s.id} className="flex items-center justify-between py-3">
                            <div>
                                <p className="text-sm font-bold text-charcoal-900">{s.name}</p>
                                <p className="text-[10px] text-charcoal-400 uppercase tracking-widest">
                                    {s.lastNotifiedAt ? `last checked ${new Date(s.lastNotifiedAt).toLocaleDateString()}` : "not checked yet"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-charcoal-500 hover:text-brand-600 hover:bg-brand-50" onClick={() => viewMatches(s)} title="View matches">
                                    <Search className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-charcoal-500 hover:text-brand-600 hover:bg-brand-50" onClick={() => toggleAlert(s)} title={s.alertEnabled ? "Disable alert" : "Enable alert"}>
                                    {s.alertEnabled ? <Bell className="h-4 w-4 text-brand-600" /> : <BellOff className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-charcoal-500 hover:text-red-600 hover:bg-red-50" onClick={() => remove(s.id)} title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
