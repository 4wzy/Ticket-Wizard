'use client';

import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, XMarkIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { authenticatedFetch } from '@/lib/api-client';

interface UsageData {
  usage: {
    current: number;
    limit: number;
    percentage: number;
    is_unlimited: boolean;
  };
  subscription: {
    plan_name: string;
  };
}

interface UsageLimitWarningProps {
  onUpgrade?: () => void;
  onDismiss?: () => void;
  checkInterval?: number; // milliseconds
}

export default function UsageLimitWarning({ 
  onUpgrade, 
  onDismiss, 
  checkInterval = 300000 // Check every 5 minutes instead of 1 minute
}: UsageLimitWarningProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkUsage = async () => {
      try {
        const response = await authenticatedFetch('/api/usage/current');
        if (response.ok) {
          const data = await response.json();
          setUsageData(data);
          
          // Show warning if usage is above 80% and not unlimited
          const shouldShow = !data.usage.is_unlimited && 
                           data.usage.percentage >= 80 && 
                           !dismissed;
          setShowWarning(shouldShow);
        }
      } catch (error) {
        console.error('Failed to check usage:', error);
      }
    };

    // Check immediately
    checkUsage();

    // Set up interval checking
    const interval = setInterval(checkUsage, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowWarning(false);
    onDismiss?.();
  };

  const getWarningLevel = (percentage: number) => {
    if (percentage >= 95) return 'critical';
    if (percentage >= 90) return 'high';
    return 'medium';
  };

  const getWarningStyles = (level: string) => {
    switch (level) {
      case 'critical':
        return {
          container: 'bg-red-900/20 border-red-500/50',
          icon: 'text-red-400',
          text: 'text-red-300',
          button: 'bg-red-600 hover:bg-red-700',
          progress: 'bg-red-500'
        };
      case 'high':
        return {
          container: 'bg-orange-900/20 border-orange-500/50',
          icon: 'text-orange-400',
          text: 'text-orange-300',
          button: 'bg-orange-600 hover:bg-orange-700',
          progress: 'bg-orange-500'
        };
      default:
        return {
          container: 'bg-yellow-900/20 border-yellow-500/50',
          icon: 'text-yellow-400',
          text: 'text-yellow-300',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          progress: 'bg-yellow-500'
        };
    }
  };

  const getWarningMessage = (percentage: number, planName: string) => {
    if (percentage >= 95) {
      return `Critical: You've used ${percentage.toFixed(1)}% of your ${planName} plan tokens. Upgrade now to avoid service interruption.`;
    }
    if (percentage >= 90) {
      return `Warning: You've used ${percentage.toFixed(1)}% of your ${planName} plan tokens. Consider upgrading soon.`;
    }
    return `Notice: You've used ${percentage.toFixed(1)}% of your ${planName} plan tokens this month.`;
  };

  if (!showWarning || !usageData) {
    return null;
  }

  const warningLevel = getWarningLevel(usageData.usage.percentage);
  const styles = getWarningStyles(warningLevel);
  const message = getWarningMessage(usageData.usage.percentage, usageData.subscription.plan_name);

  return (
    <div className={`fixed top-4 right-4 max-w-md rounded-lg border p-4 shadow-lg z-50 ${styles.container}`}>
      <div className="flex items-start space-x-3">
        <ExclamationTriangleIcon className={`h-6 w-6 flex-shrink-0 ${styles.icon}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold ${styles.text}`}>
              {warningLevel === 'critical' ? 'Usage Limit Reached' : 'Usage Warning'}
            </h3>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <p className={`text-sm mb-3 ${styles.text}`}>
            {message}
          </p>
          
          {/* Usage Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">
                {usageData.usage.current.toLocaleString()} / {usageData.usage.limit.toLocaleString()} tokens
              </span>
              <span className={`text-xs font-medium ${styles.text}`}>
                {usageData.usage.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${styles.progress}`}
                style={{ width: `${Math.min(100, usageData.usage.percentage)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={onUpgrade}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded text-white text-sm font-medium transition-colors ${styles.button}`}
            >
              <CreditCardIcon className="h-4 w-4" />
              <span>Upgrade Plan</span>
            </button>
            <button
              onClick={() => window.open('/usage', '_blank')}
              className="px-3 py-1.5 rounded text-gray-300 text-sm border border-gray-600 hover:bg-gray-700 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}