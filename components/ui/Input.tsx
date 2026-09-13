// components/ui/Input.tsx
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
