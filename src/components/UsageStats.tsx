'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { authenticatedFetch } from '@/lib/api-client';
import { AI_MODELS } from '@/lib/ai-config';
import { ChartBarIcon, ClockIcon, CpuChipIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface UsageData {
  usage: {
    current: number;
    limit: number;
    overage: number;
    percentage: number;
    period_start: string;
    period_end: string;
    is_unlimited: boolean;
  };
  subscription: {
    plan_name: string;
    status: string;
  };
}

interface UsageHistory {
  total_events: number;
  total_tokens: number;
  daily_usage: Record<string, { total: number; features: Record<string, number> }>;
  feature_breakdown: Record<string, number>;
  model_breakdown: Record<string, number>;
  raw_events: Array<{
    endpoint: string;
    tokens_used: number;
    feature_used: string;
    model_used: string;
    created_at: string;
  }>;
}

export default function UsageStats() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch usage data
      const [currentUsage, history] = await Promise.all([
        authenticatedFetch('/api/usage/current'),
        authenticatedFetch('/api/usage/history?days=30')
      ]);

      // If we get a 500 error, it might be because the user needs billing setup
      if (!currentUsage.ok && currentUsage.status === 500) {
        console.log('Setting up billing for user...');
        const setupResponse = await authenticatedFetch('/api/setup-billing', {
          method: 'POST'
        });
        
        if (setupResponse.ok) {
          // Retry fetching usage data after setup
          const [retryCurrentUsage, retryHistory] = await Promise.all([
            authenticatedFetch('/api/usage/current'),
            authenticatedFetch('/api/usage/history?days=30')
          ]);
          
          if (retryCurrentUsage.ok && retryHistory.ok) {
            const currentData = await retryCurrentUsage.json();
            const historyData = await retryHistory.json();
            setUsageData(currentData);
            setUsageHistory(historyData.usage_history);
            return;
          }
        }
      }

      if (!currentUsage.ok || !history.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const currentData = await currentUsage.json();
      const historyData = await history.json();

      console.log('UsageStats - Current data:', currentData);
      console.log('UsageStats - History data:', historyData);
      console.log('UsageStats - Feature breakdown:', historyData.usage_history?.feature_breakdown);

      setUsageData(currentData);
      setUsageHistory(historyData.usage_history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 75) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <motion.div 
              key={i} 
              className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md rounded-2xl p-6 border border-neutral-700/60 shadow-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <motion.div 
                className="h-4 bg-neutral-700/60 rounded w-1/2 mb-4"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div 
                className="h-8 bg-neutral-700/60 rounded w-3/4"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="bg-gradient-to-br from-red-900/20 to-red-800/20 backdrop-blur-md border border-red-500/50 rounded-2xl p-6 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          </motion.div>
          <span className="text-red-400">Error loading usage data: {error}</span>
        </div>
      </motion.div>
    );
  }

  if (!usageData || !usageHistory) {
    return null;
  }

  // Calculate daily usage for chart
  const last7Days = Object.entries(usageHistory.daily_usage)
    .slice(-7)
    .map(([date, data]) => ({ date, ...data }));

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Current Usage Overview */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {/* Current Usage */}
        <motion.div 
          className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md rounded-2xl p-6 border border-neutral-700/60 shadow-2xl relative overflow-hidden group"
          whileHover={{ y: -4, scale: 1.02 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-neutral-600/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-lg font-semibold text-white">Current Usage</h3>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <CpuChipIcon className="h-6 w-6 text-violet-400" />
            </motion.div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Tokens Used</span>
              <span className={`font-bold ${getUsageColor(usageData.usage.percentage)}`}>
                {formatNumber(usageData.usage.current)}
              </span>
            </div>
            {!usageData.usage.is_unlimited && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Limit</span>
                  <span className="text-gray-300">{formatNumber(usageData.usage.limit)}</span>
                </div>
                <div className="w-full bg-neutral-700/50 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className={`h-3 rounded-full ${getProgressBarColor(usageData.usage.percentage)} relative overflow-hidden`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, usageData.usage.percentage)}%` }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-pulse"></div>
                  </motion.div>
                </div>
                <div className="text-center">
                  <span className={`text-sm font-medium ${getUsageColor(usageData.usage.percentage)}`}>
                    {usageData.usage.percentage.toFixed(1)}% used
                  </span>
                </div>
              </>
            )}
            {usageData.usage.is_unlimited && (
              <div className="text-center">
                <span className="text-green-400 font-medium">Unlimited</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Billing Period */}
        <motion.div 
          className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md rounded-2xl p-6 border border-neutral-700/60 shadow-2xl relative overflow-hidden group"
          whileHover={{ y: -4, scale: 1.02 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-neutral-600/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-lg font-semibold text-white">Billing Period</h3>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <ClockIcon className="h-6 w-6 text-violet-400" />
            </motion.div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Plan</span>
              <span className="text-white font-medium">{usageData.subscription.plan_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Starts</span>
              <span className="text-gray-300">{formatDate(usageData.usage.period_start)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Ends</span>
              <span className="text-gray-300">{formatDate(usageData.usage.period_end)}</span>
            </div>
            {usageData.usage.overage > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                <span className="text-red-400">Overage</span>
                <span className="text-red-400 font-medium">{formatNumber(usageData.usage.overage)}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Monthly Summary */}
        <motion.div 
          className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md rounded-2xl p-6 border border-neutral-700/60 shadow-2xl relative overflow-hidden group"
          whileHover={{ y: -4, scale: 1.02 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-neutral-600/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-lg font-semibold text-white">30-Day Summary</h3>
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChartBarIcon className="h-6 w-6 text-violet-400" />
            </motion.div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Requests</span>
              <span className="text-white font-medium">{formatNumber(usageHistory.total_events)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Tokens</span>
              <span className="text-white font-medium">{formatNumber(usageHistory.total_tokens)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Avg per Request</span>
              <span className="text-gray-300">
                {usageHistory.total_events > 0 
                  ? Math.round(usageHistory.total_tokens / usageHistory.total_events)
                  : 0
                }
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Feature Breakdown */}
      <motion.div 
        className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md rounded-2xl p-6 border border-neutral-700/60 shadow-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        whileHover={{ y: -2 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <motion.span 
            className="mr-2 text-xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            🔧
          </motion.span>
          Usage by Feature (Last 30 Days)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(usageHistory.feature_breakdown).map(([feature, tokens], index) => {
            const percentage = (tokens / usageHistory.total_tokens) * 100;
            return (
              <motion.div 
                key={feature} 
                className="bg-gradient-to-br from-neutral-800/60 to-neutral-700/60 backdrop-blur-sm rounded-xl p-4 border border-neutral-600/50 relative overflow-hidden group"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <div className="flex justify-between items-center mb-2 relative z-10">
                  <span className="text-neutral-300 capitalize font-medium">
                    {feature.replace(/_/g, ' ')}
                  </span>
                  <span className="text-white font-bold">{formatNumber(tokens)}</span>
                </div>
                <div className="w-full bg-neutral-600/50 rounded-full h-2 overflow-hidden mb-2">
                  <motion.div
                    className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: 0.8 + index * 0.1, ease: "easeOut" }}
                  />
                </div>
                <div className="text-xs text-neutral-400 relative z-10">
                  {percentage.toFixed(1)}% of total usage
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Model Usage Breakdown */}
      <motion.div 
        className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md rounded-2xl p-6 border border-neutral-700/60 shadow-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        whileHover={{ y: -2 }}
      >
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <motion.span 
            className="mr-3 text-2xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <SparklesIcon className="h-6 w-6 text-indigo-400" />
          </motion.span>
          Magic Token Usage by Level (Last 30 Days)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(usageHistory.model_breakdown || {}).map(([model, tokens], index) => {
            const percentage = (tokens / usageHistory.total_tokens) * 100;
            const modelConfig = AI_MODELS[model as keyof typeof AI_MODELS];
            const displayName = modelConfig?.displayName || model;
            const description = modelConfig?.description || 'AI model';
            const costMultiplier = modelConfig?.costMultiplier || 1.0;
            
            return (
              <motion.div 
                key={model} 
                className="bg-gradient-to-br from-neutral-800/60 to-neutral-700/60 backdrop-blur-sm rounded-xl p-4 border border-neutral-600/50 relative overflow-hidden group"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div className="flex-1">
                    <span className="text-neutral-200 font-medium text-sm block">
                      {displayName}
                    </span>
                    <span className="text-neutral-400 text-xs">
                      {description}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-bold">{formatNumber(tokens)}</span>
                    <div className="text-xs text-neutral-400">
                      {costMultiplier}x cost
                    </div>
                  </div>
                </div>
                <div className="w-full bg-neutral-600/50 rounded-full h-2 overflow-hidden mb-2">
                  <motion.div
                    className={`h-2 rounded-full ${
                      model.includes('lite') 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                        : 'bg-gradient-to-r from-orange-500 to-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: 1.0 + index * 0.1, ease: "easeOut" }}
                  />
                </div>
                <div className="text-xs text-neutral-400 relative z-10">
                  {percentage.toFixed(1)}% of total usage
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Daily Usage Chart */}
      <motion.div 
        className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md rounded-2xl p-6 border border-neutral-700/60 shadow-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        whileHover={{ y: -2 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <motion.span 
            className="mr-2 text-xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            📈
          </motion.span>
          Daily Usage (Last 7 Days)
        </h3>
        <div className="space-y-3">
          {last7Days.map(({ date, total }, index) => {
            const maxUsage = Math.max(...last7Days.map(d => d.total));
            const percentage = maxUsage > 0 ? (total / maxUsage) * 100 : 0;
            
            return (
              <motion.div 
                key={date} 
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
              >
                <div className="w-20 text-sm text-neutral-300 font-medium">
                  {formatDate(date)}
                </div>
                <div className="flex-1 bg-neutral-700/50 rounded-full h-7 relative overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-violet-500 to-purple-500 h-7 rounded-full flex items-center justify-end pr-3 relative overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: 1 + index * 0.1, ease: "easeOut" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-pulse"></div>
                    {total > 0 && (
                      <span className="text-xs text-white font-bold relative z-10">
                        {formatNumber(total)}
                      </span>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div 
        className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md rounded-2xl p-6 border border-neutral-700/60 shadow-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        whileHover={{ y: -2 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <motion.span 
            className="mr-2 text-xl"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          >
            ⚡
          </motion.span>
          Recent Activity
        </h3>
        <div className="space-y-3">
          {usageHistory.raw_events.slice(0, 10).map((event, index) => (
            <motion.div 
              key={index} 
              className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-neutral-800/40 to-neutral-700/40 border border-neutral-600/30 relative overflow-hidden group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
              whileHover={{ scale: 1.02, x: 4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/3 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <div className="flex-1 relative z-10">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-white text-sm capitalize font-medium">
                    {event.feature_used.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-neutral-400 bg-neutral-700/60 px-2 py-1 rounded-md">
                    {event.endpoint}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  {new Date(event.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-right relative z-10">
                <div className="text-white font-bold">
                  {formatNumber(event.tokens_used)}
                </div>
                <div className="text-xs text-neutral-400">tokens</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}