import { NextRequest, NextResponse } from 'next/server';
import { joinOrganizationBySlug } from '@/lib/database';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { userId, orgSlug } = await request.json();

    if (!userId || !orgSlug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate orgSlug format (basic)
    const slugRegex = /^[a-z0-9\-]+$/;
    if (!slugRegex.test(orgSlug)) {
      return NextResponse.json({ error: 'Invalid organization slug format' }, { status: 400 });
    }

    // Verify user exists and is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Join organization
    const result = await joinOrganizationBySlug(userId, orgSlug);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to join organization' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      organization: result.organization,
      message: `Successfully joined ${result.organization?.name}`
    });
  } catch (error) {
    console.error('Error joining organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}