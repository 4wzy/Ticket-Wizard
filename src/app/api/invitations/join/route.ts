import { NextRequest, NextResponse } from 'next/server';
import { joinOrganizationWithInvite } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // Validate invite code format (8 characters, alphanumeric)
    const codeRegex = /^[A-Z0-9]{8}$/;
    if (!codeRegex.test(inviteCode.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid invite code format' }, { status: 400 });
    }

    // Get the authenticated user using hybrid authentication
    const { user, error: authError, method } = await getAuthenticatedUser(request);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('Auth method used:', method);

    if (!user.email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    // Join organization using invite code
    const result = await joinOrganizationWithInvite(
      user.id,
      user.email,
      inviteCode.toUpperCase()
    );

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
    console.error('Error joining with invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}