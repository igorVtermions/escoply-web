type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  inverse?: boolean;
};

export function SectionHeading({ eyebrow, title, description, align = "center", inverse = false }: SectionHeadingProps) {
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className={`mb-3 text-sm font-bold uppercase tracking-[0.16em] ${inverse ? "text-secondary-light" : "text-secondary-dark"}`}>{eyebrow}</p>}
      <h2 className={`text-3xl font-bold tracking-[-0.035em] sm:text-4xl md:text-5xl ${inverse ? "text-white" : "text-ink"}`}>{title}</h2>
      {description && <p className={`mt-5 text-base leading-7 sm:text-lg ${inverse ? "text-blue-100" : "text-muted"}`}>{description}</p>}
    </div>
  );
}
