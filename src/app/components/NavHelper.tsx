"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const NavHelper = () => {
  // Local storage key for the helper dismissal
  const STORAGE_KEY = 'jira_wizard_nav_helper_dismissed';
  const [showHelper, setShowHelper] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    // Check if the helper was previously dismissed
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    
    if (!isDismissed) {
      // Show the helper after a short delay
      const timer = setTimeout(() => setShowHelper(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissHelper = () => {
    setShowHelper(false);
    // Save the dismissal to local storage
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <>
      {/* Enhanced Information button */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-pink-600 text-white rounded-full p-3 shadow-xl hover:shadow-purple-500/40 transition-all duration-300 group relative overflow-hidden"
        onClick={() => setShowInfo(!showInfo)}
        aria-label="Navigation information"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: showInfo ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <InformationCircleIcon className="h-6 w-6 relative z-10" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </motion.button>

      {/* Enhanced Auto-show helper on first visit */}
      <AnimatePresence>
        {showHelper && (
          <motion.div 
            className="fixed top-20 right-6 z-50 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-purple-400/30 rounded-2xl p-6 shadow-2xl shadow-purple-600/30 max-w-sm"
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="flex justify-between items-start mb-4">
              <motion.h4 
                className="font-bold text-lg bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                ✨ Navigation Guide
              </motion.h4>
              <motion.button 
                onClick={dismissHelper} 
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-700/50 transition-colors"
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <XMarkIcon className="h-5 w-5" />
              </motion.button>
            </div>
            <motion.div 
              className="mt-4 text-sm text-neutral-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="mb-3">TicketWizard uses a dual-navigation system:</p>
              <div className="space-y-3 text-xs">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="text-indigo-300 font-medium">Top Bar:</span>
                    <p className="text-neutral-300 mt-1">Global navigation and account settings</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="text-purple-300 font-medium">Side Bar:</span>
                    <p className="text-neutral-300 mt-1">Mode-specific navigation and features</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg border border-purple-400/20">
                <p className="text-xs text-purple-300 font-medium mb-1">💡 Pro Tip</p>
                <p className="text-xs text-neutral-300">Collapse the sidebar for more workspace when creating complex tickets.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Manual info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            className="fixed bottom-20 right-6 z-50 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-indigo-400/30 rounded-2xl p-6 shadow-2xl shadow-indigo-600/30 max-w-sm"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="flex justify-between items-start mb-4">
              <motion.h4 
                className="font-bold text-lg bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                🧭 Navigation Guide
              </motion.h4>
              <motion.button 
                onClick={() => setShowInfo(false)} 
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-700/50 transition-colors"
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <XMarkIcon className="h-5 w-5" />
              </motion.button>
            </div>
            <motion.div 
              className="space-y-4 text-sm text-neutral-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="mb-3">TicketWizard&apos;s interface structure:</p>
              <div className="space-y-3 text-xs">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="text-indigo-300 font-medium">Top Navigation:</span>
                    <p className="text-neutral-300 mt-1">Company branding and global settings</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="text-cyan-300 font-medium">Side Navigation:</span>
                    <p className="text-neutral-300 mt-1">Dashboard links and collapsible workspace</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 rounded-lg border border-indigo-400/20">
                <p className="text-xs text-indigo-300 font-medium mb-1">💡 Pro Tip</p>
                <p className="text-xs text-neutral-300">Collapse the sidebar for maximum workspace when creating complex tickets.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavHelper;
