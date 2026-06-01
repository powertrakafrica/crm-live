import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline" | "verified" | "accent";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
                {
                    "border-transparent bg-slate-900 text-white":
                        variant === "default",
                    "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200":
                        variant === "secondary",
                    "border-transparent bg-red-50 text-red-700 hover:bg-red-100":
                        variant === "destructive",
                    "border-slate-200 bg-white text-slate-700 hover:bg-slate-50":
                        variant === "outline",
                    "border-transparent bg-brand-50 text-brand-700 flex gap-1 items-center":
                        variant === "verified",
                    "border-transparent bg-accent-50 text-accent-700":
                        variant === "accent",
                },
                className
            )}
            {...props}
        />
    );
}

export { Badge };
