"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";

// ============================================================
// BUTTON SYSTEM
// ============================================================

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline" | "icon";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, iconRight, children, disabled, ...props }, ref) => {
    const variantClasses: Record<ButtonVariant, string> = {
      primary: [
        "bg-electric-500 hover:bg-electric-600 text-white",
        "shadow-glow-blue hover:shadow-[0_0_30px_rgba(43,142,247,0.4)]",
        "border border-electric-400/30",
      ].join(" "),
      secondary: [
        "bg-navy-700/60 hover:bg-navy-600/60 text-navy-100",
        "border border-navy-500/30 hover:border-electric-500/30",
        "backdrop-blur-sm",
      ].join(" "),
      danger: [
        "bg-crimson-500 hover:bg-crimson-600 text-white",
        "shadow-glow-red border border-crimson-400/30",
      ].join(" "),
      ghost: [
        "bg-transparent hover:bg-navy-700/40 text-navy-200 hover:text-navy-50",
        "border border-transparent hover:border-navy-600/30",
      ].join(" "),
      outline: [
        "bg-transparent hover:bg-electric-500/10 text-electric-400",
        "border border-electric-500/30 hover:border-electric-500/60",
      ].join(" "),
      icon: [
        "bg-navy-700/40 hover:bg-navy-600/60 text-navy-300 hover:text-navy-50",
        "border border-navy-600/20 hover:border-electric-500/25",
        "!p-0 aspect-square",
      ].join(" "),
    };

    const sizeClasses: Record<ButtonSize, string> = {
      xs: "h-7 px-2.5 text-xs gap-1.5 rounded-lg",
      sm: "h-8 px-3 text-xs gap-1.5 rounded-xl",
      md: "h-9 px-4 text-sm gap-2 rounded-xl",
      lg: "h-11 px-6 text-sm gap-2 rounded-2xl",
    };

    const iconSizeClasses: Record<ButtonSize, string> = {
      xs: "h-7 w-7 rounded-lg",
      sm: "h-8 w-8 rounded-xl",
      md: "h-9 w-9 rounded-xl",
      lg: "h-11 w-11 rounded-2xl",
    };

    return (
      // @ts-expect-error React 19 types conflict with framer-motion
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        className={cn(
          "inline-flex items-center justify-center font-medium",
          "transition-all duration-200 ease-smooth",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-navy-900",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          "select-none",
          variantClasses[variant],
          variant === "icon" ? iconSizeClasses[size] : sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <>
            {icon && <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
            {variant !== "icon" && children}
            {iconRight && <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{iconRight}</span>}
            {variant === "icon" && children}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

// ============================================================
// INPUT SYSTEM
// ============================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, iconRight, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-navy-300">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 group-focus-within:text-electric-400 transition-colors [&>svg]:w-4 [&>svg]:h-4">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-9 px-3 text-sm",
              "bg-navy-800/60 backdrop-blur-sm",
              "border border-navy-600/30",
              "rounded-xl text-navy-100 placeholder-navy-500",
              "transition-all duration-200 ease-smooth",
              "focus:outline-none focus:border-electric-500/60 focus:ring-2 focus:ring-electric-500/15 focus:bg-navy-800/80",
              "hover:border-navy-500/50",
              icon && "pl-9",
              iconRight && "pr-9",
              error && "border-crimson-500/40 focus:border-crimson-500/60",
              className
            )}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 group-focus-within:text-electric-400 transition-colors [&>svg]:w-4 [&>svg]:h-4">
              {iconRight}
            </div>
          )}
          {/* Focus glow line */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-electric-500 rounded-full transition-all duration-300 w-0 group-focus-within:w-4/5 opacity-80" />
        </div>
        {error && <p className="text-xs text-crimson-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

// ============================================================
// SELECT
// ============================================================

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && <label htmlFor={selectId} className="block text-xs font-medium text-navy-300">{label}</label>}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full h-9 px-3 text-sm",
            "bg-navy-800/60 backdrop-blur-sm",
            "border border-navy-600/30 rounded-xl",
            "text-navy-100",
            "transition-all duration-200 focus:outline-none focus:border-electric-500/60 focus:ring-2 focus:ring-electric-500/15",
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-navy-800 text-navy-100">
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";

// ============================================================
// DIVIDER
// ============================================================

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-gradient-to-r from-transparent via-navy-600/40 to-transparent", className)} />;
}

// ============================================================
// TOOLTIP (simple CSS)
// ============================================================

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative group/tooltip inline-flex">
      {children}
      <div className={cn(
        "absolute z-50 px-2 py-1 text-xs text-navy-100 bg-navy-800 border border-navy-600/40 rounded-lg",
        "whitespace-nowrap pointer-events-none",
        "opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150",
        "shadow-lg",
        sideClasses[side]
      )}>
        {content}
      </div>
    </div>
  );
}
