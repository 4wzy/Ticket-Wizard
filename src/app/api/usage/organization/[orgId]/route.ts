import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    // Use hybrid authentication approach (same as team usage API)
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const orgId = resolvedParams.orgId;
    const supabaseAdmin = createSupabaseAdmin();

    // Get user's organization membership and role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('org_role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Profile access denied:', {
        userId: user.id,
        orgId,
        profileError: profileError?.message
      });
      return NextResponse.json({ 
        error: 'Access denied - user profile not found'
      }, { status: 403 });
    }

    // Check if user is org admin and belongs to the requested organization
    const isOrgAdmin = userProfile.org_role === 'org_admin';
    const belongsToOrg = userProfile.organization_id === orgId;

    if (!isOrgAdmin || !belongsToOrg) {
      return NextResponse.json({ 
        error: 'Access denied - organization admin privileges required for this organization'
      }, { status: 403 });
    }

    // Get organization information
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('name, token_limit')
      .eq('id', orgId)
      .single();

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get current date range (current month)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all teams in the organization
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select(`
        id,
        name,
        slug,
        token_limit,
        tokens_used
      `)
      .eq('organization_id', orgId);

    if (teamsError) {
      console.error('Could not fetch teams:', teamsError);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    // Get all usage data for the organization in current month
    const { data: allOrgUsage, error: usageError } = await supabaseAdmin
      .from('token_usage_events')
      .select('user_id, tokens_used, feature_used, created_at, team_id')
      .eq('organization_id', orgId)
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString());

    if (usageError) {
      console.error('Could not fetch usage data:', usageError);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    const orgUsageData = allOrgUsage || [];

    // Calculate organization-wide statistics
    const totalOrgTokens = orgUsageData.reduce((sum, event) => sum + event.tokens_used, 0);
    const totalEvents = orgUsageData.length;
    const uniqueUsers = new Set(orgUsageData.map(event => event.user_id)).size;

    // Feature breakdown across organization
    const featureBreakdown = orgUsageData.reduce((acc, event) => {
      if (!acc[event.feature_used]) {
        acc[event.feature_used] = 0;
      }
      acc[event.feature_used] += event.tokens_used;
      return acc;
    }, {} as Record<string, number>);

    // Daily usage (last 30 days)
    const dailyUsage = orgUsageData.reduce((acc, event) => {
      const date = event.created_at.split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += event.tokens_used;
      return acc;
    }, {} as Record<string, number>);

    // Team usage breakdown
    const teamUsageResults = teams?.map(team => {
      const teamEvents = orgUsageData.filter(event => event.team_id === team.id);
      const teamTokens = teamEvents.reduce((sum, event) => sum + event.tokens_used, 0);
      const teamUserCount = new Set(teamEvents.map(event => event.user_id)).size;

      return {
        team_id: team.id,
        team_name: team.name,
        team_slug: team.slug,
        token_limit: team.token_limit,
        tokens_used: teamTokens,
        usage_percentage: team.token_limit > 0 ? (teamTokens / team.token_limit) * 100 : 0,
        active_users: teamUserCount,
        api_requests: teamEvents.length,
      };
    }).sort((a, b) => b.tokens_used - a.tokens_used) || [];

    // Top users across organization (anonymized)
    const userUsage = orgUsageData.reduce((acc, event) => {
      if (!acc[event.user_id]) {
        acc[event.user_id] = { tokens: 0, requests: 0 };
      }
      acc[event.user_id].tokens += event.tokens_used;
      acc[event.user_id].requests += 1;
      return acc;
    }, {} as Record<string, { tokens: number; requests: number }>);

    const topUsers = Object.entries(userUsage)
      .map(([userId, usage]) => ({
        user_id: userId,
        tokens_used: usage.tokens,
        api_requests: usage.requests,
      }))
      .sort((a, b) => b.tokens_used - a.tokens_used)
      .slice(0, 10); // Top 10 users

    // Usage trends (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const usageTrend = last7Days.map(date => ({
      date,
      tokens: dailyUsage[date] || 0
    }));

    return NextResponse.json({
      organization: {
        id: orgId,
        name: organization.name,
        token_limit: organization.token_limit,
      },
      usage: {
        current_month: {
          total_tokens: totalOrgTokens,
          total_events: totalEvents,
          unique_users: uniqueUsers,
          period_start: firstDayOfMonth.toISOString(),
          period_end: lastDayOfMonth.toISOString(),
        },
        feature_breakdown: featureBreakdown,
        daily_usage: dailyUsage,
        usage_trend: usageTrend,
        team_breakdown: teamUsageResults,
        top_users: topUsers,
      },
      teams_count: teams?.length || 0,
      user_role: userProfile.org_role,
    });

  } catch (error) {
    console.error('Organization usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}