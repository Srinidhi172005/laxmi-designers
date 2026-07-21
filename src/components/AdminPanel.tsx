import React, { useState } from "react";
import { Product, ConciergeBooking, BookingStatus, BOOKING_STATUSES, Category, Subcategory, HomepageBanner, VideoAsset, Testimonial, BoutiqueSettings } from "../types";
import { Plus, Trash2, Edit3, Mail, Package, Users, Sparkles, FolderPlus, Film, Settings, Image, X, LogOut, KeyRound, Star, Globe } from "lucide-react";
import { supabase } from "../supabase";
import ImageUploadField from "./ImageUploadField";
import VideoUploadField from "./VideoUploadField";
import SiteEditor from "./SiteEditor";
import { SiteContent } from "../siteContent";
import { formatDateDDMonYYYY } from "../utils/date";
import { safeHttpUrl, isValidHttpUrl } from "../utils/safeUrl";

// Human-readable labels for each video placement, matching the website sections.
const VIDEO_PLACEMENTS: Record<string, string> = {
  featured: "Home — Featured Collection",
  hero: "Home — Hero Section",
  about: "About Us — Page Cover",
  gallery: "Home — Specialties Marquee",
};

// Colour coding for each enquiry status shown in the admin enquiries table.
const STATUS_STYLES: Record<BookingStatus, string> = {
  New: "bg-blue-50 text-blue-700 border-blue-200",
  Contacted: "bg-amber-50 text-amber-700 border-amber-200",
  Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-gray-100 text-gray-600 border-gray-300",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
};

interface AdminPanelProps {
  adminUsername: string;
  onLogout: () => void;
  onChangeAdminPassword: (password: string) => void;
  products: Product[];
  bookings: ConciergeBooking[];
  onDeleteBooking: (id: string) => void;
  onUpdateBookingStatus: (id: string, status: BookingStatus) => void;
  onUpdateBookingNotes: (id: string, notes: string) => void;
  onMarkBookingRead: (id: string, isRead: boolean) => void;
  categories: Category[];
  banners: HomepageBanner[];
  videos: VideoAsset[];
  testimonials: Testimonial[];
  settings: BoutiqueSettings;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onToggleFeatured: (productId: string, featured: boolean) => void;
  onAddCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onUpdateCategory: (category: Category) => void;
  onUpdateSettings: (settings: BoutiqueSettings) => void;
  onAddBanner: (banner: HomepageBanner) => void;
  onUpdateBanner: (banner: HomepageBanner) => void;
  onDeleteBanner: (id: string) => void;
  onAddVideo: (video: VideoAsset) => void;
  onUpdateVideo: (video: VideoAsset) => void;
  onDeleteVideo: (id: string) => void;
  onAddTestimonial: (t: Testimonial) => void;
  onDeleteTestimonial: (id: string) => void;
  content: SiteContent;
  onSaveContent: (content: SiteContent) => void;
}

export default function AdminPanel({
  adminUsername,
  onLogout,
  onChangeAdminPassword,
  products,
  bookings,
  onDeleteBooking,
  onUpdateBookingStatus,
  onUpdateBookingNotes,
  onMarkBookingRead,
  categories,
  banners,
  videos,
  testimonials,
  settings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onToggleFeatured,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategory,
  onUpdateSettings,
  onAddBanner,
  onUpdateBanner,
  onDeleteBanner,
  onAddVideo,
  onUpdateVideo,
  onDeleteVideo,
  onAddTestimonial,
  onDeleteTestimonial,
  content,
  onSaveContent
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "featured" | "categories" | "banners" | "videos" | "reviews" | "site" | "settings" | "bookings">("overview");

  // Category tab state
  const [newCatName, setNewCatName] = useState("");
  const [selectedParentCatId, setSelectedParentCatId] = useState("");
  const [newSubCatName, setNewSubCatName] = useState("");

  // Banner states
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerVideoUrl, setBannerVideoUrl] = useState("");
  const [bannerButtonText, setBannerButtonText] = useState("Explore Collection");
  const [bannerButtonLink, setBannerButtonLink] = useState("shop");
  const [bannerDisplayOrder, setBannerDisplayOrder] = useState("0");
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);


  // Video states
  const [videoTitle, setVideoTitle] = useState("");
  const [videoSection, setVideoSection] = useState("hero");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoThumb, setVideoThumb] = useState("");
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoFileSize, setVideoFileSize] = useState<number | null>(null);
  const [videoResolution, setVideoResolution] = useState("");
  const [videoDisplayOrder, setVideoDisplayOrder] = useState("0");
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  // Review / testimonial form state
  const [reviewQuote, setReviewQuote] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewLocation, setReviewLocation] = useState("");
  const [reviewStars, setReviewStars] = useState(5);

  // Settings states (initialized from settings prop)
  // Change-credentials form state
  const [credPassword, setCredPassword] = useState("");
  const [credConfirm, setCredConfirm] = useState("");
  const [credError, setCredError] = useState("");

  const [boutiqueName, setBoutiqueName] = useState(settings?.boutique_name || "");
  const [boutiqueLogo, setBoutiqueLogo] = useState(settings?.logo || "");
  const [boutiqueContact, setBoutiqueContact] = useState(settings?.contact_number || "");
  const [boutiqueWhatsapp, setBoutiqueWhatsapp] = useState(settings?.whatsapp_number || "");
  const [boutiqueEmail, setBoutiqueEmail] = useState(settings?.email || "");
  const [boutiqueAddress, setBoutiqueAddress] = useState(settings?.address || "");
  const [boutiqueMaps, setBoutiqueMaps] = useState(settings?.google_maps_link || "");
  const [boutiqueInsta, setBoutiqueInsta] = useState(settings?.instagram_url || "");
  const [boutiqueFb, setBoutiqueFb] = useState(settings?.facebook_url || "");
  const [boutiqueFooter, setBoutiqueFooter] = useState(settings?.footer_text || "");
  const [boutiqueHours, setBoutiqueHours] = useState(settings?.business_hours || "");

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.id || "bridal");
  const [subcategory, setSubcategory] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [description, setDescription] = useState("");
  const [primaryImage, setPrimaryImage] = useState("");
  const [secondaryImage, setSecondaryImage] = useState("");
  const [detailsInput, setDetailsInput] = useState("");
  const [signatureNote, setSignatureNote] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [productVideo, setProductVideo] = useState("");


  const resetForm = () => {
    setIsEditing(false);
    setEditingId("");
    setName("");
    setCategory(categories[0]?.id || "bridal");
    setSubcategory("");
    setPrice("");
    setOriginalPrice("");
    setDescription("");
    setPrimaryImage("");
    setSecondaryImage("");
    setDetailsInput("");
    setSignatureNote("");
    setIsFeatured(false);
    setProductVideo("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !primaryImage) {
      alert("Name and Primary Image are required.");
      return;
    }

    const detailsArray = detailsInput ? detailsInput.split("\n").filter(line => line.trim() !== "") : [];

    const productData: Product = {
      id: isEditing ? editingId : `lx-${crypto.randomUUID()}`,
      name,
      category,
      subcategory: subcategory || undefined,
      // Pricing is not shown anywhere on the site; kept at 0 for schema compatibility.
      price: parseFloat(price) || 0,
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      description,
      // Details & special note are no longer edited in the admin form; existing
      // values are preserved when editing, and new products simply have none.
      details: detailsArray,
      primaryImage,
      secondaryImage: secondaryImage || primaryImage,
      images: [primaryImage],
      inStock: true,
      stockCount: 5,
      sizes: [],
      rating: 5.0,
      reviews: [],
      signatureNote: signatureNote || undefined,
      isFeatured,
      video_url: productVideo || undefined
    };

    if (isEditing) {
      onUpdateProduct(productData);
    } else {
      onAddProduct(productData);
    }
    resetForm();
  };

  const handleEdit = (prod: Product) => {
    setIsEditing(true);
    setEditingId(prod.id);
    setName(prod.name);
    setCategory(prod.category);
    setSubcategory(prod.subcategory || "");
    setPrice(prod.price.toString());
    setOriginalPrice(prod.originalPrice ? prod.originalPrice.toString() : "");
    setDescription(prod.description);
    setPrimaryImage(prod.primaryImage);
    setSecondaryImage(prod.secondaryImage);
    setDetailsInput(prod.details.join("\n"));
    setSignatureNote(prod.signatureNote || "");
    setIsFeatured(prod.isFeatured === true);
    setProductVideo(prod.video_url || "");
    setActiveTab("products");
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const catId = newCatName.toLowerCase().trim().replace(/\s+/g, "-");
    onAddCategory({
      id: catId,
      name: newCatName.trim(),
      subcategories: []
    });
    setNewCatName("");
  };

  const handleCreateSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCatName.trim() || !selectedParentCatId) return;
    const parentCat = categories.find(c => c.id === selectedParentCatId);
    if (!parentCat) return;

    const subId = newSubCatName.toLowerCase().trim().replace(/\s+/g, "-");
    const updatedSubcategories = [
      ...parentCat.subcategories,
      { id: subId, name: newSubCatName.trim() }
    ];

    onUpdateCategory({
      ...parentCat,
      subcategories: updatedSubcategories
    });
    setNewSubCatName("");
  };

  const handleDeleteSubcategory = (catId: string, subId: string) => {
    const parentCat = categories.find(c => c.id === catId);
    if (!parentCat) return;

    const updatedSubcategories = parentCat.subcategories.filter(s => s.id !== subId);
    onUpdateCategory({
      ...parentCat,
      subcategories: updatedSubcategories
    });
  };

  // --- Featured Collection helpers ---
  const featuredList = products.filter((p) => p.isFeatured);

  // Enquiry helpers
  const unreadCount = bookings.filter((b) => b.isRead !== true).length;
  const exportEnquiriesCsv = () => {
    const headers = ["Name", "Phone", "Email", "Date", "Time", "Type", "Status", "Customer Notes", "Internal Notes"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = bookings.map((b) =>
      [b.name, b.phone, b.email, formatDateDDMonYYYY(b.date), b.timeSlot, b.consultationType, b.status || "New", b.notes, b.adminNotes]
        .map(esc)
        .join(",")
    );
    const csv = [headers.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `laxmi-enquiries-${formatDateDDMonYYYY(new Date()).replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const featuredVideoList = videos
    .filter((v) => v.section === "featured")
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const categoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.name || catId || "—";
  const subcategoryName = (catId: string, subId?: string) => {
    if (!subId) return "—";
    const cat = categories.find((c) => c.id === catId);
    return cat?.subcategories.find((s) => s.id === subId)?.name || subId;
  };

  return (
    <div id="admin-panel-container" className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#D4AF37]/20 pb-6 mb-8 gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] tracking-[0.3em] text-[#D4AF37] font-extrabold block uppercase">
              Laxmi Designers Admin
            </span>
            <h2 className="font-display font-black text-2xl md:text-3xl text-maroon-900 tracking-wide uppercase text-gold-shimmer flex items-center gap-2">
              ADMIN DASHBOARD <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            </h2>
            <span className="text-[10px] text-espresso/50 mt-1 block">Signed in as <span className="font-bold text-maroon-900">{adminUsername}</span></span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-700 hover:bg-red-500 hover:text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap bg-[#1A0508]/10 p-1 border border-[#D4AF37]/20 rounded gap-1 self-start">
          {[
            { id: "overview", label: "OVERVIEW", icon: Package },
            { id: "products", label: "PRODUCTS", icon: Plus },
            { id: "featured", label: "FEATURED", icon: Star },
            { id: "categories", label: "CATEGORIES", icon: FolderPlus },
            { id: "banners", label: "BANNERS", icon: Image },
            { id: "videos", label: "VIDEOS", icon: Film },
            { id: "settings", label: "SETTINGS", icon: Settings },
            { id: "bookings", label: "ENQUIRIES", icon: Mail },
            { id: "reviews", label: "REVIEWS", icon: Star },
            { id: "site", label: "SITE EDITOR", icon: Globe }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id !== "products") resetForm();
                }}
                className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold tracking-wider rounded uppercase transition-all duration-300 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#1A0508] text-[#D4AF37] shadow"
                    : "text-espresso/60 hover:text-maroon-900 hover:bg-[#1A0508]/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === "bookings" && unreadCount > 0 && (
                  <span className="ml-1 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div id="tab-overview" className="space-y-8 animate-fade-in">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-cream-100 border border-[#D4AF37]/20 p-5 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] tracking-wider text-espresso/50 font-bold uppercase">Total Products</span>
                <h4 className="font-serif text-2xl font-bold text-maroon-900 mt-1">{products.length}</h4>
              </div>
              <Package className="w-8 h-8 text-[#D4AF37]/60" />
            </div>

            <div className="bg-cream-100 border border-[#D4AF37]/20 p-5 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] tracking-wider text-espresso/50 font-bold uppercase">Enquiries Received</span>
                <h4 className="font-serif text-2xl font-bold text-maroon-900 mt-1">{bookings.length}</h4>
              </div>
              <Users className="w-8 h-8 text-[#D4AF37]/60" />
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-maroon-950/5 border border-[#D4AF37]/20 p-6 rounded-lg max-w-2xl">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm mb-2">About This Dashboard</h3>
            <p className="text-xs text-espresso/80 leading-relaxed font-sans">
              Use this dashboard to manage your products, categories, banners, videos, store details and customer enquiries. Changes are saved to your database and appear on the website right away. Images are uploaded to ImgBB; videos are uploaded to Supabase Storage.
            </p>
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === "products" && (
        <div id="tab-products" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          
          {/* Add / Edit Form */}
          <div className="lg:col-span-5 bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
              {isEditing ? "EDIT PRODUCT" : "ADD NEW PRODUCT"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-espresso/70 block mb-1 uppercase">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  placeholder="Royal Silk Lehenga"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-espresso/70 block mb-1 uppercase">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSubcategory("");
                    }}
                    className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium uppercase"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-espresso/70 block mb-1 uppercase">Subcategory</label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium uppercase"
                  >
                    <option value="">None</option>
                    {categories
                      .find((c) => c.id === category)
                      ?.subcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-espresso/70 block mb-1 uppercase">Product Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium h-20 resize-none"
                  placeholder="Describe the intricate embroidery details and materials..."
                />
              </div>

              {/* Image Inputs & ImgBB Simulation */}
              <div className="space-y-3 p-3 border border-[#D4AF37]/10 rounded bg-[#1A0508]/5">
                <span className="text-[10px] tracking-wider text-[#D4AF37] font-bold block uppercase mb-1">Product Images</span>

                <ImageUploadField
                  label="Primary Image URL / File Upload"
                  required
                  preset="product"
                  value={primaryImage}
                  onChange={setPrimaryImage}
                />

                <ImageUploadField
                  label="Secondary Hover Image URL / Upload"
                  preset="product"
                  value={secondaryImage}
                  onChange={setSecondaryImage}
                />
              </div>

              {/* Product Video — auto-optimized before upload */}
              <div className="p-3 border border-[#D4AF37]/10 rounded bg-[#1A0508]/5">
                <label className="text-[10px] tracking-wider text-[#D4AF37] font-bold block uppercase mb-1">Product Video</label>
                <VideoUploadField
                  label="Video URL / Upload"
                  value={productVideo}
                  onChange={(url) => setProductVideo(url)}
                />
              </div>


              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-xs tracking-wider uppercase transition-all duration-300 rounded cursor-pointer"
                >
                  {isEditing ? "Update Product" : "Add Product"}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-3 bg-cream-200 text-espresso/70 font-bold text-xs tracking-wider uppercase rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Product list table */}
          <div className="lg:col-span-7 bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4 overflow-x-auto">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
              ALL PRODUCTS ({products.length})
            </h3>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D4AF37]/20 text-[10px] tracking-wider text-espresso/60 uppercase">
                  <th className="py-2.5">Product</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/5 font-medium">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#1A0508]/5">
                    <td className="py-3 pr-2 flex items-center gap-3">
                      <img src={prod.primaryImage} alt={prod.name} className="w-8 h-10 object-cover rounded border border-[#D4AF37]/10" />
                      <div className="min-w-0">
                        <span className="font-bold text-maroon-900 block truncate">{prod.name}</span>
                        <span className="text-[9px] text-espresso/40 block font-mono">{prod.id}</span>
                      </div>
                    </td>
                    <td className="py-3 text-espresso/80 uppercase">{prod.category}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(prod)}
                          className="p-1.5 bg-cream-200 text-espresso/70 hover:bg-[#D4AF37] hover:text-[#1A0508] rounded transition-colors cursor-pointer"
                          title="Edit product"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${prod.name}"?`)) {
                              onDeleteProduct(prod.id);
                            }
                          }}
                          className="p-1.5 bg-red-100 text-red-700 hover:bg-red-500 hover:text-white rounded transition-colors cursor-pointer"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* FEATURED COLLECTION TAB */}
      {activeTab === "featured" && (
        <div id="tab-featured" className="space-y-8 animate-fade-in">

          {/* Currently featured */}
          <div className="bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-[#D4AF37]" />
              FEATURED COLLECTION ({featuredList.length})
            </h3>
            <p className="text-[11px] text-espresso/60 leading-relaxed">
              These products appear in the "Featured Collection" section on the homepage. Replace an
              image below to update it everywhere, or remove a product from the collection.
            </p>

            {featuredList.length === 0 ? (
              <div className="text-center py-12 text-espresso/50 text-xs font-semibold uppercase">
                No featured products yet — add some from the list below.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {featuredList.map((prod) => (
                  <div key={prod.id} className="p-3 border border-[#D4AF37]/15 bg-[#1A0508]/5 rounded-lg space-y-3">
                    <div className="flex items-start gap-3">
                      <img src={prod.primaryImage} alt={prod.name} className="w-14 h-18 object-cover rounded border border-[#D4AF37]/15" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-maroon-900 text-xs block truncate">{prod.name}</span>
                        <span className="text-[9px] text-espresso/50 uppercase block">{categoryName(prod.category)}</span>
                        <span className="text-[9px] text-espresso/40 font-mono block">{prod.id}</span>
                      </div>
                    </div>

                    {/* Replace the featured image (same optimized upload as products) */}
                    <ImageUploadField
                      label="Featured Image"
                      preset="product"
                      value={prod.primaryImage}
                      onChange={(url) =>
                        onUpdateProduct({ ...prod, primaryImage: url, images: [url, ...prod.images.slice(1)] })
                      }
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(prod)}
                        className="flex-1 py-2 bg-cream-200 text-espresso/80 hover:bg-[#D4AF37] hover:text-[#1A0508] font-bold text-[10px] tracking-wider uppercase rounded transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => onToggleFeatured(prod.id, false)}
                        className="flex-1 py-2 bg-cream-200 text-red-700 hover:bg-red-700 hover:text-white font-bold text-[10px] tracking-wider uppercase rounded transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All products — add to featured */}
          <div className="bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4 overflow-x-auto">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
              ALL PRODUCTS ({products.length})
            </h3>
            <p className="text-[11px] text-espresso/60">Add any product to the Featured Collection with one click.</p>

            {products.length === 0 ? (
              <div className="text-center py-12 text-espresso/50 text-xs font-semibold uppercase">No products yet.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#D4AF37]/20 text-[10px] tracking-wider text-espresso/60 uppercase">
                    <th className="py-2.5">Product</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5">Subcategory</th>
                    <th className="py-2.5 text-center">Featured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/5 font-medium">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#1A0508]/5">
                      <td className="py-3 pr-2 flex items-center gap-3">
                        <img src={prod.primaryImage} alt={prod.name} className="w-8 h-10 object-cover rounded border border-[#D4AF37]/10" />
                        <div className="min-w-0">
                          <span className="font-bold text-maroon-900 block truncate">{prod.name}</span>
                          <span className="text-[9px] text-espresso/40 block font-mono">{prod.id}</span>
                        </div>
                      </td>
                      <td className="py-3 text-espresso/80 uppercase">{categoryName(prod.category)}</td>
                      <td className="py-3 text-espresso/60 uppercase">{subcategoryName(prod.category, prod.subcategory)}</td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => onToggleFeatured(prod.id, !prod.isFeatured)}
                          title={prod.isFeatured ? "Remove from Featured Collection" : "Add to Featured Collection"}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-wider uppercase border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            prod.isFeatured
                              ? "bg-[#D4AF37] text-[#1A0508] border-[#D4AF37] hover:bg-[#1A0508] hover:text-[#D4AF37]"
                              : "bg-cream-50 text-espresso/70 border-[#D4AF37]/20 hover:border-[#D4AF37] hover:text-maroon-900"
                          }`}
                        >
                          <Star className={`w-3 h-3 ${prod.isFeatured ? "fill-[#1A0508]" : ""}`} />
                          {prod.isFeatured ? "Featured" : "Add"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Featured videos */}
          <div className="bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2 flex items-center gap-2">
              <Film className="w-4 h-4 text-[#D4AF37]" />
              FEATURED VIDEOS ({featuredVideoList.length})
            </h3>
            <p className="text-[11px] text-espresso/60 leading-relaxed">
              These videos play on the homepage, directly beneath the featured products.
              Upload new videos in the <span className="font-bold">Videos</span> tab.
            </p>

            {featuredVideoList.length === 0 ? (
              <div className="text-center py-12 text-espresso/50 text-xs font-semibold uppercase">
                No featured videos yet — add one from the list below.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {featuredVideoList.map((vid) => (
                  <div key={vid.id} className="p-3 border border-[#D4AF37]/15 bg-[#1A0508]/5 rounded-lg space-y-3">
                    <video src={vid.video_url} controls preload="metadata" className="w-full aspect-video object-cover rounded border border-[#D4AF37]/15 bg-black" />
                    <div className="min-w-0">
                      <span className="font-bold text-maroon-900 text-xs block truncate">{vid.title || "Untitled video"}</span>
                      <span className="text-[9px] text-espresso/40 font-mono block truncate">{vid.id}</span>
                    </div>
                    <button
                      onClick={() => onUpdateVideo({ ...vid, section: "hero" })}
                      className="w-full py-2 bg-cream-200 text-red-700 hover:bg-red-700 hover:text-white font-bold text-[10px] tracking-wider uppercase rounded transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove from Featured
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All videos — add to featured */}
          <div className="bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4 overflow-x-auto">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
              ALL VIDEOS ({videos.length})
            </h3>
            <p className="text-[11px] text-espresso/60">Add any uploaded video to the Featured Collection with one click.</p>

            {videos.length === 0 ? (
              <div className="text-center py-12 text-espresso/50 text-xs font-semibold uppercase">
                No videos uploaded yet — add them in the Videos tab.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#D4AF37]/20 text-[10px] tracking-wider text-espresso/60 uppercase">
                    <th className="py-2.5">Video</th>
                    <th className="py-2.5">Placement</th>
                    <th className="py-2.5 text-center">Featured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/5 font-medium">
                  {videos.map((vid) => {
                    const isFeaturedVideo = vid.section === "featured";
                    return (
                      <tr key={vid.id} className="hover:bg-[#1A0508]/5">
                        <td className="py-3 pr-2">
                          <span className="font-bold text-maroon-900 block truncate">{vid.title || "Untitled video"}</span>
                          <span className="text-[9px] text-espresso/40 block font-mono truncate max-w-xs">{vid.video_url}</span>
                        </td>
                        <td className="py-3 text-espresso/70 uppercase">{VIDEO_PLACEMENTS[vid.section] || vid.section}</td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => onUpdateVideo({ ...vid, section: isFeaturedVideo ? "hero" : "featured" })}
                            title={isFeaturedVideo ? "Remove from Featured Collection" : "Add to Featured Collection"}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-wider uppercase border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                              isFeaturedVideo
                                ? "bg-[#D4AF37] text-[#1A0508] border-[#D4AF37] hover:bg-[#1A0508] hover:text-[#D4AF37]"
                                : "bg-cream-50 text-espresso/70 border-[#D4AF37]/20 hover:border-[#D4AF37] hover:text-maroon-900"
                            }`}
                          >
                            <Star className={`w-3 h-3 ${isFeaturedVideo ? "fill-[#1A0508]" : ""}`} />
                            {isFeaturedVideo ? "Featured" : "Add"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ENQUIRIES TAB */}
      {activeTab === "bookings" && (
        <div id="tab-bookings" className="bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4 overflow-x-auto animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D4AF37]/10 pb-2">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm">
              CUSTOMER ENQUIRIES ({bookings.length})
              {unreadCount > 0 && <span className="ml-2 text-[10px] text-red-700 normal-case font-bold">{unreadCount} unread</span>}
            </h3>
            {bookings.length > 0 && (
              <button
                onClick={exportEnquiriesCsv}
                className="px-3 py-1.5 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-[10px] tracking-wider uppercase rounded transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5" /> Export CSV
              </button>
            )}
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-16 text-espresso/50 text-xs font-semibold uppercase">No enquiries yet.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D4AF37]/20 text-[10px] tracking-wider text-espresso/60 uppercase">
                  <th className="py-2.5">Customer Details</th>
                  <th className="py-2.5">Date & Time</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Follow-up notes</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/5 font-medium">
                {bookings.map((booking, idx) => {
                  const unread = booking.isRead !== true;
                  return (
                  <tr key={booking.id || idx} className={`hover:bg-[#1A0508]/5 ${unread ? "bg-blue-50/40" : ""}`}>
                    <td className={`py-3 pr-2 ${unread ? "border-l-2 border-blue-500" : "border-l-2 border-transparent"} pl-2`}>
                      <span className="font-bold text-maroon-900 flex items-center gap-1.5">
                        {unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Unread" />}
                        {booking.name}
                      </span>
                      <span className="text-[10px] text-espresso/60 block font-mono">Ph: {booking.phone}</span>
                      <span className="text-[10px] text-espresso/60 block">{booking.email}</span>
                      {booking.notes && (
                        <span className="text-[10px] text-espresso/50 block italic mt-1 max-w-[16rem]">Customer: "{booking.notes}"</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="font-bold text-espresso/80 block">{formatDateDDMonYYYY(booking.date)}</span>
                      <span className="text-[10px] text-gold-700 block uppercase font-bold">{booking.timeSlot}</span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 bg-maroon-900/10 text-maroon-900 rounded font-bold text-[9px] uppercase">
                        {booking.consultationType}
                      </span>
                    </td>
                    <td className="py-3 min-w-[12rem]">
                      <textarea
                        defaultValue={booking.adminNotes || ""}
                        placeholder="Called on… / notes"
                        disabled={!booking.id}
                        onBlur={(e) => booking.id && e.target.value !== (booking.adminNotes || "") && onUpdateBookingNotes(booking.id, e.target.value)}
                        className="w-full bg-cream-50 border border-gold-500/20 p-1.5 text-[11px] rounded focus:outline-none focus:border-gold-500 text-espresso h-14 resize-none"
                      />
                    </td>
                    <td className="py-3">
                      <select
                        aria-label="Enquiry status"
                        value={booking.status || "New"}
                        disabled={!booking.id}
                        onChange={(e) =>
                          booking.id && onUpdateBookingStatus(booking.id, e.target.value as BookingStatus)
                        }
                        className={`text-[10px] font-bold uppercase tracking-wider rounded px-2 py-1 border cursor-pointer focus:outline-none ${STATUS_STYLES[booking.status || "New"]}`}
                      >
                        {BOOKING_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => booking.id && onMarkBookingRead(booking.id, unread)}
                          disabled={!booking.id}
                          title={unread ? "Mark as read" : "Mark as unread"}
                          className="px-2 py-1 bg-cream-200 text-espresso/70 hover:bg-[#D4AF37] hover:text-[#1A0508] rounded transition-colors cursor-pointer text-[9px] font-bold uppercase tracking-wider disabled:opacity-40"
                        >
                          {unread ? "Mark read" : "Unread"}
                        </button>
                        <button
                          onClick={() => {
                            if (!booking.id) return;
                            if (confirm(`Delete enquiry from "${booking.name}"? This cannot be undone.`)) {
                              onDeleteBooking(booking.id);
                            }
                          }}
                          disabled={!booking.id}
                          title="Delete enquiry"
                          className="p-1.5 bg-cream-200 text-red-700 hover:bg-red-700 hover:text-white rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === "categories" && (
        <div id="tab-categories" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-xs font-semibold">
          
          {/* Add Category Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4">
              <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
                CREATE NEW CATEGORY
              </h3>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="text-espresso/70 block mb-1 uppercase">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                    placeholder="e.g. Traditional Wear"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-xs tracking-wider uppercase transition-all duration-300 rounded cursor-pointer"
                >
                  Add Category
                </button>
              </form>
            </div>

            {/* Add Subcategory Form */}
            <div className="bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4">
              <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
                CREATE SUBCATEGORY
              </h3>
              <form onSubmit={handleCreateSubcategory} className="space-y-4">
                <div>
                  <label className="text-espresso/70 block mb-1 uppercase">Parent Category *</label>
                  <select
                    required
                    value={selectedParentCatId}
                    onChange={(e) => setSelectedParentCatId(e.target.value)}
                    className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  >
                    <option value="">Select Parent Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-espresso/70 block mb-1 uppercase">Subcategory Name *</label>
                  <input
                    type="text"
                    required
                    value={newSubCatName}
                    onChange={(e) => setNewSubCatName(e.target.value)}
                    className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                    placeholder="e.g. Kanjivaram Sarees"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-xs tracking-wider uppercase transition-all duration-300 rounded cursor-pointer"
                >
                  Add Subcategory
                </button>
              </form>
            </div>
          </div>

          {/* Categories Curation Board */}
          <div className="lg:col-span-7 bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-6">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
              ALL CATEGORIES ({categories.length})
            </h3>
            
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 border border-[#D4AF37]/10 bg-[#1A0508]/5 rounded-lg space-y-3">
                  <div className="flex justify-between items-center border-b border-[#D4AF37]/15 pb-2">
                    <div>
                      <h4 className="font-display text-maroon-900 font-bold uppercase text-xs tracking-wider">{cat.name}</h4>
                      <span className="text-[9px] text-espresso/40 font-mono font-medium block">ID: {cat.id}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Delete category "${cat.name}"? This will delete all its subcategories.`)) {
                          onDeleteCategory(cat.id);
                        }
                      }}
                      className="text-red-700 hover:text-red-900 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>

                  {/* Subcategories list */}
                  <div className="pl-4 space-y-2">
                    <span className="text-[9px] tracking-wider text-espresso/40 font-bold block uppercase">Subcategories</span>
                    {cat.subcategories.length === 0 ? (
                      <span className="text-[10px] text-espresso/40 italic">No subcategories defined yet.</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {cat.subcategories.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-1.5 bg-[#D4AF37]/10 text-maroon-900 px-2 py-1 rounded border border-[#D4AF37]/25">
                            <span>{sub.name}</span>
                            <button
                              onClick={() => {
                                if (confirm(`Remove subcategory "${sub.name}"?`)) {
                                  handleDeleteSubcategory(cat.id, sub.id);
                                }
                              }}
                              className="text-red-700 hover:text-red-950 font-bold hover:scale-110 transition-transform cursor-pointer"
                              title="Delete subcategory"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* BANNERS TAB */}
      {activeTab === "banners" && (
        <div id="tab-banners" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-xs font-semibold">
          {/* Banner Creation form */}
          <div className="lg:col-span-5 bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
              {editingBannerId ? "EDIT HOME BANNER" : "CREATE NEW BANNER"}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const bannerData: HomepageBanner = {
                  id: editingBannerId || `bn-${Date.now()}`,
                  title: bannerTitle,
                  image_url: bannerImageUrl,
                  video_url: bannerVideoUrl || undefined,
                  button_text: bannerButtonText,
                  button_link: bannerButtonLink,
                  display_order: parseInt(bannerDisplayOrder) || 0,
                  is_active: true
                };
                if (editingBannerId) {
                  onUpdateBanner(bannerData);
                } else {
                  onAddBanner(bannerData);
                }
                setBannerTitle("");
                setBannerImageUrl("");
                setBannerVideoUrl("");
                setBannerButtonText("Explore Collection");
                setBannerButtonLink("shop");
                setBannerDisplayOrder("0");
                setEditingBannerId(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-espresso/70 block mb-1 uppercase">Banner Title / Header</label>
                <input
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  placeholder="e.g. Summer Sale Banner"
                />
              </div>

              <div>
                <span className="text-espresso/70 block mb-1 uppercase">Banner Image (auto-optimized WebP → ImgBB)</span>
                <ImageUploadField
                  label="Banner Image URL / Upload"
                  preset="banner"
                  value={bannerImageUrl}
                  onChange={setBannerImageUrl}
                />
              </div>

              <div>
                <span className="text-espresso/70 block mb-1 uppercase">Banner Video (auto-optimized MP4)</span>
                <VideoUploadField
                  label="Banner Video URL / Upload"
                  value={bannerVideoUrl}
                  onChange={(url) => setBannerVideoUrl(url)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-espresso/70 block mb-1 uppercase">Button Text</label>
                  <input
                    type="text"
                    value={bannerButtonText}
                    onChange={(e) => setBannerButtonText(e.target.value)}
                    className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  />
                </div>
                <div>
                  <label className="text-espresso/70 block mb-1 uppercase">Button Links To</label>
                  <select
                    value={bannerButtonLink}
                    onChange={(e) => setBannerButtonLink(e.target.value)}
                    className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  >
                    <option value="shop">Collections (Shop)</option>
                    <option value="home">Home</option>
                    <option value="about">About Us</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-espresso/70 block mb-1 uppercase">Display Order</label>
                <input
                  type="number"
                  value={bannerDisplayOrder}
                  onChange={(e) => setBannerDisplayOrder(e.target.value)}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-xs tracking-wider uppercase transition-all duration-300 rounded cursor-pointer"
              >
                {editingBannerId ? "Save Changes" : "Launch Banner"}
              </button>
            </form>
          </div>

          {/* Banner list */}
          <div className="lg:col-span-7 bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-6">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
              ACTIVE HOMEPAGE BANNERS
            </h3>
            <div className="space-y-4">
              {banners.map((b) => (
                <div key={b.id} className="p-4 border border-[#D4AF37]/10 bg-[#1A0508]/5 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-display text-maroon-900 font-bold uppercase text-xs">{b.title || "Untitled Banner"}</h4>
                    <span className="text-[9px] text-espresso/50 block">Link: {b.button_link} | Order: {b.display_order}</span>
                    {b.video_url && <span className="text-[9px] text-gold-600 block">✓ Suppabase Video Linked</span>}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setEditingBannerId(b.id);
                        setBannerTitle(b.title || "");
                        setBannerImageUrl(b.image_url || "");
                        setBannerVideoUrl(b.video_url || "");
                        setBannerButtonText(b.button_text || "Explore");
                        setBannerButtonLink(b.button_link || "shop");
                        setBannerDisplayOrder(b.display_order.toString());
                      }}
                      className="text-gold-600 hover:text-gold-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this banner?")) {
                          onDeleteBanner(b.id);
                        }
                      }}
                      className="text-red-700 hover:text-red-950 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIDEOS TAB */}
      {activeTab === "videos" && (
        <div id="tab-videos" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-xs font-semibold">
          {/* Video creation form */}
          <div className="lg:col-span-5 bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
              {editingVideoId ? "EDIT VIDEO PLACEMENT" : "LINK NEW VIDEO"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!videoUrl) {
                  alert("Video asset file or URL is required.");
                  return;
                }
                const vidData: VideoAsset = {
                  id: editingVideoId || `vd-${crypto.randomUUID()}`,
                  title: videoTitle,
                  section: videoSection,
                  video_url: videoUrl,
                  thumbnail_url: videoThumb || undefined,
                  duration: videoDuration ?? undefined,
                  file_size: videoFileSize ?? undefined,
                  resolution: videoResolution || undefined,
                  display_order: parseInt(videoDisplayOrder) || 0,
                  is_active: true
                };
                if (editingVideoId) {
                  onUpdateVideo(vidData);
                } else {
                  onAddVideo(vidData);
                }
                setVideoTitle("");
                setVideoUrl("");
                setVideoThumb("");
                setVideoDuration(null);
                setVideoFileSize(null);
                setVideoResolution("");
                setVideoDisplayOrder("0");
                setEditingVideoId(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-espresso/70 block mb-1 uppercase">Video Label / Title *</label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  placeholder="e.g. Varanasi Loom Cinematic Memoir"
                />
              </div>

              <div>
                <label className="text-espresso/70 block mb-1 uppercase">Placement Section *</label>
                <select
                  value={videoSection}
                  onChange={(e) => setVideoSection(e.target.value)}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                >
                  <option value="featured">Home — Featured Collection</option>
                  <option value="hero">Home — Hero Section</option>
                  <option value="about">About Us — Page Cover</option>
                  <option value="gallery">Home — Specialties Marquee</option>
                </select>
              </div>

              <div>
                <span className="text-espresso/70 block mb-1 uppercase">Video (auto-optimized MP4 + thumbnail)</span>
                <VideoUploadField
                  label="Video URL / Upload"
                  value={videoUrl}
                  onChange={(url, meta) => {
                    setVideoUrl(url);
                    if (meta) {
                      setVideoThumb(meta.thumbnailUrl || "");
                      setVideoDuration(meta.durationSeconds);
                      setVideoFileSize(meta.fileSizeBytes);
                      setVideoResolution(meta.resolution || "");
                    }
                  }}
                />
              </div>

              <div>
                <label className="text-espresso/70 block mb-1 uppercase">Display Order</label>
                <input
                  type="number"
                  value={videoDisplayOrder}
                  onChange={(e) => setVideoDisplayOrder(e.target.value)}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-xs tracking-wider uppercase transition-all duration-300 rounded cursor-pointer"
              >
                {editingVideoId ? "Save Video Placement" : "Publish Video"}
              </button>
            </form>
          </div>

          {/* Videos catalog list */}
          <div className="lg:col-span-7 bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-6">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
              ALL VIDEOS ({videos.length})
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {videos.map((v) => (
                <div key={v.id} className="p-4 border border-[#D4AF37]/10 bg-[#1A0508]/5 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-display text-maroon-900 font-bold uppercase text-xs">{v.title}</h4>
                    <span className="text-[9px] bg-gold-300/10 text-gold-600 border border-gold-500/25 px-1.5 py-0.5 rounded font-bold uppercase block mt-1 max-w-fit">Section: {v.section}</span>
                    <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-espresso/40 hover:underline block mt-1 truncate max-w-xs">{v.video_url}</a>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setEditingVideoId(v.id);
                        setVideoTitle(v.title);
                        setVideoSection(v.section);
                        setVideoUrl(v.video_url);
                        setVideoDisplayOrder(v.display_order.toString());
                      }}
                      className="text-gold-600 hover:text-gold-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this video?")) {
                          onDeleteVideo(v.id);
                        }
                      }}
                      className="text-red-700 hover:text-red-950 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REVIEWS / TESTIMONIALS TAB */}
      {activeTab === "reviews" && (
        <div id="tab-reviews" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-xs font-semibold">
          {/* Add review form */}
          <div className="lg:col-span-5 bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-[#D4AF37]" /> ADD CUSTOMER REVIEW
            </h3>
            <p className="text-[11px] text-espresso/60 leading-relaxed">
              These appear in the "What Our Customers Say" section on the homepage.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!reviewQuote.trim() || !reviewName.trim()) {
                  alert("Review text and customer name are required.");
                  return;
                }
                onAddTestimonial({
                  id: `tm-${crypto.randomUUID()}`,
                  quote: reviewQuote.trim(),
                  author: reviewName.trim(),
                  location: reviewLocation.trim() || undefined,
                  rating: reviewStars,
                  display_order: testimonials.length,
                  is_active: true,
                });
                setReviewQuote("");
                setReviewName("");
                setReviewLocation("");
                setReviewStars(5);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-espresso/70 block mb-1 uppercase">Review Text *</label>
                <textarea
                  required
                  value={reviewQuote}
                  onChange={(e) => setReviewQuote(e.target.value)}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium h-24 resize-none"
                  placeholder="e.g. The bridal lehenga was fitted to millimetre precision..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-espresso/70 block mb-1 uppercase">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                    placeholder="e.g. Priyanka Reddy"
                  />
                </div>
                <div>
                  <label className="text-espresso/70 block mb-1 uppercase">Location</label>
                  <input
                    type="text"
                    value={reviewLocation}
                    onChange={(e) => setReviewLocation(e.target.value)}
                    className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                    placeholder="e.g. Hyderabad"
                  />
                </div>
              </div>
              <div>
                <label className="text-espresso/70 block mb-1 uppercase">Rating</label>
                <select
                  value={reviewStars}
                  onChange={(e) => setReviewStars(parseInt(e.target.value))}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                >
                  <option value={5}>★★★★★ (5)</option>
                  <option value={4}>★★★★ (4)</option>
                  <option value={3}>★★★ (3)</option>
                  <option value={2}>★★ (2)</option>
                  <option value={1}>★ (1)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-xs tracking-wider uppercase transition-all duration-300 rounded cursor-pointer"
              >
                Add Review
              </button>
            </form>
          </div>

          {/* All reviews */}
          <div className="lg:col-span-7 bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
              ALL REVIEWS ({testimonials.length})
            </h3>
            {testimonials.length === 0 ? (
              <div className="text-center py-12 text-espresso/50 text-xs font-semibold uppercase leading-relaxed">
                No reviews added yet.<br />
                <span className="normal-case font-medium text-espresso/40">Until you add some, the homepage shows a few sample reviews.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {testimonials.map((t) => (
                  <div key={t.id} className="p-4 border border-[#D4AF37]/10 bg-[#1A0508]/5 rounded-lg flex gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-[#D4AF37] mb-1">
                        {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-[#D4AF37]" />
                        ))}
                      </div>
                      <p className="text-espresso/80 italic leading-relaxed">"{t.quote}"</p>
                      <span className="text-[10px] text-maroon-900 font-bold block mt-1.5 uppercase tracking-wider">
                        — {t.author}{t.location ? `, ${t.location}` : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Delete this review from "${t.author}"?`)) onDeleteTestimonial(t.id);
                      }}
                      title="Delete review"
                      className="p-1.5 bg-cream-200 text-red-700 hover:bg-red-700 hover:text-white rounded transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SITE EDITOR TAB */}
      {activeTab === "site" && (
        <SiteEditor content={content} onSave={onSaveContent} />
      )}

      {/* SETTINGS TAB */}
      {activeTab === "settings" && (
        <div id="tab-settings" className="max-w-3xl bg-cream-100 border border-[#D4AF37]/20 p-8 rounded-lg animate-fade-in text-xs font-semibold space-y-6">

          {/* Change the signed-in admin's password (Supabase Auth) */}
          <div className="border border-[#D4AF37]/25 rounded-lg p-5 bg-[#1A0508]/5">
            <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2 mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#D4AF37]" /> Change Admin Password
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCredError("");
                if (credPassword.length < 8) { setCredError("Password must be at least 8 characters."); return; }
                if (credPassword !== credConfirm) { setCredError("Passwords do not match."); return; }
                onChangeAdminPassword(credPassword);
                setCredPassword("");
                setCredConfirm("");
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="md:col-span-2">
                <label className="text-espresso/70 block mb-1 uppercase">Signed in as</label>
                <input
                  type="text"
                  value={adminUsername}
                  disabled
                  className="w-full bg-cream-200/60 border border-gold-500/20 p-2 text-xs rounded text-espresso/70 font-medium cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-espresso/70 block mb-1 uppercase">New Password</label>
                <input
                  type="password"
                  value={credPassword}
                  onChange={(e) => { setCredPassword(e.target.value); setCredError(""); }}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-espresso/70 block mb-1 uppercase">Confirm Password</label>
                <input
                  type="password"
                  value={credConfirm}
                  onChange={(e) => { setCredConfirm(e.target.value); setCredError(""); }}
                  className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
              </div>
              {credError && <p className="md:col-span-2 text-red-600 font-bold">{credError}</p>}
              <button
                type="submit"
                className="md:col-span-2 py-2.5 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-xs tracking-wider uppercase transition-all duration-300 rounded cursor-pointer"
              >
                Update Password
              </button>
            </form>
            <p className="text-[10px] text-espresso/50 mt-3 leading-relaxed">
              This updates your Supabase account password. Your email is managed in the Supabase dashboard.
            </p>
          </div>

          <h3 className="font-display font-bold text-maroon-900 uppercase text-sm border-b border-[#D4AF37]/10 pb-2">
STORE DETAILS
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Reject anything that isn't a real http(s) URL — a stored
              // `javascript:` value would otherwise run in every visitor's
              // browser via the footer links.
              const urlFields: [string, string][] = [
                ["Google Maps link", boutiqueMaps],
                ["Instagram URL", boutiqueInsta],
                ["Facebook URL", boutiqueFb],
                ["Logo URL", boutiqueLogo],
              ];
              for (const [label, value] of urlFields) {
                if (value && !isValidHttpUrl(value)) {
                  alert(`${label} must be a valid link starting with http:// or https://`);
                  return;
                }
              }
              onUpdateSettings({
                id: "boutique_config",
                boutique_name: boutiqueName,
                logo: boutiqueLogo,
                contact_number: boutiqueContact,
                whatsapp_number: boutiqueWhatsapp,
                email: boutiqueEmail,
                address: boutiqueAddress,
                google_maps_link: boutiqueMaps,
                instagram_url: boutiqueInsta,
                facebook_url: boutiqueFb,
                footer_text: boutiqueFooter,
                business_hours: boutiqueHours
              });
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div>
              <label className="text-espresso/70 block mb-1 uppercase">Store Name *</label>
              <input
                type="text"
                required
                value={boutiqueName}
                onChange={(e) => setBoutiqueName(e.target.value)}
                className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
              />
            </div>

            <div>
              <span className="text-espresso/70 block mb-1 uppercase">Website Logo (auto-optimized WebP → ImgBB)</span>
              <ImageUploadField
                label="Logo URL / Upload"
                preset="logo"
                value={boutiqueLogo}
                onChange={setBoutiqueLogo}
              />
            </div>

            <div>
              <label className="text-espresso/70 block mb-1 uppercase">Contact number</label>
              <input
                type="text"
                value={boutiqueContact}
                onChange={(e) => setBoutiqueContact(e.target.value)}
                className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
              />
            </div>

            <div>
              <label className="text-espresso/70 block mb-1 uppercase">WhatsApp Number</label>
              <input
                type="text"
                value={boutiqueWhatsapp}
                onChange={(e) => setBoutiqueWhatsapp(e.target.value)}
                className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
              />
            </div>

            <div>
              <label className="text-espresso/70 block mb-1 uppercase">Email Address</label>
              <input
                type="email"
                value={boutiqueEmail}
                onChange={(e) => setBoutiqueEmail(e.target.value)}
                className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
              />
            </div>

            <div>
              <label className="text-espresso/70 block mb-1 uppercase">Business Hours</label>
              <input
                type="text"
                value={boutiqueHours}
                onChange={(e) => setBoutiqueHours(e.target.value)}
                className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-espresso/70 block mb-1 uppercase">Physical Address</label>
              <input
                type="text"
                value={boutiqueAddress}
                onChange={(e) => setBoutiqueAddress(e.target.value)}
                className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-espresso/70 block mb-1 uppercase">Google Maps Link</label>
              <input
                type="text"
                value={boutiqueMaps}
                onChange={(e) => setBoutiqueMaps(e.target.value)}
                className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
              />
            </div>

            <div>
              <label className="text-espresso/70 block mb-1 uppercase">Instagram URL</label>
              <input
                type="text"
                value={boutiqueInsta}
                onChange={(e) => setBoutiqueInsta(e.target.value)}
                className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
              />
            </div>

            <div>
              <label className="text-espresso/70 block mb-1 uppercase">Facebook URL</label>
              <input
                type="text"
                value={boutiqueFb}
                onChange={(e) => setBoutiqueFb(e.target.value)}
                className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-espresso/70 block mb-1 uppercase">Footer Text</label>
              <input
                type="text"
                value={boutiqueFooter}
                onChange={(e) => setBoutiqueFooter(e.target.value)}
                className="w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
              />
            </div>

            <button
              type="submit"
              className="md:col-span-2 py-3 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-xs tracking-wider uppercase transition-all duration-300 rounded cursor-pointer"
            >
              Update settings
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
