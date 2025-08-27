'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authenticatedFetch } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { 
  UserIcon, 
  CreditCardIcon, 
  SparklesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface UsageData {
  usage: {
    current: number;
    limit: number;
    percentage: number;
    is_unlimited: boolean;
    period_start: string;
    period_end: string;
  };
  subscription: {
    plan_name: string;
    status: string;
  };
}

interface UsageHistory {
  total_events: number;
  total_tokens: number;
  feature_breakdown: Record<string, number>;
}

interface AccountBillingTabProps {
  setStatusMessage: (message: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

export default function AccountBillingTab({ setStatusMessage }: AccountBillingTabProps) {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const [currentUsage, history] = await Promise.all([
        authenticatedFetch('/api/usage/current'),
        authenticatedFetch('/api/usage/history?days=30')
      ]);

      if (currentUsage.ok && history.ok) {
        const currentData = await currentUsage.json();
        const historyData = await history.json();
        setUsageData(currentData);
        setUsageHistory(historyData.usage_history);
      }
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanDescription = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return 'Basic magic with limited tokens for getting started';
      case 'pro':
        return 'Professional magic with expanded capabilities';
      case 'team':
        return 'Team collaboration with shared token pools';
      case 'enterprise':
        return 'Unlimited magic for large organizations';
      default:
        return 'Custom magical tier for your needs';
    }
  };

  const getPlanFeatures = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return [
          '🪄 Basic Magic (10k tokens/month)',
          '🔗 Standard Jira Integration',
          '📋 Basic Templates'
        ];
      case 'pro':
        return [
          '🪄 Advanced Magic (100k tokens/month)',
          '🔗 Premium Jira Integration',
          '📋 Advanced Templates',
          '💬 Priority Support'
        ];
      default:
        return [
          '🪄 Magic Tokens',
          '🔗 Jira Integration',
          '📋 Templates'
        ];
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/60 backdrop-blur-md rounded-xl border border-neutral-700/50 p-6 relative overflow-hidden shadow-xl">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/60 backdrop-blur-md rounded-xl border border-neutral-700/50 p-6 relative overflow-hidden shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Magical sparkles */}
      <div className="absolute top-4 right-6 w-1 h-1 bg-gold-400 rounded-full animate-pulse opacity-50"></div>
      <div className="absolute bottom-6 left-4 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-1000 opacity-50"></div>
      
      <h2 className="text-xl font-semibold text-neutral-100 mb-6 flex items-center">
        <UserIcon className="h-6 w-6 mr-3 text-indigo-400" />
        👤 Account & Usage
      </h2>
      
      <div className="space-y-8">
        {/* Access Level */}
        <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 backdrop-blur-sm rounded-xl p-5 border border-blue-600/30 relative overflow-hidden">
          <div className="absolute top-2 left-2 w-1 h-1 bg-blue-400 rounded-full animate-pulse opacity-60"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-blue-200 mb-2 flex items-center">
                <span className="mr-2">📊</span>
                Usage Tracking: Active
              </h3>
              <p className="text-sm text-blue-300/80">
                Monitor your ticket creation activity and team productivity
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-800/40 text-blue-200 text-xs rounded-full border border-blue-600/30">
                  📈 Usage Analytics
                </span>
                <span className="px-2 py-1 bg-blue-800/40 text-blue-200 text-xs rounded-full border border-blue-600/30">
                  🔗 Enterprise Integration
                </span>
                <span className="px-2 py-1 bg-blue-800/40 text-blue-200 text-xs rounded-full border border-blue-600/30">
                  📋 Personal Templates
                </span>
              </div>
              {usageData && (
                <div className="mt-3 text-sm text-blue-300/70">
                  Current period: {formatDate(usageData.usage.period_start)} - {formatDate(usageData.usage.period_end)}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  window.location.href = '/usage';
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg flex items-center justify-center cursor-pointer"
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                View Detailed Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-neutral-800/40 backdrop-blur-sm rounded-xl p-5 border border-neutral-700/30">
          <h3 className="text-lg font-medium text-neutral-200 mb-4 flex items-center">
            <span className="mr-2">👤</span>
            Account Information
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <label className="text-neutral-300 font-medium">Email Address</label>
                <p className="text-sm text-neutral-400 mt-1">{user?.email || 'Loading...'}</p>
              </div>
              <button 
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                onClick={() => setStatusMessage({
                  type: 'info',
                  message: '🧙‍♂️ Email change wizard coming soon! This magical feature is being crafted.'
                })}
              >
                Change Email
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <label className="text-neutral-300 font-medium">Password</label>
                <p className="text-sm text-neutral-400 mt-1">••••••••••••</p>
              </div>
              <button 
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                onClick={() => setStatusMessage({
                  type: 'info',
                  message: '🔐 Password change spell coming soon! Your magical security will be enhanced.'
                })}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="bg-neutral-800/40 backdrop-blur-sm rounded-xl p-5 border border-neutral-700/30">
          <h3 className="text-lg font-medium text-neutral-200 mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Current Month Usage Summary
          </h3>
          
          {usageData && (
            <>
              {/* Token Usage Progress */}
              <div className="mb-6 p-4 bg-purple-900/20 rounded-lg border border-purple-600/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-300">📊 Tokens Used</span>
                  <span className="text-sm text-purple-400">
                    {usageData.usage.current.toLocaleString()} / {usageData.usage.is_unlimited ? '∞' : usageData.usage.limit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-purple-900/30 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      usageData.usage.percentage > 90 
                        ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                        : usageData.usage.percentage > 75
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, usageData.usage.percentage)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-purple-400/80 mt-2">
                  Resets on {formatDate(usageData.usage.period_end)}
                </p>
                {usageData.usage.percentage > 80 && (
                  <div className="mt-3 flex items-center space-x-2 p-2 bg-orange-900/20 border border-orange-600/30 rounded-lg">
                    <ExclamationTriangleIcon className="h-4 w-4 text-orange-400" />
                    <span className="text-xs text-orange-300">
                      {usageData.usage.percentage > 95 
                        ? 'Usage limit almost reached! Consider upgrading your plan.'
                        : 'High usage detected. Monitor your remaining tokens.'}
                    </span>
                  </div>
                )}
              </div>

              {usageHistory && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-purple-900/20 rounded-lg border border-purple-600/20">
                    <div className="text-2xl font-bold text-purple-300">{usageHistory.total_events}</div>
                    <div className="text-xs text-purple-400 mt-1">📊 API Requests</div>
                  </div>
                  <div className="text-center p-3 bg-blue-900/20 rounded-lg border border-blue-600/20">
                    <div className="text-2xl font-bold text-blue-300">
                      {usageHistory.feature_breakdown.manual_refine || 0}
                    </div>
                    <div className="text-xs text-blue-400 mt-1">✍️ Manual Refinements</div>
                  </div>
                  <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-600/20">
                    <div className="text-2xl font-bold text-green-300">
                      {(usageHistory.feature_breakdown.guided_chat || 0) + (usageHistory.feature_breakdown.manual_chat || 0)}
                    </div>
                    <div className="text-xs text-green-400 mt-1">💬 AI Chat Sessions</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Magical backdrop effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-indigo-900/5 rounded-xl pointer-events-none" />
    </motion.div>
  );
}