// Editable website content — everything here is managed from Admin → Site
// Editor and stored as a single JSON row in the `site_content` table
// (id = 'site'). The DB value is merged OVER these defaults, so the live site
// looks identical until the admin changes something, and any field the admin
// hasn't touched keeps its default.

export interface ServiceItem {
  title: string;
  body: string;
}

export interface JournalItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  readTime: string;
  image: string;
  content: string;
}

export interface SiteContent {
  // Top announcement bar (every page)
  announcement: string;

  // Homepage "Our Heritage & Craft" manifesto
  homeEyebrow: string;
  homeHeading: string;
  homeBody: string;

  // About Us page
  aboutEyebrow: string;
  aboutHeading: string;
  aboutIntro: string;
  aboutBody: string; // optional extra paragraphs (blank by default)

  // Services page
  servicesEyebrow: string;
  servicesHeading: string;
  servicesSubtitle: string;
  services: ServiceItem[];

  // Specialties ribbon (homepage moving strip)
  specialties: string[];

  // Journal / Stories
  journal: JournalItem[];

  // SEO / browser tab
  seoTitle: string;
  seoDescription: string;
}

export const SITE_CONTENT_DEFAULTS: SiteContent = {
  announcement: "Handcrafted in Machilipatnam · Custom orders welcome",

  homeEyebrow: "Since 2015 • Machilipatnam",
  homeHeading: "OUR HERITAGE & CRAFT",
  homeBody:
    "\"We believe high-fashion is an expression of heritage, not dynamic cycles. At Laxmi Designers, we support independent loom communities, ensuring our master weavers receive fair-trade livelihoods while crafting magnificent heirlooms meant to be passed down for centuries.\"",

  aboutEyebrow: "Laxmi Heritage & Loom Preservation",
  aboutHeading: "ABOUT LAXMI DESIGNERS",
  aboutIntro:
    "Laxmi Designers is a boutique specializing in maggam embroidery, blouse stitching, machine embroidery and designer dresses. We create elegant custom designs for weddings, festivals and special occasions.",
  aboutBody: "",

  servicesEyebrow: "Custom Tailoring & Crafts",
  servicesHeading: "OUR SPECIALIST SERVICES",
  servicesSubtitle: "Exquisite handcraftsmanship tailored to your absolute specifications",
  services: [
    {
      title: "Maggam Work",
      body:
        "Our signature offering. Experience generational embroidery handcrafted with thin, specialized metal needles (maggam). We embellish raw silk and velvet canvases with authentic zardozi wiring, pearls, and custom stone configurations tailored for royal bridal trousseaus.",
    },
    {
      title: "Machine Embroidery",
      body:
        "For contemporary silhouettes, we utilize high-precision multi-thread machines to render complex, dense floral scrolls and geometric lattice borders. Perfectly blends structural durability with modern editorial aesthetics.",
    },
    {
      title: "Blouse Stitching",
      body:
        "A masterwork drape requires absolute anatomical precision. Our master drapers oversee the custom fitting, neck shape cuts (Queen Anne, Sabya, deep-V), and padding support structure for every blouse, guaranteeing flawless comfort under heavy sarees.",
    },
    {
      title: "Designer Dresses",
      body:
        "Custom designer frocks, sweeping anarkalis, Indo-Western fusion wear, crop tops, and grand event garments designed, cut, and tailored for weddings, festivals, and special gatherings.",
    },
  ],

  specialties: [
    "Bridal Wear",
    "Maggam Work",
    "Blouse Stitching",
    "Designer Frocks",
    "Half Sarees",
    "Anarkalis",
    "Machine Embroidery",
    "Saree Draping",
    "Kids Wear",
    "Custom Tailoring",
  ],

  journal: [],

  seoTitle: "Laxmi Designers — Fashion Studio | Bridal, Sarees & Custom Couture",
  seoDescription:
    "Laxmi Designers — boutique fashion studio in Machilipatnam. Bridal wear, maggam embroidery, blouse stitching, half sarees, anarkalis and custom designer dresses.",
};

/** Merge a partial DB value over the defaults, returning a complete object. */
export function mergeSiteContent(data: Partial<SiteContent> | null | undefined): SiteContent {
  const d = data || {};
  return {
    ...SITE_CONTENT_DEFAULTS,
    ...d,
    // Arrays are replaced wholesale (admin edits the whole list), but fall back
    // to defaults when the stored value is missing/empty.
    services: Array.isArray(d.services) && d.services.length ? d.services : SITE_CONTENT_DEFAULTS.services,
    specialties: Array.isArray(d.specialties) && d.specialties.length ? d.specialties : SITE_CONTENT_DEFAULTS.specialties,
    journal: Array.isArray(d.journal) ? d.journal : SITE_CONTENT_DEFAULTS.journal,
  };
}
