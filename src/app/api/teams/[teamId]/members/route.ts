import { NextRequest, NextResponse } from 'next/server';
import { teamService, teamMembershipService } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';

// GET /api/teams/[teamId]/members - Get team members
export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Check permissions
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    const team = await teamService.getById(resolvedParams.teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user can view this team
    const canView = 
      (profile?.org_role === 'org_admin' && profile.organization_id === team.organization_id) || // Org admins can view teams in their org
      (await teamMembershipService.hasTeamRole(user.id, resolvedParams.teamId, 'team_admin')) || // Team admins can view their own team
      (await teamMembershipService.hasTeamRole(user.id, resolvedParams.teamId, 'member')) || // Team members can view their own team
      (await teamMembershipService.hasTeamRole(user.id, resolvedParams.teamId, 'viewer')); // Team viewers can view their own team

    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get team members using new service
    const members = await teamMembershipService.getTeamMemberships(resolvedParams.teamId);

    return NextResponse.json({
      teamId: resolvedParams.teamId,
      teamName: team.name,
      members: members.map(member => ({
        id: member.user_id,
        full_name: member.user?.full_name || 'Unknown',
        team_role: member.team_role,
        joined_at: member.joined_at,
        membershipId: member.id
      }))
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/members - Add member to team
export async function POST(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, teamRole } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Check permissions
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    // Get team to verify it exists and get organization
    const team = await teamService.getById(resolvedParams.teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user can manage this team
    const canManage = 
      (profile?.org_role === 'org_admin' && profile.organization_id === team.organization_id) || // Org admins can manage teams in their org
      (await teamMembershipService.hasTeamRole(user.id, resolvedParams.teamId, 'team_admin')); // Team admins can manage their own team

    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Add member to team using new service
    const membership = await teamMembershipService.addUserToTeam(userId, resolvedParams.teamId, teamRole || 'member');
    if (!membership) {
      return NextResponse.json({ error: 'Failed to add member to team' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId]/members/[userId] - Remove member from team
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Check permissions
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    const team = await teamService.getById(resolvedParams.teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user can manage this team
    const canManage = 
      (profile?.org_role === 'org_admin' && profile.organization_id === team.organization_id) || // Org admins can manage teams in their org
      (await teamMembershipService.hasTeamRole(user.id, resolvedParams.teamId, 'team_admin')); // Team admins can manage their own team

    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Remove member from team using new service
    const success = await teamMembershipService.removeUserFromTeam(userId, resolvedParams.teamId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to remove member from team' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/teams/[teamId]/members - Update member role
export async function PUT(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, teamRole } = body;

    if (!userId || !teamRole) {
      return NextResponse.json({ error: 'User ID and team role are required' }, { status: 400 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Check permissions
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    const team = await teamService.getById(resolvedParams.teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user can manage this team
    const canManage = 
      (profile?.org_role === 'org_admin' && profile.organization_id === team.organization_id) || // Org admins can manage teams in their org
      (await teamMembershipService.hasTeamRole(user.id, resolvedParams.teamId, 'team_admin')); // Team admins can manage their own team

    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update member role using new service
    const success = await teamMembershipService.updateUserTeamRole(userId, resolvedParams.teamId, teamRole);
    if (!success) {
      return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}