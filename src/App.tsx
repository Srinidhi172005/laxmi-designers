import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Mail,
  ArrowRight,
  BookOpen,
  User,
  Star,
  Plus,
  Trash2,
  Lock,
  ChevronRight,
  ShieldCheck,
  Instagram,
  Facebook,
  Filter,
  MessageCircle
} from "lucide-react";

import { Product, CartItem, ConciergeBooking, OrderDetails, BookingStatus } from "./types";
import { SAMPLE_PRODUCTS } from "./data";
import { formatDateDDMonYYYY } from "./utils/date";
import { safeHttpUrl } from "./utils/safeUrl";
import { SiteContent, SITE_CONTENT_DEFAULTS, mergeSiteContent } from "./siteContent";
import Header from "./components/Header";
import ProductCard from "./components/ProductCard";
import ProductDetailModal from "./components/ProductDetailModal";
import ConciergeModal from "./components/ConciergeModal";
import SpecialtiesMarquee from "./components/SpecialtiesMarquee";
import TestimonialsMarquee from "./components/TestimonialsMarquee";
import ProductCardSkeleton from "./components/ProductCardSkeleton";
const AdminPanel = lazy(() => import("./components/AdminPanel"));
import AdminLogin from "./components/AdminLogin";

// Admin access is enforced by Supabase Auth + row-level security on the
// database — not by anything in this bundle. Visitors never sign in.
import ToastContainer, { Toast } from "./components/ToastContainer";
import heroImage from "./assets/hero.jpeg";
import { supabase } from "./supabase";
import { Category, HomepageBanner, VideoAsset, BoutiqueSettings, Testimonial } from "./types";

export default function App() {
  // Navigation & Filtering State
  const [currentView, setView] = useState<string>(() => {
    const path = window.location.pathname.substring(1);
    return ["shop", "services", "about", "contact", "admin"].includes(path) ? path : "home";
  });
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Admin authentication — backed by a real Supabase Auth session.
  const [adminAuthed, setAdminAuthed] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>("");

  // Overlay Controls State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [conciergeOpen, setConciergeOpen] = useState<boolean>(false);

  // Notification Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Bookings log for interactive feedback
  const [bookings, setBookings] = useState<ConciergeBooking[]>([]);
  const [orders, setOrders] = useState<OrderDetails[]>([]);

  // Dynamic homepage, collection, video and settings states
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [content, setContent] = useState<SiteContent>(SITE_CONTENT_DEFAULTS);
  const [settings, setSettings] = useState<BoutiqueSettings>({
    id: "boutique_config",
    boutique_name: "Laxmi Designers",
    logo: "",
    contact_number: "+91 99081 25039",
    whatsapp_number: "9908125039",
    email: "enquiry@laxmidesigners.com",
    address: "D.No 20-73, Hyny School St, Gandhi Nagar, Machilipatnam, Andhra Pradesh 521002",
    google_maps_link: "https://maps.google.com/?q=Gandhi+Nagar,+Machilipatnam",
    instagram_url: "https://instagram.com/_laxmi_designers_",
    facebook_url: "https://facebook.com",
    footer_text: "© 2026 Laxmi Designers. Handcrafted Luxury.",
    business_hours: "10:00 AM - 8:00 PM"
  });

  // DEFAULT CATEGORIES
  const DEFAULT_CATEGORIES: Category[] = [
    {
      id: "bridal",
      name: "Bridal",
      subcategories: [
        { id: "maggam", name: "Maggam Work" },
        { id: "lehengas", name: "Lehengas" },
        { id: "blouses", name: "Blouse Stitching" }
      ]
    },
    {
      id: "dresses",
      name: "Dresses",
      subcategories: [
        { id: "frocks", name: "Designer Frocks" },
        { id: "anarkalis", name: "Anarkalis" },
        { id: "partywear", name: "Party Wear" }
      ]
    },
    {
      id: "traditional",
      name: "Traditional",
      subcategories: [
        { id: "sarees", name: "Heritage Sarees" },
        { id: "half-sarees", name: "Half Sarees" }
      ]
    },
    {
      id: "kids",
      name: "Kids",
      subcategories: [
        { id: "kids-frocks", name: "Kids Frocks" },
        { id: "lehengas-kids", name: "Pattu Langa" }
      ]
    }
  ];

  // Load & Sync with Supabase
  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch settings
      let { data: settingsData } = await supabase.from("settings").select("*").maybeSingle();
      if (!settingsData) {
        const defaultSettings = {
          id: "boutique_config",
          boutique_name: "Laxmi Designers",
          contact_number: "+91 99081 25039",
          whatsapp_number: "9908125039",
          email: "enquiry@laxmidesigners.com",
          address: "D.No 20-73, Hyny School St, Gandhi Nagar, Machilipatnam, Andhra Pradesh 521002",
          google_maps_link: "https://maps.google.com/?q=Gandhi+Nagar,+Machilipatnam",
          instagram_url: "https://instagram.com/_laxmi_designers_",
          facebook_url: "https://facebook.com",
          footer_text: "© 2026 Laxmi Designers. Handcrafted Luxury.",
          business_hours: "10:00 AM - 8:00 PM"
        };
        await supabase.from("settings").insert([defaultSettings]);
        setSettings(defaultSettings);
      } else {
        setSettings(settingsData);
      }

      // 2. Fetch categories & subcategories
      const { data: cats } = await supabase.from("categories").select("*, subcategories(*)");
      if (!cats || cats.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          await supabase.from("categories").insert([{
            id: cat.id,
            name: cat.name,
            description: "",
            image_url: "",
            display_order: 0,
            is_active: true
          }]);
          if (cat.subcategories && cat.subcategories.length > 0) {
            const subsToInsert = cat.subcategories.map(sub => ({
              id: sub.id,
              category_id: cat.id,
              name: sub.name
            }));
            await supabase.from("subcategories").insert(subsToInsert);
          }
        }
        setCategories(DEFAULT_CATEGORIES);
      } else {
        const mappedCats = cats.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          image_url: c.image_url,
          display_order: c.display_order,
          is_active: c.is_active,
          subcategories: (c.subcategories || []).map((s: any) => ({ id: s.id, name: s.name }))
        }));
        setCategories(mappedCats);
      }

      // 3. Fetch products
      const { data: prods } = await supabase.from("products").select("*");
      if (!prods || prods.length === 0) {
        for (const prod of SAMPLE_PRODUCTS) {
          await supabase.from("products").insert([{
            id: prod.id,
            category_id: prod.category.toLowerCase().includes("bridal") ? "bridal" : (prod.category.toLowerCase().includes("dress") ? "dresses" : (prod.category.toLowerCase().includes("traditional") ? "traditional" : "kids")),
            subcategory_id: prod.subcategory || null,
            name: prod.name,
            description: prod.description,
            price: prod.price,
            discount_price: prod.originalPrice || null,
            stock: prod.stockCount || 5,
            image_urls: prod.images || [prod.primaryImage],
            video_url: null,
            is_featured: prod.rating >= 4.8,
            is_new_arrival: true,
            is_active: true,
            details: prod.details,
            signature_note: prod.signatureNote
          }]);
        }
        setProducts(SAMPLE_PRODUCTS);
      } else {
        const mappedProds = prods.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category_id,
          subcategory: p.subcategory_id || undefined,
          price: Number(p.price),
          originalPrice: p.discount_price ? Number(p.discount_price) : undefined,
          description: p.description || "",
          details: p.details || [],
          primaryImage: p.image_urls?.[0] || "",
          secondaryImage: p.image_urls?.[1] || p.image_urls?.[0] || "",
          images: p.image_urls || [],
          inStock: p.is_active && (p.stock > 0),
          stockCount: p.stock || 0,
          sizes: p.size ? p.size.split(",").map((s: string) => s.trim()) : ["S", "M", "L", "Custom Measure"],
          rating: 4.8,
          reviews: [],
          signatureNote: p.signature_note || "",
          isFeatured: p.is_featured === true
        }));
        setProducts(mappedProds);
      }

      // NOTE: bookings and orders contain customer PII (names, phones, emails,
      // addresses). They are deliberately NOT fetched here — see
      // fetchAdminOnlyData(), which runs only for a signed-in admin.

      // 6. Fetch banners
      const { data: bannerList } = await supabase.from("homepage_banners").select("*").order("display_order", { ascending: true });
      if (bannerList && bannerList.length > 0) {
        setBanners(bannerList);
      } else {
        const defaultBanner = {
          id: "banner-1",
          title: "",
          // Store an empty image_url so the hero falls back to the bundled asset;
          // never persist a build-specific bundled path to the database.
          image_url: "",
          video_url: "",
          button_text: "Explore Collection",
          button_link: "shop",
          display_order: 0,
          is_active: true
        };
        await supabase.from("homepage_banners").insert([defaultBanner]);
        setBanners([defaultBanner]);
      }

      // 8. Fetch videos
      const { data: vids } = await supabase.from("videos").select("*").order("display_order", { ascending: true });
      if (vids) {
        setVideos(vids);
      }

      // 9. Fetch testimonials (falls back to built-in samples if the table is
      // absent or empty — the marquee handles that).
      const { data: tms } = await supabase.from("testimonials").select("*").order("display_order", { ascending: true });
      if (tms) {
        setTestimonials(tms.filter((t: any) => t.is_active !== false));
      }

      // 10. Fetch editable site content (merged over defaults).
      const { data: sc } = await supabase.from("site_content").select("data").eq("id", "site").maybeSingle();
      if (sc?.data) {
        setContent(mergeSiteContent(sc.data));
      }
    };

    fetchData()
      .catch(err => console.error("Error loading database records:", err))
      .finally(() => setIsLoading(false));

    // Subscribe ONLY to the public catalog tables. Never subscribe to
    // bookings/orders — those payloads carry customer PII and this channel is
    // open in every visitor's browser.
    const CATALOG_TABLES = ["products", "categories", "subcategories", "homepage_banners", "videos", "settings", "testimonials", "site_content"];
    let channel = supabase.channel("catalog-db-changes");
    for (const table of CATALOG_TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        fetchData().catch(err => console.error(err));
      });
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddProduct = async (newProduct: Product) => {
    try {
      const { error } = await supabase.from("products").insert([{
        id: newProduct.id,
        category_id: newProduct.category,
        subcategory_id: newProduct.subcategory || null,
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        discount_price: newProduct.originalPrice || null,
        stock: newProduct.stockCount || 5,
        image_urls: newProduct.images || [newProduct.primaryImage],
        video_url: null,
        is_featured: newProduct.isFeatured === true,
        is_new_arrival: true,
        is_active: true,
        details: newProduct.details,
        signature_note: newProduct.signatureNote
      }]);
      if (error) throw error;
      setProducts((prev) => [...prev, newProduct]);
      addToast(`"${newProduct.name}" launched into inventory`, "gold");
    } catch (err) {
      console.error(err);
      addToast("Failed to launch creation in database", "info");
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      const { error } = await supabase.from("products").update({
        category_id: updatedProduct.category,
        subcategory_id: updatedProduct.subcategory || null,
        name: updatedProduct.name,
        description: updatedProduct.description,
        price: updatedProduct.price,
        discount_price: updatedProduct.originalPrice || null,
        stock: updatedProduct.stockCount || 5,
        image_urls: updatedProduct.images || [updatedProduct.primaryImage],
        is_featured: updatedProduct.isFeatured === true,
        details: updatedProduct.details,
        signature_note: updatedProduct.signatureNote
      }).eq("id", updatedProduct.id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
      addToast(`"${updatedProduct.name}" successfully updated`, "gold");
    } catch (err) {
      console.error(err);
      addToast("Failed to update creation in database", "info");
    }
  };

  // Add / remove a product from the homepage Featured Collection
  const handleToggleFeatured = async (productId: string, featured: boolean) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, isFeatured: featured } : p)));
    try {
      const { error } = await supabase.from("products").update({ is_featured: featured }).eq("id", productId);
      if (error) throw error;
      addToast(featured ? "Added to Featured Collection" : "Removed from Featured Collection", featured ? "gold" : "info");
    } catch (err) {
      console.error(err);
      addToast("Failed to update the Featured Collection", "info");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      addToast("Product successfully retired from inventory", "info");
    } catch (err) {
      console.error(err);
      addToast("Failed to delete creation from database", "info");
    }
  };

  const handleAddCategory = async (newCategory: Category) => {
    try {
      const { error } = await supabase.from("categories").insert([{
        id: newCategory.id,
        name: newCategory.name,
        description: "",
        image_url: newCategory.image_url || "",
        display_order: 0,
        is_active: true
      }]);
      if (error) throw error;
      setCategories((prev) => [...prev, { ...newCategory, subcategories: newCategory.subcategories || [] }]);
      addToast(`Category "${newCategory.name}" added`, "gold");
    } catch (err) {
      console.error(err);
      addToast("Failed to add category", "info");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);
      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      addToast("Category removed", "info");
    } catch (err) {
      console.error(err);
      addToast("Failed to delete category", "info");
    }
  };

  const handleUpdateCategory = async (updatedCategory: Category) => {
    try {
      await supabase.from("subcategories").delete().eq("category_id", updatedCategory.id);
      if (updatedCategory.subcategories && updatedCategory.subcategories.length > 0) {
        const subs = updatedCategory.subcategories.map(s => ({
          id: s.id,
          category_id: updatedCategory.id,
          name: s.name
        }));
        await supabase.from("subcategories").insert(subs);
      }
      await supabase.from("categories").update({
        name: updatedCategory.name,
        description: updatedCategory.description || "",
        image_url: updatedCategory.image_url || "",
        display_order: updatedCategory.display_order || 0,
        is_active: updatedCategory.is_active !== false
      }).eq("id", updatedCategory.id);
      setCategories((prev) => prev.map((c) => (c.id === updatedCategory.id ? updatedCategory : c)));
    } catch (err) {
      console.error(err);
    }
  };

  // Banners, Videos, Settings Mutators
  const handleUpdateSettings = async (updatedSettings: BoutiqueSettings) => {
    try {
      const { error } = await supabase.from("settings").update(updatedSettings).eq("id", "boutique_config");
      if (error) throw error;
      addToast("Boutique Settings updated successfully", "gold");
    } catch (err) {
      console.error(err);
      addToast("Failed to save settings", "info");
    }
  };

  const handleAddBanner = async (banner: HomepageBanner) => {
    try {
      const { error } = await supabase.from("homepage_banners").insert([banner]);
      if (error) throw error;
      setBanners((prev) => [...prev, banner]);
      addToast("Home Banner added successfully", "gold");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBanner = async (banner: HomepageBanner) => {
    try {
      const { error } = await supabase.from("homepage_banners").update(banner).eq("id", banner.id);
      if (error) throw error;
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? banner : b)));
      addToast("Home Banner updated successfully", "gold");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      const { error } = await supabase.from("homepage_banners").delete().eq("id", id);
      if (error) throw error;
      setBanners((prev) => prev.filter((b) => b.id !== id));
      addToast("Home Banner removed", "info");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddVideo = async (video: VideoAsset) => {
    try {
      const { error } = await supabase.from("videos").insert([video]);
      if (error) throw error;
      setVideos((prev) => [...prev, video]);
      addToast("Video asset saved", "gold");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateVideo = async (video: VideoAsset) => {
    try {
      const { error } = await supabase.from("videos").update(video).eq("id", video.id);
      if (error) throw error;
      setVideos((prev) => prev.map((v) => (v.id === video.id ? video : v)));
      addToast("Video replaced/updated", "gold");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) throw error;
      setVideos((prev) => prev.filter((v) => v.id !== id));
      addToast("Video retired", "info");
    } catch (err) {
      console.error(err);
    }
  };

  // Client testimonials ("What Our Customers Say")
  const handleAddTestimonial = async (t: Testimonial) => {
    try {
      const { error } = await supabase.from("testimonials").insert([t]);
      if (error) throw error;
      setTestimonials((prev) => [...prev, t]);
      addToast("Review added", "gold");
    } catch (err) {
      console.error(err);
      addToast("Failed to add review", "info");
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    try {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      addToast("Review removed", "info");
    } catch (err) {
      console.error(err);
      addToast("Failed to remove review", "info");
    }
  };

  // Editable website content (Admin → Site Editor)
  const handleSaveContent = async (next: SiteContent) => {
    setContent(next); // optimistic
    try {
      const { error } = await supabase
        .from("site_content")
        .upsert({ id: "site", data: next, updated_at: new Date().toISOString() });
      if (error) throw error;
      addToast("Website content saved", "gold");
    } catch (err) {
      console.error(err);
      addToast("Failed to save content", "info");
    }
  };

  // Customer PII (bookings + orders) is fetched ONLY for a signed-in admin, so
  // an anonymous visitor's browser never even issues the query.
  useEffect(() => {
    if (!adminAuthed) {
      setBookings([]);
      setOrders([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: bks } = await supabase.from("bookings").select("*");
      if (!cancelled && bks) {
        setBookings(bks.map((b: any) => ({
          id: b.id,
          name: b.name,
          email: b.email,
          phone: b.phone,
          date: b.date,
          timeSlot: b.time_slot,
          consultationType: b.consultation_type,
          notes: b.notes,
          status: b.status || "New",
          adminNotes: b.admin_notes || "",
          isRead: b.is_read === true
        })));
      }

      const { data: ords } = await supabase.from("orders").select("*");
      if (!cancelled && ords) {
        setOrders(ords.map((o: any) => ({
          id: o.id,
          date: formatDateDDMonYYYY(o.created_at),
          shipping: {
            firstName: (o.customer_name || "").split(" ")[0] || "",
            lastName: (o.customer_name || "").split(" ").slice(1).join(" ") || "",
            email: o.email || "",
            phone: o.phone || "",
            address: o.address || "",
            city: o.city || "",
            state: o.state || "",
            zipCode: o.zip_code || "",
            country: o.country || "India"
          },
          payment: { cardName: "", cardNumber: "", expiry: "", cvv: "" },
          cartItems: o.cart_items || [],
          subtotal: Number(o.subtotal),
          shippingCost: Number(o.shipping_cost),
          discount: 0,
          total: Number(o.total)
        })));
      }
    })();
    return () => { cancelled = true; };
  }, [adminAuthed]);

  // Restore an existing admin session on load and keep it in sync (handles
  // refresh, token expiry and sign-out from another tab).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAdminAuthed(Boolean(data.session));
      setAdminUsername(data.session?.user?.email || "");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdminAuthed(Boolean(session));
      setAdminUsername(session?.user?.email || "");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Listen to custom mega-menu category / subcategory selections.
  // detail may be a plain string (category id, legacy) or { category, subcategory }.
  useEffect(() => {
    const handleCategoryEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail === "object") {
        setCategoryFilter(detail.category || "all");
        setSubCategoryFilter(detail.subcategory || "all");
      } else {
        setCategoryFilter(detail);
        setSubCategoryFilter("all");
      }
    };
    window.addEventListener("setCategoryFilter", handleCategoryEvent);
    return () => window.removeEventListener("setCategoryFilter", handleCategoryEvent);
  }, []);

  // Apply the editable SEO title + description to the document. (Google renders
  // JS so it picks these up; note WhatsApp/Facebook link-preview crawlers read
  // the STATIC index.html and won't see JS-set values.)
  useEffect(() => {
    if (content.seoTitle) document.title = content.seoTitle;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content.seoDescription || "");
  }, [content.seoTitle, content.seoDescription]);

  // Scroll to top only when the page/view changes — NOT when the product
  // preview opens/closes (that would jump the shopper away from where they were).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentView]);

  // Sync browser URL with view state
  useEffect(() => {
    const path = currentView === "home" ? "/" : `/${currentView}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
  }, [currentView]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.substring(1) || "home";
      setView(path);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Toast manager helpers
  const addToast = (message: string, type: Toast["type"]) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Order via WhatsApp — opens WhatsApp with the store number and product details
  const handleWhatsAppOrder = (
    product: Product,
    size?: string,
    customMeasurements?: CartItem["customMeasurements"]
  ) => {
    const rawNumber = settings?.whatsapp_number || settings?.contact_number || "";
    const digits = rawNumber.replace(/\D/g, "");
    if (!digits) {
      addToast("WhatsApp number is not set. Add it in the admin Settings.", "info");
      return;
    }
    // If the number has no country code (10 digits), assume India (+91)
    const phone = digits.length === 10 ? `91${digits}` : digits;

    let message = `Hello! I'm interested in this product from ${settings?.boutique_name || "Laxmi Designers"}:\n\n`;
    message += `*${product.name}*\n`;
    if (size) message += `Size: ${size}\n`;
    if (customMeasurements) {
      const m = customMeasurements;
      const parts = [
        m.bust && `Bust ${m.bust}`,
        m.waist && `Waist ${m.waist}`,
        m.hips && `Hips ${m.hips}`,
        m.height && `Height ${m.height}`
      ].filter(Boolean);
      if (parts.length) message += `Measurements (in): ${parts.join(", ")}\n`;
      if (m.additionalNotes) message += `Notes: ${m.additionalNotes}\n`;
    }
    message += `\nIs this available?`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // General WhatsApp chat link for the footer/contact (no product context)
  const whatsappDigits = (settings?.whatsapp_number || settings?.contact_number || "").replace(/\D/g, "");
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits.length === 10 ? `91${whatsappDigits}` : whatsappDigits}`
    : "";
  const currentYear = new Date().getFullYear();

  // Admin auth handlers — real Supabase Auth. Returns an error message, or
  // null when the sign-in succeeded.
  const handleAdminLogin = async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return error.message === "Invalid login credentials"
        ? "Incorrect email or password. Please try again."
        : error.message;
    }
    setAdminAuthed(true);
    setAdminUsername(data.user?.email || email);
    return null;
  };

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setAdminAuthed(false);
    setAdminUsername("");
    setView("home");
    addToast("You have been logged out.", "info");
  };

  // Change the signed-in admin's password via Supabase Auth.
  const handleChangeAdminPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      addToast(`Could not update password: ${error.message}`, "info");
      return;
    }
    addToast("Password updated successfully.", "gold");
  };

  // Lock background page scroll while a full-screen overlay is open
  useEffect(() => {
    const overlayOpen = Boolean(selectedProduct) || conciergeOpen;
    if (overlayOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [selectedProduct, conciergeOpen]);

  // Interactive Booking Log Callback
  const handleBookSuccess = async (booking: ConciergeBooking) => {
    try {
      const id = `bk-${Date.now()}`;
      const { error } = await supabase.from("bookings").insert([{
        id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        date: booking.date,
        time_slot: booking.timeSlot,
        consultation_type: booking.consultationType,
        notes: booking.notes
      }]);
      if (error) throw error;
      addToast(`Consultation slot requested on ${formatDateDDMonYYYY(booking.date)}`, "gold");
    } catch (err) {
      console.error(err);
      addToast("Failed to request slot in database", "info");
    }
  };

  // Delete an enquiry (booking) from the database and local state
  const handleDeleteBooking = async (id: string) => {
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
      setBookings((prev) => prev.filter((b) => b.id !== id));
      addToast("Enquiry deleted", "info");
    } catch (err) {
      console.error(err);
      addToast("Failed to delete enquiry", "info");
    }
  };

  // Update the status of an enquiry (booking)
  const handleUpdateBookingStatus = async (id: string, status: BookingStatus) => {
    // Optimistically reflect the change in the UI
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    try {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
      addToast(`Enquiry marked "${status}"`, "gold");
    } catch (err) {
      console.error(err);
      addToast("Status saved locally, but the database update failed. Add a 'status' column to the bookings table.", "info");
    }
  };

  // Internal follow-up notes on an enquiry (never shown to customers)
  const handleUpdateBookingNotes = async (id: string, adminNotes: string) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, adminNotes } : b)));
    try {
      const { error } = await supabase.from("bookings").update({ admin_notes: adminNotes }).eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      addToast("Couldn't save the note (add an 'admin_notes' column to bookings).", "info");
    }
  };

  // Mark an enquiry read / unread
  const handleMarkBookingRead = async (id: string, isRead: boolean) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, isRead } : b)));
    try {
      const { error } = await supabase.from("bookings").update({ is_read: isRead }).eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
    }
  };

  // Homepage "Featured Collection" — curated from the admin panel. If nothing
  // has been marked featured yet, fall back to the first few products so the
  // section is never empty.
  const explicitlyFeatured = products.filter((p) => p.isFeatured);
  const featuredProducts = explicitlyFeatured.length > 0 ? explicitlyFeatured : products.slice(0, 3);

  // Videos placed in the Featured Collection (section === "featured"), shown
  // beneath the product list on the homepage.
  const featuredVideos = videos
    .filter((v) => v.section === "featured" && v.is_active !== false && v.video_url)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  // Resolve a category value (id OR name) to its canonical category id, so
  // products map to categories consistently no matter how they were stored.
  const resolveCatId = (val?: string): string => {
    if (!val) return "";
    const byId = categories.find((c) => c.id === val);
    if (byId) return byId.id;
    const byName = categories.find((c) => c.name.toLowerCase() === val.toLowerCase());
    return byName ? byName.id : val;
  };

  // The subcategories that belong to the currently selected category (for the
  // contextual subcategory filter row).
  const activeCategory = categories.find((c) => c.id === resolveCatId(categoryFilter));
  const activeSubcategories = activeCategory?.subcategories || [];

  // Product Filtering Engine — filter by category AND subcategory (both robust
  // to id-or-name values so no item is ever accidentally hidden).
  const filteredProducts = products.filter((p) => {
    const matchCat = categoryFilter === "all" || resolveCatId(p.category) === resolveCatId(categoryFilter);
    const matchSub =
      subCategoryFilter === "all" ||
      p.subcategory === subCategoryFilter ||
      activeSubcategories.find((s) => s.id === subCategoryFilter)?.name === p.subcategory;
    return matchCat && matchSub;
  });

  // Products in their default (curated) order — sorting UI has been removed.
  const sortedProducts = filteredProducts;

  // Group the visible products by Category → Subcategory so the catalog is
  // uniformly organized. Every product lands in a group (unknown category or
  // missing subcategory still gets a sensible section), so nothing is hidden.
  const UNCATEGORIZED = "__uncategorized__";
  const NO_SUBCATEGORY = "__none__";
  const productSections = (() => {
    const groups = new Map<string, Product[]>();
    for (const p of sortedProducts) {
      const catId = resolveCatId(p.category) || UNCATEGORIZED;
      const subId = p.subcategory || NO_SUBCATEGORY;
      const key = `${catId}||${subId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    const catDisplay = (catId: string) =>
      categories.find((c) => c.id === catId)?.name || (catId === UNCATEGORIZED ? "More Designs" : catId);
    const subDisplay = (catId: string, subId: string): string | null => {
      if (subId === NO_SUBCATEGORY) return null;
      const cat = categories.find((c) => c.id === catId);
      return cat?.subcategories.find((s) => s.id === subId || s.name === subId)?.name || subId;
    };
    const sections: { key: string; catName: string; subName: string | null; items: Product[] }[] = [];
    const used = new Set<string>();
    const addCat = (catId: string) => {
      const cat = categories.find((c) => c.id === catId);
      const present = [...groups.keys()].filter((k) => k.startsWith(`${catId}||`)).map((k) => k.split("||")[1]);
      const orderedSubs = [...new Set([...(cat?.subcategories.map((s) => s.id) || []), NO_SUBCATEGORY, ...present])];
      for (const subId of orderedSubs) {
        const key = `${catId}||${subId}`;
        if (groups.has(key) && !used.has(key)) {
          used.add(key);
          sections.push({ key, catName: catDisplay(catId), subName: subDisplay(catId, subId), items: groups.get(key)! });
        }
      }
    };
    categories.forEach((c) => addCat(c.id));
    [...groups.keys()].forEach((k) => { if (!used.has(k)) addCat(k.split("||")[0]); });
    return sections;
  })();

  return (
    <div id="laxmi-app-root" className="min-h-screen bg-cream-50 text-espresso relative overflow-x-hidden selection:bg-gold-500 selection:text-maroon-900 flex flex-col justify-between">
      
      {/* HEADER SECTION */}
      <Header
        currentView={currentView}
        setView={(v) => {
          setView(v);
          setSelectedProduct(null);
        }}
        setConciergeOpen={setConciergeOpen}
        products={products}
        setQuickView={(p) => setSelectedProduct(p)}
        onSearchSelect={(p) => setSelectedProduct(p)}
        categories={categories}
        settings={settings}
        announcement={content.announcement}
      />

      {/* FLOATING BESPOKE CONCIERGE ACCESS (Desktop Right Float) */}
      <motion.button
        id="floating-concierge-trigger"
        onClick={() => setConciergeOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed right-6 bottom-24 z-30 bg-maroon-700 hover:bg-maroon-900 text-gold-300 hover:text-gold-100 px-4 py-3 rounded-full shadow-2xl border border-gold-500/30 flex items-center gap-2 text-xs tracking-widest font-bold uppercase transition-all hidden md:flex cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-gold-300 animate-spin-slow" />
        BOOK BRIDAL APPOINTMENT
      </motion.button>

      {/* PRIMARY RENDER OUTLET */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              {/* VIEW 1: HOME LANDING */}
              {currentView === "home" && (
                <div id="view-home" className="flex flex-col">
                  {/* Cinematic Editorial Hero Section */}
                  <section id="hero-carousel-section" className="relative h-[85vh] md:h-[92vh] flex flex-col justify-end items-center pb-24 md:pb-28 overflow-hidden bg-maroon-950 border-b-2 border-gold-500/35">
                    {/* Background Hero Image / Video */}
                    {(() => {
                      const activeBanner = banners.find(b => b.is_active) || {
                        title: "",
                        image_url: heroImage,
                        video_url: "",
                        button_text: "Explore Collection",
                        button_link: "shop"
                      };
                      // Suppress the legacy seeded hero title if it still lives in the DB.
                      const heroTitle =
                        (activeBanner.title || "").trim().toLowerCase() === "the heritage unveiling"
                          ? ""
                          : activeBanner.title;
                      return (
                        <>
                          {activeBanner.video_url ? (
                            <video
                              src={activeBanner.video_url}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.35]"
                            />
                          ) : (
                            <img
                              src={activeBanner.image_url || heroImage}
                              alt="Bridal collection"
                              onError={(e) => {
                                // A stored banner URL can be stale/broken (e.g. an old bundled
                                // asset path saved to the DB). Fall back to the shipped image once.
                                const img = e.currentTarget;
                                if (img.dataset.fellBack) return;
                                img.dataset.fellBack = "1";
                                img.src = heroImage;
                              }}
                              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.35] scale-102 hover:scale-105 transition-transform duration-10000"
                            />
                          )}

                          {/* Royal Corner Ornaments */}
                          <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-gold-500/30 rounded-tl-lg hidden md:block" />
                          <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-gold-500/30 rounded-tr-lg hidden md:block" />
                          <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-gold-500/30 rounded-bl-lg hidden md:block" />
                          <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-gold-500/30 rounded-br-lg hidden md:block" />

                          {/* Hero copy elements */}
                          <div className="relative z-10 text-center px-4 max-w-4xl flex flex-col items-center">
                            {heroTitle && (
                              <motion.h1
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                                className="font-serif text-3xl md:text-5xl text-gold-300 font-light tracking-widest uppercase italic text-gold-shimmer mb-4"
                              >
                                {heroTitle}
                              </motion.h1>
                            )}

                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2, duration: 0.8 }}
                              className="flex flex-col sm:flex-row gap-4 mt-2 items-center justify-center w-full"
                            >
                              <button
                                id="hero-shop-cta"
                                onClick={() => setView(activeBanner.button_link === "shop" ? "shop" : "home")}
                                className="w-full sm:w-auto px-8 py-4 bg-gold-500 hover:bg-gold-300 text-maroon-900 border border-gold-500 text-[10px] tracking-[0.2em] font-bold rounded-none flex items-center justify-center gap-2 transition-all uppercase cursor-pointer"
                              >
                                <span>{activeBanner.button_text || "Explore Collection"}</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                              
                              <button
                                id="hero-concierge-cta"
                                onClick={() => setConciergeOpen(true)}
                                className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-cream-100/10 text-gold-300 hover:text-gold-100 border border-gold-500/40 hover:border-gold-300 text-[10px] tracking-[0.2em] font-bold rounded-none flex items-center justify-center gap-2 transition-all uppercase cursor-pointer"
                              >
                                <Sparkles className="w-4 h-4 text-gold-300" />
                                <span>Book consultation</span>
                              </button>
                            </motion.div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Scroll indicators */}
                    <div className="absolute bottom-6 flex flex-col items-center text-[9px] tracking-[0.3em] text-gold-300/60 uppercase">
                      <span>Scroll To Explore</span>
                      <div className="w-0.5 h-8 bg-gradient-to-b from-gold-500 to-transparent mt-2 animate-bounce" />
                    </div>
                  </section>

                  {/* Specialties ribbon (infinite marquee) */}
                  <SpecialtiesMarquee items={content.specialties} />

                  {/* Brand Manifesto Section (Asymmetric & Ornate) */}
                  <section id="brand-manifesto-section" className="py-16 md:py-24 px-4 bg-cream-100 relative paisley-bg-pattern border-b border-gold-500/10">
                    <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
                      <div className="w-20 h-0.5 bg-gold-500/30 mb-8" />
                      <span className="text-[10px] tracking-[0.3em] text-gold-600 font-extrabold uppercase mb-2">{content.homeEyebrow}</span>
                      <h3 className="font-display font-bold text-2xl md:text-3xl text-maroon-900 tracking-wider uppercase mb-6 text-gold-shimmer">
                        {content.homeHeading}
                      </h3>
                      <p className="font-serif text-sm md:text-base text-espresso/80 leading-relaxed italic max-w-2xl mb-8 whitespace-pre-line">
                        {content.homeBody}
                      </p>
                      <button
                        onClick={() => setView("about")}
                        className="text-xs text-gold-600 hover:text-gold-800 font-bold tracking-widest border-b border-gold-500/20 hover:border-gold-600 pb-1 flex items-center gap-1 uppercase transition-colors"
                      >
                        ABOUT OUR CRAFT <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-20 h-0.5 bg-gold-500/30 mt-8" />
                    </div>
                  </section>

                  {/* Featured Collection Grid (full-bleed, fills the viewport on all devices) */}
                  <section id="featured-collection-section" className="py-16 md:py-24 px-4 sm:px-6 md:px-10 lg:px-16 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-baseline mb-12 gap-4 border-b border-gold-500/10 pb-4">
                      <div>
                        <span className="text-[10px] tracking-[0.25em] text-gold-600 font-bold block uppercase mb-1">FEATURED PICKS</span>
                        <h3 className="font-display font-black text-xl md:text-2xl text-maroon-900 tracking-wide uppercase">
                          FEATURED COLLECTION
                        </h3>
                      </div>
                      <button
                        id="featured-view-all"
                        onClick={() => setView("shop")}
                        className="text-xs font-bold tracking-widest text-gold-600 hover:text-gold-800 flex items-center gap-1 border-b border-gold-500/10 hover:border-gold-500 py-1 uppercase"
                      >
                        VIEW ALL PRODUCTS <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Asymmetric Products grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {isLoading
                        ? Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)
                        : featuredProducts.map((prod) => (
                            <ProductCard
                              key={prod.id}
                              product={prod}
                              onViewDetails={(p) => setSelectedProduct(p)}
                              onQuickView={(p) => setSelectedProduct(p)}
                              onWhatsAppOrder={handleWhatsAppOrder}
                            />
                          ))}
                    </div>

                    {/* Featured videos — shown after the product list */}
                    {featuredVideos.length > 0 && (
                      <div id="featured-videos" className="mt-12">
                        <div className="flex items-baseline gap-3 mb-5 border-b border-gold-500/10 pb-2">
                          <h3 className="font-display font-bold text-base md:text-lg text-maroon-900 uppercase tracking-wide">
                            In Motion
                          </h3>
                          <span className="text-gold-600 text-[11px] font-bold tracking-widest uppercase">
                            · Watch our craft
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                          {featuredVideos.map((vid) => (
                            <figure
                              key={vid.id}
                              className="group bg-cream-100 border border-gold-500/15 hover:border-gold-500/40 overflow-hidden shadow-sm hover:shadow-md transition-all duration-500"
                            >
                              <div className="relative aspect-[3/4] overflow-hidden bg-maroon-950">
                                <video
                                  src={vid.video_url}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              </div>
                              {vid.title && (
                                <figcaption className="p-4">
                                  <span className="font-serif text-sm md:text-base text-maroon-900 tracking-wide font-semibold line-clamp-1">
                                    {vid.title}
                                  </span>
                                </figcaption>
                              )}
                            </figure>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Editorial Chronicles / Story section — only when there are stories */}
                  {content.journal.length > 0 && (
                  <section id="home-editorial-section" className="bg-maroon-900 py-16 md:py-24 text-cream-100 border-t-2 border-b-2 border-gold-500/30">
                    <div className="max-w-7xl mx-auto px-4 md:px-8">
                      <div className="text-center mb-16">
                        <span className="text-[9px] tracking-[0.3em] text-gold-300 font-extrabold block mb-1 uppercase">OUR STORIES</span>
                        <h3 className="font-display font-black text-2xl md:text-3xl tracking-wider text-gold-shimmer uppercase">
                          ESSAYS ON INDIAN CRAFTSMANSHIP
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {content.journal.slice(0, 3).map((story) => (
                          <div
                            key={story.id}
                            className="bg-maroon-950/40 border border-gold-500/20 rounded-lg overflow-hidden flex flex-col justify-between group hover:border-gold-300 transition-all shadow-lg"
                          >
                            <div className="aspect-video overflow-hidden border-b border-gold-500/10">
                              <img
                                src={story.image}
                                alt={story.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between text-[9px] tracking-widest text-gold-300 font-bold mb-3 uppercase">
                                  <span>{story.date}</span>
                                  <span>{story.readTime}</span>
                                </div>
                                <h4 className="font-serif text-lg text-cream-100 group-hover:text-gold-300 transition-colors font-bold mb-2">
                                  {story.title}
                                </h4>
                                <p className="text-xs text-cream-200/80 leading-relaxed line-clamp-3 mb-4">
                                  {story.content}
                                </p>
                              </div>
                              <button
                                onClick={() => setView("journal")}
                                className="text-xs text-gold-300 font-bold tracking-widest flex items-center gap-1 border-b border-gold-500/20 hover:border-gold-300 pb-0.5 mt-2 text-left self-start uppercase"
                              >
                                READ ESSAY <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                  )}

                  {/* Testimonials (infinite moving cards) — managed in Admin → Reviews */}
                  <TestimonialsMarquee items={testimonials} />
                </div>
              )}

              {/* VIEW 2: SHOP / COLLECTIONS GRID */}
              {currentView === "shop" && (
                <div id="view-shop" className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] tracking-[0.2em] text-espresso/60 uppercase mb-8 font-medium">
                    <button onClick={() => setView("home")} className="hover:text-gold-600 transition-colors cursor-pointer">HOME</button>
                    <ChevronRight className="w-2.5 h-2.5 text-gold-500" />
                    <button onClick={() => setCategoryFilter("all")} className="hover:text-gold-600 transition-colors cursor-pointer">COLLECTIONS</button>
                    {categoryFilter !== "all" && (
                      <>
                        <ChevronRight className="w-2.5 h-2.5 text-gold-500" />
                        <span className="text-gold-600 font-bold">{categoryFilter}</span>
                      </>
                    )}
                  </div>
                  {/* Category Header */}
                  <div className="text-center mb-10 border-b border-gold-500/15 pb-6">
                    <span className="text-[10px] tracking-[0.3em] text-gold-600 font-extrabold block mb-1 uppercase">
                      Laxmi Designers Catalog
                    </span>
                    <h2 className="font-display font-black text-2xl md:text-4xl text-maroon-900 tracking-wide uppercase text-gold-shimmer">
                      SHOP OUR COLLECTION
                    </h2>
                    <p className="text-xs text-espresso/60 mt-1 max-w-lg mx-auto leading-relaxed uppercase">
                      Browse by category and style
                    </p>
                  </div>

                  {/* Filter controls subbar */}
                  <div id="shop-filter-panel" className="flex flex-col gap-3 bg-cream-100 border border-gold-500/15 p-4 rounded-lg mb-8 text-xs font-semibold">
                    {/* Category row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] tracking-widest text-espresso/50 font-bold uppercase flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5 text-gold-600" /> CATEGORIES:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {["all", ...categories.map(c => c.id)].map((catId) => {
                          const label = catId === "all" ? "ALL" : (categories.find(c => c.id === catId)?.name || catId);
                          const isActive = resolveCatId(categoryFilter) === catId || (catId === "all" && categoryFilter === "all");
                          return (
                            <button
                              key={catId}
                              id={`filter-cat-${catId}`}
                              onClick={() => { setCategoryFilter(catId); setSubCategoryFilter("all"); }}
                              className={`px-3 py-1.5 rounded tracking-wider border text-[10px] uppercase transition-all ${
                                isActive
                                  ? "bg-maroon-900 text-gold-300 border-gold-500 shadow-sm"
                                  : "bg-cream-50 border-gold-500/10 text-espresso hover:border-gold-500/30"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Subcategory row — appears once a specific category is chosen */}
                    {categoryFilter !== "all" && activeSubcategories.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-gold-500/10 pt-3">
                        <span className="text-[10px] tracking-widest text-espresso/50 font-bold uppercase">STYLE:</span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setSubCategoryFilter("all")}
                            className={`px-3 py-1.5 rounded tracking-wider border text-[10px] uppercase transition-all ${
                              subCategoryFilter === "all"
                                ? "bg-gold-500 text-maroon-900 border-gold-500 shadow-sm"
                                : "bg-cream-50 border-gold-500/10 text-espresso hover:border-gold-500/30"
                            }`}
                          >
                            All
                          </button>
                          {activeSubcategories.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setSubCategoryFilter(sub.id)}
                              className={`px-3 py-1.5 rounded tracking-wider border text-[10px] uppercase transition-all ${
                                subCategoryFilter === sub.id
                                  ? "bg-gold-500 text-maroon-900 border-gold-500 shadow-sm"
                                  : "bg-cream-50 border-gold-500/10 text-espresso hover:border-gold-500/30"
                              }`}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Catalog — grouped by Category → Subcategory */}
                  {isLoading ? (
                    <div id="shop-loading-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <ProductCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : sortedProducts.length === 0 ? (
                    <div id="shop-empty-state" className="text-center py-24 border border-dashed border-gold-500/20 rounded-lg bg-cream-100/50">
                      <h3 className="font-serif font-bold text-lg text-maroon-900 uppercase">NO PRODUCTS FOUND</h3>
                      <p className="text-xs text-espresso/60 tracking-wider mt-1">
                        Try resetting your filters or select "ALL" categories.
                      </p>
                      <button
                        onClick={() => { setCategoryFilter("all"); setSubCategoryFilter("all"); }}
                        className="mt-4 px-5 py-2.5 bg-maroon-900 hover:bg-maroon-800 text-gold-300 border border-gold-500 text-[10px] tracking-widest font-bold rounded uppercase transition-colors"
                      >
                        RESET FILTERS
                      </button>
                    </div>
                  ) : (
                    <div id="shop-products-grid" className="space-y-12">
                      {productSections.map((section) => (
                        <div key={section.key} id={`shop-group-${section.key}`}>
                          <div className="flex items-baseline gap-3 mb-5 border-b border-gold-500/10 pb-2">
                            <h3 className="font-display font-bold text-base md:text-lg text-maroon-900 uppercase tracking-wide">
                              {section.catName}
                            </h3>
                            {section.subName && (
                              <span className="text-gold-600 text-[11px] font-bold tracking-widest uppercase">· {section.subName}</span>
                            )}
                            <span className="text-espresso/40 text-[10px] font-medium ml-auto tracking-wider">
                              {section.items.length} {section.items.length === 1 ? "item" : "items"}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                            {section.items.map((prod) => (
                              <ProductCard
                                key={prod.id}
                                product={prod}
                                onViewDetails={(p) => setSelectedProduct(p)}
                                onQuickView={(p) => setSelectedProduct(p)}
                                onWhatsAppOrder={handleWhatsAppOrder}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 3: JOURNAL / OUR STORY */}
              {currentView === "journal" && (
                <div id="view-journal" className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16 space-y-16">
                  <div className="text-center border-b border-gold-500/15 pb-6">
                    <span className="text-[10px] tracking-[0.3em] text-gold-600 font-extrabold block mb-1 uppercase">
                      Laxmi Designers Blog
                    </span>
                    <h2 className="font-display font-black text-2xl md:text-4xl text-maroon-900 tracking-wide uppercase text-gold-shimmer">
                      OUR STORIES
                    </h2>
                    <p className="text-xs text-espresso/60 mt-1 uppercase">
                      Stories about our designs, crafts and the people behind them
                    </p>
                  </div>

                  {content.journal.length === 0 && (
                    <div className="text-center py-16 text-espresso/50 text-sm">No stories published yet.</div>
                  )}

                  {content.journal.map((story, idx) => (
                    <article
                      key={story.id}
                      id={`journal-story-${story.id}`}
                      className="bg-cream-100 border border-gold-500/15 rounded-lg overflow-hidden flex flex-col md:flex-row shadow-sm gap-6 md:gap-0 p-1"
                    >
                      <div className="w-full md:w-1/3 aspect-[3/4] md:aspect-auto overflow-hidden">
                        <img src={story.image} alt={story.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center text-[9px] tracking-widest text-gold-600 font-extrabold mb-3 uppercase">
                            <span>{story.date}</span>
                            <span>{story.readTime}</span>
                          </div>
                          <h3 className="font-display text-lg md:text-xl font-bold text-maroon-900 mb-1 leading-tight">{story.title}</h3>
                          <p className="font-serif text-xs text-gold-700 italic tracking-wide mb-4">{story.subtitle}</p>
                          <p className="text-xs md:text-sm text-espresso/80 leading-relaxed font-sans">{story.content}</p>
                        </div>
                        <div className="border-t border-gold-500/10 pt-4 mt-6 flex justify-between items-center">
                          <span className="text-[8px] tracking-[0.2em] text-espresso/40 uppercase font-bold">BLOG POST</span>
                          <button
                            onClick={() => addToast("This story is now open to read.", "gold")}
                            className="text-[10px] tracking-widest font-bold text-maroon-700 hover:text-maroon-900 uppercase"
                          >
                            Save story
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* VIEW 4: THE CRAFT / ABOUT MANIFESTO */}
              {currentView === "about" && (
                <div id="view-about" className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16 space-y-12">
                  <div className="text-center border-b border-gold-500/15 pb-6">
                    <span className="text-[10px] tracking-[0.3em] text-gold-600 font-extrabold block mb-1 uppercase">
                      {content.aboutEyebrow}
                    </span>
                    <h2 className="font-display font-black text-2xl md:text-4xl text-maroon-900 tracking-wide uppercase text-gold-shimmer">
                      {content.aboutHeading}
                    </h2>
                    <p className="text-xs text-espresso/60 mt-1 uppercase max-w-xl mx-auto leading-relaxed">
                      {content.aboutIntro}
                    </p>
                  </div>

                  {content.aboutBody && (
                    <div className="max-w-2xl mx-auto font-serif text-sm md:text-base text-espresso/80 leading-relaxed whitespace-pre-line">
                      {content.aboutBody}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: SERVICES */}
              {currentView === "services" && (
                <div id="view-services" className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16 space-y-12">
                  <div className="text-center border-b border-gold-500/15 pb-6">
                    <span className="text-[10px] tracking-[0.3em] text-gold-600 font-extrabold block mb-1 uppercase">
                      {content.servicesEyebrow}
                    </span>
                    <h2 className="font-display font-black text-2xl md:text-4xl text-maroon-900 tracking-wide uppercase text-gold-shimmer">
                      {content.servicesHeading}
                    </h2>
                    <p className="text-xs text-espresso/60 mt-1 uppercase">
                      {content.servicesSubtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {content.services.map((svc, i) => (
                      <div key={i} className="p-8 bg-cream-100 border border-gold-500/20 rounded-lg flex flex-col justify-between hover:border-gold-500 transition-all duration-300">
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-gold-600 animate-pulse" />
                            <h3 className="font-display font-bold text-lg text-maroon-900 uppercase">{svc.title}</h3>
                          </div>
                          <p className="text-xs md:text-sm text-espresso/80 leading-relaxed font-sans mb-6 whitespace-pre-line">
                            {svc.body}
                          </p>
                        </div>
                        <button onClick={() => setConciergeOpen(true)} className="w-full py-3 bg-maroon-900 text-gold-300 text-[10px] tracking-[0.2em] font-bold uppercase transition-all hover:bg-gold-500 hover:text-maroon-900 border border-gold-500">
                          Book a consultation
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW: CONTACT */}
              {currentView === "contact" && (
                <div id="view-contact" className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16 space-y-12">
                  <div className="text-center border-b border-gold-500/15 pb-6">
                    <span className="text-[10px] tracking-[0.3em] text-gold-600 font-extrabold block mb-1 uppercase">
                      Contact Us
                    </span>
                    <h2 className="font-display font-black text-2xl md:text-4xl text-maroon-900 tracking-wide uppercase text-gold-shimmer">
                      CONTACT OUR STORE
                    </h2>
                    <p className="text-xs text-espresso/60 mt-1 uppercase">
                      Plan a physical visit or start a custom design consultation
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <a href="https://wa.me/919908125039" target="_blank" rel="noopener noreferrer" className="p-6 bg-cream-100 border border-gold-500/10 rounded hover:border-gold-500 transition-all text-center flex flex-col items-center gap-3">
                      <Phone className="w-6 h-6 text-gold-600" />
                      <h4 className="font-display font-bold text-xs tracking-wider text-maroon-900 uppercase">WHATSAPP DIRECT</h4>
                      <p className="text-xs text-espresso/70">Chat directly with our head tailor</p>
                      <span className="text-sm font-bold text-gold-700">9908125039</span>
                    </a>

                    <a href="https://instagram.com/_laxmi_designers_" target="_blank" rel="noopener noreferrer" className="p-6 bg-cream-100 border border-gold-500/10 rounded hover:border-gold-500 transition-all text-center flex flex-col items-center gap-3">
                      <Instagram className="w-6 h-6 text-gold-600" />
                      <h4 className="font-display font-bold text-xs tracking-wider text-maroon-900 uppercase">INSTAGRAM CHANNEL</h4>
                      <p className="text-xs text-espresso/70">See our latest collections</p>
                      <span className="text-sm font-bold text-gold-700">@_laxmi_designers_</span>
                    </a>

                    <div className="p-6 bg-cream-100 border border-gold-500/10 rounded text-center flex flex-col items-center gap-3">
                      <MapPin className="w-6 h-6 text-gold-600" />
                      <h4 className="font-display font-bold text-xs tracking-wider text-maroon-900 uppercase">PHYSICAL STUDIO</h4>
                      <p className="text-xs text-espresso/70">D.No 20-73, Hyny School St, Gandhi Nagar</p>
                      <span className="text-[10px] md:text-xs font-semibold text-gold-700 uppercase">Machilipatnam, AP 521002</span>
                    </div>
                  </div>

                  <div className="p-8 md:p-10 border-2 border-gold-500/40 bg-maroon-950 text-center space-y-4 max-w-xl mx-auto rounded-lg shadow-xl">
                    <h3 className="font-display font-bold text-lg md:text-xl text-gold-300 uppercase tracking-wider">Schedule a Digital Consultation</h3>
                    <p className="text-xs md:text-sm text-cream-100/85 leading-relaxed font-sans">
                      Our designers look forward to crafting your customized bridal apparel. Use our booking form to request a secure virtual measurement and customization video meeting.
                    </p>
                    <button onClick={() => setConciergeOpen(true)} className="px-8 py-3 bg-gold-500 hover:bg-gold-300 text-maroon-900 text-[10px] tracking-widest font-extrabold uppercase transition-all cursor-pointer rounded">
                      Book a Consultation
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW: ADMIN — gated by login; panel is code-split */}
              {currentView === "admin" && !adminAuthed && (
                <AdminLogin onLogin={handleAdminLogin} />
              )}
              {currentView === "admin" && adminAuthed && (
                <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-24 text-center text-sm text-espresso/60 uppercase tracking-widest">Loading admin dashboard…</div>}>
                <AdminPanel
                  adminUsername={adminUsername}
                  onLogout={handleAdminLogout}
                  onChangeAdminPassword={handleChangeAdminPassword}
                  products={products}
                  bookings={bookings}
                  onDeleteBooking={handleDeleteBooking}
                  onUpdateBookingStatus={handleUpdateBookingStatus}
                  onUpdateBookingNotes={handleUpdateBookingNotes}
                  onMarkBookingRead={handleMarkBookingRead}
                  categories={categories}
                  banners={banners}
                  videos={videos}
                  settings={settings}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onToggleFeatured={handleToggleFeatured}
                  onAddCategory={handleAddCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onUpdateSettings={handleUpdateSettings}
                  onAddBanner={handleAddBanner}
                  onUpdateBanner={handleUpdateBanner}
                  onDeleteBanner={handleDeleteBanner}
                  testimonials={testimonials}
                  onAddTestimonial={handleAddTestimonial}
                  onDeleteTestimonial={handleDeleteTestimonial}
                  onAddVideo={handleAddVideo}
                  onUpdateVideo={handleUpdateVideo}
                  onDeleteVideo={handleDeleteVideo}
                  content={content}
                  onSaveContent={handleSaveContent}
                />
                </Suspense>
              )}
            </motion.div>
        </AnimatePresence>
      </main>

      {/* PRODUCT PREVIEW — rendered as a fixed overlay ABOVE the page (not as a
          replacement for it) so opening/closing it never unmounts the page. The
          shopper keeps their exact scroll position when the preview is closed. */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onWhatsAppOrder={handleWhatsAppOrder}
        />
      )}

      {/* OVERLAY: Appointment booking */}
      <ConciergeModal
        isOpen={conciergeOpen}
        onClose={() => setConciergeOpen(false)}
        onBookSuccess={handleBookSuccess}
      />



      {/* OVERLAY: Dynamic Non-Blocking Auto-dismiss Toasts */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* FOOTER: Ornate & Royal information layout */}
      <footer id="atelier-footer" className="bg-maroon-950 text-cream-100 border-t-2 border-gold-500/50 mt-20">
        {/* Main footer */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h4 className="font-display font-bold text-2xl text-gold-300 tracking-[0.15em] text-gold-shimmer uppercase">
              {settings.boutique_name || "LAXMI DESIGNERS"}
            </h4>
            <p className="text-[11px] tracking-[0.35em] text-gold-500 uppercase mt-1">
              Fashion Studio · Since 2015
            </p>
            <p className="text-sm text-cream-200 leading-relaxed mt-4 max-w-xs">
              {settings.footer_text || "A heritage fashion studio specializing in bridal wear, maggam work, blouse stitching, machine embroidery and designer dresses."}
            </p>

            {/* Social buttons */}
            <div className="flex items-center gap-3 mt-6">
              {settings.instagram_url && (
                <a href={safeHttpUrl(settings.instagram_url)} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                   className="w-9 h-9 flex items-center justify-center rounded-full border border-gold-500/40 text-gold-300 hover:bg-gold-500 hover:text-maroon-950 transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {settings.facebook_url && (
                <a href={safeHttpUrl(settings.facebook_url)} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                   className="w-9 h-9 flex items-center justify-center rounded-full border border-gold-500/40 text-gold-300 hover:bg-gold-500 hover:text-maroon-950 transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                   className="w-9 h-9 flex items-center justify-center rounded-full border border-gold-500/40 text-[#25D366] hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Explore */}
          <nav aria-label="Footer navigation" className="flex flex-col">
            <h5 className="font-display font-bold text-sm text-gold-300 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-gold-500/20">Explore</h5>
            <div className="flex flex-col gap-2.5 text-sm text-cream-200">
              <button onClick={() => setView("home")} className="text-left w-fit hover:text-gold-300 transition-colors">Home</button>
              <button onClick={() => setView("shop")} className="text-left w-fit hover:text-gold-300 transition-colors">Collections</button>
              <button onClick={() => setView("services")} className="text-left w-fit hover:text-gold-300 transition-colors">Services</button>
              <button onClick={() => setView("about")} className="text-left w-fit hover:text-gold-300 transition-colors">About Us</button>
              <button onClick={() => setView("contact")} className="text-left w-fit hover:text-gold-300 transition-colors">Contact</button>
            </div>
          </nav>

          {/* Contact */}
          <div className="flex flex-col">
            <h5 className="font-display font-bold text-sm text-gold-300 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-gold-500/20">Get in Touch</h5>
            <div className="flex flex-col gap-3 text-sm text-cream-200">
              <a href={`tel:${(settings.contact_number || "+919908125039").replace(/\s/g, "")}`} className="flex items-center gap-3 hover:text-gold-300 transition-colors">
                <Phone className="w-4 h-4 text-gold-400 shrink-0" />
                <span>{settings.contact_number || "+91 99081 25039"}</span>
              </a>
              <a href={`mailto:${settings.email || "contact@laxmidesigners.com"}`} className="flex items-center gap-3 hover:text-gold-300 transition-colors break-all">
                <Mail className="w-4 h-4 text-gold-400 shrink-0" />
                <span>{settings.email || "contact@laxmidesigners.com"}</span>
              </a>
              <p className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{settings.address || "Gandhi Nagar, Machilipatnam, Andhra Pradesh"}</span>
              </p>
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-gold-300 transition-colors">
                  <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span>Chat on WhatsApp</span>
                </a>
              )}
              {settings.google_maps_link && (
                <a href={safeHttpUrl(settings.google_maps_link)} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:text-gold-300 transition-colors font-semibold text-xs tracking-wider uppercase pl-7">
                  Get Directions →
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-gold-500/20">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-cream-200/70">
            <span className="text-center md:text-left">
              © {currentYear} {settings.boutique_name || "Laxmi Designers"}. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <button className="hover:text-gold-300 transition-colors">Terms</button>
              <span className="text-gold-500/40">•</span>
              <button className="hover:text-gold-300 transition-colors">Privacy</button>
              <span className="text-gold-500/40">•</span>
              <span className="text-gold-400/80 tracking-wider uppercase">Machilipatnam</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
