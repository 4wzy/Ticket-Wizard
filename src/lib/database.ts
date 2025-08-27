import { supabase, createSupabaseAdmin } from './supabaseClient';
import { Organization, UserProfile, OrganizationInvitation, Team } from '@/types/database';

// Types for multi-team support
export interface UserTeamMembership {
  id: string;
  user_id: string;
  team_id: string;
  team_role: 'team_admin' | 'member' | 'viewer';
  joined_at: string;
  created_at: string;
  updated_at: string;
  // Populated relations
  team?: Team;
  user?: UserProfile;
}

export interface UserWithTeams extends UserProfile {
  team_memberships: (UserTeamMembership & { team: Team })[];
}

// Organization utilities
export const organizationService = {
  async create(orgData: {
    name: string;
    slug: string;
    domain?: string;
    plan_tier?: 'trial' | 'apprentice' | 'wizard' | 'archmage' | 'enterprise';
  }): Promise<Organization | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: orgData.name,
        slug: orgData.slug,
        domain: orgData.domain,
        is_team_plan: true,
        plan_tier: orgData.plan_tier || 'trial',
        token_limit: 1000000,
        tokens_used: 0,
        tokens_reset_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        settings: {},
        features: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating organization:', error);
      return null;
    }

    return data;
  },

  async findByName(name: string): Promise<Organization | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .ilike('name', name) // Case-insensitive search
      .single();

    if (error) {
      return null; // Don't log error for not found
    }

    return data;
  },

  async findByDomain(domain: string): Promise<Organization | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('domain', domain)
      .single();

    if (error) {
      console.error('Error finding organization by domain:', error);
      return null;
    }

    return data;
  },

  async findBySlug(slug: string): Promise<Organization | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error finding organization by slug:', error);
      return null;
    }

    return data;
  },

  async findById(id: string): Promise<Organization | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error finding organization by ID:', error);
      return null;
    }

    return data;
  }
};

// User Profile utilities
export const userProfileService = {
  async create(profileData: {
    id: string;
    organization_id?: string;
    full_name?: string;
    org_role?: 'org_admin' | 'member';
  }): Promise<UserProfile | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: profileData.id,
        organization_id: profileData.organization_id,
        full_name: profileData.full_name,
        org_role: profileData.org_role || 'member',
        status: 'active',
        tokens_used: 0,
        last_active: new Date().toISOString(),
        joined_organization_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return data;
  },

  async getById(userId: string): Promise<UserProfile | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting user profile:', error);
      return null;
    }

    return data;
  },

  async update(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const supabaseAdmin = createSupabaseAdmin();
    
    // Filter out any deprecated fields that might still be passed
    const { id, created_at, updated_at, ...allowedUpdates } = updates;
    
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(allowedUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }

    return data;
  }
};

// Utility functions for signup flow
export async function createOrganizationFromEmail(email: string, orgName?: string): Promise<{ organization: Organization | null; isNewOrg: boolean; error?: string }> {
  try {
    const domain = email.split('@')[1];
    
    // Skip common email providers
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com', 'tutanota.com'];
    if (commonDomains.includes(domain.toLowerCase())) {
      // For personal email domains, create individual organization
      const individualOrgName = orgName || `${email.split('@')[0]}'s Workspace`;
      const slug = individualOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      const organization = await organizationService.create({
        name: individualOrgName,
        slug: slug,
        domain: undefined // Don't set domain for personal emails
      });
      
      return { organization, isNewOrg: true };
    }

    // Check if organization with this domain already exists
    const existingOrg = await organizationService.findByDomain(domain);
    if (existingOrg) {
      return { organization: existingOrg, isNewOrg: false };
    }

    // Verify domain before creating organization (basic check)
    if (!isValidDomain(domain)) {
      return { organization: null, isNewOrg: false, error: 'Invalid email domain' };
    }

    // Create new organization for business domain
    const defaultOrgName = orgName || `${domain.split('.')[0]} Team`;
    const slug = defaultOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const organization = await organizationService.create({
      name: defaultOrgName,
      slug: slug,
      domain: domain
    });

    return { organization, isNewOrg: true };
  } catch (error) {
    console.error('Error creating organization from email:', error);
    return { organization: null, isNewOrg: false, error: 'Failed to create organization' };
  }
}

function isValidDomain(domain: string): boolean {
  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain) && domain.includes('.') && domain.length > 3;
}

export async function createUserProfileWithOrganization(
  userId: string, 
  email: string, 
  fullName?: string,
  orgName?: string
): Promise<{ userProfile: UserProfile | null; organization: Organization | null; isOrgCreator: boolean; error?: string }> {
  try {
    // If organization name is provided, try to find existing organization first
    let organization: Organization | null = null;
    let isNewOrg = false;

    if (orgName && orgName.trim()) {
      // Look for existing organization by name
      organization = await organizationService.findByName(orgName.trim());
      
      if (organization) {
        // Found existing organization - user will join it
        isNewOrg = false;
        console.log(`Found existing organization: ${organization.name} (${organization.id})`);
      } else {
        // No existing organization with that name, create new one
        const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        // Check if slug already exists (different name, same slug)
        const existingBySlug = await organizationService.findBySlug(slug);
        if (existingBySlug) {
          // Slug conflict - modify the slug
          const timestamp = Date.now().toString().slice(-4);
          const uniqueSlug = `${slug}-${timestamp}`;
          
          organization = await organizationService.create({
            name: orgName.trim(),
            slug: uniqueSlug,
            domain: undefined // Don't set domain for manually named orgs
          });
        } else {
          organization = await organizationService.create({
            name: orgName.trim(),
            slug: slug,
            domain: undefined // Don't set domain for manually named orgs
          });
        }
        
        isNewOrg = true;
        console.log(`Created new organization: ${organization?.name} (${organization?.id})`);
      }
    } else {
      // No organization name provided, use email-based logic
      const result = await createOrganizationFromEmail(email, orgName);
      organization = result.organization;
      isNewOrg = result.isNewOrg;
      
      if (result.error) {
        return { userProfile: null, organization: null, isOrgCreator: false, error: result.error };
      }
    }

    if (!organization) {
      return { userProfile: null, organization: null, isOrgCreator: false, error: 'Failed to create or find organization' };
    }

    // Check if this is the first user for this organization (creator)
    const supabaseAdmin = createSupabaseAdmin();
    const { data: existingProfiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('organization_id', organization.id);

    const isOrgCreator = isNewOrg || (!existingProfiles || existingProfiles.length === 0);

    // Check if user profile already exists (e.g., from invitation join)
    const existingProfile = await userProfileService.getById(userId);
    let userProfile: UserProfile | null;

    if (existingProfile) {
      // Update existing profile with additional info
      userProfile = await userProfileService.update(userId, {
        full_name: fullName || existingProfile.full_name,
        // Don't override organization info if already set from invitation
        organization_id: existingProfile.organization_id || organization.id,
        org_role: existingProfile.org_role || (isOrgCreator ? 'org_admin' : 'member')
      });
    } else {
      // Create new user profile
      userProfile = await userProfileService.create({
        id: userId,
        organization_id: organization.id,
        full_name: fullName,
        org_role: isOrgCreator ? 'org_admin' : 'member'
      });
    }

    if (!userProfile) {
      return { userProfile: null, organization: null, isOrgCreator: false, error: 'Failed to create user profile' };
    }

    return { userProfile, organization, isOrgCreator };
  } catch (error) {
    console.error('Error in createUserProfileWithOrganization:', error);
    return { userProfile: null, organization: null, isOrgCreator: false, error: 'Internal error occurred' };
  }
}

// New function for joining organization by slug/invitation
export async function joinOrganizationBySlug(userId: string, orgSlug: string): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  try {
    const organization = await organizationService.findBySlug(orgSlug);
    if (!organization) {
      return { success: false, error: 'Organization not found' };
    }

    // Check if user already has a profile
    const existingProfile = await userProfileService.getById(userId);
    if (existingProfile?.organization_id) {
      return { success: false, error: 'User already belongs to an organization' };
    }

    // Update or create user profile with organization
    let userProfile: UserProfile | null;
    if (existingProfile) {
      userProfile = await userProfileService.update(userId, {
        organization_id: organization.id,
        org_role: 'member',
        joined_organization_at: new Date().toISOString()
      });
    } else {
      userProfile = await userProfileService.create({
        id: userId,
        organization_id: organization.id,
        org_role: 'member'
      });
    }

    if (!userProfile) {
      return { success: false, error: 'Failed to join organization' };
    }

    return { success: true, organization };
  } catch (error) {
    console.error('Error joining organization by slug:', error);
    return { success: false, error: 'Internal error occurred' };
  }
}

// Invitation service
export const invitationService = {
  async create(inviteData: {
    organization_id: string;
    created_by: string;
    email?: string;
    invite_type: 'organization' | 'team';
    org_role?: 'org_admin' | 'member';
    max_uses?: number;
    expires_at?: string;
    metadata?: Record<string, any>;
  }): Promise<OrganizationInvitation | null> {
    const supabaseAdmin = createSupabaseAdmin();
    
    // Generate unique invite code
    const inviteCode = generateInviteCode();
    
    const { data, error } = await supabaseAdmin
      .from('organization_invitations')
      .insert({
        organization_id: inviteData.organization_id,
        created_by: inviteData.created_by,
        invite_code: inviteCode,
        email: inviteData.email,
        invite_type: inviteData.invite_type,
        org_role: inviteData.org_role || 'member',
        max_uses: inviteData.max_uses,
        uses_count: 0,
        expires_at: inviteData.expires_at,
        status: 'active',
        metadata: inviteData.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return null;
    }

    return data;
  },

  async findByCode(inviteCode: string): Promise<OrganizationInvitation | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('organization_invitations')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('status', 'active')
      .single();

    if (error) {
      return null;
    }

    return data;
  },

  async validateAndUse(inviteCode: string, userEmail?: string): Promise<{ valid: boolean; invitation?: OrganizationInvitation; error?: string }> {
    const invitation = await this.findByCode(inviteCode);
    
    if (!invitation) {
      return { valid: false, error: 'Invalid or expired invitation code' };
    }

    // Check if invitation is expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return { valid: false, error: 'Invitation has expired' };
    }

    // Check if invitation is for specific email
    if (invitation.email && userEmail && invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      return { valid: false, error: 'This invitation is for a different email address' };
    }

    // Check usage limits
    if (invitation.max_uses && invitation.uses_count >= invitation.max_uses) {
      return { valid: false, error: 'Invitation has reached maximum usage limit' };
    }

    // Increment usage count
    const supabaseAdmin = createSupabaseAdmin();
    const { error: updateError } = await supabaseAdmin
      .from('organization_invitations')
      .update({ 
        uses_count: invitation.uses_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation usage:', updateError);
      return { valid: false, error: 'Failed to process invitation' };
    }

    return { valid: true, invitation };
  },

  async getForOrganization(organizationId: string): Promise<OrganizationInvitation[]> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return [];
    }

    return data || [];
  }
};

// Team service
export const teamService = {
  async create(teamData: {
    organization_id: string;
    name: string;
    slug: string;
    description?: string;
    token_limit?: number;
  }): Promise<Team | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('teams')
      .insert({
        organization_id: teamData.organization_id,
        name: teamData.name,
        slug: teamData.slug,
        description: teamData.description,
        token_limit: teamData.token_limit || 100000,
        tokens_used: 0,
        tokens_reset_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        settings: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating team:', error);
      return null;
    }

    return data;
  },

  async getById(teamId: string): Promise<Team | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error) {
      console.error('Error getting team:', error);
      return null;
    }

    return data;
  },

  async getByOrganization(organizationId: string): Promise<Team[]> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting teams:', error);
      return [];
    }

    return data || [];
  },

  async update(teamId: string, updates: Partial<Team>): Promise<Team | null> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single();

    if (error) {
      console.error('Error updating team:', error);
      return null;
    }

    return data;
  },

  async delete(teamId: string): Promise<boolean> {
    const supabaseAdmin = createSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      console.error('Error deleting team:', error);
      return false;
    }

    return true;
  },

  async getMembers(teamId: string): Promise<UserProfile[]> {
    const supabaseAdmin = createSupabaseAdmin();
    
    const { data: memberships, error } = await supabaseAdmin
      .from('user_team_memberships')
      .select(`
        user:user_profiles (*)
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error getting team members:', error);
      return [];
    }

    return memberships?.map(m => m.user).filter(Boolean) as UserProfile[] || [];
  },

  async addMember(teamId: string, userId: string, teamRole: 'team_admin' | 'member' | 'viewer' = 'member'): Promise<boolean> {
    const supabaseAdmin = createSupabaseAdmin();
    
    const { error } = await supabaseAdmin
      .from('user_team_memberships')
      .insert({
        user_id: userId,
        team_id: teamId,
        team_role: teamRole
      });

    if (error) {
      console.error('Error adding team member:', error);
      return false;
    }

    return true;
  },

  async removeMember(userId: string, teamId: string): Promise<boolean> {
    const supabaseAdmin = createSupabaseAdmin();
    
    const { error } = await supabaseAdmin
      .from('user_team_memberships')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);

    if (error) {
      console.error('Error removing team member:', error);
      return false;
    }

    return true;
  },

  async updateMemberRole(userId: string, teamRole: 'team_admin' | 'member' | 'viewer', teamId: string): Promise<boolean> {
    const supabaseAdmin = createSupabaseAdmin();
    
    const { error } = await supabaseAdmin
      .from('user_team_memberships')
      .update({ 
        team_role: teamRole,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('team_id', teamId);

    if (error) {
      console.error('Error updating member role:', error);
      return false;
    }

    return true;
  }
};

// Team Membership service (for multi-team support)
export const teamMembershipService = {
  // Get all team memberships for a user
  async getUserMemberships(userId: string): Promise<(UserTeamMembership & { team: Team })[]> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('user_team_memberships')
      .select(`
        *,
        team:teams (*)
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error getting user team memberships:', error);
      return [];
    }

    return data || [];
  },

  // Get all members of a team
  async getTeamMemberships(teamId: string): Promise<(UserTeamMembership & { user: UserProfile })[]> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('user_team_memberships')
      .select(`
        *,
        user:user_profiles (*)
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error getting team memberships:', error);
      return [];
    }

    return data || [];
  },

  // Add user to team
  async addUserToTeam(userId: string, teamId: string, teamRole: 'team_admin' | 'member' | 'viewer' = 'member'): Promise<UserTeamMembership | null> {
    const supabaseAdmin = createSupabaseAdmin();
    
    // Check if membership already exists
    const { data: existing } = await supabaseAdmin
      .from('user_team_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    if (existing) {
      // Update existing membership
      const { data, error } = await supabaseAdmin
        .from('user_team_memberships')
        .update({ 
          team_role: teamRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .select()
        .single();

      if (error) {
        console.error('Error updating team membership:', error);
        return null;
      }
      return data;
    }

    // Create new membership
    const { data, error } = await supabaseAdmin
      .from('user_team_memberships')
      .insert({
        user_id: userId,
        team_id: teamId,
        team_role: teamRole
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding user to team:', error);
      return null;
    }

    return data;
  },

  // Remove user from team
  async removeUserFromTeam(userId: string, teamId: string): Promise<boolean> {
    const supabaseAdmin = createSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('user_team_memberships')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);

    if (error) {
      console.error('Error removing user from team:', error);
      return false;
    }

    return true;
  },

  // Update user's role in a team
  async updateUserTeamRole(userId: string, teamId: string, teamRole: 'team_admin' | 'member' | 'viewer'): Promise<boolean> {
    const supabaseAdmin = createSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('user_team_memberships')
      .update({ 
        team_role: teamRole,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('team_id', teamId);

    if (error) {
      console.error('Error updating user team role:', error);
      return false;
    }

    return true;
  },

  // Get users with their team memberships for an organization
  async getOrganizationUsersWithTeams(organizationId: string): Promise<UserWithTeams[]> {
    const supabaseAdmin = createSupabaseAdmin();
    
    // First get all users in the organization
    const { data: users, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .order('joined_organization_at', { ascending: true });

    if (usersError) {
      console.error('Error getting organization users:', usersError);
      return [];
    }

    if (!users) return [];

    // Then get all team memberships for these users
    const userIds = users.map(u => u.id);
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('user_team_memberships')
      .select(`
        *,
        team:teams (*)
      `)
      .in('user_id', userIds)
      .order('joined_at', { ascending: true });

    if (membershipsError) {
      console.error('Error getting team memberships:', membershipsError);
      // Return users without team info if memberships fail
      return users.map(user => ({ ...user, team_memberships: [] }));
    }

    // Combine users with their team memberships
    return users.map(user => ({
      ...user,
      team_memberships: (memberships || [])
        .filter(m => m.user_id === user.id)
        .map(m => m as UserTeamMembership & { team: Team })
    }));
  },

  // Check if user has specific role in team
  async hasTeamRole(userId: string, teamId: string, requiredRole: 'team_admin' | 'member' | 'viewer'): Promise<boolean> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('user_team_memberships')
      .select('team_role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    if (error || !data) return false;

    // Role hierarchy: team_admin > member > viewer
    const roleHierarchy = { 'team_admin': 3, 'member': 2, 'viewer': 1 };
    return roleHierarchy[data.team_role] >= roleHierarchy[requiredRole];
  },

  // Check if user is admin of any team
  async isTeamAdmin(userId: string): Promise<boolean> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('user_team_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('team_role', 'team_admin')
      .limit(1);

    if (error) {
      console.error('Error checking team admin status:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  },

  // Get teams where user is admin
  async getUserAdminTeams(userId: string): Promise<Team[]> {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('user_team_memberships')
      .select(`
        team:teams (*)
      `)
      .eq('user_id', userId)
      .eq('team_role', 'team_admin');

    if (error) {
      console.error('Error getting user admin teams:', error);
      return [];
    }

    return (data || []).map(item => item.team).filter(Boolean) as Team[];
  }
};

// Generate a unique invite code
function generateInviteCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Function to join organization using invite code
export async function joinOrganizationWithInvite(
  userId: string, 
  userEmail: string,
  inviteCode: string
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  try {
    // Validate the invitation
    const validation = await invitationService.validateAndUse(inviteCode, userEmail);
    
    if (!validation.valid || !validation.invitation) {
      return { success: false, error: validation.error };
    }

    // Get the organization
    const organization = await organizationService.findById(validation.invitation.organization_id);
    if (!organization) {
      return { success: false, error: 'Organization not found' };
    }

    // Check if user already has a profile
    const existingProfile = await userProfileService.getById(userId);
    if (existingProfile?.organization_id) {
      return { success: false, error: 'You already belong to an organization' };
    }

    // Create or update user profile
    let userProfile: UserProfile | null;
    if (existingProfile) {
      userProfile = await userProfileService.update(userId, {
        organization_id: organization.id,
        org_role: validation.invitation.org_role || 'member',
        joined_organization_at: new Date().toISOString()
      });
    } else {
      userProfile = await userProfileService.create({
        id: userId,
        organization_id: organization.id,
        org_role: validation.invitation.org_role || 'member'
      });
    }

    if (!userProfile) {
      return { success: false, error: 'Failed to join organization' };
    }

    // Handle team memberships from invitation metadata
    const metadata = validation.invitation.metadata as any;
    if (metadata) {
      // Legacy single team support
      if (metadata.teamId && metadata.teamRole) {
        await teamMembershipService.addUserToTeam(userId, metadata.teamId, metadata.teamRole);
      }
      // New multi-team support
      else if (metadata.teamMemberships && Array.isArray(metadata.teamMemberships)) {
        for (const membership of metadata.teamMemberships) {
          if (membership.teamId && membership.teamRole) {
            await teamMembershipService.addUserToTeam(userId, membership.teamId, membership.teamRole);
          }
        }
      }
    }

    return { success: true, organization };
  } catch (error) {
    console.error('Error joining organization with invite:', error);
    return { success: false, error: 'Internal error occurred' };
  }
}