'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Team, UserProfile, OrganizationInvitation, Organization } from '@/types/database';
import { useRouter } from 'next/navigation';
import CollapsibleSidebar from '@/app/components/CollapsibleSidebar';
import NavHelper from '@/app/components/NavHelper';
import { authenticatedFetch } from '@/lib/api-client';
import OrganizationUsageOverview from '@/components/OrganizationUsageOverview';

interface TeamMembership {
  team_id: string;
  team_name: string;
  team_role: 'team_admin' | 'member' | 'viewer';
  joined_at: string;
}

interface OrgMember extends UserProfile {
  id: string;
  full_name: string;
  org_role: 'org_admin' | 'member';
  status: 'active' | 'pending' | 'suspended';
  last_active: string;
  joined_organization_at: string;
  team_memberships: TeamMembership[];
  // Legacy fields for backward compatibility
  team_id?: string;
  team_role?: 'team_admin' | 'member' | 'viewer';
  team_name?: string;
}

export default function OrgAdminPage() {
  const { user, userRole, organization, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'teams' | 'members' | 'invitations' | 'usage' | 'settings'>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Team creation
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSlug, setNewTeamSlug] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamTokenLimit, setNewTeamTokenLimit] = useState(100000);
  const [createLoading, setCreateLoading] = useState(false);

  // Invitation creation
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteType, setInviteType] = useState<'organization' | 'team'>('team');
  const [inviteTeamId, setInviteTeamId] = useState<string>('');
  const [inviteOrgRole, setInviteOrgRole] = useState<'org_admin' | 'member'>('member');
  const [inviteTeamRole, setInviteTeamRole] = useState<'team_admin' | 'member' | 'viewer'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

  // Multi-team assignment state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [teamAssignments, setTeamAssignments] = useState<Record<string, TeamMembership[]>>({});

  useEffect(() => {
    console.log('useEffect triggered:', { 
      authLoading, 
      user: !!user, 
      isOrgAdmin: userRole.isOrgAdmin, 
      organization: !!organization,
      orgId: organization?.id 
    });
    
    if (authLoading) {
      console.log('Still loading auth...');
      return;
    }
    
    if (!user || !userRole.isOrgAdmin) {
      console.log('User not authenticated or not org admin, redirecting');
      router.push('/');
      return;
    }
    
    if (!organization) {
      console.log('No organization found');
      setError('No organization found. Please contact support.');
      setLoading(false);
      return;
    }
    
    console.log('All conditions met, fetching org data');
    fetchOrgData();
  }, [authLoading, user, userRole.isOrgAdmin, organization, router]);

  const fetchOrgData = async () => {
    if (!organization?.id) {
      console.log('No organization ID available');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching org data for organization:', organization.id);
      
      // Fetch teams, members, and invitations in parallel
      const [teamsRes, membersRes, invitationsRes] = await Promise.all([
        authenticatedFetch('/api/teams'),
        authenticatedFetch(`/api/organizations/members?orgId=${organization.id}`),
        authenticatedFetch(`/api/invitations?organizationId=${organization.id}`)
      ]);
      
      console.log('API responses:', { 
        teams: teamsRes.status, 
        members: membersRes.status, 
        invitations: invitationsRes.status 
      });
      
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        console.log('Teams data:', teamsData);
        setTeams(teamsData.teams || []);
      } else {
        console.error('Teams fetch failed:', teamsRes.status, await teamsRes.text().catch(() => 'No error text'));
      }
      
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        console.log('Members data:', membersData);
        const membersList = membersData.organization?.members || [];
        setMembers(membersList);
        
        // Initialize team assignments for editing
        const assignments: Record<string, TeamMembership[]> = {};
        membersList.forEach((member: OrgMember) => {
          assignments[member.id] = member.team_memberships || [];
        });
        setTeamAssignments(assignments);
      } else {
        console.error('Members fetch failed:', membersRes.status, await membersRes.text().catch(() => 'No error text'));
      }
      
      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json();
        console.log('Invitations data:', invitationsData);
        setInvitations(invitationsData.invitations || []);
      } else {
        console.error('Invitations fetch failed:', invitationsRes.status, await invitationsRes.text().catch(() => 'No error text'));
      }
    } catch (error) {
      console.error('Error fetching org data:', error);
      setError(`Failed to load organization data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!organization?.id || !newTeamName || !newTeamSlug) return;
    
    try {
      setCreateLoading(true);
      const response = await authenticatedFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: newTeamName,
          slug: newTeamSlug,
          description: newTeamDescription,
          tokenLimit: newTeamTokenLimit,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create team');
      }
      
      // Reset form and refresh data
      setNewTeamName('');
      setNewTeamSlug('');
      setNewTeamDescription('');
      setNewTeamTokenLimit(100000);
      setShowCreateTeam(false);
      await fetchOrgData();
    } catch (error) {
      console.error('Error creating team:', error);
      setError(error instanceof Error ? error.message : 'Failed to create team');
    } finally {
      setCreateLoading(false);
    }
  };

  const deleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete "${teamName}"? This will remove all team members from the team.`)) {
      return;
    }
    
    try {
      const response = await authenticatedFetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete team');
      }
      
      await fetchOrgData();
    } catch (error) {
      console.error('Error deleting team:', error);
      setError('Failed to delete team');
    }
  };

  const updateMemberOrgRole = async (userId: string, newRole: 'org_admin' | 'member') => {
    try {
      const response = await authenticatedFetch(`/api/organizations/members`, {
        method: 'PUT',
        body: JSON.stringify({
          userId,
          orgRole: newRole,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update member role');
      }
      
      await fetchOrgData();
    } catch (error) {
      console.error('Error updating member role:', error);
      setError('Failed to update member role');
    }
  };

  const updateMemberTeam = async (userId: string, teamId: string | null) => {
    try {
      const response = await authenticatedFetch(`/api/organizations/members`, {
        method: 'PUT',
        body: JSON.stringify({
          userId,
          teamId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update member team');
      }
      
      await fetchOrgData();
    } catch (error) {
      console.error('Error updating member team:', error);
      setError('Failed to update member team');
    }
  };

  const updateMemberTeamAssignments = async (userId: string, teamMemberships: TeamMembership[]) => {
    try {
      const response = await authenticatedFetch(`/api/organizations/members`, {
        method: 'PUT',
        body: JSON.stringify({
          userId,
          teamMemberships: teamMemberships.map(tm => ({
            teamId: tm.team_id,
            teamRole: tm.team_role
          }))
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update member team assignments');
      }
      
      await fetchOrgData();
      setEditingMemberId(null);
    } catch (error) {
      console.error('Error updating member team assignments:', error);
      setError('Failed to update member team assignments');
    }
  };

  const addTeamToMember = (userId: string, teamId: string, teamRole: 'team_admin' | 'member' | 'viewer' = 'member') => {
    const currentAssignments = teamAssignments[userId] || [];
    if (currentAssignments.some(tm => tm.team_id === teamId)) {
      setError('User is already assigned to this team');
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) {
      setError('Team not found');
      return;
    }

    const newAssignment: TeamMembership = {
      team_id: teamId,
      team_name: team.name,
      team_role: teamRole,
      joined_at: new Date().toISOString()
    };

    setTeamAssignments(prev => ({
      ...prev,
      [userId]: [...currentAssignments, newAssignment]
    }));
  };

  const removeTeamFromMember = (userId: string, teamId: string) => {
    setTeamAssignments(prev => ({
      ...prev,
      [userId]: (prev[userId] || []).filter(tm => tm.team_id !== teamId)
    }));
  };

  const updateTeamRole = (userId: string, teamId: string, newRole: 'team_admin' | 'member' | 'viewer') => {
    setTeamAssignments(prev => ({
      ...prev,
      [userId]: (prev[userId] || []).map(tm => 
        tm.team_id === teamId ? { ...tm, team_role: newRole } : tm
      )
    }));
  };

  const createInvitation = async () => {
    if (!organization?.id) return;
    
    // Validation for team invites
    if (inviteType === 'team' && !inviteTeamId) {
      setError('Please select a team for team invitations');
      return;
    }
    
    try {
      setInviteLoading(true);
      const response = await authenticatedFetch('/api/invitations/create', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: organization.id,
          teamId: inviteType === 'team' ? inviteTeamId : undefined,
          email: inviteEmail || undefined,
          inviteType: inviteType,
          orgRole: inviteOrgRole,
          teamRole: inviteTeamRole,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invitation');
      }
      
      const data = await response.json();
      setCreatedInviteCode(data.invitation.invite_code);
      
      // Reset form and refresh data
      setInviteEmail('');
      setInviteType('team');
      setInviteTeamId('');
      setInviteOrgRole('member');
      setInviteTeamRole('member');
      setShowInviteForm(false);
      await fetchOrgData();
    } catch (error) {
      console.error('Error creating invitation:', error);
      setError(error instanceof Error ? error.message : 'Failed to create invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  // Auto-generate slug from team name
  useEffect(() => {
    if (newTeamName) {
      const slug = newTeamName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setNewTeamSlug(slug);
    }
  }, [newTeamName]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <NavHelper />
        <main className="flex min-h-0">
          <CollapsibleSidebar />
          <div className="flex-1 p-8">
            <div className="max-w-6xl mx-auto">
              <div className="animate-pulse-glow bg-gradient-to-r from-purple-600/20 to-violet-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8">
                <h1 className="text-3xl font-bold mb-4 animate-fade-in-up bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">✨ Loading organization admin dashboard...</h1>
                <div className="animate-float">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!userRole.isOrgAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <NavHelper />
        <main className="flex min-h-0">
          <CollapsibleSidebar />
          <div className="flex-1 p-8">
            <div className="max-w-6xl mx-auto">
              <div className="animate-scale-in bg-gradient-to-r from-red-600/20 to-orange-600/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-8">
                <h1 className="text-3xl font-bold mb-8 animate-fade-in-up bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">🚫 Access Denied</h1>
                <p className="text-red-400 animate-fade-in-up">You need organization admin permissions to access this magical realm.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Magical background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-violet-500 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{animationDelay: '4s'}}></div>
      </div>
      <NavHelper />
      <main className="flex min-h-0">
        <CollapsibleSidebar />
        <div className="flex-1 p-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="animate-fade-in-up">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent mb-2">
                  ✨ Organization Admin Dashboard
                </h1>
                <p className="text-slate-400 text-lg">Manage your magical organization realm</p>
              </div>
              <div className="animate-fade-in-up bg-gradient-to-r from-purple-600/20 to-violet-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl px-4 py-2" style={{animationDelay: '0.2s'}}>
                <div className="text-sm text-slate-300 font-medium">
                  🏰 {organization?.name}
                </div>
              </div>
            </div>

            {error && (
              <div className="animate-scale-in bg-gradient-to-r from-red-600/20 to-orange-600/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 mb-6 animate-pulse-glow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">⚠️</span>
                  <p className="text-red-400 font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg px-4 py-2 text-red-300 hover:text-red-100 transition-all duration-300 animate-bounce"
                >
                  ✨ Dismiss
                </button>
              </div>
            )}

            {/* Magical Tab Navigation */}
            <div className="animate-fade-in-up bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-purple-500/20 p-2 rounded-2xl mb-8" style={{animationDelay: '0.4s'}}>
              <div className="flex space-x-2">
                {[
                  { id: 'teams', label: '👥 Teams', icon: '👥' },
                  { id: 'members', label: '🧙‍♀️ Members', icon: '🧙‍♀️' },
                  { id: 'invitations', label: '📜 Invitations', icon: '📜' },
                  { id: 'usage', label: '📊 Usage Analytics', icon: '📊' },
                  { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
                ].map((tab, index) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/25 animate-pulse-glow'
                        : 'text-slate-400 hover:text-white hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 animate-float'
                    }`}
                    style={activeTab !== tab.id ? {animationDelay: `${index * 0.1}s`} : {}}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            {/* Magical Tab Content */}
            {activeTab === 'teams' && (
              <div className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    👥 Teams ({teams.length})
                  </h2>
                  <button
                    onClick={() => setShowCreateTeam(true)}
                    className="group bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 animate-float"
                  >
                    <span className="mr-2">✨</span>
                    Create Team
                    <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">🎆</span>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teams.map((team, index) => (
                    <div key={team.id} className="group bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 hover:border-purple-400/40 transition-all duration-300 transform hover:scale-105 animate-fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">{team.name}</h3>
                          <p className="text-sm text-slate-400 font-mono bg-slate-800/50 px-2 py-1 rounded-lg mt-1">/{team.slug}</p>
                        </div>
                        <button
                          onClick={() => deleteTeam(team.id, team.name)}
                          className="text-red-400 hover:text-red-300 text-sm bg-red-600/10 hover:bg-red-600/20 px-3 py-2 rounded-lg transition-all duration-300 border border-red-500/30 hover:border-red-400/50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                      <div className="mb-4">
                        <p className="text-slate-300 text-sm bg-slate-800/30 p-3 rounded-lg border-l-4 border-purple-500/50">
                          {team.description || '✨ No description'}
                        </p>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="bg-gradient-to-r from-slate-800/30 to-slate-700/30 p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-400 flex items-center gap-2">
                              <span>📊</span> Token Usage:
                            </span>
                            <span className="font-mono font-medium">{team.tokens_used?.toLocaleString()} / {team.token_limit?.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full transition-all duration-500" 
                              style={{width: `${Math.min(((team.tokens_used || 0) / (team.token_limit || 1)) * 100, 100)}%`}}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 flex items-center gap-2">
                            <span>📅</span> Created:
                          </span>
                          <span className="font-medium">{new Date(team.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {teams.length === 0 && (
                    <div className="col-span-full text-center py-16 animate-fade-in-up">
                      <div className="bg-gradient-to-r from-purple-600/10 to-violet-600/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-12">
                        <div className="text-6xl mb-4 animate-float">🎆</div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent mb-2">
                          No teams found
                        </h3>
                        <p className="text-slate-400">Create your first magical team to get started on this adventure!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    🧙‍♀️ Organization Members ({members.length})
                  </h2>
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="group bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/25 animate-float"
                  >
                    <span className="mr-2">🎉</span>
                    Invite Member
                    <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">✨</span>
                  </button>
                </div>

                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-700/80 to-slate-600/80">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">👤 Member</th>
                        <th className="text-left px-6 py-4 text-sm font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">🏰 Organization Role</th>
                        <th className="text-left px-6 py-4 text-sm font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">👥 Team Memberships</th>
                        <th className="text-left px-6 py-4 text-sm font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">⚙️ Actions</th>
                        <th className="text-left px-6 py-4 text-sm font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">📅 Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {members.map((member, index) => (
                        <tr key={member.id} className="hover:bg-gradient-to-r hover:from-purple-600/10 hover:to-violet-600/10 transition-all duration-300 animate-fade-in-up" style={{animationDelay: `${index * 0.05}s`}}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold">
                                {(member.full_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-white">{member.full_name || '✨ Unnamed User'}</div>
                                <div className="text-xs text-slate-400 font-mono bg-slate-800/50 px-2 py-1 rounded">{member.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={member.org_role}
                              onChange={(e) => updateMemberOrgRole(member.id, e.target.value as any)}
                              className="px-3 py-2 bg-gradient-to-r from-slate-700 to-slate-600 border border-purple-500/30 rounded-lg text-white text-sm hover:border-purple-400/50 transition-all duration-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                              disabled={member.id === user?.id}
                            >
                              <option value="member">👤 Member</option>
                              <option value="org_admin">👑 Organization Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              {member.team_memberships.length > 0 ? (
                                member.team_memberships.map((membership) => (
                                  <div key={membership.team_id} className="flex items-center gap-2 bg-slate-800/30 rounded-lg p-2">
                                    <span className="text-sm font-medium text-white">{membership.team_name}</span>
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                                      membership.team_role === 'team_admin' 
                                        ? 'bg-orange-600/20 text-orange-400'
                                        : membership.team_role === 'member'
                                        ? 'bg-green-600/20 text-green-400'
                                        : 'bg-slate-600/20 text-slate-400'
                                    }`}>
                                      {membership.team_role === 'team_admin' ? '🛡️ Admin' : membership.team_role === 'member' ? '👤 Member' : '👁️ Viewer'}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-sm text-slate-400 italic">No team assignments</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setEditingMemberId(editingMemberId === member.id ? null : member.id)}
                              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg text-white text-sm font-medium transition-all duration-300 transform hover:scale-105"
                            >
                              {editingMemberId === member.id ? '❌ Cancel' : '✏️ Edit Teams'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-400 flex items-center gap-1">
                              <span>📅</span>
                              {new Date(member.joined_organization_at).toLocaleDateString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {members.length === 0 && (
                    <div className="text-center py-16">
                      <div className="animate-float text-6xl mb-4">👻</div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent mb-2">
                        No members found
                      </h3>
                      <p className="text-slate-400">Invite some magical beings to join your organization!</p>
                    </div>
                  )}
                </div>

                {/* Team Assignment Editor */}
                {editingMemberId && (
                  <div className="mt-8 bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent mb-6">
                      ✏️ Edit Team Assignments for {members.find(m => m.id === editingMemberId)?.full_name || 'User'}
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Current team assignments */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-3">👥 Current Team Assignments</h4>
                        <div className="space-y-2">
                          {(teamAssignments[editingMemberId] || []).map((assignment) => (
                            <div key={assignment.team_id} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-white">{assignment.team_name}</span>
                                <select
                                  value={assignment.team_role}
                                  onChange={(e) => updateTeamRole(editingMemberId, assignment.team_id, e.target.value as any)}
                                  className="px-3 py-1 bg-slate-700 border border-purple-500/30 rounded text-white text-sm"
                                >
                                  <option value="viewer">👁️ Viewer</option>
                                  <option value="member">👤 Member</option>
                                  <option value="team_admin">🛡️ Admin</option>
                                </select>
                              </div>
                              <button
                                onClick={() => removeTeamFromMember(editingMemberId, assignment.team_id)}
                                className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition-all duration-300"
                              >
                                ❌ Remove
                              </button>
                            </div>
                          ))}
                          {(teamAssignments[editingMemberId] || []).length === 0 && (
                            <p className="text-sm text-slate-400 italic">No current team assignments</p>
                          )}
                        </div>
                      </div>

                      {/* Add new team assignment */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-3">➕ Add New Team Assignment</h4>
                        <div className="flex gap-3">
                          <select
                            className="flex-1 px-3 py-2 bg-slate-700 border border-purple-500/30 rounded-lg text-white text-sm"
                            onChange={(e) => {
                              if (e.target.value) {
                                addTeamToMember(editingMemberId, e.target.value, 'member');
                                e.target.value = '';
                              }
                            }}
                          >
                            <option value="">✨ Select a team to add...</option>
                            {teams
                              .filter(team => !(teamAssignments[editingMemberId] || []).some(ta => ta.team_id === team.id))
                              .map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                              ))
                            }
                          </select>
                        </div>
                      </div>

                      {/* Save/Cancel buttons */}
                      <div className="flex gap-3 pt-4 border-t border-slate-700">
                        <button
                          onClick={() => updateMemberTeamAssignments(editingMemberId, teamAssignments[editingMemberId] || [])}
                          className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-medium transition-all duration-300 transform hover:scale-105"
                        >
                          💾 Save Changes
                        </button>
                        <button
                          onClick={() => setEditingMemberId(null)}
                          className="px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 rounded-lg text-white font-medium transition-all duration-300"
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'invitations' && (
              <div className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-8">
                  📜 Active Invitations ({invitations.length})
                </h2>

                {/* Show newly created invitation code */}
                {createdInviteCode && (
                  <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-green-400 mb-2">Invitation Created Successfully!</h3>
                        <p className="text-sm text-slate-300 mb-3">Share this code with the person you want to invite:</p>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-xl font-bold bg-slate-800 px-4 py-2 rounded border">
                            {createdInviteCode}
                          </span>
                          <button
                            onClick={() => navigator.clipboard.writeText(createdInviteCode)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                          >
                            Copy Code
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => setCreatedInviteCode(null)}
                        className="text-green-300 hover:text-green-100 text-sm"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-slate-800 rounded-lg p-6 border-l-4 border-purple-500">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xl font-bold bg-slate-700 px-3 py-1 rounded">
                                {invitation.invite_code}
                              </span>
                              <button
                                onClick={() => navigator.clipboard.writeText(invitation.invite_code)}
                                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                              >
                                Copy
                              </button>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              invitation.status === 'active' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {invitation.status}
                            </span>
                          </div>
                          
                          {/* Permissions Summary */}
                          <div className="mb-4 p-3 bg-slate-700 rounded-lg">
                            <h4 className="text-sm font-semibold text-purple-400 mb-2">What this invitation grants:</h4>
                            <div className="flex flex-wrap gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                invitation.org_role === 'org_admin' 
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-blue-600 text-white'
                              }`}>
                                Org: {invitation.org_role === 'org_admin' ? 'Admin' : 'Member'}
                              </span>
                              {(() => {
                                const metadata = invitation.metadata as any;
                                const teamRole = metadata?.teamRole || metadata?.teamMemberships?.[0]?.teamRole || 'viewer';
                                const teamName = metadata?.teamId ? teams.find(t => t.id === metadata.teamId)?.name || 'Team' : 'General';
                                return (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    teamRole === 'team_admin' 
                                      ? 'bg-orange-600 text-white'
                                      : teamRole === 'member'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-600 text-white'
                                  }`}>
                                    {teamName}: {teamRole === 'team_admin' ? 'Admin' : teamRole === 'member' ? 'Member' : 'Viewer'}
                                  </span>
                                );
                              })()}
                              {invitation.email && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-600 text-white">
                                  Email-specific
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Detailed Information */}
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-slate-400 font-medium">Target Team:</span>
                              <div className="text-white mt-1">
                                {invitation.invite_type === 'team' && invitation.team_id ? (
                                  <span className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30">
                                    {teams.find(t => t.id === invitation.team_id)?.name || 'Unknown Team'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Organization-wide</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Target Email:</span>
                              <div className="text-white mt-1">
                                {invitation.email ? (
                                  <span className="font-mono bg-slate-700 px-2 py-1 rounded">{invitation.email}</span>
                                ) : (
                                  <span className="text-yellow-400">Any user can use</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Usage:</span>
                              <div className="text-white mt-1">
                                <span className="font-semibold">{invitation.uses_count}</span> / {invitation.max_uses || '∞'} uses
                                {invitation.max_uses && invitation.uses_count >= invitation.max_uses && (
                                  <span className="text-red-400 ml-2">(Exhausted)</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Created:</span>
                              <div className="text-white mt-1">{new Date(invitation.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>

                          {/* Expiration Warning */}
                          {invitation.expires_at && (
                            <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600 rounded text-sm">
                              <span className="text-yellow-400 font-medium">Expires:</span> {new Date(invitation.expires_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {invitations.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <p>No active invitations.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    📊 Organization Usage Analytics
                  </h2>
                  <div className="text-sm text-cyan-300 bg-cyan-900/30 px-4 py-2 rounded-lg border border-cyan-600/30">
                    Real-time insights across all teams
                  </div>
                </div>

                {organization?.id && (
                  <OrganizationUsageOverview 
                    organizationId={organization.id} 
                    organizationName={organization.name} 
                  />
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent mb-8">
                  ⚙️ Organization Settings
                </h2>
                
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                    <span>🏰</span> Organization Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                      <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>🏷️</span> Organization Name
                      </label>
                      <input
                        type="text"
                        value={organization?.name || ''}
                        readOnly
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm"
                      />
                    </div>
                    <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                      <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>🌐</span> Domain
                      </label>
                      <input
                        type="text"
                        value={organization?.domain || '✨ No domain set'}
                        readOnly
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm"
                      />
                    </div>
                    <div className="animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                      <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>🏆</span> Plan Tier
                      </label>
                      <input
                        type="text"
                        value={organization?.plan_tier || '✨ trial'}
                        readOnly
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm"
                      />
                    </div>
                    <div className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                      <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>📊</span> Total Token Limit
                      </label>
                      <input
                        type="text"
                        value={organization?.token_limit?.toLocaleString() || '0'}
                        readOnly
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Magical Create Team Modal */}
            {showCreateTeam && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 w-full max-w-md animate-scale-in shadow-2xl shadow-purple-500/20">
                  <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent flex items-center gap-2">
                    <span className="animate-bounce">✨</span> Create New Team
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                      <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>🏷️</span> Team Name
                      </label>
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g., ✨ Engineering Team"
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300"
                      />
                    </div>
                    
                    <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                      <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>🔗</span> Team Slug
                      </label>
                      <input
                        type="text"
                        value={newTeamSlug}
                        onChange={(e) => setNewTeamSlug(e.target.value)}
                        placeholder="e.g., engineering-team"
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300 font-mono"
                      />
                    </div>
                    
                    <div className="animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                      <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>📝</span> Description (Optional)
                      </label>
                      <textarea
                        value={newTeamDescription}
                        onChange={(e) => setNewTeamDescription(e.target.value)}
                        placeholder="Brief magical description of the team..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300"
                      />
                    </div>
                    
                    <div className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                      <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>📊</span> Token Limit
                      </label>
                      <input
                        type="number"
                        value={newTeamTokenLimit}
                        onChange={(e) => setNewTeamTokenLimit(parseInt(e.target.value) || 100000)}
                        min="1000"
                        step="1000"
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300 font-mono"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={createTeam}
                      disabled={createLoading || !newTeamName || !newTeamSlug}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 disabled:shadow-none disabled:scale-100"
                    >
                      {createLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Creating...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span>✨</span> Create Team
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowCreateTeam(false)}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rounded-xl font-medium transition-all duration-300 transform hover:scale-105"
                    >
                      <span className="flex items-center gap-2">
                        <span>❌</span> Cancel
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Magical Invite Member Modal */}
            {showInviteForm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-xl border border-green-500/30 rounded-2xl p-8 w-full max-w-md animate-scale-in shadow-2xl shadow-green-500/20">
                  <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
                    <span className="animate-bounce">🎉</span> Create Invitation
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                      <label className="block text-sm font-bold mb-3 text-green-400 flex items-center gap-2">
                        <span>🎯</span> Invitation Type
                      </label>
                      <select
                        value={inviteType}
                        onChange={(e) => {
                          setInviteType(e.target.value as any);
                          setInviteTeamId(''); // Reset team selection when type changes
                        }}
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-green-500/30 rounded-xl text-white backdrop-blur-sm focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-300"
                      >
                        <option value="team">👥 Team Invite (Recommended)</option>
                        <option value="organization">🏰 Organization Only (No Team Assignment)</option>
                      </select>
                    </div>
                    
                    {inviteType === 'team' && (
                      <div className="animate-fade-in-up" style={{animationDelay: '0.15s'}}>
                        <label className="block text-sm font-bold mb-3 text-green-400 flex items-center gap-2">
                          <span>👥</span> Select Team
                        </label>
                        <select
                          value={inviteTeamId}
                          onChange={(e) => setInviteTeamId(e.target.value)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-green-500/30 rounded-xl text-white backdrop-blur-sm focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-300"
                        >
                          <option value="">Select a team...</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                      <label className="block text-sm font-bold mb-3 text-green-400 flex items-center gap-2">
                        <span>📬</span> Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Leave blank for ✨ open invitation"
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-green-500/30 rounded-xl text-white backdrop-blur-sm focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-300"
                      />
                    </div>
                    
                    <div className="animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                      <label className="block text-sm font-bold mb-3 text-green-400 flex items-center gap-2">
                        <span>🏰</span> Organization Role
                      </label>
                      <select
                        value={inviteOrgRole}
                        onChange={(e) => setInviteOrgRole(e.target.value as any)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-green-500/30 rounded-xl text-white backdrop-blur-sm focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-300"
                      >
                        <option value="member">👤 Member</option>
                        <option value="org_admin">👑 Organization Admin</option>
                      </select>
                    </div>
                    
                    {inviteType === 'team' && (
                      <div className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                        <label className="block text-sm font-bold mb-3 text-green-400 flex items-center gap-2">
                          <span>🎭</span> Team Role
                        </label>
                        <select
                          value={inviteTeamRole}
                          onChange={(e) => setInviteTeamRole(e.target.value as any)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-green-500/30 rounded-xl text-white backdrop-blur-sm focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-300"
                        >
                          <option value="member">👤 Member</option>
                          <option value="team_admin">🛡️ Team Admin</option>
                          <option value="viewer">👁️ Viewer</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={createInvitation}
                      disabled={inviteLoading}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/25 disabled:shadow-none disabled:scale-100"
                    >
                      {inviteLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Creating...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span>✨</span> Create Invitation
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowInviteForm(false)}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rounded-xl font-medium transition-all duration-300 transform hover:scale-105"
                    >
                      <span className="flex items-center gap-2">
                        <span>❌</span> Cancel
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}