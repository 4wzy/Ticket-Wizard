"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PerformanceSettings {
  animationsEnabled: boolean;
  particleEffectsEnabled: boolean;
  cursorEffectsEnabled: boolean;
  reducedMotion: boolean;
  backgroundEffectsEnabled: boolean;
  highPerformanceMode: boolean;
}

interface PerformanceContextType {
  settings: PerformanceSettings;
  updateSetting: <K extends keyof PerformanceSettings>(key: K, value: PerformanceSettings[K]) => void;
  toggleAnimations: () => void;
  enableHighPerformanceMode: () => void;
  resetToDefaults: () => void;
}

const defaultSettings: PerformanceSettings = {
  animationsEnabled: true,
  particleEffectsEnabled: true,
  cursorEffectsEnabled: true,
  reducedMotion: false,
  backgroundEffectsEnabled: true,
  highPerformanceMode: false,
};

// Detect if user prefers reduced motion
const getInitialSettings = (): PerformanceSettings => {
  if (typeof window !== 'undefined') {
    const savedSettings = localStorage.getItem('performance-settings');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return { ...defaultSettings, ...parsed, reducedMotion: prefersReducedMotion };
    }
    
    // If user prefers reduced motion, start with performance mode
    if (prefersReducedMotion) {
      return {
        ...defaultSettings,
        animationsEnabled: false,
        particleEffectsEnabled: false,
        cursorEffectsEnabled: false,
        reducedMotion: true,
        backgroundEffectsEnabled: false,
        highPerformanceMode: true,
      };
    }
  }
  
  return defaultSettings;
};

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PerformanceSettings>(getInitialSettings);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('performance-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof PerformanceSettings>(
    key: K,
    value: PerformanceSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleAnimations = () => {
    setSettings(prev => ({
      ...prev,
      animationsEnabled: !prev.animationsEnabled,
      particleEffectsEnabled: !prev.animationsEnabled,
      cursorEffectsEnabled: !prev.animationsEnabled,
      backgroundEffectsEnabled: !prev.animationsEnabled,
    }));
  };

  const enableHighPerformanceMode = () => {
    setSettings({
      animationsEnabled: false,
      particleEffectsEnabled: false,
      cursorEffectsEnabled: false,
      reducedMotion: true,
      backgroundEffectsEnabled: false,
      highPerformanceMode: true,
    });
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  const contextValue: PerformanceContextType = {
    settings,
    updateSetting,
    toggleAnimations,
    enableHighPerformanceMode,
    resetToDefaults,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
};