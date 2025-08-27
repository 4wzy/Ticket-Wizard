import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';

// GET /api/teams - Get teams for user's organization
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, method } = await getAuthenticatedUser(request);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('Auth method used:', method);

    // Get user's organization
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'User not in organization' }, { status: 400 });
    }

    // Get teams for organization
    const teams = await teamService.getByOrganization(profile.organization_id);

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/teams - Create new team (org admins only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, slug, description, tokenLimit } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const { user, error: authError, method } = await getAuthenticatedUser(request);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('Auth method used:', method);

    // Check if user is org admin
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    if (!profile?.organization_id) {
      console.error('No organization_id for user:', user.id);
      return NextResponse.json({ error: 'User not in organization' }, { status: 403 });
    }

    if (profile.org_role !== 'org_admin') {
      console.error('User is not org admin:', { userId: user.id, orgRole: profile.org_role });
      return NextResponse.json({ error: 'Organization admin access required' }, { status: 403 });
    }

    // Create team
    const team = await teamService.create({
      organization_id: profile.organization_id,
      name,
      slug,
      description,
      token_limit: tokenLimit
    });

    if (!team) {
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}