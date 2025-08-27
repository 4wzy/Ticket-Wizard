"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { getJiraConnection } from '@/lib/jiraApi';
import { authenticatedFetch } from '@/lib/api-client';

interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls?: {
    [size: string]: string;
  };
}

interface JiraPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketData: {
    title: string;
    description: string;
    acceptanceCriteria: string;
    key?: string; // If editing existing ticket
  };
  mode: 'create' | 'update';
  onSuccess?: (ticketKey: string, ticketUrl: string) => void;
  onError?: (error: string) => void;
}

const JiraPushModal: React.FC<JiraPushModalProps> = ({
  isOpen,
  onClose,
  ticketData,
  mode,
  onSuccess,
  onError
}) => {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [issueType, setIssueType] = useState<string>('Task');
  const [priority, setPriority] = useState<string>('Medium');
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects when modal opens
  useEffect(() => {
    if (isOpen && mode === 'create') {
      loadProjects();
    }
  }, [isOpen, mode]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    setError(null);
    
    try {
      const connection = getJiraConnection();
      if (!connection) {
        throw new Error('No Jira connection found');
      }

      const response = await authenticatedFetch('/api/jira/projects', {
        method: 'GET',
        headers: {
          'x-jira-connection': JSON.stringify(connection),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load projects');
      }

      const data = await response.json();
      
      // Handle token refresh
      if (data.tokenRefreshed) {
        const updatedConnection = {
          ...connection,
          accessToken: data.newAccessToken,
          refreshToken: data.newRefreshToken,
          tokenExpiry: data.newTokenExpiry,
        };
        localStorage.setItem('jira-connection', JSON.stringify(updatedConnection));
      }

      setProjects(data.projects || []);
      
      // Auto-select first project if available
      if (data.projects && data.projects.length > 0) {
        setSelectedProject(data.projects[0].key);
      }
    } catch (error: any) {
      console.error('Error loading projects:', error);
      setError(error.message || 'Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'create' && !selectedProject) {
      setError('Please select a project');
      return;
    }

    if (!ticketData.title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const connection = getJiraConnection();
      if (!connection) {
        throw new Error('No Jira connection found');
      }

      let response;
      
      if (mode === 'create') {
        // Create new ticket
        response = await authenticatedFetch('/api/jira/tickets/create', {
          method: 'POST',
          headers: {
            'x-jira-connection': JSON.stringify(connection),
          },
          body: JSON.stringify({
            projectKey: selectedProject,
            title: ticketData.title,
            description: ticketData.description,
            acceptanceCriteria: ticketData.acceptanceCriteria,
            issueType,
            priority,
          }),
        });
      } else {
        // Update existing ticket
        response = await authenticatedFetch('/api/jira/tickets/update', {
          method: 'PUT',
          headers: {
            'x-jira-connection': JSON.stringify(connection),
          },
          body: JSON.stringify({
            ticketKey: ticketData.key,
            title: ticketData.title,
            description: ticketData.description,
            acceptanceCriteria: ticketData.acceptanceCriteria,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${mode} ticket`);
      }

      const data = await response.json();
      
      // Handle token refresh
      if (data.tokenRefreshed) {
        const updatedConnection = {
          ...connection,
          accessToken: data.newAccessToken,
          refreshToken: data.newRefreshToken,
          tokenExpiry: data.newTokenExpiry,
        };
        localStorage.setItem('jira-connection', JSON.stringify(updatedConnection));
      }

      // Success callback
      if (onSuccess) {
        onSuccess(data.ticketKey, data.url);
      }

      onClose();
    } catch (error: any) {
      console.error(`Error ${mode}ing ticket:`, error);
      const errorMessage = error.message || `Failed to ${mode} ticket`;
      setError(errorMessage);
      
      // Also notify parent component about the error
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const issueTypes = ['Task', 'Story', 'Bug', 'Epic'];
  const priorities = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-neutral-900/95 backdrop-blur-md rounded-xl border border-neutral-700/50 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        {/* Magical Header */}
        <div className="relative p-6 border-b border-neutral-700/50 bg-gradient-to-r from-violet-900/20 via-purple-900/20 to-indigo-900/20">
          {/* Sparkle Effects */}
          <div className="absolute inset-0 overflow-hidden rounded-t-xl">
            <div className="absolute top-2 left-4 w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
            <div className="absolute top-4 right-8 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-500"></div>
            <div className="absolute top-6 left-1/3 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-1000"></div>
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {mode === 'create' ? (
                <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-600/30">
                  <PlusIcon className="h-6 w-6 text-blue-400" />
                </div>
              ) : (
                <div className="p-2 bg-green-600/20 rounded-lg border border-green-600/30">
                  <ArrowUpTrayIcon className="h-6 w-6 text-green-400" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-neutral-100 flex items-center">
                  {mode === 'create' ? '✨ Create New Jira Ticket' : '🪄 Update Jira Ticket'}
                </h2>
                <p className="text-sm text-neutral-400 mt-1">
                  {mode === 'create' 
                    ? 'Transform your ticket into Jira magic' 
                    : 'Sync your improvements back to Jira'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded-lg transition-all duration-200"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Magical Content */}
        <div className="p-6 space-y-6">
          {/* Error Display - Magical Style */}
          {error && (
            <div className="bg-red-900/30 backdrop-blur-sm border border-red-600/50 rounded-xl p-4 animate-fade-in">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse"></div>
                <p className="text-red-200 text-sm leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Project Selection - Magical Style */}
          {mode === 'create' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-200 flex items-center">
                <span className="mr-2">🏗️</span>
                Jira Project
                <span className="text-red-400 ml-1">*</span>
              </label>
              {loadingProjects ? (
                <div className="flex items-center space-x-3 p-4 bg-neutral-800/40 backdrop-blur-sm border border-neutral-600/50 rounded-xl">
                  <ArrowPathIcon className="h-5 w-5 animate-spin text-purple-400" />
                  <span className="text-neutral-300">✨ Loading magical projects...</span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-800/60 backdrop-blur-sm border border-neutral-600/50 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all duration-200 hover:bg-neutral-800/80"
                    disabled={loading}
                  >
                    <option value="" className="bg-neutral-800">✨ Select a project</option>
                    {projects.map((project) => (
                      <option key={project.key} value={project.key} className="bg-neutral-800">
                        {project.name} ({project.key})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Issue Type Selection - Magical Style */}
          {mode === 'create' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-200 flex items-center">
                <span className="mr-2">🎭</span>
                Issue Type
              </label>
              <div className="relative">
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800/60 backdrop-blur-sm border border-neutral-600/50 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all duration-200 hover:bg-neutral-800/80"
                  disabled={loading}
                >
                  {issueTypes.map((type) => (
                    <option key={type} value={type} className="bg-neutral-800">
                      {type}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          )}

          {/* Priority Selection - Magical Style */}
          {mode === 'create' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-200 flex items-center">
                <span className="mr-2">🔥</span>
                Priority
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800/60 backdrop-blur-sm border border-neutral-600/50 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all duration-200 hover:bg-neutral-800/80"
                  disabled={loading}
                >
                  {priorities.map((prio) => (
                    <option key={prio} value={prio} className="bg-neutral-800">
                      {prio}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse delay-700"></div>
                </div>
              </div>
            </div>
          )}

          {/* Magical Ticket Preview */}
          <div className="bg-gradient-to-br from-neutral-800/60 to-neutral-900/60 backdrop-blur-sm rounded-xl p-5 border border-neutral-600/50 relative overflow-hidden">
            {/* Magical sparkles */}
            <div className="absolute top-2 right-2 w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
            <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-1000"></div>
            
            <h3 className="text-sm font-medium text-neutral-200 mb-4 flex items-center">
              <span className="mr-2">📋</span>
              Ticket Preview
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5 flex items-center">
                  <span className="mr-1">📝</span>
                  Title
                </label>
                <div className="text-sm text-neutral-100 bg-neutral-800/70 backdrop-blur-sm border border-neutral-600/30 rounded-lg px-4 py-3">
                  {ticketData.title || '✨ No title yet'}
                </div>
              </div>
              
              {ticketData.description && (
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5 flex items-center">
                    <span className="mr-1">📖</span>
                    Description
                  </label>
                  <div className="text-sm text-neutral-200 bg-neutral-800/70 backdrop-blur-sm border border-neutral-600/30 rounded-lg px-4 py-3 max-h-32 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                      {ticketData.description}
                    </pre>
                  </div>
                </div>
              )}
              
              {ticketData.acceptanceCriteria && (
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5 flex items-center">
                    <span className="mr-1">✅</span>
                    Acceptance Criteria
                  </label>
                  <div className="text-sm text-neutral-200 bg-neutral-800/70 backdrop-blur-sm border border-neutral-600/30 rounded-lg px-4 py-3 max-h-32 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                      {ticketData.acceptanceCriteria}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Magical Update Info */}
          {mode === 'update' && ticketData.key && (
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-sm rounded-xl p-4 border border-green-600/30 relative overflow-hidden">
              <div className="absolute top-2 left-2 w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-700"></div>
              
              <h3 className="text-sm font-medium text-green-200 mb-2 flex items-center">
                <span className="mr-2">🔄</span>
                Updating Existing Ticket
              </h3>
              <p className="text-sm text-green-100/80">
                This will sync your changes to: 
                <span className="text-green-300 font-mono ml-1 bg-green-900/40 px-2 py-1 rounded border border-green-600/30">
                  {ticketData.key}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Magical Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-neutral-700/50 bg-gradient-to-r from-neutral-900/20 to-neutral-800/20 backdrop-blur-sm">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded-lg transition-all duration-200 disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (mode === 'create' && !selectedProject)}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg ${
              mode === 'create' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-500/50' 
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border border-green-500/50'
            }`}
          >
            {loading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            <span>
              {loading 
                ? `${mode === 'create' ? '✨ Creating Magic...' : '🪄 Updating Jira...'}` 
                : mode === 'create' ? '✨ Create Ticket' : '🪄 Update Ticket'
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default JiraPushModal;