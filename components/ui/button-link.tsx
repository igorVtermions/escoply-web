import type { AnchorHTMLAttributes, ReactNode } from "react";

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function ButtonLink({ children, className = "", variant = "primary", ...props }: ButtonLinkProps) {
  const variants = {
    primary: "bg-primary text-white shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary-light",
    secondary: "border border-border bg-white text-primary hover:-translate-y-0.5 hover:border-primary/25 hover:bg-surface-muted",
    ghost: "text-ink hover:bg-surface-muted",
  };
  return <a className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition ${variants[variant]} ${className}`} {...props}>{children}</a>;
}
