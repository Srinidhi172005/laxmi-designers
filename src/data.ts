import { Product } from "./types";

// Static demo data removed. Products are managed dynamically via the Admin panel
// and loaded from Supabase. This starts empty by design.
export const SAMPLE_PRODUCTS: Product[] = [];

// Static editorial stories removed. Kept as an empty export so consumers that
// map over STORIES simply render nothing until real content is added.
export const STORIES: {
  id: string;
  title: string;
  subtitle: string;
  readTime: string;
  image: string;
  date: string;
  content: string;
}[] = [];
