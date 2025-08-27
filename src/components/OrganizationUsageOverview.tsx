'use client';

import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import { 
  ChartBarIcon, 
  BuildingOfficeIcon, 
  CpuChipIcon, 
  ArrowTrendingUpIcon,
  UserGroupIcon,
  SparklesIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface TeamUsageData {
  team_id: string;
  team_name: string;
  team_slug: string;
  token_limit: number;
  tokens_used: number;
  usage_percentage: number;
  active_users: number;
  api_requests: number;
}

interface TopUser {
  user_id: string;
  tokens_used: number;
  api_requests: number;
}

interface UsageTrend {
  date: string;
  tokens: number;
}

interface OrganizationUsageData {
  organization: {
    id: string;
    name: string;
    token_limit: number;
  };
  usage: {
    current_month: {
      total_tokens: number;
      total_events: number;
      unique_users: number;
      period_start: string;
      period_end: string;
    };
    feature_breakdown: Record<string, number>;
    daily_usage: Record<string, number>;
    usage_trend: UsageTrend[];
    team_breakdown: TeamUsageData[];
    top_users: TopUser[];
  };
  teams_count: number;
  user_role: string;
}

interface OrganizationUsageOverviewProps {
  organizationId: string;
  organizationName?: string;
}

export default function OrganizationUsageOverview({ organizationId }: OrganizationUsageOverviewProps) {
  const [usageData, setUsageData] = useState<OrganizationUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrgUsage = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/usage/organization/${organizationId}`);
      
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      } else {
        setError('Failed to fetch organization usage data');
      }
    } catch (err) {
      setError('Error loading usage data');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchOrgUsage();
    }
  }, [organizationId, fetchOrgUsage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'from-red-500 to-orange-500';
    if (percentage >= 70) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-emerald-500';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/30 backdrop-blur-sm rounded-xl p-6 border border-indigo-600/30">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-700 rounded"></div>
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

  const orgUsagePercentage = usageData.organization.token_limit > 0 
    ? (usageData.usage.current_month.total_tokens / usageData.organization.token_limit) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/30 backdrop-blur-sm rounded-xl p-6 border border-indigo-600/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center">
            <BuildingOfficeIcon className="h-6 w-6 mr-3 text-indigo-400" />
            📊 Organization Usage Analytics
          </h3>
          <div className="text-sm text-indigo-300 bg-indigo-900/30 px-3 py-2 rounded-lg border border-indigo-600/30">
            {usageData.teams_count} Teams • {usageData.usage.current_month.unique_users} Active Users
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-600/30 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm">Total Tokens</p>
                <p className="text-2xl font-bold text-white">
                  {usageData.usage.current_month.total_tokens.toLocaleString()}
                </p>
                <p className="text-xs text-purple-400">
                  {orgUsagePercentage.toFixed(1)}% of limit
                </p>
              </div>
              <CpuChipIcon className="h-8 w-8 text-purple-400" />
            </div>
            <div className="w-full bg-purple-800/30 rounded-full h-2 mt-2">
              <div 
                className={`bg-gradient-to-r ${getUsageColor(orgUsagePercentage)} h-2 rounded-full transition-all duration-500`}
                style={{width: `${Math.min(orgUsagePercentage, 100)}%`}}
              ></div>
            </div>
          </div>

          <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-600/30 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm">API Requests</p>
                <p className="text-2xl font-bold text-white">
                  {usageData.usage.current_month.total_events.toLocaleString()}
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-green-900/30 rounded-lg p-4 border border-green-600/30 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm">Active Users</p>
                <p className="text-2xl font-bold text-white">
                  {usageData.usage.current_month.unique_users}
                </p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-orange-900/30 rounded-lg p-4 border border-orange-600/30 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-300 text-sm">Teams</p>
                <p className="text-2xl font-bold text-white">
                  {usageData.teams_count}
                </p>
              </div>
              <SparklesIcon className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Top Feature */}
        {topFeature && (
          <div className="p-4 bg-indigo-900/20 rounded-lg border border-indigo-600/20 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <h4 className="text-sm font-medium text-indigo-300 mb-2 flex items-center gap-2">
              <FireIcon className="h-4 w-4" />
              Most Used Feature Organization-Wide
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-white capitalize font-medium">
                {topFeature[0].replace(/_/g, ' ')}
              </span>
              <span className="text-indigo-400 font-bold">
                {topFeature[1].toLocaleString()} tokens
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Usage Trend Chart */}
      {usageData.usage.usage_trend.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 animate-fade-in-up" style={{animationDelay: '0.5s'}}>
          <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-purple-400" />
            📈 7-Day Usage Trend
          </h4>
          <div className="space-y-3">
            {usageData.usage.usage_trend.map((trend, index) => {
              const maxTokens = Math.max(...usageData.usage.usage_trend.map(t => t.tokens));
              const percentage = maxTokens > 0 ? (trend.tokens / maxTokens) * 100 : 0;
              
              return (
                <div key={trend.date} className="flex items-center space-x-4" style={{animationDelay: `${0.6 + index * 0.1}s`}}>
                  <div className="w-20 text-sm text-gray-400">
                    {formatDate(trend.date)}
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-1000 animate-fade-in-up"
                      style={{ 
                        width: `${percentage}%`,
                        animationDelay: `${0.8 + index * 0.1}s`
                      }}
                    ></div>
                  </div>
                  <div className="w-20 text-sm text-gray-300 text-right font-mono">
                    {trend.tokens.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Breakdown */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 animate-fade-in-up" style={{animationDelay: '0.7s'}}>
        <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-purple-400" />
          🏆 Team Usage Leaderboard
        </h4>
        <div className="space-y-3">
          {usageData.usage.team_breakdown.slice(0, 8).map((team, index) => (
            <div
              key={team.team_id}
              className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-all duration-300 animate-fade-in-up"
              style={{animationDelay: `${0.8 + index * 0.05}s`}}
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="text-white font-medium">{team.team_name}</p>
                  <p className="text-xs text-gray-400">
                    {team.active_users} users • {team.api_requests} requests
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-400">
                    {team.tokens_used.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {team.usage_percentage.toFixed(1)}% of limit
                  </p>
                </div>
                <div className="w-16 bg-gray-700 rounded-full h-2">
                  <div
                    className={`bg-gradient-to-r ${getUsageColor(team.usage_percentage)} h-2 rounded-full transition-all duration-1000`}
                    style={{ 
                      width: `${Math.min(team.usage_percentage, 100)}%`,
                      animationDelay: `${1.0 + index * 0.1}s`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Breakdown */}
      {Object.keys(usageData.usage.feature_breakdown).length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 animate-fade-in-up" style={{animationDelay: '0.9s'}}>
          <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-400" />
            🎯 Feature Usage Breakdown
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(usageData.usage.feature_breakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([feature, tokens], index) => {
                const maxTokens = Math.max(...Object.values(usageData.usage.feature_breakdown));
                const percentage = (tokens / maxTokens) * 100;
                
                return (
                  <div 
                    key={feature} 
                    className="p-3 bg-gray-800/30 rounded-lg animate-fade-in-up"
                    style={{animationDelay: `${1.0 + index * 0.1}s`}}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium capitalize">
                        {feature.replace(/_/g, ' ')}
                      </span>
                      <span className="text-purple-400 font-bold text-sm">
                        {tokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${percentage}%`,
                          animationDelay: `${1.2 + index * 0.1}s`
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}