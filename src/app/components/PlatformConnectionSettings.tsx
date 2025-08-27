"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LinkIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CogIcon,
  XMarkIcon,
  PuzzlePieceIcon,
  StarIcon,
  SparklesIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { platformManager } from '@/lib/platformManager';
import { PlatformType, PlatformRegistry } from '@/lib/platformApi';
import TrelloBoardSelector from './TrelloBoardSelector';

interface PlatformConnectionSettingsProps {
  onConnectionChange?: (connected: boolean) => void;
}

interface PlatformStatus {
  platform: PlatformType;
  connected: boolean;
  loading: boolean;
  error?: string;
}

export default function PlatformConnectionSettings({ onConnectionChange }: PlatformConnectionSettingsProps) {
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [activePlatform, setActivePlatform] = useState<PlatformType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jiraInstanceUrl, setJiraInstanceUrl] = useState('');
  
  // Trello board selection state
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [pendingTrelloConnection, setPendingTrelloConnection] = useState(false);

  // Load platform statuses on mount
  useEffect(() => {
    loadPlatformStatuses();
    setActivePlatform(platformManager.getActivePlatform());
  }, []);

  const loadPlatformStatuses = () => {
    const allPlatforms = platformManager.getAllPlatforms();
    const connectionStatus = platformManager.getConnectionStatus();
    
    const statuses: PlatformStatus[] = allPlatforms.map(platform => ({
      platform,
      connected: connectionStatus[platform],
      loading: false
    }));

    setPlatformStatuses(statuses);
    onConnectionChange?.(platformManager.hasAnyConnection());
  };

  const updatePlatformStatus = (platform: PlatformType, updates: Partial<PlatformStatus>) => {
    setPlatformStatuses(prev => 
      prev.map(status => 
        status.platform === platform 
          ? { ...status, ...updates }
          : status
      )
    );
  };

  const connectToPlatform = async (platform: PlatformType) => {
    updatePlatformStatus(platform, { loading: true, error: undefined });

    try {
      let authResult;
      
      if (platform === 'jira') {
        if (!jiraInstanceUrl.trim()) {
          throw new Error('Please enter a Jira instance URL');
        }
        authResult = await platformManager.connectPlatform(platform, jiraInstanceUrl);
      } else {
        authResult = await platformManager.connectPlatform(platform);
      }

      // Store state for callback verification
      if (authResult.state) {
        sessionStorage.setItem(`${platform}-oauth-state`, authResult.state);
      }

      // Open OAuth popup
      const popup = window.open(
        authResult.authUrl,
        `${platform}-oauth`,
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === `${platform}-auth-success`) {
          popup?.close();
          window.removeEventListener('message', handleMessage);
          
          // For Trello, show board selection after successful connection
          if (platform === 'trello') {
            setPendingTrelloConnection(true);
            setShowBoardSelector(true);
          }
          
          // Refresh platform statuses
          setTimeout(() => {
            loadPlatformStatuses();
            if (platformManager.getConnectedPlatforms().length === 1) {
              setActivePlatform(platform);
            }
          }, 500);
        }
      };

      window.addEventListener('message', handleMessage);

      // Handle popup close
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          updatePlatformStatus(platform, { loading: false });
        }
      }, 1000);

    } catch (error: any) {
      console.error(`Error connecting to ${platform}:`, error);
      updatePlatformStatus(platform, { 
        loading: false, 
        error: error.message || 'Failed to start OAuth flow'
      });
    }
  };

  const disconnectFromPlatform = async (platform: PlatformType) => {
    updatePlatformStatus(platform, { loading: true });

    try {
      await platformManager.disconnectPlatform(platform);
      
      // Update active platform if needed
      const newActivePlatform = platformManager.getActivePlatform();
      setActivePlatform(newActivePlatform);
      
      loadPlatformStatuses();
    } catch (error: any) {
      console.error(`Error disconnecting from ${platform}:`, error);
      updatePlatformStatus(platform, { 
        loading: false, 
        error: error.message 
      });
    }
  };

  // Handle Trello board selection
  const handleBoardSelection = (selectedBoardIds: string[]) => {
    const trelloService = PlatformRegistry.get('trello');
    if (trelloService && 'updateSelectedBoards' in trelloService) {
      (trelloService as any).updateSelectedBoards(selectedBoardIds);
    }
    setPendingTrelloConnection(false);
    setShowBoardSelector(false);
    
    // Refresh statuses to show board count
    loadPlatformStatuses();
  };

  const handleBoardSelectorClose = () => {
    setShowBoardSelector(false);
    if (pendingTrelloConnection) {
      // If user cancels board selection, they still have a connection but no boards selected
      setPendingTrelloConnection(false);
    }
  };

  // Get selected board count for Trello
  const getTrelloBoardCount = (): number => {
    const trelloService = PlatformRegistry.get('trello');
    if (trelloService && 'getSelectedBoardIds' in trelloService) {
      return (trelloService as any).getSelectedBoardIds().length;
    }
    return 0;
  };

  // Check if Trello needs board selection
  const trelloNeedsBoardSelection = (): boolean => {
    const trelloService = PlatformRegistry.get('trello');
    if (trelloService && 'needsBoardSelection' in trelloService) {
      return (trelloService as any).needsBoardSelection();
    }
    return false;
  };

  // Open board selector for existing Trello connection
  const manageTrelloBoards = () => {
    const trelloService = PlatformRegistry.get('trello');
    if (trelloService && 'getSelectedBoardIds' in trelloService) {
      setShowBoardSelector(true);
    }
  };

  const setAsActivePlatform = (platform: PlatformType) => {
    try {
      platformManager.setActivePlatform(platform);
      setActivePlatform(platform);
    } catch (error: any) {
      console.error('Error setting active platform:', error);
    }
  };

  const getPlatformIcon = (platform: PlatformType) => {
    const icons = {
      jira: '🔷',
      trello: '📋',
      github: '🐙',
      linear: '📐'
    };
    return icons[platform];
  };

  const getPlatformColors = (platform: PlatformType) => {
    const colors = {
      jira: {
        primary: 'blue-500',
        secondary: 'blue-100',
        accent: 'blue-600'
      },
      trello: {
        primary: 'blue-600',
        secondary: 'blue-100',
        accent: 'blue-700'
      },
      github: {
        primary: 'gray-700',
        secondary: 'gray-100',
        accent: 'gray-800'
      },
      linear: {
        primary: 'purple-600',
        secondary: 'purple-100',
        accent: 'purple-700'
      }
    };
    return colors[platform];
  };

  return (
    <div className="bg-neutral-900/70 backdrop-blur-sm rounded-xl border border-neutral-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-neutral-100 flex items-center">
          <SparklesIcon className="h-6 w-6 mr-2 text-purple-400" />
          Platform Connections
        </h2>
        
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-neutral-400">Connected:</span>
          <span className="text-green-400 font-medium">
            {platformStatuses.filter(s => s.connected).length} / {platformStatuses.length}
          </span>
        </div>
      </div>

      {/* Active Platform Indicator */}
      {activePlatform && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/30 rounded-lg p-3 mb-6"
        >
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getPlatformIcon(activePlatform)}</div>
            <div>
              <p className="text-purple-300 font-medium">Active Platform</p>
              <p className="text-neutral-200 capitalize">{activePlatform}</p>
            </div>
            <div className="ml-auto">
              <StarIcon className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Platform Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {platformStatuses.map((status) => {
            const info = platformManager.getPlatformInfo(status.platform);
            const colors = getPlatformColors(status.platform);
            
            return (
              <motion.div
                key={status.platform}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
                  status.connected
                    ? `bg-${colors.primary}/10 border-${colors.primary}/30 hover:border-${colors.primary}/50`
                    : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                }`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                </div>

                <div className="relative p-4">
                  {/* Platform Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getPlatformIcon(status.platform)}</div>
                      <div>
                        <h3 className="font-semibold text-neutral-100 capitalize">
                          {info?.name || status.platform}
                        </h3>
                        <p className="text-xs text-neutral-400 max-w-[200px]">
                          {info?.description}
                        </p>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center space-x-2">
                      {status.loading ? (
                        <ArrowPathIcon className="h-4 w-4 text-blue-400 animate-spin" />
                      ) : status.connected ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-400" />
                      )}
                      
                      {activePlatform === status.platform && (
                        <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                      )}
                    </div>
                  </div>

                  {/* Jira Instance URL Input */}
                  {status.platform === 'jira' && !status.connected && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Jira Instance URL
                      </label>
                      <div className="flex space-x-2">
                        <div className="flex-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10">
                            <span className="text-neutral-500 text-xs">https://</span>
                          </div>
                          <input
                            type="text"
                            value={jiraInstanceUrl}
                            onChange={(e) => setJiraInstanceUrl(e.target.value)}
                            placeholder="your-domain.atlassian.net"
                            className="w-full pl-12 pr-2 py-1.5 text-sm rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={status.loading}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {status.error && (
                    <div className="mb-3 flex items-center space-x-2 text-xs text-red-400">
                      <ExclamationTriangleIcon className="h-3 w-3 flex-shrink-0" />
                      <span>{status.error}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      {status.connected ? (
                        <>
                          <button
                            onClick={() => disconnectFromPlatform(status.platform)}
                            disabled={status.loading}
                            className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 text-xs transition-colors disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                          
                          {/* Trello Board Management */}
                          {status.platform === 'trello' && (
                            <button
                              onClick={manageTrelloBoards}
                              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 text-xs transition-colors flex items-center space-x-1"
                            >
                              <RectangleStackIcon className="h-3 w-3" />
                              <span>Manage Boards ({getTrelloBoardCount()})</span>
                            </button>
                          )}
                          
                          {activePlatform !== status.platform && (
                            <button
                              onClick={() => setAsActivePlatform(status.platform)}
                              className={`px-3 py-1.5 rounded-lg bg-${colors.primary}/20 hover:bg-${colors.primary}/30 text-${colors.primary} border border-${colors.primary}/30 text-xs transition-colors`}
                            >
                              Set Active
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => connectToPlatform(status.platform)}
                          disabled={status.loading || (status.platform === 'jira' && !jiraInstanceUrl.trim())}
                          className={`px-3 py-1.5 rounded-lg bg-${colors.primary}/20 hover:bg-${colors.primary}/30 text-${colors.primary} border border-${colors.primary}/30 text-xs transition-colors disabled:opacity-50 flex items-center space-x-1`}
                        >
                          {status.loading ? (
                            <ArrowPathIcon className="h-3 w-3 animate-spin" />
                          ) : (
                            <LinkIcon className="h-3 w-3" />
                          )}
                          <span>Connect</span>
                        </button>
                      )}
                    </div>

                    {/* Platform Status */}
                    <div className="text-xs">
                      {status.connected ? (
                        <div className="text-right">
                          <span className="text-green-400 font-medium">Connected</span>
                          {status.platform === 'trello' && trelloNeedsBoardSelection() && (
                            <div className="text-yellow-400 text-xs mt-1">
                              ⚠ No boards selected
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-500">Not Connected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Connection Glow Effect */}
                {status.connected && (
                  <div className={`absolute inset-0 bg-gradient-to-r from-${colors.primary}/5 to-transparent pointer-events-none`} />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Info Section */}
      <div className="mt-6 pt-6 border-t border-neutral-800">
        <div className="flex items-start space-x-3">
          <PuzzlePieceIcon className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-neutral-300 font-medium mb-2">Universal Integration ✨</h3>
            <ul className="text-sm text-neutral-400 space-y-1">
              <li>• Connect multiple platforms simultaneously</li>
              <li>• Switch between platforms seamlessly</li>
              <li>• Unified ticket management across all platforms</li>
              <li>• Cross-platform ticket migration and synchronization</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Trello Board Selector Modal */}
      <TrelloBoardSelector
        isOpen={showBoardSelector}
        onClose={handleBoardSelectorClose}
        onSave={handleBoardSelection}
        initialSelectedBoards={(() => {
          const trelloService = PlatformRegistry.get('trello');
          return trelloService && 'getSelectedBoardIds' in trelloService 
            ? (trelloService as any).getSelectedBoardIds() 
            : [];
        })()}
      />
    </div>
  );
}