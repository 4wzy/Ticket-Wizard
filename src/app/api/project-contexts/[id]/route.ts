import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createSupabaseAdmin } from '@/lib/supabaseClient';
import {
  validateAndSanitizeText,
  validateVisibilityScope,
  validateKeyValueObject,
  validateUUID,
  checkResourceAccess,
  checkRateLimit,
  VALIDATION_LIMITS
} from '@/lib/security';

// Helper function to check edit permissions
async function checkEditPermissions(projectContext: any, userId: string, userProfile: any, supabaseAdmin: any): Promise<boolean> {
  // Creator can always edit their own project contexts
  if (projectContext.created_by === userId) {
    return true;
  }

  // Check based on visibility scope
  switch (projectContext.visibility_scope) {
    case 'private':
      // Only creator can edit private project contexts
      return false;
    
    case 'team':
      // Team members can edit team project contexts
      if (!projectContext.team_id) return false;
      
      const { data: teamMembership } = await supabaseAdmin
        .from('user_team_memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', projectContext.team_id)
        .single();
      
      return !!teamMembership;
    
    case 'organization':
      // Organization members can edit org project contexts
      return userProfile.organization_id === projectContext.organization_id;
    
    case 'global':
      // Only org admins can edit global project contexts (to prevent vandalism)
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

    // Get project context by ID
    const { data: projectContext, error } = await supabaseAdmin
      .from('project_contexts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching project context:', error);
      return NextResponse.json({ error: 'Project context not found' }, { status: 404 });
    }

    // Check if user has access to this resource
    const accessCheck = await checkResourceAccess(
      projectContext,
      user.id,
      userProfile,
      userTeamIds
    );

    if (!accessCheck.hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ projectContext });
  } catch (error) {
    console.error('Error in project context GET:', error);
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

    // First, get the existing project context to check permissions
    const { data: existingContext, error: fetchError } = await supabaseAdmin
      .from('project_contexts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingContext) {
      return NextResponse.json({ error: 'Project context not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, abbreviations, terminology, project_info, standards, visibility_scope, team_id } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
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

    // Check edit permissions based on project context visibility and user relationship
    const canEdit = await checkEditPermissions(existingContext, user.id, userProfile, supabaseAdmin);
    if (!canEdit) {
      return NextResponse.json({ error: 'You do not have permission to edit this project context' }, { status: 403 });
    }

    // Build update object - only include fields that are being updated
    const updateData: any = {
      name,
      description,
      abbreviations: abbreviations || {},
      terminology: terminology || {},
      project_info,
      standards,
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
        return NextResponse.json({ error: 'team_id is required for team-scoped contexts' }, { status: 400 });
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

    // Update project context
    const { data: projectContext, error } = await supabaseAdmin
      .from('project_contexts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project context:', error);
      return NextResponse.json({ error: 'Failed to update project context' }, { status: 500 });
    }

    return NextResponse.json({ projectContext });
  } catch (error) {
    console.error('Error in project context PUT:', error);
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

    // First, get the existing project context to check permissions
    const { data: existingContext, error: fetchError } = await supabaseAdmin
      .from('project_contexts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingContext) {
      return NextResponse.json({ error: 'Project context not found' }, { status: 404 });
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
    const canEdit = await checkEditPermissions(existingContext, user.id, userProfile, supabaseAdmin);
    if (!canEdit) {
      return NextResponse.json({ error: 'You do not have permission to delete this project context' }, { status: 403 });
    }

    // Delete project context
    const { error } = await supabaseAdmin
      .from('project_contexts')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting project context:', error);
      return NextResponse.json({ error: 'Failed to delete project context' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in project context DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}