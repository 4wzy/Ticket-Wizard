import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin();
    
    // Get all organizations with member counts
    const { data: orgs, error } = await supabaseAdmin
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        domain,
        plan_tier,
        created_at,
        user_profiles(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    // Format the response
    const formattedOrgs = orgs?.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      domain: org.domain || 'No domain',
      plan_tier: org.plan_tier,
      member_count: org.user_profiles?.length || 0,
      created_at: org.created_at
    })) || [];

    return NextResponse.json({
      organizations: formattedOrgs,
      total: formattedOrgs.length
    });
  } catch (error) {
    console.error('Error in organizations list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}