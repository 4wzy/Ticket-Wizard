import { NextRequest, NextResponse } from 'next/server';
import { invitationService } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      organizationId, 
      teamId, // Legacy single team support
      teamIds, // New multi-team support
      email, 
      inviteType, 
      orgRole, 
      teamRole, // Legacy single team role
      teamMemberships, // New multi-team memberships
      maxUses, 
      expiresAt 
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validate invite type
    if (!inviteType || !['organization', 'team'].includes(inviteType)) {
      return NextResponse.json({ error: 'Invalid invite type. Must be "organization" or "team"' }, { status: 400 });
    }

    // For team invites, teamId or teamIds is required
    if (inviteType === 'team' && !teamId && (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0)) {
      return NextResponse.json({ error: 'Team ID(s) required for team invitations' }, { status: 400 });
    }

    // Get the authenticated user using hybrid authentication
    const { user, error: authError, method } = await getAuthenticatedUser(request);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('Auth method used:', method);

    // Validate org_role if provided
    if (orgRole && !['org_admin', 'member'].includes(orgRole)) {
      return NextResponse.json({ error: 'Invalid org role. Must be "org_admin" or "member"' }, { status: 400 });
    }

    // Validate team_role if provided
    if (teamRole && !['team_admin', 'member', 'viewer'].includes(teamRole)) {
      return NextResponse.json({ error: 'Invalid team role. Must be "team_admin", "member", or "viewer"' }, { status: 400 });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    // Validate maxUses if provided
    if (maxUses && (typeof maxUses !== 'number' || maxUses < 1 || maxUses > 1000)) {
      return NextResponse.json({ error: 'Max uses must be between 1 and 1000' }, { status: 400 });
    }

    // Validate expiration date if provided
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (isNaN(expDate.getTime()) || expDate <= new Date()) {
        return NextResponse.json({ error: 'Expiration date must be in the future' }, { status: 400 });
      }
    }

    // Create invitation with multi-team support
    const invitation = await invitationService.create({
      organization_id: organizationId,
      created_by: user.id,
      email,
      invite_type: inviteType,
      org_role: orgRole || 'member',
      max_uses: maxUses,
      expires_at: expiresAt,
      // Store team membership data in metadata for multi-team support
      metadata: {
        // Legacy single team support
        ...(teamId && { teamId, teamRole: teamRole || 'member' }),
        // New multi-team support
        ...(teamMemberships && Array.isArray(teamMemberships) && { teamMemberships })
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        invite_code: invitation.invite_code,
        email: invitation.email,
        invite_type: invitation.invite_type,
        org_role: invitation.org_role,
        max_uses: invitation.max_uses,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at,
        metadata: invitation.metadata
      }
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}