"use client";

import React, { useState, useEffect } from 'react';
import { 
  LinkIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CogIcon,
  XMarkIcon,
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';
import { authenticatedFetch } from '@/lib/api-client';
import { JiraProject } from '@/lib/jiraApi';
import { JiraProjectPermission } from '@/types/database';

interface JiraConnection {
  instanceUrl: string;
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  userEmail?: string;
  siteName?: string;
}

interface JiraConnectionSettingsProps {
  onConnectionChange?: (connected: boolean) => void;
}

export default function JiraConnectionSettings({ onConnectionChange }: JiraConnectionSettingsProps) {
  const [connection, setConnection] = useState<JiraConnection>({
    instanceUrl: '',
    isConnected: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instanceUrlInput, setInstanceUrlInput] = useState('');
  
  // Project selection state
  const [availableProjects, setAvailableProjects] = useState<JiraProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<JiraProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState<JiraProjectPermission[]>([]);

  // Load connection data from localStorage on mount
  useEffect(() => {
    const savedConnection = localStorage.getItem('jira-connection');
    if (savedConnection) {
      try {
        const parsed = JSON.parse(savedConnection) as JiraConnection;
        setConnection(parsed);
        setInstanceUrlInput(parsed.instanceUrl);
        onConnectionChange?.(parsed.isConnected);
        
        // Load project permissions if connected
        if (parsed.isConnected) {
          loadCurrentPermissions();
          // Check token health
          checkTokenHealth();
        }
      } catch (error) {
        console.error('Error loading Jira connection from localStorage:', error);
        localStorage.removeItem('jira-connection');
      }
    }
  }, []); // Remove onConnectionChange from dependencies

  // Periodic token health check
  useEffect(() => {
    if (!connection.isConnected) return;

    const interval = setInterval(checkTokenHealth, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [connection.isConnected]);

  // Save connection data to localStorage
  const saveConnection = (connectionData: JiraConnection) => {
    setConnection(connectionData);
    localStorage.setItem('jira-connection', JSON.stringify(connectionData));
    onConnectionChange?.(connectionData.isConnected);
  };

  // Normalize Jira instance URL
  const normalizeInstanceUrl = (url: string): string => {
    if (!url) return '';
    
    // Remove protocol if present
    let normalized = url.replace(/^https?:\/\//, '');
    
    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');
    
    // Ensure it ends with .atlassian.net if it doesn't already
    if (!normalized.includes('.atlassian.net') && !normalized.includes('.jira.com')) {
      // If it's just a domain name, assume it's an Atlassian cloud instance
      if (!normalized.includes('.')) {
        normalized = `${normalized}.atlassian.net`;
      }
    }
    
    return normalized;
  };

  // Test connection to Jira instance
  const testConnection = async () => {
    if (!instanceUrlInput.trim()) {
      setError('Please enter a Jira instance URL');
      return;
    }

    setTestingConnection(true);
    setError(null);

    try {
      const normalizedUrl = normalizeInstanceUrl(instanceUrlInput);
      
      // Test if the instance exists by trying to access the login page
      const testUrl = `https://${normalizedUrl}`;
      
      const response = await authenticatedFetch('/api/jira/test-instance', {
        method: 'POST',
        body: JSON.stringify({ instanceUrl: testUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test Jira instance');
      }

      const result = await response.json();
      
      if (result.valid) {
        // Update the connection with the normalized URL but don't mark as connected yet
        const updatedConnection = {
          ...connection,
          instanceUrl: normalizedUrl,
          isConnected: false,
        };
        saveConnection(updatedConnection);
        setInstanceUrlInput(normalizedUrl);
        setError(null);
      } else {
        setError('Invalid Jira instance URL. Please check the URL and try again.');
      }
    } catch (error: any) {
      console.error('Error testing Jira connection:', error);
      setError(error.message || 'Failed to test connection to Jira instance');
    } finally {
      setTestingConnection(false);
    }
  };

  // Initiate OAuth connection
  const connectToJira = async () => {
    if (!connection.instanceUrl) {
      setError('Please test your Jira instance URL first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate OAuth authorization URL
      const response = await authenticatedFetch('/api/jira/auth/start', {
        method: 'POST',
        body: JSON.stringify({ instanceUrl: connection.instanceUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start OAuth flow');
      }

      const { authUrl, state } = await response.json();
      
      // Store the state and instance URL for the callback
      sessionStorage.setItem('jira-oauth-state', state);
      sessionStorage.setItem('jira-instance-url', connection.instanceUrl);
      
      // Redirect to Jira OAuth page
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error starting OAuth flow:', error);
      setError(error.message || 'Failed to start connection process');
      setIsLoading(false);
    }
  };

  // Disconnect from Jira
  const disconnectFromJira = () => {
    const updatedConnection: JiraConnection = {
      instanceUrl: connection.instanceUrl, // Keep the URL for convenience
      isConnected: false,
    };
    
    saveConnection(updatedConnection);
    
    // Clear any stored tokens
    localStorage.removeItem('jira-access-token');
    localStorage.removeItem('jira-refresh-token');
    sessionStorage.removeItem('jira-oauth-state');
    sessionStorage.removeItem('jira-instance-url');
    
    setError(null);
  };

  // Check if tokens are expired
  const isTokenExpired = (): boolean => {
    if (!connection.tokenExpiry) return true;
    return Date.now() >= connection.tokenExpiry;
  };

  // Check refresh token validity
  const hasValidRefreshToken = (): boolean => {
    return !!(connection.refreshToken && connection.refreshToken !== 'undefined' && connection.refreshToken !== 'null');
  };

  // Proactive token health check
  const checkTokenHealth = async () => {
    if (!connection.isConnected) return;
    
    const expired = isTokenExpired();
    const hasRefresh = hasValidRefreshToken();
    
    if (expired && !hasRefresh) {
      // Token expired and no valid refresh token - force reconnect
      setError('Authentication expired and cannot be renewed. Please reconnect to Jira.');
      disconnectFromJira();
    }
  };

  // Load available projects from Jira
  const loadAvailableProjects = async () => {
    if (!connection.isConnected) return;

    setLoadingProjects(true);
    setError(null);

    try {
      const connectionData = localStorage.getItem('jira-connection');
      if (!connectionData) {
        throw new Error('No Jira connection found');
      }

      const response = await authenticatedFetch('/api/jira/projects', {
        method: 'GET',
        headers: {
          'x-jira-connection': connectionData,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch projects');
      }

      const data = await response.json();
      setAvailableProjects(data.projects || []);
    } catch (error: any) {
      console.error('Error loading Jira projects:', error);
      setError(error.message);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load current project permissions
  const loadCurrentPermissions = async () => {
    try {
      const response = await authenticatedFetch('/api/jira/projects/permissions');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch permissions');
      }

      const data = await response.json();
      setCurrentPermissions(data.permissions || []);
      
      // Update selected projects based on current permissions
      const permittedProjectIds = data.permissions.map((p: JiraProjectPermission) => p.project_id);
      setSelectedProjects(availableProjects.filter(project => 
        permittedProjectIds.includes(project.id)
      ));
    } catch (error: any) {
      console.error('Error loading project permissions:', error);
    }
  };

  // Save project permissions
  const saveProjectPermissions = async () => {
    try {
      const response = await authenticatedFetch('/api/jira/projects/permissions', {
        method: 'POST',
        body: JSON.stringify({
          projects: selectedProjects.map(p => ({
            id: p.id,
            key: p.key,
            name: p.name
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save permissions');
      }

      setShowProjectSelection(false);
      await loadCurrentPermissions();
      setError(null);
    } catch (error: any) {
      console.error('Error saving project permissions:', error);
      setError(error.message);
    }
  };

  // Open project selection modal
  const openProjectSelection = async () => {
    setShowProjectSelection(true);
    await loadAvailableProjects();
    await loadCurrentPermissions();
  };

  return (
    <div className="bg-neutral-900/70 backdrop-blur-sm rounded-xl border border-neutral-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-neutral-100 flex items-center">
          <LinkIcon className="h-6 w-6 mr-2 text-indigo-400" />
          Jira Connection
        </h2>
        
        {/* Connection Status Indicator */}
        <div className="flex items-center space-x-2">
          {connection.isConnected ? (
            <>
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Connected</span>
              {isTokenExpired() && !hasValidRefreshToken() && (
                <ExclamationTriangleIcon className="h-4 w-4 text-red-400 ml-1" title="Authentication expired - reconnection required" />
              )}
              {isTokenExpired() && hasValidRefreshToken() && (
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 ml-1" title="Token expired but will auto-refresh" />
              )}
            </>
          ) : (
            <>
              <XCircleIcon className="h-5 w-5 text-red-400" />
              <span className="text-red-400 text-sm font-medium">Not Connected</span>
            </>
          )}
        </div>
      </div>

      {/* Instance URL Configuration */}
      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="jira-url" className="block text-sm font-medium text-neutral-300 mb-2">
            Jira Instance URL
          </label>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <span className="text-neutral-500 text-sm">https://</span>
              </div>
              <input
                id="jira-url"
                type="text"
                value={instanceUrlInput}
                onChange={(e) => setInstanceUrlInput(e.target.value)}
                placeholder="your-domain.atlassian.net"
                className="w-full pl-16 pr-3 py-2 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={isLoading || testingConnection}
              />
            </div>
            <button
              onClick={testConnection}
              disabled={testingConnection || isLoading}
              className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {testingConnection ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CogIcon className="h-4 w-4" />
              )}
              <span>Test</span>
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Enter your Jira cloud instance URL (e.g., mycompany.atlassian.net)
          </p>
        </div>
      </div>

      {/* Connection Details */}
      {connection.isConnected && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 mb-6">
          <h3 className="text-green-400 font-medium mb-2">Connection Details</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">Instance:</span>
              <span className="text-neutral-200">https://{connection.instanceUrl}</span>
            </div>
            {connection.userEmail && (
              <div className="flex justify-between">
                <span className="text-neutral-400">User:</span>
                <span className="text-neutral-200">{connection.userEmail}</span>
              </div>
            )}
            {connection.siteName && (
              <div className="flex justify-between">
                <span className="text-neutral-400">Site:</span>
                <span className="text-neutral-200">{connection.siteName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Project Management Section */}
      {connection.isConnected && (
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-blue-400 font-medium">Project Access</h3>
            <button
              onClick={openProjectSelection}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
            >
              Manage Projects
            </button>
          </div>
          
          {currentPermissions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-neutral-400 mb-2">
                You have access to {currentPermissions.length} project{currentPermissions.length === 1 ? '' : 's'}:
              </p>
              <div className="flex flex-wrap gap-2">
                {currentPermissions.map((permission) => (
                  <span
                    key={permission.id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-900/40 text-blue-300 border border-blue-700/50"
                  >
                    <span className="font-mono text-blue-200 mr-1">{permission.project_key}</span>
                    {permission.project_name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-400">
              <p className="mb-2">⚠️ No projects selected</p>
              <p>You need to select at least one project to see tickets. Click "Manage Projects" to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        {connection.isConnected ? (
          <button
            onClick={disconnectFromJira}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connectToJira}
            disabled={!connection.instanceUrl || isLoading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <LinkIcon className="h-4 w-4" />
            )}
            <span>Connect to Jira</span>
          </button>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-6 pt-6 border-t border-neutral-800">
        <h3 className="text-neutral-300 font-medium mb-2">How it works:</h3>
        <ul className="text-sm text-neutral-400 space-y-1">
          <li>• Enter your Jira cloud instance URL</li>
          <li>• Click "Connect to Jira" to authorize via OAuth 2.0</li>
          <li>• Select which projects you want to access</li>
          <li>• Grant permissions to read and update your Jira tickets</li>
          <li>• Your connection is stored securely in your browser</li>
        </ul>
      </div>

      {/* Project Selection Modal */}
      {showProjectSelection && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-100">
                Select Jira Projects
              </h2>
              <button
                onClick={() => setShowProjectSelection(false)}
                className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {loadingProjects ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-400" />
                <span className="ml-3 text-neutral-300">Loading projects...</span>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-neutral-300 mb-4">
                    Choose which Jira projects you want to access in this application. Only tickets from selected projects will be visible.
                  </p>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availableProjects.map((project) => {
                      const isSelected = selectedProjects.some(p => p.id === project.id);
                      return (
                        <div
                          key={project.id}
                          className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-900/30 border-blue-600 ring-1 ring-blue-500'
                              : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedProjects(prev => prev.filter(p => p.id !== project.id));
                            } else {
                              setSelectedProjects(prev => [...prev, project]);
                            }
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'border-blue-500 bg-blue-500' : 'border-neutral-500'
                            }`}>
                              {isSelected && (
                                <CheckCircleIcon className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-sm text-blue-300 bg-neutral-800 px-2 py-1 rounded">
                                  {project.key}
                                </span>
                                <span className="text-neutral-200 font-medium">
                                  {project.name}
                                </span>
                              </div>
                              {project.projectTypeKey && (
                                <p className="text-xs text-neutral-400 mt-1">
                                  Type: {project.projectTypeKey}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {availableProjects.length === 0 && (
                    <div className="text-center py-8 text-neutral-400">
                      <PuzzlePieceIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No projects found. Make sure you have access to at least one Jira project.</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                  <div className="text-sm text-neutral-400">
                    {selectedProjects.length} project{selectedProjects.length === 1 ? '' : 's'} selected
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowProjectSelection(false)}
                      className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveProjectPermissions}
                      disabled={selectedProjects.length === 0}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Selection
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}