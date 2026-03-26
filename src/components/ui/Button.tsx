"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-bg hover:bg-accent/90 active:bg-accent-dim",
  secondary: "bg-surface-light text-text hover:bg-surface-light/80",
  danger: "bg-danger text-white hover:bg-danger/90",
  ghost: "bg-transparent text-text-dim hover:bg-surface-light/50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth = true, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          min-h-[60px] px-6 py-4
          rounded-[var(--radius)]
          font-semibold text-base uppercase tracking-wider
          transition-all duration-100
          active:scale-[0.97]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          ${fullWidth ? "w-full" : ""}
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
