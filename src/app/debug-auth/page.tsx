'use client';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function DebugAuthPage() {
  const { user, userProfile, organization, team, userRole, loading, profileState } = useAuth();
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);

  useEffect(() => {
    const checkSupabaseAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      setSupabaseSession(session);
      setSupabaseUser(user);
    };
    
    checkSupabaseAuth();
  }, []);

  if (loading) {
    return <div className="p-8">Loading auth debug info...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="space-y-6">
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">AuthContext State</h2>
            <pre className="text-sm bg-slate-700 p-4 rounded overflow-auto">
              {JSON.stringify({
                user: user ? { id: user.id, email: user.email } : null,
                userProfile,
                organization,
                team,
                userRole,
                profileState,
                loading
              }, null, 2)}
            </pre>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Direct Supabase Auth</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Session:</h3>
                <pre className="text-sm bg-slate-700 p-4 rounded overflow-auto">
                  {JSON.stringify(supabaseSession, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold">User:</h3>
                <pre className="text-sm bg-slate-700 p-4 rounded overflow-auto">
                  {JSON.stringify(supabaseUser, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Browser Cookies</h2>
            <pre className="text-sm bg-slate-700 p-4 rounded overflow-auto">
              {typeof document !== 'undefined' ? document.cookie : 'Server-side render'}
            </pre>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-x-4">
              <button
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Go to Login
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                Sign Out
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}