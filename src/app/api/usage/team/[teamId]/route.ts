import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    // Use hybrid authentication approach (same as templates API)
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const teamId = resolvedParams.teamId;
    const supabaseAdmin = createSupabaseAdmin();

    // Get user's team membership for this specific team (using admin client)
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('user_team_memberships')
      .select('team_role')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .single();

    if (membershipError || !membership) {
      console.error('Team usage access denied:', {
        userId: user.id,
        teamId,
        membershipError: membershipError?.message
      });
      return NextResponse.json({ 
        error: 'Access denied to team - user is not a member of this team'
      }, { status: 403 });
    }

    // Check if user is team admin or org admin
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('org_role, organization_id')
      .eq('id', user.id)
      .single();

    const isTeamAdmin = membership.team_role === 'team_admin';
    const isOrgAdmin = userProfile?.org_role === 'org_admin';

    if (!isTeamAdmin && !isOrgAdmin) {
      return NextResponse.json({ 
        error: 'Access denied - team admin privileges required'
      }, { status: 403 });
    }

    // Get team information
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('name, organization_id')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get current date range (current month)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Use a different approach: get team member IDs first, then use a SQL function
    // This avoids the RLS recursion issue by using a server-side function
    
    // First, let's try to get team data using the regular client
    // If this fails due to RLS, we'll use the current user's access level
    
    let teamMembers: any[] = [];
    let teamUsageData: any[] = [];
    
    // Get team members using admin client
    const { data: members, error: membersError } = await supabaseAdmin
      .from('user_team_memberships')
      .select(`
        user_id,
        team_role,
        user_profiles!inner(id, full_name)
      `)
      .eq('team_id', teamId);
    
    if (membersError) {
      console.error('Could not fetch team members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }
    
    teamMembers = members || [];

    // Get usage data using admin client
    const { data: allOrgUsage, error: usageError } = await supabaseAdmin
      .from('token_usage_events')
      .select('user_id, tokens_used, feature_used, created_at, team_id')
      .eq('organization_id', team.organization_id)
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString());

    if (usageError) {
      console.error('Could not fetch usage data:', usageError);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    // Filter to only this team's usage
    teamUsageData = allOrgUsage?.filter(event => event.team_id === teamId) || [];

    // Calculate member usage from the filtered data
    const memberUsageResults = teamMembers.map(member => {
      const memberEvents = teamUsageData.filter(event => event.user_id === member.user_id);
      const totalTokens = memberEvents.reduce((sum, event) => sum + event.tokens_used, 0);

      return {
        user_id: member.user_id,
        full_name: member.user_profiles.full_name,
        team_role: member.team_role,
        tokens_used: totalTokens,
      };
    });

    // Calculate team statistics from the filtered data
    const totalTeamTokens = teamUsageData.reduce((sum, event) => sum + event.tokens_used, 0);
    const totalEvents = teamUsageData.length;

    // Feature breakdown
    const featureBreakdown = teamUsageData.reduce((acc, event) => {
      if (!acc[event.feature_used]) {
        acc[event.feature_used] = 0;
      }
      acc[event.feature_used] += event.tokens_used;
      return acc;
    }, {} as Record<string, number>);

    // Daily usage (last 30 days)
    const dailyUsage = teamUsageData.reduce((acc, event) => {
      const date = event.created_at.split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += event.tokens_used;
      return acc;
    }, {} as Record<string, number>);

    // Get team usage quotas if any
    const { data: teamQuotas } = await supabaseAdmin
      .from('usage_quotas')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true);

    return NextResponse.json({
      team: {
        id: teamId,
        name: team.name,
        organization_id: team.organization_id,
      },
      usage: {
        current_month: {
          total_tokens: totalTeamTokens,
          total_events: totalEvents,
          period_start: firstDayOfMonth.toISOString(),
          period_end: lastDayOfMonth.toISOString(),
        },
        feature_breakdown: featureBreakdown,
        daily_usage: dailyUsage,
        members: memberUsageResults.sort((a, b) => b.tokens_used - a.tokens_used),
      },
      quotas: teamQuotas || [],
      user_role: membership.team_role,
    });

  } catch (error) {
    console.error('Team usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}