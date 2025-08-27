import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { teamMembershipService, teamService } from '@/lib/database';
import { createSupabaseAdmin } from '@/lib/supabaseClient';

// GET /api/users/[userId]/teams - Get all teams for a user
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();
    
    // Check permissions - user can view their own teams, or org admins can view any user's teams
    const { data: requestingUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    const { data: targetUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', params.userId)
      .single();

    const canView = 
      user.id === params.userId || // User viewing their own teams
      (requestingUserProfile?.org_role === 'org_admin' && 
       requestingUserProfile.organization_id === targetUserProfile?.organization_id); // Org admin viewing user in same org

    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get user's team memberships
    const memberships = await teamMembershipService.getUserMemberships(params.userId);

    return NextResponse.json({
      userId: params.userId,
      teamMemberships: memberships.map(membership => ({
        id: membership.id,
        teamId: membership.team_id,
        teamName: membership.team?.name || 'Unknown',
        teamSlug: membership.team?.slug || '',
        teamRole: membership.team_role,
        joinedAt: membership.joined_at
      }))
    });
  } catch (error) {
    console.error('Error fetching user teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users/[userId]/teams - Add user to a team
export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { teamId, teamRole = 'member' } = body;

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Check permissions
    const { data: requestingUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    const { data: targetUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', params.userId)
      .single();

    // Verify team exists and is in the same organization
    const team = await teamService.getById(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const canManage = 
      (requestingUserProfile?.org_role === 'org_admin' && 
       requestingUserProfile.organization_id === targetUserProfile?.organization_id &&
       requestingUserProfile.organization_id === team.organization_id) || // Org admin
      (await teamMembershipService.hasTeamRole(user.id, teamId, 'team_admin')); // Team admin

    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions to manage team membership' }, { status: 403 });
    }

    // Add user to team
    const membership = await teamMembershipService.addUserToTeam(params.userId, teamId, teamRole);
    if (!membership) {
      return NextResponse.json({ error: 'Failed to add user to team' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      membership: {
        id: membership.id,
        teamId: membership.team_id,
        teamRole: membership.team_role,
        joinedAt: membership.joined_at
      }
    });
  } catch (error) {
    console.error('Error adding user to team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[userId]/teams?teamId=... - Remove user from a team
export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Check permissions
    const { data: requestingUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    const { data: targetUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', params.userId)
      .single();

    const canManage = 
      (requestingUserProfile?.org_role === 'org_admin' && 
       requestingUserProfile.organization_id === targetUserProfile?.organization_id) || // Org admin
      (await teamMembershipService.hasTeamRole(user.id, teamId, 'team_admin')); // Team admin

    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions to manage team membership' }, { status: 403 });
    }

    // Remove user from team
    const success = await teamMembershipService.removeUserFromTeam(params.userId, teamId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to remove user from team' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing user from team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}