"use client";

import { cn } from "@/lib/utils";
import React from "react";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    {
                        /* Primary */
                        "bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-md":
                            variant === "primary",
                        /* Secondary */
                        "bg-white text-brand-700 border border-brand-200 hover:bg-brand-50 hover:border-brand-300 shadow-sm":
                            variant === "secondary",
                        /* Outline */
                        "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300":
                            variant === "outline",
                        /* Ghost */
                        "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900":
                            variant === "ghost",
                        /* Danger */
                        "bg-red-600 text-white hover:bg-red-700 shadow-sm":
                            variant === "danger",
                        /* Sizes */
                        "h-9 px-4 text-sm": size === "sm",
                        "h-10 px-5 text-sm": size === "md",
                        "h-12 px-8 text-base": size === "lg",
                        "h-10 w-10 p-0": size === "icon",
                    },
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
