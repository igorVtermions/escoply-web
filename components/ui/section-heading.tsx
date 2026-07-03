type SectionHeadingProps = { eyebrow?: string; title: string; description?: string; align?: "left" | "center" };

export function SectionHeading({ eyebrow, title, description, align = "center" }: SectionHeadingProps) {
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-secondary-dark">{eyebrow}</p>}
      <h2 className="text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl md:text-5xl">{title}</h2>
      {description && <p className="mt-5 text-base leading-7 text-muted sm:text-lg">{description}</p>}
    </div>
  );
}
