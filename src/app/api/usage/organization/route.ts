import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;
    const supabase = await createSupabaseServerClient();

    // Get user's organization and role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'User not in an organization' }, { status: 403 });
    }

    // Only org admins can view organization-wide usage
    if (userProfile.org_role !== 'org_admin') {
      return NextResponse.json({ error: 'Access denied. Organization admin required.' }, { status: 403 });
    }

    const organizationId = userProfile.organization_id;

    // Get organization info
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    // Get current date range (current month)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get organization usage for current month
    const { data: orgUsage } = await supabase
      .from('token_usage_events')
      .select('tokens_used, feature_used, created_at, team_id, user_id')
      .eq('organization_id', organizationId)
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString());

    // Get all teams in organization
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('organization_id', organizationId);

    // Calculate team-level usage
    const teamUsage = teams?.map(team => {
      const teamEvents = orgUsage?.filter(event => event.team_id === team.id) || [];
      const totalTokens = teamEvents.reduce((sum, event) => sum + event.tokens_used, 0);
      
      return {
        team_id: team.id,
        team_name: team.name,
        tokens_used: totalTokens,
        events_count: teamEvents.length,
      };
    }) || [];

    // Get all organization members
    const { data: orgMembers } = await supabase
      .from('user_profiles')
      .select('id, full_name, org_role')
      .eq('organization_id', organizationId);

    // Calculate member-level usage
    const memberUsage = orgMembers?.map(member => {
      const memberEvents = orgUsage?.filter(event => event.user_id === member.id) || [];
      const totalTokens = memberEvents.reduce((sum, event) => sum + event.tokens_used, 0);
      
      return {
        user_id: member.id,
        full_name: member.full_name,
        org_role: member.org_role,
        tokens_used: totalTokens,
        events_count: memberEvents.length,
      };
    }) || [];

    // Calculate organization statistics
    const totalOrgTokens = orgUsage?.reduce((sum, event) => sum + event.tokens_used, 0) || 0;
    const totalEvents = orgUsage?.length || 0;

    // Feature breakdown
    const featureBreakdown = orgUsage?.reduce((acc, event) => {
      if (!acc[event.feature_used]) {
        acc[event.feature_used] = 0;
      }
      acc[event.feature_used] += event.tokens_used;
      return acc;
    }, {} as Record<string, number>) || {};

    // Daily usage (last 30 days)
    const dailyUsage = orgUsage?.reduce((acc, event) => {
      const date = event.created_at.split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += event.tokens_used;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get organization usage quotas
    const { data: orgQuotas } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    return NextResponse.json({
      organization: {
        id: organizationId,
        name: organization?.name,
      },
      usage: {
        current_month: {
          total_tokens: totalOrgTokens,
          total_events: totalEvents,
          period_start: firstDayOfMonth.toISOString(),
          period_end: lastDayOfMonth.toISOString(),
        },
        feature_breakdown: featureBreakdown,
        daily_usage: dailyUsage,
        teams: teamUsage.sort((a, b) => b.tokens_used - a.tokens_used),
        members: memberUsage.sort((a, b) => b.tokens_used - a.tokens_used),
      },
      quotas: orgQuotas || [],
    });

  } catch (error) {
    console.error('Organization usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}