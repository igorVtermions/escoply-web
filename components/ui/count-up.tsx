"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  prefix?: string;
  minimumIntegerDigits?: number;
  duration?: number;
  delay?: number;
};

export function CountUp({ value, prefix = "", minimumIntegerDigits = 1, duration = 3000, delay = 350 }: CountUpProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let animationFrame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        const startedAt = performance.now();
        const animate = (now: number) => {
          const elapsed = now - startedAt - delay;
          const progress = Math.min(Math.max(elapsed / duration, 0), 1);
          const easedProgress = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          setDisplayValue(Math.round(value * easedProgress));

          if (progress < 1) animationFrame = requestAnimationFrame(animate);
        };

        animationFrame = requestAnimationFrame(animate);
        observer.disconnect();
      },
      { threshold: 0.6 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [delay, duration, value]);

  const formattedValue = new Intl.NumberFormat("pt-BR", {
    minimumIntegerDigits,
    useGrouping: true,
  }).format(displayValue);

  return <span ref={elementRef}>{prefix}{formattedValue}</span>;
}
