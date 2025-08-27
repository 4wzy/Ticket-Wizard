import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';
import { ProjectContext } from '@/types/database';
import {
  validateAndSanitizeText,
  validateVisibilityScope,
  validateKeyValueObject,
  checkRateLimit,
  VALIDATION_LIMITS
} from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    // Use hybrid authentication approach
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Get user's profile to check organization membership
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get user's team memberships for filtering team-scoped contexts
    const { data: userTeams, error: teamsError } = await supabaseAdmin
      .from('user_team_memberships')
      .select('team_id')
      .eq('user_id', user.id);

    if (teamsError) {
      console.error('Error fetching user teams:', teamsError);
      return NextResponse.json({ error: 'Failed to fetch user teams' }, { status: 500 });
    }

    const userTeamIds = userTeams?.map(membership => membership.team_id) || [];

    // Build visibility filter using safe parameterized queries
    // 1. Global contexts (everyone can see)
    let globalQuery = supabaseAdmin
      .from('project_contexts')
      .select('*')
      .eq('visibility_scope', 'global');

    // 2. Private contexts (user created)
    let privateQuery = supabaseAdmin
      .from('project_contexts')
      .select('*')
      .eq('visibility_scope', 'private')
      .eq('created_by', user.id);

    let queries = [globalQuery, privateQuery];

    // 3. Organization contexts (if user belongs to org)
    if (userProfile.organization_id) {
      let orgQuery = supabaseAdmin
        .from('project_contexts')
        .select('*')
        .eq('visibility_scope', 'organization')
        .eq('organization_id', userProfile.organization_id);
      queries.push(orgQuery);
    }

    // 4. Team contexts (if user belongs to teams) - safe parameterized approach
    if (userTeamIds.length > 0) {
      let teamQuery = supabaseAdmin
        .from('project_contexts')
        .select('*')
        .eq('visibility_scope', 'team')
        .in('team_id', userTeamIds);
      queries.push(teamQuery);
    }

    // Execute all queries safely
    const results = await Promise.all(queries.map(q => q.order('created_at', { ascending: false })));
    
    // Check for errors
    for (const result of results) {
      if (result.error) {
        console.error('Error fetching project contexts:', result.error);
        return NextResponse.json({ error: 'Failed to fetch project contexts' }, { status: 500 });
      }
    }

    // Combine and deduplicate results
    const allContexts = results.flatMap(result => result.data || []);
    const uniqueContexts = Array.from(
      new Map(allContexts.map(ctx => [ctx.id, ctx])).values()
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ projectContexts: uniqueContexts });
  } catch (error) {
    console.error('Error in project contexts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`create_context_${clientIp}`, 10, 60000); // 10 requests per minute
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' }, 
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
          }
        }
      );
    }

    // Use hybrid authentication approach
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Get user's profile to check permissions
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, abbreviations, terminology, project_info, standards, team_id, visibility_scope = 'organization' } = body;

    // Validate and sanitize all inputs
    const nameValidation = validateAndSanitizeText(name, 'Name', VALIDATION_LIMITS.NAME_MAX_LENGTH, true);
    if (!nameValidation.isValid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    const descValidation = validateAndSanitizeText(description, 'Description', VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH);
    if (!descValidation.isValid) {
      return NextResponse.json({ error: descValidation.error }, { status: 400 });
    }

    const projectInfoValidation = validateAndSanitizeText(project_info, 'Project info', VALIDATION_LIMITS.PROJECT_INFO_MAX_LENGTH);
    if (!projectInfoValidation.isValid) {
      return NextResponse.json({ error: projectInfoValidation.error }, { status: 400 });
    }

    const standardsValidation = validateAndSanitizeText(standards, 'Standards', VALIDATION_LIMITS.STANDARDS_MAX_LENGTH);
    if (!standardsValidation.isValid) {
      return NextResponse.json({ error: standardsValidation.error }, { status: 400 });
    }

    const abbreviationsValidation = validateKeyValueObject(abbreviations, 'Abbreviations');
    if (!abbreviationsValidation.isValid) {
      return NextResponse.json({ error: abbreviationsValidation.error }, { status: 400 });
    }

    const terminologyValidation = validateKeyValueObject(terminology, 'Terminology');
    if (!terminologyValidation.isValid) {
      return NextResponse.json({ error: terminologyValidation.error }, { status: 400 });
    }

    // Validate visibility_scope
    const scopeValidation = validateVisibilityScope(visibility_scope);
    if (!scopeValidation.isValid) {
      return NextResponse.json({ error: scopeValidation.error }, { status: 400 });
    }

    // Check permissions based on visibility scope
    if (visibility_scope === 'organization' && !userProfile.organization_id) {
      return NextResponse.json({ error: 'Must be part of an organization to create organization-wide contexts' }, { status: 403 });
    }

    if (scopeValidation.value === 'team') {
      if (!team_id) {
        return NextResponse.json({ error: 'team_id is required for team-scoped contexts' }, { status: 400 });
      }
      
      // Verify user is actually a member of the specified team
      const { data: teamMembership, error: teamError } = await supabaseAdmin
        .from('user_team_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('team_id', team_id)
        .single();
      
      if (teamError || !teamMembership) {
        return NextResponse.json({ error: 'You are not a member of the specified team' }, { status: 403 });
      }
    }

    if (visibility_scope === 'global') {
      // Allow anyone to create global contexts, but they'll need org admin approval for editing
      // This enables true public contribution while maintaining quality control
    }

    // Determine organization_id and team_id based on visibility_scope
    let final_organization_id = userProfile.organization_id; // Always set for management
    let final_team_id = null;

    if (visibility_scope === 'team') {
      final_team_id = team_id;
    }
    // For all visibility levels, keep organization_id for management purposes
    // The visibility filtering happens in the GET endpoint, not through NULL values

    // Create project context with sanitized data
    const { data: projectContext, error } = await supabaseAdmin
      .from('project_contexts')
      .insert({
        organization_id: final_organization_id,
        team_id: final_team_id,
        name: nameValidation.value,
        description: descValidation.value,
        abbreviations: abbreviationsValidation.value,
        terminology: terminologyValidation.value,
        project_info: projectInfoValidation.value,
        standards: standardsValidation.value,
        visibility_scope: scopeValidation.value,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project context:', error);
      return NextResponse.json({ error: 'Failed to create project context' }, { status: 500 });
    }

    return NextResponse.json({ projectContext }, { status: 201 });
  } catch (error) {
    console.error('Error in project contexts POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}