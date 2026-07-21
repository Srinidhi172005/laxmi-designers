import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, MessageCircle } from "lucide-react";
import { Product, CartItem } from "../types";

interface ProductDetailModalProps {
  key?: any;
  product: Product | null;
  onClose: () => void;
  onWhatsAppOrder: (product: Product, size?: string, customMeasurements?: CartItem["customMeasurements"]) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onWhatsAppOrder
}: ProductDetailModalProps) {
  if (!product) return null;

  const [activeImage, setActiveImage] = useState(product.primaryImage);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

  // Zoom Logic on hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleWhatsAppOrder = () => {
    onWhatsAppOrder(product);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        id="pdp-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md overflow-y-auto flex items-center justify-center py-6 px-4"
      >
        <motion.div
          id="pdp-container"
          initial={{ y: 50, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 50, scale: 0.95 }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
          className="w-full max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden bg-cream-100 border border-gold-500/40 rounded-none shadow-2xl relative"
        >
          {/* Circular Motif Background Ornamentation */}
          <div className="absolute -top-32 -right-32 w-96 h-96 border border-gold-500/10 rounded-full pointer-events-none" />
          <div className="absolute -top-40 -right-40 w-96 h-96 border-2 border-gold-500/5 rounded-full pointer-events-none" />

          {/* Close Button Header */}
          <div className="sticky top-0 z-20 p-4 md:p-6 border-b border-gold-500/20 flex justify-between items-center bg-maroon-900 text-cream-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-300 animate-pulse" />
              <span className="text-[10px] tracking-[0.25em] font-bold uppercase text-gold-300">
                Laxmi Designers • Product Details
              </span>
            </div>
            <button
              id="pdp-close-btn"
              onClick={onClose}
              className="p-1 rounded-full text-gold-300 hover:text-gold-100 transition-colors"
              aria-label="Close product detail"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 md:p-7">

            {/* LEFT COLUMN: Cinematic Image Gallery with zoom */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              {/* Zoom-on-Hover Frame */}
              <div
                id="pdp-main-image-container"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                className="relative aspect-[3/4] rounded-none overflow-hidden border border-gold-500/20 bg-cream-100/40 cursor-zoom-in"
              >
                <img
                  src={activeImage}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-transform duration-200 ${
                    isZoomed ? "scale-220" : "scale-100"
                  }`}
                  style={
                    isZoomed
                      ? {
                          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        }
                      : undefined
                  }
                />
              </div>

              {/* Thumbnails rail */}
              <div id="pdp-thumbnails" className="flex gap-3 justify-center">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`w-20 h-24 rounded-none border overflow-hidden bg-cream-100/20 transition-all ${
                      activeImage === img ? "border-gold-500 scale-105 shadow" : "border-gold-500/10 hover:border-gold-500/40 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

            </div>

            {/* RIGHT COLUMN: Product Configurator */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              
              {/* Product Info Block */}
              <div className="border-b border-gold-500/10 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] tracking-[0.25em] font-bold uppercase text-gold-600">
                    {product.category}
                  </span>
                </div>

                <h1 className="font-display font-bold text-2xl md:text-3xl text-maroon-900 tracking-wide mb-2 leading-tight text-gold-shimmer">
                  {product.name}
                </h1>
              </div>

              {/* Signature Artisan Note */}
              {product.signatureNote && (
                <div className="p-3.5 bg-maroon-900/5 border-l-4 border-gold-500 rounded-none flex gap-3 items-start shadow-sm">
                  <Sparkles className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] tracking-widest text-gold-600 font-extrabold uppercase block">
                      DESIGNER'S NOTE
                    </span>
                    <p className="text-xs text-maroon-900 leading-relaxed font-serif font-medium">
                      "{product.signatureNote}"
                    </p>
                  </div>
                </div>
              )}

              {/* Product Brief Description */}
              <p className="text-xs md:text-sm text-espresso/80 leading-relaxed font-sans">
                {product.description}
              </p>

              {/* Order via WhatsApp */}
              <div className="border-t border-b border-gold-500/10 py-5">
                <button
                  id="whatsapp-order-cta"
                  onClick={handleWhatsAppOrder}
                  className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe5b] text-white border border-[#25D366] font-bold text-xs tracking-[0.2em] rounded-none flex items-center justify-center gap-2 transition-all active:scale-98 uppercase"
                >
                  <MessageCircle className="w-4.5 h-4.5" />
                  ENQUIRE ON WHATSAPP
                </button>
                <p className="text-[10px] text-espresso/50 text-center mt-2 tracking-wide">
                  Chat with us on WhatsApp to confirm availability and delivery.
                </p>
              </div>

            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
