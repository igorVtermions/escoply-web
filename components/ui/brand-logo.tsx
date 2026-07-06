import Image from "next/image";
import { brand } from "@/constants/brand";

export function BrandLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  if (inverse) {
    return (
      <span className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-white">
        <span className="relative block size-10 overflow-hidden rounded-xl">
          <Image src={brand.iconPath} alt="" width={1254} height={1254} className="absolute -inset-[8%] size-[116%] max-w-none" />
        </span>
        <span className={`brand-logo-name ${compact ? "is-hidden" : ""}`}>{brand.name}</span>
      </span>
    );
  }

  return (
    <span className="relative block h-11 w-40 overflow-hidden" aria-label={brand.name}>
      <Image
        src={brand.logoPath}
        alt="Escoply"
        width={1448}
        height={1086}
        className="absolute -left-4 -top-[2.65rem] h-auto w-44 max-w-none"
        priority
      />
    </span>
  );
}
