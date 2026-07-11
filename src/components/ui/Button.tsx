import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          size === "sm" && "h-8 px-3 text-xs",
          size === "md" && "h-9 px-4 text-sm",
          variant === "primary" &&
            "bg-accent text-white hover:bg-accent-hover",
          variant === "secondary" &&
            "bg-surface-elevated text-foreground hover:bg-border border border-border",
          variant === "ghost" &&
            "text-muted hover:text-foreground hover:bg-surface-elevated",
          variant === "danger" &&
            "bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
