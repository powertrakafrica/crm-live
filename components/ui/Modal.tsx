"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
    showClose?: boolean;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-md", showClose = true }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} flex flex-col max-h-[90vh] overflow-hidden animate-scale-in border border-slate-100`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    {showClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
                <div className="p-5 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
