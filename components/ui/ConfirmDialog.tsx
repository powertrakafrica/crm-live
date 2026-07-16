"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

// A reusable confirmation dialog for destructive actions. Wraps the generic
// `Modal` with a standard red-warning icon + message + Cancel/Confirm footer,
// so every delete across the app uses one consistent, cancellable prompt
// instead of the native browser `confirm()` (or no prompt at all).
//
// `message` is a ReactNode so callers can inline a <strong> item name.
// `busy` disables both buttons and shows a spinner on Confirm while the
// DELETE request is in flight — prevents a double-submit from firing twice.
export interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    busy?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    destructive = true,
    busy = false,
}: ConfirmDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
            <div className="space-y-6">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-50 rounded-lg shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="text-sm text-slate-600 pt-1">{message}</div>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                    <Button variant="outline" onClick={onClose} disabled={busy}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={destructive ? "danger" : "primary"}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}