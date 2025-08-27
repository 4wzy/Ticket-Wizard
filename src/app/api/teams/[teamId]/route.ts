import { NextRequest, NextResponse } from 'next/server';
import { teamService, teamMembershipService } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';

// GET /api/teams/[teamId] - Get team details
export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Check user permissions
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const team = await teamService.getById(resolvedParams.teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user can access this team
    let canAccess = profile.org_role === 'org_admin'; // Org admins can access any team
    
    if (!canAccess) {
      // Check if user is a member of this team
      const userMemberships = await teamMembershipService.getUserMemberships(user.id);
      canAccess = userMemberships.some(tm => tm.team_id === resolvedParams.teamId);
    }

    if (!canAccess) {
      return NextResponse.json({ error: 'Insufficient permissions to access this team' }, { status: 403 });
    }

    // Get team members
    const members = await teamService.getMembers(resolvedParams.teamId);

    return NextResponse.json({
      team,
      members
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/teams/[teamId] - Update team (org admins and team admins)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, description, token_limit, settings } = body;

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

    // Check if user can update this team
    let canUpdate = profile?.org_role === 'org_admin'; // Org admins can update any team
    
    if (!canUpdate) {
      // Check if user is a team admin of this team
      const isTeamAdmin = await teamMembershipService.hasTeamRole(user.id, resolvedParams.teamId, 'team_admin');
      canUpdate = isTeamAdmin;
    }

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update team
    const updatedTeam = await teamService.update(resolvedParams.teamId, {
      name,
      description,
      token_limit,
      settings,
      updated_at: new Date().toISOString()
    });

    if (!updatedTeam) {
      return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
    }

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId] - Delete team (org admins only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Check if user is org admin
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('org_role')
      .eq('id', user.id)
      .single();

    if (profile?.org_role !== 'org_admin') {
      return NextResponse.json({ error: 'Organization admin access required' }, { status: 403 });
    }

    const success = await teamService.delete(resolvedParams.teamId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}