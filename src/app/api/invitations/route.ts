import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';
import { OrganizationInvitation } from '@/types/database';
import { teamMembershipService } from '@/lib/database';

// GET /api/invitations - Get invitations for organization or team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const teamId = searchParams.get('teamId');

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's permissions
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get user's team memberships for team-level access control
    const teamMemberships = await teamMembershipService.getUserMemberships(user.id);

    let invitations: OrganizationInvitation[] = [];

    if (teamId) {
      // Get team invitations (team admins can see team invitations)
      const teamMembership = teamMemberships.find(tm => tm.team_id === teamId);
      if (teamMembership && teamMembership.team_role === 'team_admin') {
        // Get invitations that have this team in their metadata
        const { data, error } = await supabaseAdmin
          .from('organization_invitations')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Filter invitations that include this team in metadata
          invitations = data.filter(inv => {
            const metadata = inv.metadata as any;
            return metadata && (
              metadata.teamId === teamId || 
              (metadata.teamMemberships && Array.isArray(metadata.teamMemberships) && 
               metadata.teamMemberships.some((tm: any) => tm.teamId === teamId))
            );
          });
        }
      }
    } else if (organizationId) {
      // Get organization invitations (org admins can see all invitations)
      if (profile.organization_id === organizationId && profile.org_role === 'org_admin') {
        const { data, error } = await supabaseAdmin
          .from('organization_invitations')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (!error) {
          invitations = data || [];
        }
      }
    } else {
      // Get invitations for user's organization
      if (profile.org_role === 'org_admin') {
        const { data, error } = await supabaseAdmin
          .from('organization_invitations')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false });

        if (!error) {
          invitations = data || [];
        }
      } else {
        // If user is team admin of any teams, show invitations for those teams
        const adminTeams = teamMemberships.filter(tm => tm.team_role === 'team_admin');
        if (adminTeams.length > 0) {
          const { data, error } = await supabaseAdmin
            .from('organization_invitations')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false });

          if (!error && data) {
            // Filter invitations that include teams user administers
            const adminTeamIds = adminTeams.map(tm => tm.team_id);
            invitations = data.filter(inv => {
              const metadata = inv.metadata as any;
              return metadata && (
                adminTeamIds.includes(metadata.teamId) || 
                (metadata.teamMemberships && Array.isArray(metadata.teamMemberships) && 
                 metadata.teamMemberships.some((tm: any) => adminTeamIds.includes(tm.teamId)))
              );
            });
          }
        }
      }
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}