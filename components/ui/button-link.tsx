import type { AnchorHTMLAttributes, ReactNode } from "react";

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function ButtonLink({ children, className = "", variant = "primary", ...props }: ButtonLinkProps) {
  const variants = {
    primary: "button-primary bg-primary text-white shadow-lg shadow-primary/20",
    secondary: "button-secondary border border-border bg-white text-primary",
    ghost: "button-ghost text-ink",
  };
  return (
    <a
      className={`button-interactive inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold ${variants[variant]} ${className}`}
      {...props}
    >
      <span className="button-content inline-flex items-center justify-center gap-[inherit]">{children}</span>
    </a>
  );
}
