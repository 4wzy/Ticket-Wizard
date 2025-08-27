'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { UserProfile, Organization, Team, UserTeamMembership } from '@/types/database';
import { authenticatedFetch } from '@/lib/api-client';

export enum ProfileCompletionState {
  LOADING = 'loading',
  EMAIL_UNCONFIRMED = 'email_unconfirmed',
  PROFILE_INCOMPLETE = 'profile_incomplete',
  ORGANIZATION_PENDING = 'organization_pending',
  COMPLETE = 'complete'
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  organization: Organization | null;
  team: Team | null; // Primary/default team for backward compatibility
  teamMemberships: (UserTeamMembership & { team: Team })[];
  userRole: {
    isOrgAdmin: boolean;
    isTeamAdmin: boolean; // True if user is admin of any team
    orgRole: string | null;
    teamRole: string | null; // Role in primary team
    teamRoles: Record<string, string>; // Role in each team by team ID
  };
  loading: boolean;
  profileState: ProfileCompletionState;
  error: string | null;
  signOut: () => Promise<void>;
  setupUserProfile: (fullName?: string, organizationName?: string) => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
  clearError: () => void;
  // New helper functions for multi-team support
  getTeamRole: (teamId: string) => string | null;
  isTeamAdmin: (teamId: string) => boolean;
  isTeamMember: (teamId: string) => boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  organization: null,
  team: null,
  teamMemberships: [],
  userRole: {
    isOrgAdmin: false,
    isTeamAdmin: false,
    orgRole: null,
    teamRole: null,
    teamRoles: {},
  },
  loading: true,
  profileState: ProfileCompletionState.LOADING,
  error: null,
  signOut: async () => {},
  setupUserProfile: async () => false,
  refreshUserProfile: async () => {},
  clearError: () => {},
  getTeamRole: () => null,
  isTeamAdmin: () => false,
  isTeamMember: () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMemberships, setTeamMemberships] = useState<(UserTeamMembership & { team: Team })[]>([]);
  const [userRole, setUserRole] = useState({
    isOrgAdmin: false,
    isTeamAdmin: false,
    orgRole: null as string | null,
    teamRole: null as string | null,
    teamRoles: {} as Record<string, string>,
  });
  const [loading, setLoading] = useState(true);
  const [profileState, setProfileState] = useState<ProfileCompletionState>(ProfileCompletionState.LOADING);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setOrganization(null);
    setTeam(null);
    setTeamMemberships([]);
    setUserRole({
      isOrgAdmin: false,
      isTeamAdmin: false,
      orgRole: null,
      teamRole: null,
      teamRoles: {},
    });
    setProfileState(ProfileCompletionState.LOADING);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  // Helper functions for multi-team support
  const getTeamRole = (teamId: string): string | null => {
    const membership = teamMemberships.find(tm => tm.team_id === teamId);
    return membership?.team_role || null;
  };

  const isTeamAdmin = (teamId: string): boolean => {
    return getTeamRole(teamId) === 'team_admin';
  };

  const isTeamMember = (teamId: string): boolean => {
    return teamMemberships.some(tm => tm.team_id === teamId);
  };

  const updateUserRole = (profile: UserProfile | null, memberships: (UserTeamMembership & { team: Team })[] = []) => {
    if (!profile) {
      setUserRole({
        isOrgAdmin: false,
        isTeamAdmin: false,
        orgRole: null,
        teamRole: null,
        teamRoles: {},
      });
      return;
    }

    // Build team roles map
    const teamRoles: Record<string, string> = {};
    let hasTeamAdminRole = false;
    let primaryTeamRole: string | null = null;

    memberships.forEach(membership => {
      teamRoles[membership.team_id] = membership.team_role;
      if (membership.team_role === 'team_admin') {
        hasTeamAdminRole = true;
      }
      // Use first team as primary for backward compatibility
      if (!primaryTeamRole) {
        primaryTeamRole = membership.team_role;
      }
    });

    setUserRole({
      isOrgAdmin: profile.org_role === 'org_admin',
      isTeamAdmin: hasTeamAdminRole,
      orgRole: profile.org_role,
      teamRole: primaryTeamRole,
      teamRoles,
    });
  };

  const determineProfileState = (user: User | null, userProfile: UserProfile | null, organization: Organization | null): ProfileCompletionState => {
    if (!user) return ProfileCompletionState.LOADING;
    
    if (!user.email_confirmed_at) {
      return ProfileCompletionState.EMAIL_UNCONFIRMED;
    }
    
    if (!userProfile) {
      return ProfileCompletionState.PROFILE_INCOMPLETE;
    }
    
    if (!userProfile.organization_id || !organization) {
      return ProfileCompletionState.ORGANIZATION_PENDING;
    }
    
    return ProfileCompletionState.COMPLETE;
  };

  const setupUserProfile = async (fullName?: string, organizationName?: string): Promise<boolean> => {
    if (!user?.email) {
      setError('No user email found');
      return false;
    }

    setError(null);
    try {
      const response = await authenticatedFetch('/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          organizationName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || 'Failed to setup user profile');
        return false;
      }

      const data = await response.json();
      setUserProfile(data.userProfile);
      setOrganization(data.organization);
      
      // Handle team memberships from new multi-team system
      const memberships = data.teamMemberships || [];
      setTeamMemberships(memberships);
      
      // Set primary team for backward compatibility (first team or null)
      setTeam(memberships.length > 0 ? memberships[0].team : null);
      
      updateUserRole(data.userProfile, memberships);
      setProfileState(determineProfileState(user, data.userProfile, data.organization));
      return true;
    } catch (error) {
      console.error('Error setting up user profile:', error);
      setError('Network error occurred. Please try again.');
      return false;
    }
  };

  const refreshUserProfile = async () => {
    if (!user?.id) return;

    setError(null);
    try {
      const response = await fetch(`/api/auth/setup?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.userProfile);
        setOrganization(data.organization);
        
        // Handle team memberships from new multi-team system
        const memberships = data.teamMemberships || [];
        setTeamMemberships(memberships);
        
        // Set primary team for backward compatibility (first team or null)
        setTeam(memberships.length > 0 ? memberships[0].team : null);
        
        updateUserRole(data.userProfile, memberships);
        setProfileState(determineProfileState(user, data.userProfile, data.organization));
      } else if (response.status === 404) {
        // User profile doesn't exist yet - this is expected for new users
        setUserProfile(null);
        setOrganization(null);
        setTeam(null);
        setTeamMemberships([]);
        setUserRole({
          isOrgAdmin: false,
          isTeamAdmin: false,
          orgRole: null,
          teamRole: null,
          teamRoles: {},
        });
        setProfileState(determineProfileState(user, null, null));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || 'Failed to refresh user profile');
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      setError('Network error occurred while refreshing profile.');
    }
  };

  const fetchUserProfile = async (userId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/auth/setup?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.userProfile);
        setOrganization(data.organization);
        
        // Handle team memberships from new multi-team system
        const memberships = data.teamMemberships || [];
        setTeamMemberships(memberships);
        
        // Set primary team for backward compatibility (first team or null)
        const primaryTeam = memberships.length > 0 ? memberships[0].team : null;
        setTeam(primaryTeam);
        
        updateUserRole(data.userProfile, memberships);
        return { userProfile: data.userProfile, organization: data.organization, team: primaryTeam };
      } else if (response.status === 404) {
        // User profile doesn't exist yet - this is expected for new users, don't set error
        setUserProfile(null);
        setOrganization(null);
        setTeam(null);
        setTeamMemberships([]);
        setUserRole({
          isOrgAdmin: false,
          isTeamAdmin: false,
          orgRole: null,
          teamRole: null,
          teamRoles: {},
        });
        return { userProfile: null, organization: null, team: null };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Unexpected error fetching user profile:', errorData);
        setError(errorData.error || 'Failed to fetch user profile');
        return { userProfile: null, organization: null };
      }
    } catch (error) {
      console.error('Network error fetching user profile:', error);
      setError('Network error occurred while fetching profile.');
      return { userProfile: null, organization: null, team: null };
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { userProfile, organization, team } = await fetchUserProfile(session.user.id);
        setProfileState(determineProfileState(session.user, userProfile, organization));
      } else {
        setProfileState(ProfileCompletionState.LOADING);
      }
      
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setLoading(true);
        const { userProfile, organization, team } = await fetchUserProfile(session.user.id);
        setProfileState(determineProfileState(session.user, userProfile, organization));
        setLoading(false);
      } else {
        setUserProfile(null);
        setOrganization(null);
        setTeam(null);
        setTeamMemberships([]);
        setUserRole({
          isOrgAdmin: false,
          isTeamAdmin: false,
          orgRole: null,
          teamRole: null,
          teamRoles: {},
        });
        setProfileState(ProfileCompletionState.LOADING);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userProfile, 
      organization,
      team,
      teamMemberships,
      userRole,
      loading,
      profileState,
      error,
      signOut, 
      setupUserProfile, 
      refreshUserProfile,
      clearError,
      getTeamRole,
      isTeamAdmin,
      isTeamMember
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
