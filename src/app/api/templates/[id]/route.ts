import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';
import {
  validateUUID,
  checkResourceAccess
} from '@/lib/security';

// Helper function to check edit permissions
async function checkEditPermissions(template: any, userId: string, userProfile: any, supabaseAdmin: any): Promise<boolean> {
  // Creator can always edit their own templates
  if (template.created_by === userId) {
    return true;
  }

  // Check based on visibility scope
  switch (template.visibility_scope) {
    case 'private':
      // Only creator can edit private templates
      return false;
    
    case 'team':
      // Team members can edit team templates
      if (!template.team_id) return false;
      
      const { data: teamMembership } = await supabaseAdmin
        .from('user_team_memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', template.team_id)
        .single();
      
      return !!teamMembership;
    
    case 'organization':
      // Organization members can edit org templates
      return userProfile.organization_id === template.organization_id;
    
    case 'global':
      // Only org admins can edit global templates (to prevent vandalism)
      return userProfile.org_role === 'org_admin';
    
    default:
      return false;
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate ID format
    const idValidation = validateUUID(params.id);
    if (!idValidation.isValid) {
      return NextResponse.json({ error: idValidation.error }, { status: 400 });
    }

    // Use hybrid authentication approach
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Get user's profile and team memberships for access control
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { data: userTeams, error: teamsError } = await supabaseAdmin
      .from('user_team_memberships')
      .select('team_id')
      .eq('user_id', user.id);

    if (teamsError) {
      console.error('Error fetching user teams:', teamsError);
      return NextResponse.json({ error: 'Failed to fetch user teams' }, { status: 500 });
    }

    const userTeamIds = userTeams?.map(membership => membership.team_id) || [];

    // Get template by ID
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if user has access to this resource
    const accessCheck = await checkResourceAccess(
      template,
      user.id,
      userProfile,
      userTeamIds
    );

    if (!accessCheck.hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error in template GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Use hybrid authentication approach
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // First, get the existing template to check permissions
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
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
      visibility_scope,
      team_id
    } = body;

    // Validate required fields
    if (!name || !title_format || !description_format || !acceptance_criteria_format) {
      return NextResponse.json({ 
        error: 'Name, title format, description format, and acceptance criteria format are required' 
      }, { status: 400 });
    }

    // Get user's profile for permission checks
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check edit permissions based on template visibility and user relationship
    const canEdit = await checkEditPermissions(existingTemplate, user.id, userProfile, supabaseAdmin);
    if (!canEdit) {
      return NextResponse.json({ error: 'You do not have permission to edit this template' }, { status: 403 });
    }

    // Build update object - only include fields that are being updated
    const updateData: any = {
      name,
      description,
      category: category || 'General',
      tags: tags || [],
      title_format,
      description_format,
      acceptance_criteria_format,
      additional_fields: additional_fields || [],
      updated_at: new Date().toISOString()
    };

    // Handle visibility_scope changes if provided
    if (visibility_scope) {
      // Validate visibility_scope
      if (!['global', 'organization', 'team', 'private'].includes(visibility_scope)) {
        return NextResponse.json({ error: 'Invalid visibility scope' }, { status: 400 });
      }

      // Check permissions for visibility changes
      if (visibility_scope === 'global') {
        // Allow anyone to update to global visibility, but they'll need org admin approval for editing
        // This enables true public contribution while maintaining quality control
      }

      if (visibility_scope === 'team' && !team_id) {
        return NextResponse.json({ error: 'team_id is required for team-scoped templates' }, { status: 400 });
      }

      updateData.visibility_scope = visibility_scope;

      // Update organization_id and team_id based on new visibility scope
      // Always keep organization_id for management purposes
      updateData.organization_id = userProfile.organization_id;
      
      if (visibility_scope === 'team') {
        updateData.team_id = team_id;
      } else {
        updateData.team_id = null;
      }
    }

    // Update template
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error in template PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Use hybrid authentication approach
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // First, get the existing template to check permissions
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get user's profile for permission checks
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, org_role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check edit permissions (same permissions for delete)
    const canEdit = await checkEditPermissions(existingTemplate, user.id, userProfile, supabaseAdmin);
    if (!canEdit) {
      return NextResponse.json({ error: 'You do not have permission to delete this template' }, { status: 403 });
    }

    // Delete template
    const { error } = await supabaseAdmin
      .from('templates')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in template DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}