import { NextRequest, NextResponse } from 'next/server';
import { createUserProfileWithOrganization, userProfileService, organizationService, teamMembershipService } from '@/lib/database';
import { createSupabaseAdmin } from '@/lib/supabaseClient';
import { getAuthenticatedUser } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user instead of relying on body data
    const { user, error: authError, method } = await getAuthenticatedUser(request);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('Auth method used:', method);

    const body = await request.json().catch(() => ({}));
    const { fullName, organizationName } = body;

    // Use authenticated user data
    const userId = user.id;
    const email = user.email;

    if (!email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    // Validate optional fields
    if (fullName && (typeof fullName !== 'string' || fullName.length > 100)) {
      return NextResponse.json({ error: 'Invalid full name' }, { status: 400 });
    }

    if (organizationName && (typeof organizationName !== 'string' || organizationName.length > 100)) {
      return NextResponse.json({ error: 'Invalid organization name' }, { status: 400 });
    }

    // Check if user already has a profile (e.g., from invitation)
    const existingProfile = await userProfileService.getById(userId);
    
    if (existingProfile && existingProfile.organization_id) {
      // User already has organization assignment, just update name if provided
      let updatedProfile = existingProfile;
      if (fullName && fullName !== existingProfile.full_name) {
        updatedProfile = await userProfileService.update(userId, {
          full_name: fullName
        });
        if (!updatedProfile) {
          return NextResponse.json({ 
            error: 'Failed to update user profile' 
          }, { status: 500 });
        }
      }
      
      // Get organization and team memberships
      const organization = await organizationService.findById(existingProfile.organization_id);
      
      // Get user's team memberships using the new multi-team system
      const teamMemberships = await teamMembershipService.getUserMemberships(userId);
      
      return NextResponse.json({
        success: true,
        userProfile: updatedProfile,
        organization,
        teamMemberships,
        isOrgCreator: existingProfile.org_role === 'org_admin'
      });
    }

    // Create user profile with organization (existing flow for new users)
    const result = await createUserProfileWithOrganization(
      userId,
      email,
      fullName,
      organizationName
    );

    if (!result.userProfile || result.error) {
      return NextResponse.json({ 
        error: result.error || 'Failed to create user profile' 
      }, { status: 500 });
    }

    // Get team memberships for newly created user
    const teamMemberships = result.userProfile ? 
      await teamMembershipService.getUserMemberships(result.userProfile.id) : [];

    return NextResponse.json({
      success: true,
      userProfile: result.userProfile,
      organization: result.organization,
      teamMemberships,
      isOrgCreator: result.isOrgCreator
    });
  } catch (error) {
    console.error('Error in auth setup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Get user profile first using admin client to bypass RLS issues
    const supabaseAdmin = createSupabaseAdmin();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      // Only log non-404 errors - missing profiles are expected for new users
      if (profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError);
      }
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get organization and team memberships separately if user profile exists
    let organization = null;
    let teamMemberships = [];
    
    if (userProfile?.organization_id) {
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', userProfile.organization_id)
        .single();
      
      if (!orgError) {
        organization = orgData;
      }
    }
    
    // Get team memberships using the new multi-team system
    if (userProfile) {
      teamMemberships = await teamMembershipService.getUserMemberships(userProfile.id);
    }

    return NextResponse.json({
      userProfile,
      organization,
      teamMemberships
    });
  } catch (error) {
    console.error('Error in auth setup GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}