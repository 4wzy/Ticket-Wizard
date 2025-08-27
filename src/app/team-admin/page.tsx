'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Team, UserProfile, OrganizationInvitation } from '@/types/database';
import { useRouter } from 'next/navigation';
import CollapsibleSidebar from '@/app/components/CollapsibleSidebar';
import NavHelper from '@/app/components/NavHelper';
import { authenticatedFetch } from '@/lib/api-client';
import TeamUsageOverview from '@/components/TeamUsageOverview';

interface TeamMember extends UserProfile {
  id: string;
  full_name: string;
  org_role: 'org_admin' | 'member';
  team_role: 'team_admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  last_active: string;
  joined_organization_at: string;
}

export default function TeamAdminPage() {
  const { user, userRole, teamMemberships, organization, loading: authLoading, isTeamAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'invitations'>('overview');
  
  // Multi-team support
  const [adminTeams, setAdminTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Team editing
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  
  // Invitation creation
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'team_admin' | 'member' | 'viewer'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !userRole.isTeamAdmin) {
      router.push('/');
      return;
    }
    
    // Get teams where user is admin
    const userAdminTeams = teamMemberships.filter(membership => 
      membership.team_role === 'team_admin'
    ).map(membership => membership.team);
    
    setAdminTeams(userAdminTeams);
    
    // Select first admin team if none selected
    if (!selectedTeamId && userAdminTeams.length > 0) {
      setSelectedTeamId(userAdminTeams[0].id);
    }
    
    if (userAdminTeams.length === 0) {
      setError('You are not an admin of any teams. Please contact your organization admin.');
      setLoading(false);
      return;
    }
    
  }, [authLoading, user, userRole.isTeamAdmin, teamMemberships, selectedTeamId, router]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamData(selectedTeamId);
    }
  }, [selectedTeamId]);

  const fetchTeamData = async (teamId: string) => {
    if (!teamId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch team details and members in parallel
      const [teamResponse, membersResponse] = await Promise.all([
        authenticatedFetch(`/api/teams/${teamId}`),
        authenticatedFetch(`/api/teams/${teamId}/members`)
      ]);
      
      if (!teamResponse.ok) {
        throw new Error('Failed to fetch team data');
      }
      
      const teamData = await teamResponse.json();
      setTeamData(teamData.team || teamData);
      setTeamName(teamData.team?.name || teamData.name);
      setTeamDescription(teamData.team?.description || teamData.description || '');
      
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        // Convert the new member format to the expected format
        const formattedMembers = membersData.members?.map((member: any) => ({
          id: member.id,
          full_name: member.full_name,
          org_role: 'member', // We don't have org_role in team members API
          team_role: member.team_role,
          status: 'active',
          last_active: new Date().toISOString(),
          joined_organization_at: member.joined_at
        })) || [];
        setMembers(formattedMembers);
      }
      
      // Fetch team invitations
      await fetchInvitations(teamId);
    } catch (error) {
      console.error('Error fetching team data:', error);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async (teamId: string) => {
    try {
      const response = await authenticatedFetch(`/api/invitations?teamId=${teamId}`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const updateTeam = async () => {
    if (!selectedTeamId) return;
    
    try {
      const response = await authenticatedFetch(`/api/teams/${selectedTeamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamName,
          description: teamDescription,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update team');
      }
      
      const data = await response.json();
      setTeamData(data.team);
      setEditingTeam(false);
    } catch (error) {
      console.error('Error updating team:', error);
      setError('Failed to update team');
    }
  };

  const updateMemberRole = async (userId: string, newRole: 'team_admin' | 'member' | 'viewer') => {
    if (!selectedTeamId) return;
    
    try {
      const response = await authenticatedFetch(`/api/teams/${selectedTeamId}/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          teamRole: newRole,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update member role');
      }
      
      // Refresh member list
      await fetchTeamData(selectedTeamId);
    } catch (error) {
      console.error('Error updating member role:', error);
      setError('Failed to update member role');
    }
  };

  const removeMember = async (userId: string) => {
    if (!selectedTeamId || !confirm('Are you sure you want to remove this member from the team?')) return;
    
    try {
      const response = await authenticatedFetch(`/api/teams/${selectedTeamId}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove member');
      }
      
      // Refresh member list
      await fetchTeamData(selectedTeamId);
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Failed to remove member');
    }
  };

  const createInvitation = async () => {
    if (!selectedTeamId || !organization?.id) return;
    
    try {
      setInviteLoading(true);
      const response = await authenticatedFetch('/api/invitations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization.id,
          email: inviteEmail || undefined,
          inviteType: 'team',
          orgRole: 'member',
          metadata: {
            teamId: selectedTeamId,
            teamRole: inviteRole
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invitation');
      }
      
      const data = await response.json();
      alert(`Invitation created! Code: ${data.invitation.invite_code}`);
      
      // Reset form and refresh invitations
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
      await fetchInvitations(selectedTeamId);
    } catch (error) {
      console.error('Error creating invitation:', error);
      setError(error instanceof Error ? error.message : 'Failed to create invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <NavHelper />
        <main className="flex min-h-0">
          <CollapsibleSidebar />
          <div className="flex-1 p-8">
            <div className="max-w-6xl mx-auto">
              <div className="animate-pulse-glow bg-gradient-to-r from-purple-600/20 to-violet-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8">
                <h1 className="text-3xl font-bold mb-4 animate-fade-in-up bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">✨ Loading team admin dashboard...</h1>
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

  if (!userRole.isTeamAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <NavHelper />
        <main className="flex min-h-0">
          <CollapsibleSidebar />
          <div className="flex-1 p-8">
            <div className="max-w-6xl mx-auto">
              <div className="animate-scale-in bg-gradient-to-r from-red-600/20 to-orange-600/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-8">
                <h1 className="text-3xl font-bold mb-8 animate-fade-in-up bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">🚫 Access Denied</h1>
                <p className="text-red-400 animate-fade-in-up">You need team admin permissions to access this magical realm.</p>
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
                  ✨ Team Admin Dashboard
                </h1>
                <p className="text-slate-400 text-lg">Manage your magical team realm</p>
              </div>
              <div className="animate-fade-in-up bg-gradient-to-r from-purple-600/20 to-violet-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl px-4 py-2" style={{animationDelay: '0.2s'}}>
                <div className="text-sm text-slate-300 font-medium flex items-center gap-2">
                  <span>🏰</span> {organization?.name} 
                  <span className="text-violet-400">→</span>
                  <span>🛡️</span> {teamData?.name}
                </div>
              </div>
            </div>

            {/* Team Selector */}
            {adminTeams.length > 1 && (
              <div className="animate-fade-in-up mb-6 bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6" style={{animationDelay: '0.3s'}}>
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                  <span>🎯</span> Select Team to Manage
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {adminTeams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
                        selectedTeamId === team.id
                          ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/25'
                          : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-slate-300'
                      }`}
                    >
                      <span className="mr-2">👥</span>
                      {team.name}
                      {selectedTeamId === team.id && <span className="ml-2">✨</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  { id: 'overview', label: '🏰 Overview', icon: '🏰' },
                  { id: 'members', label: '👥 Members', icon: '👥' },
                  { id: 'invitations', label: '📜 Invitations', icon: '📜' }
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
            {activeTab === 'overview' && (
              <div className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                {/* Magical Team Information */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent flex items-center gap-2">
                      <span className="animate-bounce">🕰️</span> Team Information
                    </h2>
                    <button
                      onClick={() => setEditingTeam(!editingTeam)}
                      className="group bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 animate-float"
                    >
                      <span className="mr-2">{editingTeam ? '❌' : '✏️'}</span>
                      {editingTeam ? 'Cancel' : 'Edit Team'}
                      <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">✨</span>
                    </button>
                  </div>

                  {editingTeam ? (
                    <div className="space-y-6">
                      <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                        <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                          <span>🏷️</span> Team Name
                        </label>
                        <input
                          type="text"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300"
                        />
                      </div>
                      <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                        <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                          <span>📝</span> Description
                        </label>
                        <textarea
                          value={teamDescription}
                          onChange={(e) => setTeamDescription(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300"
                        />
                      </div>
                      <div className="flex gap-4 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                        <button
                          onClick={updateTeam}
                          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
                        >
                          <span className="flex items-center gap-2">
                            <span>✨</span> Save Changes
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingTeam(false);
                            setTeamName(teamData?.name || '');
                            setTeamDescription(teamData?.description || '');
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rounded-xl font-medium transition-all duration-300 transform hover:scale-105"
                        >
                          <span className="flex items-center gap-2">
                            <span>❌</span> Cancel
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                        <h3 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
                          <span>🏷️</span> Team Name
                        </h3>
                        <div className="bg-gradient-to-r from-slate-700/30 to-slate-600/30 p-4 rounded-xl border-l-4 border-purple-500/50">
                          <p className="text-lg font-medium">{teamData?.name}</p>
                        </div>
                      </div>
                      <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                        <h3 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
                          <span>📝</span> Description
                        </h3>
                        <div className="bg-gradient-to-r from-slate-700/30 to-slate-600/30 p-4 rounded-xl border-l-4 border-purple-500/50">
                          <p>{teamData?.description || '✨ No description provided'}</p>
                        </div>
                      </div>
                      <div className="md:col-span-2 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                        {selectedTeamId && teamData && (
                          <TeamUsageOverview 
                            teamId={selectedTeamId} 
                            teamName={teamData.name}
                          />
                        )}
                      </div>
                      <div className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                        <h3 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
                          <span>👥</span> Members
                        </h3>
                        <div className="bg-gradient-to-r from-slate-700/30 to-slate-600/30 p-4 rounded-xl border-l-4 border-purple-500/50">
                          <p className="text-lg font-medium">{members.length} team members</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    👥 Team Members ({members.length})
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

                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8">
                  <div className="space-y-4">
                    {members.map((member, index) => (
                      <div key={member.id} className="group bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 hover:border-purple-400/40 transition-all duration-300 transform hover:scale-[1.02] animate-fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-lg animate-float">
                              {(member.full_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white">{member.full_name || '✨ Unnamed User'}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`text-xs px-3 py-1 rounded-lg font-medium ${
                                  member.team_role === 'team_admin' 
                                    ? 'bg-gradient-to-r from-orange-600/20 to-yellow-600/20 text-orange-400 border border-orange-500/30'
                                    : member.team_role === 'member'
                                    ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-500/30'
                                    : 'bg-gradient-to-r from-slate-600/20 to-slate-500/20 text-slate-400 border border-slate-500/30'
                                }`}>
                                  Team: {member.team_role === 'team_admin' ? '🛡️ Admin' : member.team_role === 'member' ? '👤 Member' : '👁️ Viewer'}
                                </span>
                                <span className={`text-xs px-3 py-1 rounded-lg font-medium ${
                                  member.org_role === 'org_admin'
                                    ? 'bg-gradient-to-r from-purple-600/20 to-violet-600/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                  Org: {member.org_role === 'org_admin' ? '👑 Admin' : '👤 Member'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <span>📅</span> Joined: {new Date(member.joined_organization_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <select
                              value={member.team_role}
                              onChange={(e) => updateMemberRole(member.id, e.target.value as any)}
                              className="px-3 py-2 bg-gradient-to-r from-slate-700 to-slate-600 border border-purple-500/30 rounded-lg text-white text-sm hover:border-purple-400/50 transition-all duration-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                              disabled={member.id === user?.id}
                            >
                              <option value="team_admin">🛡️ Team Admin</option>
                              <option value="member">👤 Member</option>
                              <option value="viewer">👁️ Viewer</option>
                            </select>
                            {member.id !== user?.id && (
                              <button
                                onClick={() => removeMember(member.id)}
                                className="px-4 py-2 bg-gradient-to-r from-red-600/20 to-orange-600/20 hover:from-red-600/40 hover:to-orange-600/40 border border-red-500/30 hover:border-red-400/50 rounded-lg text-red-400 hover:text-red-300 text-sm transition-all duration-300 transform hover:scale-105"
                              >
                                🗑️ Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {members.length === 0 && (
                      <div className="text-center py-16 animate-fade-in-up">
                        <div className="bg-gradient-to-r from-purple-600/10 to-violet-600/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-12">
                          <div className="text-6xl mb-4 animate-float">👻</div>
                          <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent mb-2">
                            No team members found
                          </h3>
                          <p className="text-slate-400">Invite some magical beings to join your team!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invitations' && (
              <div className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent mb-8 flex items-center gap-2">
                  <span className="animate-bounce">📜</span> Active Team Invitations ({invitations.length})
                </h2>
                
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8">
                  <div className="space-y-4">
                    {invitations.map((invitation, index) => (
                      <div key={invitation.id} className="group bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6 hover:border-indigo-400/40 transition-all duration-300 transform hover:scale-[1.02] animate-fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-lg font-bold bg-gradient-to-r from-slate-700 to-slate-600 px-3 py-2 rounded-lg border border-indigo-500/30">
                                  {invitation.invite_code}
                                </span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(invitation.invite_code)}
                                  className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105"
                                >
                                  📋 Copy
                                </button>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                invitation.status === 'active' 
                                  ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-500/30' 
                                  : 'bg-gradient-to-r from-red-600/20 to-orange-600/20 text-red-400 border border-red-500/30'
                              }`}>
                                {invitation.status === 'active' ? '✨ Active' : '❌ Inactive'}
                              </span>
                            </div>
                            
                            <div className="grid md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-indigo-400 font-bold flex items-center gap-1">
                                  <span>🎖️</span> Role:
                                </span>
                                <div className="mt-1">
                                  {(() => {
                                    const metadata = invitation.metadata as any;
                                    const teamRole = metadata?.teamRole || metadata?.teamMemberships?.[0]?.teamRole || 'viewer';
                                    return (
                                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                        teamRole === 'team_admin' 
                                          ? 'bg-gradient-to-r from-orange-600/20 to-yellow-600/20 text-orange-400 border border-orange-500/30'
                                          : teamRole === 'member'
                                          ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-500/30'
                                          : 'bg-gradient-to-r from-slate-600/20 to-slate-500/20 text-slate-400 border border-slate-500/30'
                                      }`}>
                                        {teamRole === 'team_admin' ? '🛡️ Admin' : teamRole === 'member' ? '👤 Member' : '👁️ Viewer'}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div>
                                <span className="text-indigo-400 font-bold flex items-center gap-1">
                                  <span>📊</span> Usage:
                                </span>
                                <div className="text-white mt-1">
                                  <span className="font-mono font-bold">{invitation.uses_count}</span> / {invitation.max_uses || '∞'} uses
                                  {invitation.max_uses && invitation.uses_count >= invitation.max_uses && (
                                    <span className="text-red-400 ml-2 text-xs">(Exhausted)</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-indigo-400 font-bold flex items-center gap-1">
                                  <span>📬</span> Target:
                                </span>
                                <div className="text-white mt-1">
                                  {invitation.email ? (
                                    <span className="font-mono bg-slate-700/50 px-2 py-1 rounded text-xs">{invitation.email}</span>
                                  ) : (
                                    <span className="text-yellow-400 text-xs">✨ Open invitation</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 text-xs text-slate-400 flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <span>📅</span> Created: {new Date(invitation.created_at).toLocaleDateString()}
                              </span>
                              {invitation.expires_at && (
                                <span className="flex items-center gap-1">
                                  <span>⏰</span> Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {invitations.length === 0 && (
                      <div className="text-center py-16 animate-fade-in-up">
                        <div className="bg-gradient-to-r from-indigo-600/10 to-blue-600/10 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-12">
                          <div className="text-6xl mb-4 animate-float">🎆</div>
                          <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent mb-2">
                            No active invitations
                          </h3>
                          <p className="text-slate-400">Create magical invitations to grow your team!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Magical Invite Member Modal */}
            {showInviteForm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 w-full max-w-md animate-scale-in shadow-2xl shadow-purple-500/20">
                  <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent flex items-center gap-2">
                    <span className="animate-bounce">🎉</span> Invite Team Member
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                      <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>📬</span> Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Leave blank for ✨ open invitation"
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300"
                      />
                    </div>
                    
                    <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                      <label className="block text-sm font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>🎭</span> Team Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-purple-500/30 rounded-xl text-white backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300"
                      >
                        <option value="member">👤 Member</option>
                        <option value="team_admin">🛡️ Team Admin</option>
                        <option value="viewer">👁️ Viewer</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={createInvitation}
                      disabled={inviteLoading}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 disabled:shadow-none disabled:scale-100"
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