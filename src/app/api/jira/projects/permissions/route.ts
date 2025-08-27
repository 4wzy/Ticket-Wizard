import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Get user's selected Jira projects
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's access token to maintain RLS context
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: permissions, error } = await supabase
      .from('jira_project_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('project_name');

    if (error) {
      console.error('Error fetching Jira project permissions:', error);
      return NextResponse.json({ error: 'Failed to fetch project permissions' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      permissions: permissions || [] 
    });
  } catch (error: any) {
    console.error('Error in GET /api/jira/projects/permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add or update user's selected Jira projects
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projects } = await request.json();
    if (!Array.isArray(projects)) {
      return NextResponse.json({ error: 'Projects must be an array' }, { status: 400 });
    }

    // Validate project structure
    for (const project of projects) {
      if (!project.id || !project.key || !project.name) {
        return NextResponse.json({ 
          error: 'Each project must have id, key, and name' 
        }, { status: 400 });
      }
    }

    // Get user's access token to maintain RLS context
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // First, deactivate all existing permissions for this user
    const { error: deactivateError } = await supabase
      .from('jira_project_permissions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (deactivateError) {
      console.error('Error deactivating existing permissions:', deactivateError);
      return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
    }

    // Now insert or reactivate the new permissions
    const permissionsData = projects.map(project => ({
      user_id: user.id,
      project_id: project.id,
      project_key: project.key,
      project_name: project.name,
      is_active: true,
      updated_at: new Date().toISOString()
    }));

    const { data: newPermissions, error: insertError } = await supabase
      .from('jira_project_permissions')
      .upsert(permissionsData, { 
        onConflict: 'user_id,project_id',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('Error inserting project permissions:', insertError);
      return NextResponse.json({ error: 'Failed to save project permissions' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Project permissions updated successfully',
      permissions: newPermissions
    });
  } catch (error: any) {
    console.error('Error in POST /api/jira/projects/permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove a specific project permission
export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get user's access token to maintain RLS context
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { error } = await supabase
      .from('jira_project_permissions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error removing project permission:', error);
      return NextResponse.json({ error: 'Failed to remove project permission' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Project permission removed successfully' 
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/jira/projects/permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}