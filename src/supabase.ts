import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials are missing from environment variables. Operating in local mock fallback mode.");
}

let client;
try {
  // Supabase anon keys are JWTs and must start with "eyJ"
  if (supabaseAnonKey && !supabaseAnonKey.startsWith("eyJ")) {
    console.warn("VITE_SUPABASE_ANON_KEY does not appear to be a valid JWT (should start with 'eyJ'). Supabase operations might fail.");
  }
  client = createClient(supabaseUrl, supabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2siLCJyb2xlIjoiYW5vbiIsImlhdCI6MTU5MDAwMDAwMCwiZXhwIjoyMTkwMDAwMDAwfQ.mockkey");
} catch (err) {
  console.error("Error creating Supabase client, falling back to mock client:", err);
  client = createClient("https://placeholder-project.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2siLCJyb2xlIjoiYW5vbiIsImlhdCI6MTU5MDAwMDAwMCwiZXhwIjoyMTkwMDAwMDAwfQ.mockkey");
}

export const supabase = client;
