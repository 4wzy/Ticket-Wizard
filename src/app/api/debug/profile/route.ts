import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Try both server client and admin client approaches
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Also try getting from Authorization header like the old API
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header:', authHeader);
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required', 
        authError,
        headers: Object.fromEntries(request.headers.entries()),
        cookies: request.cookies.getAll()
      }, { status: 401 });
    }

    // Get full user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
      },
      profile,
      profileError
    });
  } catch (error) {
    console.error('Debug profile error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}