import React from "react";
import { Star, Quote } from "lucide-react";

export interface Testimonial {
  quote: string;
  author: string;
  location?: string;
  rating?: number;
}

function renderCard(t: Testimonial, i: number) {
  const rating = t.rating ?? 5;
  return (
    <figure key={i} className="w-[280px] sm:w-[340px] shrink-0 bg-cream-100 border border-gold-500/15 rounded-lg p-6 shadow-sm relative">
      <Quote className="w-7 h-7 text-gold-500/25 absolute top-4 right-4" />
      <div className="flex text-gold-500 mb-3" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-gold-500" />
        ))}
      </div>
      <blockquote className="font-serif text-xs md:text-sm text-espresso/80 leading-relaxed italic mb-4">
        “{t.quote}”
      </blockquote>
      <figcaption className="font-sans font-bold text-[10px] tracking-widest text-maroon-900 uppercase">
        — {t.author}
        {t.location ? <span className="text-espresso/50">, {t.location}</span> : null}
      </figcaption>
    </figure>
  );
}

/**
 * Infinite moving testimonial cards (21st.dev / Aceternity "infinite moving cards"
 * pattern, restyled to the brand). Pauses on hover; respects reduced-motion.
 */
export default function TestimonialsMarquee({ items }: { items?: Testimonial[] }) {
  // Only real, admin-added reviews are shown. Hide the whole section when there
  // are none, rather than displaying placeholder testimonials.
  if (!items || items.length === 0) return null;

  // Repeat the set so the marquee stays visually full even with just a couple
  // of reviews, then duplicate the row for the seamless infinite scroll.
  let base = items;
  while (base.length < 6) base = [...base, ...items];
  const row = [...base, ...base];

  return (
    <section id="reviews-marquee-section" className="py-16 md:py-24 bg-cream-50 overflow-hidden">
      <div className="text-center px-4 mb-12">
        <span className="text-[10px] tracking-[0.25em] text-gold-600 font-bold block uppercase mb-1">
          Words From Our Clients
        </span>
        <h3 className="font-display font-black text-xl md:text-2xl text-maroon-900 tracking-wide uppercase text-gold-shimmer">
          WHAT OUR CUSTOMERS SAY
        </h3>
      </div>

      <div className="relative">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 z-10 bg-gradient-to-r from-cream-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 z-10 bg-gradient-to-l from-cream-50 to-transparent" />

        <div className="marquee-pause flex">
          <div
            className="animate-marquee flex shrink-0 gap-6 pl-6"
            style={{ ["--marquee-duration" as string]: "55s" } as React.CSSProperties}
          >
            {row.map((t, i) => renderCard(t, i))}
          </div>
        </div>
      </div>
    </section>
  );
}
