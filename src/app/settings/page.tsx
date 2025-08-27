"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import CollapsibleSidebar from '@/app/components/CollapsibleSidebar';
import NavHelper from '@/app/components/NavHelper';
import PlatformConnectionSettings from '@/app/components/PlatformConnectionSettings';
import CursorEffects from '@/app/components/CursorEffects';
import AccountBillingTab from '@/components/AccountBillingTab';
import { motion } from 'framer-motion';
import { 
  CogIcon, 
  LinkIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  UserIcon,
  CreditCardIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { getUserSelectedModel, saveUserSelectedModel, AI_MODELS, type AIModel } from '@/lib/ai-config';

export default function SettingsPage() {
  const { user, userProfile, loading } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'platforms' | 'general' | 'account'>('platforms');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [autoSaveDrafts, setAutoSaveDrafts] = useState<boolean>(true);
  const [aiLearningEnabled, setAiLearningEnabled] = useState<boolean>(false);
  const [selectedAIModel, setSelectedAIModel] = useState<AIModel>('gemini-2.5-flash-lite');
  const { theme, toggleTheme } = useTheme();

  // Memoized callback to prevent infinite re-render
  const handleConnectionChange = useCallback((connected: boolean) => {
    if (connected) {
      setStatusMessage({
        type: 'success',
        message: 'Platform connection established successfully!',
      });
    }
  }, []);

  // Load saved preferences
  useEffect(() => {
    const savedAutoSave = localStorage.getItem('autoSaveDrafts');
    if (savedAutoSave !== null) {
      setAutoSaveDrafts(savedAutoSave === 'true');
    }
    
    const savedAiLearning = localStorage.getItem('aiLearningEnabled');
    if (savedAiLearning !== null) {
      setAiLearningEnabled(savedAiLearning === 'true');
    }

    // Load saved AI model selection
    const savedModel = getUserSelectedModel();
    setSelectedAIModel(savedModel);
  }, []);

  // Handle URL parameters for success/error messages
  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    const message = searchParams.get('message');

    if (error) {
      let errorMessage = 'An error occurred';
      
      switch (error) {
        case 'oauth_failed':
          errorMessage = 'OAuth authorization failed';
          break;
        case 'invalid_callback':
          errorMessage = 'Invalid OAuth callback';
          break;
        case 'callback_failed':
          errorMessage = 'OAuth callback processing failed';
          break;
        default:
          errorMessage = error;
      }
      
      if (message) {
        errorMessage += `: ${message}`;
      }
      
      setStatusMessage({
        type: 'error',
        message: errorMessage,
      });
    } else if (success === 'connected' || success === 'trello_connected') {
      const platform = success === 'trello_connected' ? 'Trello' : 'Jira';
      setStatusMessage({
        type: 'success',
        message: `Successfully connected to ${platform}!`,
      });
    }

    // Clear the message after 5 seconds
    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  // Auth loading/redirect
  if (loading) {
    return <div className="text-center mt-10 text-neutral-300">Loading...</div>;
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  // Check if user needs to complete signup
  if (user && !userProfile && !loading) { 
    if (typeof window !== 'undefined') window.location.href = '/complete-signup'; 
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 overflow-hidden">
      <CursorEffects enabled={true} />
      <NavHelper />
      
      {/* Magical Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Multi-layered gradient orbs */}
        <motion.div 
          className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-gradient-to-r from-pink-600/15 to-purple-600/15 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
        />
        <motion.div 
          className="absolute top-2/3 right-1/4 w-[300px] h-[300px] bg-gradient-to-r from-indigo-600/10 to-cyan-600/10 rounded-full blur-3xl"
          animate={{
            x: [0, -60, 0],
            y: [0, 80, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 8
          }}
        />

        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${
              i % 3 === 0 
                ? 'w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-pink-400' 
                : i % 3 === 1 
                ? 'w-1 h-1 bg-gradient-to-r from-indigo-400 to-purple-400'
                : 'w-0.5 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-400'
            }`}
            initial={{
              x: Math.random() * 1200,
              y: Math.random() * 800,
              opacity: 0,
            }}
            animate={{
              y: [null, -40, 0],
              opacity: [0, 0.8, 0],
              scale: [0.3, 1.8, 0.3],
            }}
            transition={{
              duration: 5 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 4,
            }}
          />
        ))}

        {/* Animated grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:60px_60px]">
          <motion.div
            className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.05)_1px,transparent_1px)] bg-[size:60px_60px]"
            animate={{
              backgroundPosition: ['0px 0px', '60px 60px']
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        {/* Magical spotlight */}
        <motion.div 
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 rounded-full blur-3xl"
          animate={{
            x: [-50, 50, -50],
            y: [-30, 30, -30],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      <main className="flex-1 flex min-h-0 relative z-10">
        <CollapsibleSidebar />
        <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <motion.h1 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 flex items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 180 }}
                transition={{ duration: 0.5 }}
                className="mr-2 sm:mr-3"
              >
                <CogIcon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-indigo-400" />
              </motion.div>
              ⚙️ Settings
            </motion.h1>

            {/* Magical Status Message */}
            {statusMessage && (
              <motion.div 
                className={`mb-6 p-4 rounded-xl border backdrop-blur-md flex items-center space-x-3 relative overflow-hidden ${
                  statusMessage.type === 'success' 
                    ? 'bg-gradient-to-br from-green-900/40 to-emerald-900/30 border-green-600/50 text-green-300'
                    : statusMessage.type === 'error'
                    ? 'bg-gradient-to-br from-red-900/40 to-rose-900/30 border-red-600/50 text-red-300'
                    : 'bg-gradient-to-br from-blue-900/40 to-indigo-900/30 border-blue-600/50 text-blue-300'
                }`}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {/* Enhanced magical sparkles */}
                <motion.div 
                  className="absolute top-2 right-2 w-1 h-1 bg-current rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                  className="absolute bottom-2 left-3 w-0.5 h-0.5 bg-current rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
                />
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  {statusMessage.type === 'success' && <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />}
                  {statusMessage.type === 'error' && <XCircleIcon className="h-5 w-5 flex-shrink-0" />}
                  {statusMessage.type === 'info' && <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />}
                </motion.div>
                <p className="flex-1">{statusMessage.message}</p>
                <motion.button
                  onClick={() => setStatusMessage(null)}
                  className="text-current hover:opacity-75 p-1 transition-all duration-200"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <XCircleIcon className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}

            {/* Magical Tab Navigation - Mobile Responsive */}
            <motion.div 
              className="mb-6 sm:mb-8 relative z-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <nav className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 bg-gradient-to-r from-neutral-900/70 to-neutral-800/70 backdrop-blur-md p-1 rounded-xl border border-neutral-700/50 shadow-xl relative overflow-hidden z-20">
                {/* Enhanced magical background sparkles */}
                <motion.div 
                  className="absolute top-1 left-4 w-1 h-1 bg-purple-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                  className="absolute bottom-1 right-6 w-1.5 h-1.5 bg-blue-400 rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                />
                
                <motion.button
                  onClick={() => setActiveTab('platforms')}
                  className={`flex items-center justify-center sm:justify-start space-x-2 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative flex-1 cursor-pointer ${
                    activeTab === 'platforms'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  }`}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </motion.div>
                  <span className="hidden xs:inline sm:inline">✨ Platforms</span>
                  <span className="xs:hidden sm:hidden">✨ Platforms</span>
                </motion.button>
                <motion.button
                  onClick={() => setActiveTab('general')}
                  className={`flex items-center justify-center sm:justify-start space-x-2 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative flex-1 cursor-pointer ${
                    activeTab === 'general'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  }`}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CogIcon className="h-4 w-4" />
                  </motion.div>
                  <span className="hidden xs:inline sm:inline">⚙️ General</span>
                  <span className="xs:hidden sm:hidden">⚙️</span>
                </motion.button>
                <motion.button
                  onClick={() => setActiveTab('account')}
                  className={`flex items-center justify-center sm:justify-start space-x-2 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative flex-1 cursor-pointer ${
                    activeTab === 'account'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  }`}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <UserIcon className="h-4 w-4" />
                  </motion.div>
                  <span className="hidden xs:inline sm:inline">👤 Account & Usage</span>
                  <span className="xs:hidden sm:hidden">👤</span>
                </motion.button>
                
                {/* Magical backdrop effect - moved behind buttons */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-indigo-900/5 rounded-xl pointer-events-none" />
              </nav>
            </motion.div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'platforms' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  key="platforms-tab"
                >
                  <PlatformConnectionSettings 
                    onConnectionChange={handleConnectionChange}
                  />
                </motion.div>
              )}

              {activeTab === 'general' && (
                <motion.div 
                  className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/60 backdrop-blur-md rounded-xl border border-neutral-700/50 p-6 relative overflow-hidden shadow-xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  key="general-tab"
                >
                  {/* Magical sparkles */}
                  <div className="absolute top-3 right-4 w-1 h-1 bg-indigo-400 rounded-full animate-pulse opacity-50"></div>
                  <div className="absolute bottom-4 left-6 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-700 opacity-50"></div>
                  
                  <h2 className="text-xl font-semibold text-neutral-100 mb-6 flex items-center">
                    <CogIcon className="h-6 w-6 mr-3 text-indigo-400" />
                    ⚙️ General Settings
                  </h2>
                  
                  <div className="space-y-8">
                    {/* Application Preferences */}
                    <div className="bg-neutral-800/40 backdrop-blur-sm rounded-xl p-5 border border-neutral-700/30">
                      <h3 className="text-lg font-medium text-neutral-200 mb-4 flex items-center">
                        <span className="mr-2">🎛️</span>
                        Application Preferences
                      </h3>
                      <div className="space-y-6">
                        {/* AI Model Selection */}
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1">
                              <label className="text-neutral-300 font-medium flex items-center">
                                <span className="mr-2">🧙‍♂️</span>
                                AI Magic Level
                              </label>
                              <p className="text-sm text-neutral-400 mt-1">Choose your wizard's magical power for AI assistance</p>
                            </div>
                            <select 
                              value={selectedAIModel}
                              onChange={(e) => {
                                const newModel = e.target.value as AIModel;
                                setSelectedAIModel(newModel);
                                saveUserSelectedModel(newModel);
                                const modelConfig = AI_MODELS[newModel];
                                setStatusMessage({
                                  type: 'success',
                                  message: `✨ AI magic level changed to ${modelConfig.displayName}! Your spells will now use ${newModel.includes('lite') ? 'efficient apprentice' : 'powerful archmage'} magic.`
                                });
                              }}
                              className="bg-neutral-800/40 backdrop-blur-sm border border-neutral-600/30 rounded-lg px-4 py-2.5 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-purple-500 hover:bg-neutral-700/40 transition-colors min-w-[200px] cursor-pointer"
                            >
                              {Object.values(AI_MODELS).map((model) => (
                                <option key={model.name} value={model.name}>
                                  {model.displayName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="mt-3 p-3 bg-indigo-900/20 border border-indigo-600/30 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <SparklesIcon className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-indigo-200">
                                <p className="font-medium mb-1">Current Level: {AI_MODELS[selectedAIModel].displayName}</p>
                                <p className="text-indigo-300/80 mb-2">{AI_MODELS[selectedAIModel].description}</p>
                                <ul className="space-y-1 text-indigo-300/80">
                                  <li>• <strong>Magic Token Cost:</strong> {AI_MODELS[selectedAIModel].costMultiplier}x multiplier</li>
                                  <li>• <strong>Max Context:</strong> {AI_MODELS[selectedAIModel].capabilities.maxTokens.toLocaleString()} tokens</li>
                                  <li>• <strong>File Support:</strong> {AI_MODELS[selectedAIModel].capabilities.supportsFiles ? 'Yes ✅' : 'No ❌'}</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1">
                            <label className="text-neutral-300 font-medium flex items-center">
                              <span className="mr-2">💾</span>
                              Auto-save Drafts
                            </label>
                            <p className="text-sm text-neutral-400 mt-1">Automatically save your magical ticket drafts</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={autoSaveDrafts}
                              onChange={(e) => {
                                setAutoSaveDrafts(e.target.checked);
                                localStorage.setItem('autoSaveDrafts', e.target.checked.toString());
                                setStatusMessage({
                                  type: 'success',
                                  message: `✨ Auto-save drafts ${e.target.checked ? 'enabled' : 'disabled'}! Your magical preferences have been saved.`
                                });
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>
                        
                        {/* Theme Selection */}
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1">
                              <label className="text-neutral-300 font-medium flex items-center">
                                <span className="mr-2">🎨</span>
                                Theme
                              </label>
                              <p className="text-sm text-neutral-400 mt-1">Choose your preferred magical theme appearance</p>
                            </div>
                            <select 
                              value={theme}
                              onChange={(e) => {
                                if (e.target.value !== theme) {
                                  toggleTheme();
                                  setStatusMessage({
                                    type: 'success',
                                    message: `✨ Theme changed to ${e.target.value === 'dark' ? 'Dark Magic' : 'Light Magic'}! Your magical workspace has been updated.`
                                  });
                                }
                              }}
                              className="bg-neutral-800/40 backdrop-blur-sm border border-neutral-600/30 rounded-lg px-4 py-2.5 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-purple-500 hover:bg-neutral-700/40 transition-colors min-w-[160px] cursor-pointer"
                            >
                              <option value="dark">🌙 Dark Magic</option>
                              <option value="light">☀️ Light Magic</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* AI Learning Toggle - Premium Feature */}
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1">
                              <label className="text-neutral-300 font-medium flex items-center">
                                <span className="mr-2">🤖</span>
                                AI Learning & Adaptation
                                <span className="ml-2 px-2 py-1 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 text-amber-300 text-xs rounded-full border border-amber-600/30 flex items-center">
                                  👑 Premium
                                </span>
                                <span className="ml-2 px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded-full border border-purple-600/30">Coming Soon</span>
                              </label>
                              <p className="text-sm text-neutral-400 mt-1">Allow AI to learn from your usage patterns and improve project context suggestions</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={aiLearningEnabled}
                                onChange={(e) => {
                                  // Check if user has premium plan (mock check for now)
                                  const isPremium = false; // This would be checked against user's subscription
                                  
                                  if (!isPremium) {
                                    setStatusMessage({
                                      type: 'info',
                                      message: '👑 AI Learning is a premium feature! Upgrade to Enterprise plan to unlock adaptive AI that learns from your workflow.'
                                    });
                                    return;
                                  }
                                  
                                  setAiLearningEnabled(e.target.checked);
                                  localStorage.setItem('aiLearningEnabled', e.target.checked.toString());
                                  setStatusMessage({
                                    type: 'success',
                                    message: `🤖 AI Learning ${e.target.checked ? 'enabled' : 'disabled'}! Your magical AI assistant will ${e.target.checked ? 'now learn from your patterns' : 'use standard algorithms'}.`
                                  });
                                }}
                                className="sr-only peer"
                                disabled={true} // Disabled for now since it's coming soon
                              />
                              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-yellow-500 opacity-60 cursor-not-allowed"></div>
                            </label>
                          </div>
                          <div className="mt-3 p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <SparklesIcon className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-amber-200">
                                <p className="font-medium mb-1">How AI Learning Works:</p>
                                <ul className="space-y-1 text-amber-300/80">
                                  <li>• <strong>Pattern Recognition:</strong> AI analyzes your ticket refinement patterns</li>
                                  <li>• <strong>Context Evolution:</strong> Project contexts automatically improve over time</li>
                                  <li>• <strong>Personalized Suggestions:</strong> Get recommendations tailored to your workflow</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Data & Privacy */}
                    <div className="bg-neutral-800/40 backdrop-blur-sm rounded-xl p-5 border border-neutral-700/30">
                      <h3 className="text-lg font-medium text-neutral-200 mb-4 flex items-center">
                        <span className="mr-2">🔒</span>
                        Data & Privacy
                      </h3>
                      <div className="space-y-4">
                        <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <ExclamationTriangleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-200">
                              <p className="font-medium mb-1">Privacy Notice:</p>
                              <p className="text-blue-300/80">We store your templates and project contexts on our secure Supabase servers for sharing and sync. Your Jira tickets and AI improvements are never stored on our servers - they go directly from our AI service to your Jira instance.</p>
                            </div>
                          </div>
                        </div>
                        <button 
                          className="w-full text-left p-4 bg-gradient-to-r from-red-900/20 to-red-800/20 hover:from-red-800/30 hover:to-red-700/30 rounded-xl border border-red-700/30 hover:border-red-600/50 transition-all duration-200 group"
                          onClick={() => {
                            if (confirm('🗑️ Are you sure you want to clear all local data? This will remove all your saved tickets, templates, and preferences. This action cannot be undone.')) {
                              try {
                                localStorage.clear();
                                setStatusMessage({
                                  type: 'success',
                                  message: '✨ Local data cleared successfully! Your magical workspace has been reset.'
                                });
                                // Reset the auto-save setting to default after clearing
                                setTimeout(() => {
                                  setAutoSaveDrafts(true);
                                  localStorage.setItem('autoSaveDrafts', 'true');
                                }, 100);
                              } catch (error) {
                                setStatusMessage({
                                  type: 'error',
                                  message: '❌ Failed to clear local data. Please try again.'
                                });
                              }
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-red-300 group-hover:text-red-200 flex items-center">
                                <span className="mr-2">🗑️</span>
                                Clear Local Data
                              </div>
                              <div className="text-sm text-red-400/80 group-hover:text-red-300/80 mt-1">Remove all locally stored data including recent tickets and settings</div>
                            </div>
                            <DocumentTextIcon className="h-5 w-5 text-red-400 group-hover:text-red-300 transition-colors" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Magical backdrop effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-indigo-900/5 rounded-xl pointer-events-none" />
                </motion.div>
              )}

              {activeTab === 'account' && (
                <AccountBillingTab setStatusMessage={setStatusMessage} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}