import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "light" | "glass";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-200",
  secondary: "bg-white text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-100 disabled:text-ink-400",
  ghost: "text-ink-700 hover:bg-ink-100 disabled:text-ink-300",
  light: "bg-white text-brand-700 hover:bg-brand-50 disabled:text-brand-200",
  glass: "bg-white/15 text-white hover:bg-white/25 disabled:text-white/50",
  danger: "bg-danger-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return `inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${extra}`;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }>(
  function IconButton({ label, active, className = "", type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        aria-pressed={active}
        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-ink-700 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:bg-transparent ${active ? "bg-brand-50 text-brand-700" : ""} ${className}`}
        {...props}
      />
    );
  },
);
