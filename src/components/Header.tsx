import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Menu, X, Sparkles, ChevronDown, Trash2, Phone, MessageCircle } from "lucide-react";
import { Product, Category, BoutiqueSettings } from "../types";

interface HeaderProps {
  currentView: string;
  setView: (view: string) => void;
  setConciergeOpen: (open: boolean) => void;
  products: Product[];
  setQuickView: (product: Product) => void;
  onSearchSelect: (product: Product) => void;
  categories?: Category[];
  settings?: BoutiqueSettings;
  announcement?: string;
}

export default function Header({
  currentView,
  setView,
  setConciergeOpen,
  products,
  setQuickView,
  onSearchSelect,
  categories = [],
  settings,
  announcement
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Monitor scrolling to shrink header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock background scroll while the mobile drawer or search overlay is open
  useEffect(() => {
    if (mobileMenuOpen || searchOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [mobileMenuOpen, searchOpen]);

  // Close the search overlay on Escape for keyboard users
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Filter search results dynamically
  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false);
  const [mobileActiveAccordion, setMobileActiveAccordion] = useState<string | null>(null);

  const navLinks = [
    { id: "home", label: "HOME" },
    { id: "shop", label: "COLLECTIONS", hasMega: true },
    { id: "services", label: "SERVICES" },
    { id: "about", label: "ABOUT US" },
    { id: "contact", label: "CONTACT" },
  ];

  const toSubs = (names: string[]) => names.map((n) => ({ id: n.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: n }));
  const categoriesData = categories && categories.length > 0
    ? categories.map((cat) => ({
        id: cat.id,
        title: cat.name.toUpperCase(),
        subcategories: cat.subcategories // { id, name }
      }))
    : [
        { id: "bridal", title: "BRIDAL", subcategories: toSubs(["Blouse Designs", "Maggam Work", "Machine Embroidery", "Saree Draping"]) },
        { id: "dresses", title: "DRESSES", subcategories: toSubs(["Designer Frocks", "Party Wear Frocks", "Long Frocks", "Indo-Western Frocks", "Crop Tops", "Short Tops"]) },
        { id: "traditional", title: "TRADITIONAL", subcategories: toSubs(["Half Sarees", "Langa Jackets", "Anarkalis", "Cut Tops"]) },
        { id: "kids", title: "KIDS", subcategories: toSubs(["Boys Collection", "Girls Collection"]) }
      ];

  // WhatsApp quick-contact link built from store settings
  const waDigits = (settings?.whatsapp_number || settings?.contact_number || "").replace(/\D/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits.length === 10 ? `91${waDigits}` : waDigits}` : "";

  return (
    <>
      {/* Top utility / announcement bar (scrolls away above the sticky header) */}
      <div className="bg-[#120305] text-cream-100 text-[10px] md:text-[11px] tracking-wider border-b border-gold-500/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 min-h-8 py-1.5 sm:py-0 flex flex-wrap items-center justify-center sm:justify-between gap-x-4 gap-y-1 text-center">
          <span className="flex items-center gap-1.5 text-gold-300">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span className="uppercase">{announcement || "Handcrafted in Machilipatnam · Custom orders welcome"}</span>
          </span>
          <div className="flex items-center gap-4">
            {(settings?.contact_number) && (
              <a href={`tel:${settings.contact_number.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
                <Phone className="w-3 h-3 shrink-0" /> {settings.contact_number}
              </a>
            )}
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-gold-300 transition-colors" aria-label="Chat with us on WhatsApp">
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                <span className="uppercase font-semibold">WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Navigation */}
      <header
        id="main-navigation"
        style={{
          backgroundColor: isScrolled ? "rgba(18, 4, 6, 0.98)" : "rgba(24, 5, 8, 0.94)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(212, 175, 55, 0.35)",
          boxShadow: isScrolled ? "0 10px 34px rgba(0, 0, 0, 0.45)" : "0 4px 20px rgba(0, 0, 0, 0.25)",
        }}
        className="sticky top-0 z-40 transition-all duration-500 ease-in-out text-cream-100"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between py-3 md:py-4">
          
          {/* Mobile Menu Trigger */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-gold-300 hover:text-gold-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Desktop Navigation Left Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs tracking-[0.2em] font-medium">
            {navLinks.map((link) => (
              <div key={link.id} className="relative py-2">
                <button
                  id={`nav-link-${link.id}`}
                  onClick={() => {
                    setView(link.id);
                    if (link.id === "shop") {
                      const event = new CustomEvent("setCategoryFilter", { detail: "all" });
                      window.dispatchEvent(event);
                    }
                  }}
                  style={{
                    color: currentView === link.id ? "#F4D06F" : "#EEDFB4",
                  }}
                  className={`flex items-center gap-1 transition-colors duration-200 hover:text-[#FBF3D9] font-semibold text-[13px] tracking-[0.12em] uppercase nav-link-underline cursor-pointer ${currentView === link.id ? "is-active" : ""}`}
                >
                  {link.label}
                </button>
              </div>
            ))}
            
            <button
              id="nav-link-concierge"
              onClick={() => setConciergeOpen(true)}
              className="px-5 py-2.5 bg-gold-500 hover:bg-gold-300 text-maroon-950 text-[12px] tracking-[0.12em] font-bold uppercase rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_2px_14px_rgba(212,175,55,0.4)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Book Now
            </button>
          </nav>

          {/* Luxury Brand Logo — shows the uploaded logo image if set, else the text wordmark */}
          <div
            id="brand-logo-container"
            onClick={() => setView("home")}
            className="text-center cursor-pointer select-none group flex flex-col items-center"
          >
            {settings?.logo ? (
              <img
                src={settings.logo}
                alt={settings?.boutique_name || "Laxmi Designers"}
                className="h-10 md:h-14 w-auto object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.25)]"
              />
            ) : (
              <>
                <h1 className="font-display font-bold text-xl md:text-3xl tracking-[0.22em] text-gold-300 group-hover:text-gold-100 transition-colors text-gold-shimmer nav-logo-glow uppercase">
                  {settings?.boutique_name || "LAXMI DESIGNERS"}
                </h1>
                <span className="text-[9px] md:text-[11px] tracking-[0.4em] text-[#E9D9A8] font-normal block uppercase mt-1 border-t border-gold-500/30 pt-1 px-4">
                  Fashion Studio
                </span>
              </>
            )}
          </div>

          {/* Action Icons Right */}
          <div id="header-actions" className="flex items-center gap-1 md:gap-4">
            
            {/* Search Toggle */}
            <button
              id="action-search-toggle"
              onClick={() => setSearchOpen(true)}
              className="p-2 text-gold-300 hover:text-[#F6E6B3] hover:scale-108 transition-all relative cursor-pointer"
              aria-label="Open search overlay"
            >
              <Search className="w-5 h-5 md:w-5.5 md:h-5.5" />
            </button>

          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="w-[85vw] max-w-[360px] h-full bg-[#1A0508] border-r border-[#D4AF37]/20 flex flex-col justify-between text-cream-100 p-6 shadow-2xl overflow-y-auto relative"
            >
              <div>
                <div className="flex items-center justify-between mb-8 border-b border-[#D4AF37]/10 pb-4">
                  <h2 className="font-display font-bold text-gold-300 text-sm tracking-widest nav-logo-glow uppercase">
                    {settings?.boutique_name || "LAXMI DESIGNERS"}
                  </h2>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-gold-300 hover:text-gold-100 cursor-pointer"
                    aria-label="Close mobile menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex flex-col gap-4 text-xs tracking-[0.25em] font-medium">
                  {navLinks.map((link) => (
                    <div key={link.id} className="flex flex-col">
                      {link.hasMega ? (
                        <>
                          <button
                            onClick={() => setMobileCollectionsOpen(!mobileCollectionsOpen)}
                            className="flex justify-between items-center text-left py-2 border-b border-[#D4AF37]/5 text-cream-100 hover:text-gold-300 cursor-pointer"
                          >
                            <span>{link.label}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileCollectionsOpen ? "rotate-180" : ""}`} />
                          </button>
                          
                          <AnimatePresence>
                            {mobileCollectionsOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="pl-4 flex flex-col gap-3 py-2 bg-[#2A0008]/40 border-l border-[#D4AF37]/20 mt-1"
                              >
                                {categoriesData.map((cat) => (
                                  <div key={cat.id} className="flex flex-col">
                                    <button
                                      onClick={() => setMobileActiveAccordion(mobileActiveAccordion === cat.id ? null : cat.id)}
                                      className="flex justify-between items-center text-left py-1.5 text-[#D7C08A] hover:text-[#F6E6B3] cursor-pointer"
                                    >
                                      <span className="text-[10px] font-bold">{cat.title}</span>
                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileActiveAccordion === cat.id ? "rotate-180" : ""}`} />
                                    </button>
                                    
                                    {mobileActiveAccordion === cat.id && (
                                      <div className="pl-4 flex flex-col gap-1.5 py-1">
                                        <button
                                          onClick={() => {
                                            setView("shop");
                                            window.dispatchEvent(new CustomEvent("setCategoryFilter", { detail: { category: cat.id, subcategory: "all" } }));
                                            setMobileMenuOpen(false);
                                          }}
                                          className="text-left py-1 text-[10px] font-bold text-gold-300 hover:text-white cursor-pointer"
                                        >
                                          All {cat.title}
                                        </button>
                                        {cat.subcategories.map((sub) => (
                                          <button
                                            key={sub.id}
                                            onClick={() => {
                                              setView("shop");
                                              const event = new CustomEvent("setCategoryFilter", { detail: { category: cat.id, subcategory: sub.id } });
                                              window.dispatchEvent(event);
                                              setMobileMenuOpen(false);
                                            }}
                                            className="text-left py-1 text-[10px] text-cream-200/80 hover:text-white cursor-pointer"
                                          >
                                            {sub.name}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setView(link.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`text-left py-2 border-b border-[#D4AF37]/5 transition-colors hover:text-gold-300 cursor-pointer ${
                            currentView === link.id ? "text-gold-300" : "text-cream-100"
                          }`}
                        >
                          {link.label}
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      setConciergeOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="text-left py-2 border-b border-[#D4AF37]/5 text-gold-300 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    CONTACT US
                  </button>
                </nav>
              </div>

              <div className="border-t border-[#D4AF37]/10 pt-6 mt-8">
                <div className="flex flex-col gap-2 text-[10px] tracking-widest text-gold-300/80 mb-4">
                  <span className="block font-bold">BRIDAL APPOINTMENTS</span>
                  <span className="block font-sans text-cream-100/60 font-light">WhatsApp: 9908125039</span>
                  <span className="block font-sans text-cream-100/60 font-light">Insta: @_laxmi_designers_</span>
                </div>
                <div className="w-full text-center py-2 bg-gold-500 text-maroon-900 text-[10px] tracking-[0.2em] font-bold rounded">
                  ESTABLISHED 2015
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instant Search Bar Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            id="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center pt-24 px-4"
          >
            <div className="w-full max-w-3xl flex flex-col gap-4 relative">
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                className="absolute -top-12 right-0 p-2 text-gold-300 hover:text-gold-100 flex items-center gap-1 text-xs tracking-widest"
                aria-label="Close search overlay"
              >
                <X className="w-5 h-5" /> CLOSE
              </button>

              <div className="relative border-b-2 border-gold-500 flex items-center">
                <input
                  type="text"
                  placeholder="SEARCH PRODUCTS..."
                  aria-label="Search products"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent text-cream-100 text-lg md:text-2xl font-serif tracking-widest py-3 focus:outline-none placeholder-gold-700/50 uppercase"
                />
                <Search className="w-6 h-6 text-gold-300 ml-2" />
              </div>

              {/* Instant predictive search results */}
              <div className="max-h-[60vh] overflow-y-auto mt-4 space-y-3 pr-2 scrollbar-style">
                {searchQuery && filteredProducts.length === 0 && (
                  <div className="text-center text-xs tracking-widest text-gold-700 py-12">
                    NO PRODUCTS FOUND FOR "{searchQuery.toUpperCase()}"
                  </div>
                )}
                
                {searchQuery && filteredProducts.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => {
                      onSearchSelect(product);
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    aria-label={`View ${product.name}`}
                    className="w-full text-left p-3 bg-maroon-900/40 border border-gold-500/10 hover:border-gold-300/40 rounded flex gap-4 items-center cursor-pointer hover:bg-maroon-900/60 transition-all group"
                  >
                    <img
                      src={product.primaryImage}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded border border-gold-500/10 group-hover:border-gold-300 transition-colors"
                    />
                    <span className="flex-1 block">
                      <span className="text-[9px] tracking-widest text-gold-300 font-bold uppercase block">{product.category}</span>
                      <span className="font-serif text-cream-100 text-sm font-medium tracking-wide group-hover:text-gold-300 transition-colors block">{product.name}</span>
                    </span>
                    <span className="text-[10px] tracking-widest text-gold-500 font-bold border border-gold-500/20 px-3 py-1.5 rounded uppercase group-hover:bg-gold-500 group-hover:text-maroon-900 transition-all shrink-0">
                      VIEW PRODUCT
                    </span>
                  </button>
                ))}

                {!searchQuery && (
                  <div className="pt-8">
                    <span className="text-[10px] tracking-[0.2em] text-gold-300 block mb-3 font-bold">POPULAR SEARCHES</span>
                    <div className="flex flex-wrap gap-2">
                      {["Bridal Lehenga", "Saree", "Ivory Sherwani", "Banarasi", "Kanjivaram", "Anarkali"].map((term) => (
                        <button
                          key={term}
                          onClick={() => setSearchQuery(term)}
                          className="px-4 py-2 bg-maroon-900/60 hover:bg-maroon-900 text-xs tracking-widest text-cream-100 border border-gold-500/10 hover:border-gold-500/40 rounded transition-all"
                        >
                          {term.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
