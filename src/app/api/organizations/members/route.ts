import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { teamMembershipService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();
    
    // Get organization details
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get members with their team memberships using new service
    const membersWithTeams = await teamMembershipService.getOrganizationUsersWithTeams(orgId);

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain || 'No domain',
        members: membersWithTeams.map(user => ({
          id: user.id,
          full_name: user.full_name || 'No name provided',
          org_role: user.org_role,
          status: user.status,
          joined_organization_at: user.joined_organization_at,
          team_memberships: user.team_memberships.map(membership => ({
            team_id: membership.team_id,
            team_name: membership.team?.name || 'Unknown',
            team_role: membership.team_role,
            joined_at: membership.joined_at
          })),
          // Legacy fields for backward compatibility
          team_id: user.team_memberships[0]?.team_id || null,
          team_role: user.team_memberships[0]?.team_role || 'member',
          team_name: user.team_memberships[0]?.team?.name || null
        }))
      }
    });
  } catch (error) {
    console.error('Error in organization members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/organizations/members - Update member roles
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      userId, 
      orgRole, 
      // Legacy single team support
      teamRole, 
      teamId,
      // New multi-team support
      teamMemberships 
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is org admin
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id || profile.org_role !== 'org_admin') {
      return NextResponse.json({ error: 'Organization admin access required' }, { status: 403 });
    }

    const supabaseAdmin2 = createSupabaseAdmin();

    // Update organization role if provided
    if (orgRole) {
      const { error: updateError } = await supabaseAdmin2
        .from('user_profiles')
        .update({ org_role: orgRole })
        .eq('id', userId)
        .eq('organization_id', profile.organization_id);

      if (updateError) {
        console.error('Error updating org role:', updateError);
        return NextResponse.json({ error: 'Failed to update organization role' }, { status: 500 });
      }
    }

    // Handle multi-team assignments if provided
    if (teamMemberships && Array.isArray(teamMemberships)) {
      // Get current team memberships
      const currentMemberships = await teamMembershipService.getUserMemberships(userId);
      const currentTeamIds = new Set(currentMemberships.map(m => m.team_id));
      const newTeamIds = new Set(teamMemberships.map((tm: any) => tm.teamId));

      // Remove user from teams they're no longer assigned to
      for (const membership of currentMemberships) {
        if (!newTeamIds.has(membership.team_id)) {
          await teamMembershipService.removeUserFromTeam(userId, membership.team_id);
        }
      }

      // Add user to new teams or update roles
      for (const tm of teamMemberships) {
        if (!tm.teamId || !tm.teamRole) continue;
        
        if (currentTeamIds.has(tm.teamId)) {
          // Update existing membership role
          await teamMembershipService.updateUserTeamRole(userId, tm.teamId, tm.teamRole);
        } else {
          // Add to new team
          await teamMembershipService.addUserToTeam(userId, tm.teamId, tm.teamRole);
        }
      }
    }
    // Handle legacy single team assignment
    else if (teamId !== undefined || teamRole !== undefined) {
      if (teamId === null || teamId === '') {
        // Remove from all teams (legacy behavior)
        const currentMemberships = await teamMembershipService.getUserMemberships(userId);
        for (const membership of currentMemberships) {
          await teamMembershipService.removeUserFromTeam(userId, membership.team_id);
        }
      } else if (teamId && teamRole) {
        // Get current memberships and replace with single team
        const currentMemberships = await teamMembershipService.getUserMemberships(userId);
        
        // Remove from all other teams
        for (const membership of currentMemberships) {
          if (membership.team_id !== teamId) {
            await teamMembershipService.removeUserFromTeam(userId, membership.team_id);
          }
        }
        
        // Add/update the target team
        await teamMembershipService.addUserToTeam(userId, teamId, teamRole);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}