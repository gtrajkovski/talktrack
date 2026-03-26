"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface BigTapButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "icon";
  size?: "md" | "lg" | "xl";
}

const variantStyles = {
  primary: "bg-accent text-bg",
  secondary: "bg-surface-light text-text",
  icon: "bg-surface text-text-dim hover:text-text",
};

const sizeStyles = {
  md: "min-h-[52px] min-w-[52px] text-sm",
  lg: "min-h-[60px] min-w-[60px] text-base",
  xl: "min-h-[80px] min-w-[80px] text-lg",
};

export const BigTapButton = forwardRef<HTMLButtonElement, BigTapButtonProps>(
  ({ variant = "secondary", size = "lg", className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          flex items-center justify-center
          px-4
          rounded-[var(--radius-sm)]
          font-semibold uppercase tracking-wide
          transition-all duration-100
          active:scale-[0.97]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          ${sizeStyles[size]}
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

BigTapButton.displayName = "BigTapButton";
