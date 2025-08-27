import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore cookie set errors in API routes
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignore cookie remove errors in API routes
          }
        },
      },
    }
  );
}

// Alternative approach: Get user from Authorization header
export async function getAuthedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return { user: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  return { user, error };
}

// Simple server client for API routes
export function createSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Hybrid approach: Try both methods, but prioritize Authorization header for API routes
export async function getAuthenticatedUser(request: NextRequest) {
  // First try Authorization header (works best for API routes)
  const { user, error } = await getAuthedUser(request);
  
  if (user && !error) {
    return { user, error: null, method: 'header' };
  }

  // Fallback to server client (for SSR)
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: ssrUser }, error: ssrError } = await supabase.auth.getUser();
    
    if (ssrUser && !ssrError) {
      return { user: ssrUser, error: null, method: 'ssr' };
    }
  } catch (error) {
    console.log('SSR auth failed:', error);
  }

  return { user: null, error: error || 'Authentication failed', method: 'none' };
}