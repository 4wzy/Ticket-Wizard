import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for public operations (with RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
// This should only be used in server-side code (API routes, server components)
export const createSupabaseAdmin = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
