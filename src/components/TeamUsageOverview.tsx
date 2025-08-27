'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import { ChartBarIcon, UserGroupIcon, CpuChipIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

interface TeamUsageData {
  team: {
    id: string;
    name: string;
  };
  usage: {
    current_month: {
      total_tokens: number;
      total_events: number;
      period_start: string;
      period_end: string;
    };
    feature_breakdown: Record<string, number>;
    daily_usage: Record<string, number>;
    members: Array<{
      user_id: string;
      full_name: string;
      team_role: string;
      tokens_used: number;
    }>;
  };
  user_role: string;
}

interface TeamUsageOverviewProps {
  teamId: string;
  teamName: string;
}

export default function TeamUsageOverview({ teamId, teamName }: TeamUsageOverviewProps) {
  const [usageData, setUsageData] = useState<TeamUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchTeamUsage();
    }
  }, [teamId]);

  const fetchTeamUsage = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/usage/team/${teamId}`);
      
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      } else {
        setError('Failed to fetch team usage data');
      }
    } catch (err) {
      setError('Error loading usage data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/30 backdrop-blur-sm rounded-xl p-6 border border-indigo-600/30">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!usageData) {
    return null;
  }

  const topFeature = Object.entries(usageData.usage.feature_breakdown)
    .sort(([,a], [,b]) => b - a)[0];

  // Get last 7 days of usage for trend
  const dailyEntries = Object.entries(usageData.usage.daily_usage)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .slice(-7);

  return (
    <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/30 backdrop-blur-sm rounded-xl p-6 border border-indigo-600/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-400" />
          📊 Team Usage Analytics
        </h3>
        <button
          onClick={() => window.open(`/usage/team/${teamId}`, '_blank')}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          View Details →
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm">Total Tokens</p>
              <p className="text-2xl font-bold text-white">
                {usageData.usage.current_month.total_tokens.toLocaleString()}
              </p>
            </div>
            <CpuChipIcon className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm">API Requests</p>
              <p className="text-2xl font-bold text-white">
                {usageData.usage.current_month.total_events}
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-green-900/30 rounded-lg p-4 border border-green-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm">Active Members</p>
              <p className="text-2xl font-bold text-white">
                {usageData.usage.members.filter(m => m.tokens_used > 0).length}
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Top Feature */}
      {topFeature && (
        <div className="mb-6 p-4 bg-indigo-900/20 rounded-lg border border-indigo-600/20">
          <h4 className="text-sm font-medium text-indigo-300 mb-2">Most Used Feature</h4>
          <div className="flex items-center justify-between">
            <span className="text-white capitalize">
              {topFeature[0].replace(/_/g, ' ')}
            </span>
            <span className="text-indigo-400 font-medium">
              {topFeature[1].toLocaleString()} tokens
            </span>
          </div>
        </div>
      )}

      {/* Usage Trend */}
      {dailyEntries.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white mb-3">Last 7 Days</h4>
          <div className="space-y-2">
            {dailyEntries.map(([date, tokens]) => {
              const maxTokens = Math.max(...dailyEntries.map(([,t]) => t));
              const percentage = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0;
              
              return (
                <div key={date} className="flex items-center space-x-3">
                  <div className="w-16 text-xs text-gray-400">
                    {formatDate(date)}
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="w-16 text-xs text-gray-300 text-right">
                    {tokens.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Team Members */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Top Contributors</h4>
        <div className="space-y-2">
          {usageData.usage.members.slice(0, 5).map((member, index) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-2 bg-gray-800/30 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm text-white">{member.full_name}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {member.team_role.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-indigo-400">
                  {member.tokens_used.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">tokens</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}