"use client";

import React from 'react';
import { BoltIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { usePerformance } from '@/context/PerformanceContext';

interface PerformanceToggleProps {
  showFullSettings?: boolean;
}

const PerformanceToggle: React.FC<PerformanceToggleProps> = ({ showFullSettings = false }) => {
  const { settings, toggleAnimations, enableHighPerformanceMode, updateSetting } = usePerformance();

  if (showFullSettings) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Cog6ToothIcon className="h-5 w-5 text-gray-300" />
          <h3 className="font-medium text-gray-200">Performance Settings</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Animations</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.animationsEnabled}
                onChange={(e) => updateSetting('animationsEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Cursor Effects</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.cursorEffectsEnabled}
                onChange={(e) => updateSetting('cursorEffectsEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Particle Effects</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.particleEffectsEnabled}
                onChange={(e) => updateSetting('particleEffectsEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Background Effects</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.backgroundEffectsEnabled}
                onChange={(e) => updateSetting('backgroundEffectsEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-700 space-y-2">
          <button
            onClick={toggleAnimations}
            className="w-full px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors text-gray-200"
          >
            {settings.animationsEnabled ? 'Disable All Animations' : 'Enable All Animations'}
          </button>
          
          <button
            onClick={enableHighPerformanceMode}
            className="w-full px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 rounded-md transition-colors text-white flex items-center justify-center space-x-1"
          >
            <BoltIcon className="h-4 w-4" />
            <span>High Performance Mode</span>
          </button>
        </div>
      </div>
    );
  }

  // Simple toggle button for header
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={toggleAnimations}
        className={`p-2 rounded-lg transition-all duration-200 ${
          settings.animationsEnabled
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
        title={settings.animationsEnabled ? 'Disable animations for better performance' : 'Enable animations'}
      >
        <BoltIcon className="h-4 w-4" />
      </button>
      
      {settings.highPerformanceMode && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-orange-900/30 border border-orange-500/30 rounded text-xs text-orange-300">
          <BoltIcon className="h-3 w-3" />
          <span>Performance Mode</span>
        </div>
      )}
    </div>
  );
};

export default PerformanceToggle;