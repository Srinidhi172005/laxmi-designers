import React from "react";
import { Sparkles } from "lucide-react";

const SPECIALTIES = [
  "Bridal Wear",
  "Maggam Work",
  "Blouse Stitching",
  "Designer Frocks",
  "Half Sarees",
  "Anarkalis",
  "Machine Embroidery",
  "Saree Draping",
  "Kids Wear",
  "Custom Tailoring"
];

/**
 * Slow, gold-accented infinite ribbon of the studio's specialties.
 * The list is rendered twice inside one track; translating the track by -50%
 * makes the loop seamless. Pauses on hover; respects reduced-motion.
 */
export default function SpecialtiesMarquee({ items: source }: { items?: string[] } = {}) {
  const base = source && source.length ? source : SPECIALTIES;
  const items = [...base, ...base];
  return (
    <section
      aria-label="Our specialties"
      className="relative bg-maroon-950 border-y-2 border-gold-500/30 py-5 overflow-hidden select-none"
    >
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 z-10 bg-gradient-to-r from-maroon-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 z-10 bg-gradient-to-l from-maroon-950 to-transparent" />

      <div className="marquee-pause flex">
        <div
          className="animate-marquee flex shrink-0 items-center whitespace-nowrap"
          style={{ ["--marquee-duration" as string]: "42s" } as React.CSSProperties}
        >
          {items.map((label, i) => (
            <span
              key={i}
              className="flex items-center gap-6 md:gap-8 pl-6 md:pl-8 font-display uppercase tracking-[0.28em] text-sm md:text-base text-gold-300"
            >
              {label}
              <Sparkles className="w-3.5 h-3.5 text-gold-500 shrink-0" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
