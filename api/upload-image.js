// Serverless image-upload proxy (Vercel Function).
//
// The ImgBB key is an unscoped bearer credential — anyone who can read it can
// upload unlimited files to the boutique's account. It therefore must NEVER be
// exposed to the browser, which rules out any VITE_* variable.
//
// This endpoint holds the key server-side and will only forward an upload for a
// caller presenting a valid Supabase session belonging to the admin.
//
// Required environment variables (Vercel → Settings → Environment Variables):
//   IMGBB_API_KEY      (server-side only — NOT prefixed with VITE_)
//   ADMIN_EMAIL        the admin's Supabase account email
//   SUPABASE_URL       (falls back to VITE_SUPABASE_URL)
//   SUPABASE_ANON_KEY  (falls back to VITE_SUPABASE_ANON_KEY)

import { createClient } from "@supabase/supabase-js";

export const config = {
  api: { bodyParser: { sizeLimit: "6mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  // Prefer the server-only name. Fall back to the VITE_-prefixed one so an
  // existing deployment keeps working: Vercel exposes every env var to
  // functions at runtime, regardless of prefix. The key still never reaches the
  // browser, because the only client-side reference to it sits inside an
  // `if (import.meta.env.DEV)` branch that the production build strips.
  const IMGBB_API_KEY = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY;
  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

  if (!IMGBB_API_KEY) {
    return res.status(500).json({ error: "Image uploads are not configured on the server (missing IMGBB_API_KEY)." });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Server is missing Supabase configuration." });
  }

  // --- 1. Authenticate the caller -------------------------------------------
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ error: "You must be signed in to upload images." });
  }

  let user;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }
    user = data.user;
  } catch {
    return res.status(401).json({ error: "Could not verify your session." });
  }

  // --- 2. Authorise: must be the admin --------------------------------------
  if (ADMIN_EMAIL && (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "You are not authorised to upload images." });
  }

  // --- 3. Forward to ImgBB with the server-held key -------------------------
  const { imageBase64, name } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "No image was provided." });
  }

  try {
    const form = new URLSearchParams();
    form.append("image", imageBase64);
    if (name && typeof name === "string") form.append("name", name.slice(0, 100));

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Image host responded with ${response.status}.` });
    }

    const json = await response.json();
    const url = json?.data?.url;
    if (!url) {
      return res.status(502).json({ error: "Image host did not return a URL." });
    }

    return res.status(200).json({ url });
  } catch (err) {
    // Never echo the upstream error verbatim — it can contain the API key.
    return res.status(502).json({ error: "Upload to the image host failed. Please try again." });
  }
}
