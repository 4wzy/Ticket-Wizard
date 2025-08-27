'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authenticatedFetch } from '@/lib/api-client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string;
  plan_tier: string;
  member_count: number;
  created_at: string;
}

interface Member {
  id: string;
  full_name: string;
  role: string;
  status: string;
  joined_at: string;
}

export default function TestOrgsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinSlug, setJoinSlug] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await authenticatedFetch('/api/organizations/list');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/members?orgId=${orgId}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.organization.members);
        setSelectedOrg(orgId);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const joinOrganization = async () => {
    if (!user || !joinSlug.trim()) return;

    setJoinLoading(true);
    setMessage('');

    try {
      const response = await authenticatedFetch('/api/organizations/join', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          orgSlug: joinSlug.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        fetchOrganizations(); // Refresh the list
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Network error occurred');
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Loading organizations...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🏢 Organization Test Dashboard</h1>
        
        {/* Join Organization Section */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Join Organization by Slug</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={joinSlug}
              onChange={(e) => setJoinSlug(e.target.value)}
              placeholder="Enter organization slug"
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
            <button
              onClick={joinOrganization}
              disabled={joinLoading || !user}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded font-semibold"
            >
              {joinLoading ? 'Joining...' : 'Join'}
            </button>
          </div>
          {message && (
            <div className="mt-4 p-3 bg-slate-700 rounded">
              {message}
            </div>
          )}
        </div>

        {/* Create Invitation Section */}
        <CreateInvitationSection organizations={organizations} user={user} />

        {/* Organizations List */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">All Organizations ({organizations.length})</h2>
            <div className="space-y-4">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="bg-slate-800 rounded-lg p-4 cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => fetchMembers(org.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{org.name}</h3>
                      <p className="text-slate-400">Slug: <code className="bg-slate-700 px-2 py-1 rounded">{org.slug}</code></p>
                      <p className="text-slate-400">Domain: {org.domain}</p>
                      <p className="text-slate-400">Plan: {org.plan_tier}</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
                        {org.member_count} members
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(org.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Members List */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              {selectedOrg ? 'Organization Members' : 'Select an organization'}
            </h2>
            {selectedOrg && (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="bg-slate-800 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{member.full_name}</h4>
                        <p className="text-slate-400 text-sm">ID: {member.id}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          member.role === 'admin' ? 'bg-red-600' : 'bg-blue-600'
                        }`}>
                          {member.role}
                        </span>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🧪 How to Test Organization Joining</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">Method 1: Domain-Based Auto-Join</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
                <li>Note the domain of an existing organization above</li>
                <li>Register a new user with an email from that domain</li>
                <li>Complete the signup process</li>
                <li>The user will automatically join the organization as a member</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">Method 2: Slug-Based Invitation</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
                <li>Copy the slug of an organization above</li>
                <li>Enter it in the "Join Organization" form</li>
                <li>Click "Join" to join that organization</li>
                <li>Refresh to see the updated member count</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateInvitationSection({ organizations, user }: { organizations: Organization[], user: any }) {
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [inviteType, setInviteType] = useState<'organization' | 'team'>('organization');
  const [orgRole, setOrgRole] = useState<'org_admin' | 'member'>('member');
  const [teamRole, setTeamRole] = useState<'team_admin' | 'member' | 'viewer'>('member');
  const [email, setEmail] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const createInvitation = async () => {
    if (!selectedOrgId || !user) return;

    setLoading(true);
    setResult('');

    try {
      const response = await authenticatedFetch('/api/invitations/create', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: selectedOrgId,
          email: email || undefined,
          inviteType,
          orgRole,
          teamRole,
          maxUses: maxUses ? parseInt(maxUses) : undefined,
          expiresAt: expiresAt || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(`✅ Invitation created! Code: ${data.invitation.invite_code}`);
        // Reset form
        setEmail('');
        setMaxUses('');
        setExpiresAt('');
        setInviteType('organization');
        setOrgRole('member');
        setTeamRole('member');
      } else {
        setResult(`❌ ${data.error}`);
      }
    } catch (error) {
      setResult('❌ Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Create Invitation</h2>
        <p className="text-neutral-400">Please authenticate to create invitations.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Create Organization Invitation</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Organization</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            >
              <option value="">Select organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.member_count} members)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Invite Type</label>
            <select
              value={inviteType}
              onChange={(e) => setInviteType(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            >
              <option value="organization">Organization Invite</option>
              <option value="team">Team Invite</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Organization Role</label>
            <select
              value={orgRole}
              onChange={(e) => setOrgRole(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            >
              <option value="member">Member</option>
              <option value="org_admin">Organization Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Team Role</label>
            <select
              value={teamRole}
              onChange={(e) => setTeamRole(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            >
              <option value="member">Member</option>
              <option value="team_admin">Team Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank for any email</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Max Uses (Optional)</label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              min="1"
              max="1000"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
            <p className="text-xs text-slate-400 mt-1">How many times this code can be used</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Expires At (Optional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank for never expires</p>
          </div>

          <button
            onClick={createInvitation}
            disabled={loading || !selectedOrgId}
            className="w-full px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-semibold"
          >
            {loading ? 'Creating...' : 'Create Invitation'}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-slate-700 rounded">
          <div className="font-mono text-sm">{result}</div>
          {result.includes('Code:') && (
            <p className="text-xs text-slate-400 mt-2">
              Users can enter this code in the "Join Organization" section of the complete-signup page.
            </p>
          )}
        </div>
      )}
    </div>
  );
}