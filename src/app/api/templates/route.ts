import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';
import { Template } from '@/types/database';
import {
  validateAndSanitizeText,
  validateVisibilityScope,
  validateTags,
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

    // Get user's team memberships for filtering team-scoped templates
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
    // 1. Global templates (everyone can see)
    let globalQuery = supabaseAdmin
      .from('templates')
      .select('*')
      .eq('visibility_scope', 'global');

    // 2. Private templates (user created)
    let privateQuery = supabaseAdmin
      .from('templates')
      .select('*')
      .eq('visibility_scope', 'private')
      .eq('created_by', user.id);

    let queries = [globalQuery, privateQuery];

    // 3. Organization templates (if user belongs to org)
    if (userProfile.organization_id) {
      let orgQuery = supabaseAdmin
        .from('templates')
        .select('*')
        .eq('visibility_scope', 'organization')
        .eq('organization_id', userProfile.organization_id);
      queries.push(orgQuery);
    }

    // 4. Team templates (if user belongs to teams) - safe parameterized approach
    if (userTeamIds.length > 0) {
      let teamQuery = supabaseAdmin
        .from('templates')
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
        console.error('Error fetching templates:', result.error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
      }
    }

    // Combine and deduplicate results
    const allTemplates = results.flatMap(result => result.data || []);
    const uniqueTemplates = Array.from(
      new Map(allTemplates.map(tmpl => [tmpl.id, tmpl])).values()
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ templates: uniqueTemplates });
  } catch (error) {
    console.error('Error in templates GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`create_template_${clientIp}`, 5, 60000); // 5 templates per minute
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' }, 
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
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

    // Get user's profile for permission checks
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      category, 
      tags, 
      title_format, 
      description_format, 
      acceptance_criteria_format, 
      additional_fields, 
      visibility_scope = 'organization',
      team_id
    } = body;

    // Validate and sanitize all inputs
    const nameValidation = validateAndSanitizeText(name, 'Name', VALIDATION_LIMITS.NAME_MAX_LENGTH, true);
    if (!nameValidation.isValid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    const descValidation = validateAndSanitizeText(description, 'Description', VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH);
    if (!descValidation.isValid) {
      return NextResponse.json({ error: descValidation.error }, { status: 400 });
    }

    const categoryValidation = validateAndSanitizeText(category, 'Category', VALIDATION_LIMITS.CATEGORY_MAX_LENGTH);
    if (!categoryValidation.isValid) {
      return NextResponse.json({ error: categoryValidation.error }, { status: 400 });
    }

    const titleFormatValidation = validateAndSanitizeText(title_format, 'Title format', VALIDATION_LIMITS.TEMPLATE_FORMAT_MAX_LENGTH, true);
    if (!titleFormatValidation.isValid) {
      return NextResponse.json({ error: titleFormatValidation.error }, { status: 400 });
    }

    const descFormatValidation = validateAndSanitizeText(description_format, 'Description format', VALIDATION_LIMITS.TEMPLATE_FORMAT_MAX_LENGTH, true);
    if (!descFormatValidation.isValid) {
      return NextResponse.json({ error: descFormatValidation.error }, { status: 400 });
    }

    const acFormatValidation = validateAndSanitizeText(acceptance_criteria_format, 'Acceptance criteria format', VALIDATION_LIMITS.TEMPLATE_FORMAT_MAX_LENGTH, true);
    if (!acFormatValidation.isValid) {
      return NextResponse.json({ error: acFormatValidation.error }, { status: 400 });
    }

    const tagsValidation = validateTags(tags);
    if (!tagsValidation.isValid) {
      return NextResponse.json({ error: tagsValidation.error }, { status: 400 });
    }

    // Validate visibility_scope
    const scopeValidation = validateVisibilityScope(visibility_scope);
    if (!scopeValidation.isValid) {
      return NextResponse.json({ error: scopeValidation.error }, { status: 400 });
    }

    // Check permissions based on visibility scope
    if (visibility_scope === 'organization' && !userProfile.organization_id) {
      return NextResponse.json({ error: 'Must be part of an organization to create organization-wide templates' }, { status: 403 });
    }

    if (visibility_scope === 'team' && !team_id) {
      return NextResponse.json({ error: 'team_id is required for team-scoped templates' }, { status: 400 });
    }

    if (visibility_scope === 'global') {
      // Allow anyone to create global templates, but they'll need org admin approval for editing
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

    // Create template with sanitized data
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .insert({
        organization_id: final_organization_id,
        team_id: final_team_id,
        created_by: user.id,
        name: nameValidation.value,
        description: descValidation.value,
        category: categoryValidation.value || 'General',
        tags: tagsValidation.value,
        title_format: titleFormatValidation.value,
        description_format: descFormatValidation.value,
        acceptance_criteria_format: acFormatValidation.value,
        additional_fields: additional_fields || [], // TODO: Validate this too
        visibility_scope: scopeValidation.value
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error in templates POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}