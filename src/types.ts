export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  originalPrice?: number; // For elegant sale/heritage curation comparisons
  description: string;
  details: string[]; // Materials, care, craftsmanship info
  primaryImage: string;
  secondaryImage: string; // For the 1% boutique hover-image-swap effect
  images: string[]; // PDP thumbnail rail
  inStock: boolean;
  stockCount: number;
  sizes: string[]; // e.g., ["XS", "S", "M", "L", "XL", "Custom Measure"]
  rating: number;
  reviews: Review[];
  signatureNote?: string; // Artisan's special note, e.g., "Handcrafted in Banaras over 120 hours"
  isFeatured?: boolean; // Shown in the homepage "Featured Collection"
  video_url?: string;
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  quantity: number;
  customMeasurements?: {
    bust?: number;
    waist?: number;
    hips?: number;
    height?: number;
    additionalNotes?: string;
  };
}

export type BookingStatus = "New" | "Contacted" | "Confirmed" | "Completed" | "Cancelled";

export const BOOKING_STATUSES: BookingStatus[] = [
  "New",
  "Contacted",
  "Confirmed",
  "Completed",
  "Cancelled",
];

export interface ConciergeBooking {
  id?: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  timeSlot: string;
  consultationType: "Bridal Fitting" | "Groom Outfit" | "Custom Measurements" | "Online Consultation";
  notes?: string;
  status?: BookingStatus;
  adminNotes?: string; // internal follow-up notes (not shown to customers)
  isRead?: boolean;
}

export interface OrderDetails {
  id?: string;
  date?: string;
  shipping: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  payment: {
    cardName: string;
    cardNumber: string;
    expiry: string;
    cvv: string;
  };
  cartItems: CartItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
}

export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
  description?: string;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface HomepageBanner {
  id: string;
  title?: string;
  image_url?: string;
  video_url?: string;
  button_text?: string;
  button_link?: string;
  display_order: number;
  is_active: boolean;
}

export interface Collection {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  video_url?: string;
  is_active: boolean;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  location?: string;
  rating?: number;
  display_order?: number;
  is_active?: boolean;
}

export interface VideoAsset {
  id: string;
  title: string;
  /** Placement: "featured" | "hero" | "about" | "gallery" */
  section: string;
  video_url: string;
  /** Auto-generated WebP poster frame (hosted on ImgBB). */
  thumbnail_url?: string;
  /** Seconds. */
  duration?: number;
  /** Bytes, after optimization. */
  file_size?: number;
  /** e.g. "1920x1080". */
  resolution?: string;
  display_order: number;
  is_active: boolean;
}

export interface BoutiqueSettings {
  id: string;
  boutique_name: string;
  logo?: string;
  contact_number?: string;
  whatsapp_number?: string;
  email?: string;
  address?: string;
  google_maps_link?: string;
  instagram_url?: string;
  facebook_url?: string;
  footer_text?: string;
  business_hours?: string;
}
