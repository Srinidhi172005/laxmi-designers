import React, { useState } from "react";
import { motion } from "motion/react";
import { MessageCircle, Eye } from "lucide-react";
import { Product } from "../types";

interface ProductCardProps {
  key?: any;
  product: Product;
  onViewDetails: (product: Product) => void;
  onQuickView: (product: Product) => void;
  onWhatsAppOrder: (product: Product) => void;
}

export default function ProductCard({
  product,
  onViewDetails,
  onQuickView,
  onWhatsAppOrder
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      id={`product-card-${product.id}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="group flex flex-col h-full bg-cream-100 border border-gold-500/15 hover:border-gold-500/40 rounded-none overflow-hidden shadow-sm hover:shadow-md transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Frame */}
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-200/40 cursor-pointer border-b border-gold-500/15">
        
        {/* Luxury Gold Border Inset Motif */}
        <div className="absolute inset-3 border border-gold-500/25 pointer-events-none z-10 transition-transform duration-500 group-hover:scale-105" />

        {/* Category Badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start">
          <span className="bg-maroon-700/90 text-gold-300 text-[8px] md:text-[9px] tracking-[0.25em] font-medium px-2.5 py-1 uppercase border border-gold-500/20 backdrop-blur-xs">
            {product.category}
          </span>
        </div>

        {/* Cinematic Imagery Frame */}
        <button
          type="button"
          onClick={() => onViewDetails(product)}
          aria-label={`View details for ${product.name}`}
          className="block w-full h-full relative cursor-pointer"
        >
          <img
            src={product.primaryImage}
            alt={`${product.name} primary`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out ${
              isHovered ? "opacity-0 scale-105 blur-sm" : "opacity-100 scale-100 blur-0"
            }`}
            loading="lazy"
          />
          <img
            src={product.secondaryImage}
            alt={`${product.name} secondary view`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out ${
              isHovered ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-95 blur-sm"
            }`}
            loading="lazy"
          />
        </button>

        {/* Low Stock Warning */}
        {product.stockCount <= 3 && product.inStock && (
          <div className="absolute bottom-3 left-3 z-10 bg-maroon-800 text-gold-300 text-[8px] tracking-[0.15em] font-semibold px-2 py-1 rounded">
            ONLY {product.stockCount} LEFT IN STOCK
          </div>
        )}

        {/* Hover-Reveal Action Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 z-10 bg-gradient-to-t from-maroon-950/80 to-transparent translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-between gap-2">
          <button
            id={`quick-view-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="flex-1 py-2 px-3 bg-cream-100/10 hover:bg-cream-100 text-gold-300 hover:text-maroon-900 border border-gold-500/30 hover:border-gold-300 text-[10px] tracking-widest font-semibold rounded flex items-center justify-center gap-1.5 transition-all uppercase"
          >
            <Eye className="w-3.5 h-3.5" /> Quick View
          </button>
          
          <button
            id={`whatsapp-order-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onWhatsAppOrder(product);
            }}
            className="flex-1 py-2 px-3 bg-[#25D366] hover:bg-[#1ebe5b] text-white border border-[#25D366] text-[10px] tracking-widest font-bold rounded flex items-center justify-center gap-1.5 transition-all uppercase"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Product Metadata Area */}
      <div className="p-4 flex flex-col flex-1 justify-between bg-cream-100">

        {/* Title */}
        <h3 className="font-serif text-sm md:text-base text-maroon-900 tracking-wide font-semibold line-clamp-1 mb-1">
          <button
            type="button"
            onClick={() => onViewDetails(product)}
            className="text-left w-full hover:text-gold-600 transition-colors cursor-pointer line-clamp-1"
          >
            {product.name}
          </button>
        </h3>

        {/* Subtle Description */}
        <p className="text-[10px] md:text-xs text-espresso/70 tracking-wide line-clamp-2 leading-relaxed">
          {product.description}
        </p>
      </div>
    </motion.div>
  );
}
