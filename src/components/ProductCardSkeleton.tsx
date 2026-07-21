import React from "react";

/**
 * Placeholder shimmer card shown while products load from Supabase.
 * Mirrors ProductCard's shape so the grid doesn't shift on load.
 */
export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col h-full bg-cream-100 border border-gold-500/15 rounded-none overflow-hidden animate-pulse">
      {/* image */}
      <div className="aspect-[3/4] bg-gradient-to-br from-cream-200 to-cream-300/60 border-b border-gold-500/15" />
      {/* body */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex justify-between">
          <div className="h-2.5 w-20 bg-cream-300/70 rounded" />
          <div className="h-2.5 w-12 bg-cream-300/70 rounded" />
        </div>
        <div className="h-3.5 w-3/4 bg-cream-300/80 rounded" />
        <div className="h-2.5 w-full bg-cream-200 rounded" />
        <div className="h-2.5 w-5/6 bg-cream-200 rounded" />
        <div className="flex justify-between items-center pt-2.5 border-t border-gold-500/10 mt-1">
          <div className="h-2.5 w-10 bg-cream-300/70 rounded" />
          <div className="h-3.5 w-16 bg-cream-300/80 rounded" />
        </div>
      </div>
    </div>
  );
}
