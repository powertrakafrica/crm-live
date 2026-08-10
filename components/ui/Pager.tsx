import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";

export interface PagerProps {
    itemNoun: string;
    onPageChange: (page: number) => void;
    page: number;
    total: number;
    totalPages: number;
}

// Shared pager footer for the portal message-thread lists. Matches the
// teps-web button styling. Renders nothing when there is only one page.
export function Pager({ itemNoun, onPageChange, page, total, totalPages }: PagerProps) {
    if (totalPages <= 1) return null;
    const go = (next: number) => onPageChange(Math.min(Math.max(1, next), totalPages));
    return (
        <div className="flex items-center justify-between pt-4">
            <span className="text-sm text-slate-500 font-medium">
                Page {page} of {totalPages} · {total} {itemNoun}
            </span>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => go(page - 1)} disabled={page <= 1}>
                    <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => go(page + 1)} disabled={page >= totalPages}>
                    Next <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}