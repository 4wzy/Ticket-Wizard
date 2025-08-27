'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import CollapsibleSidebar from '@/app/components/CollapsibleSidebar';
import NavHelper from '@/app/components/NavHelper';
import UsageStats from '@/components/UsageStats';
import { ChartBarIcon, CpuChipIcon } from '@heroicons/react/24/outline';

export default function UsagePage() {
  const { user, loading, userProfile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Auth loading/redirect
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <motion.div 
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!user) return null;
  
  // Check if user needs to complete signup
  if (user && !userProfile && !loading) { 
    if (typeof window !== 'undefined') window.location.href = '/complete-signup'; 
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Enhanced Magical Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Multi-layered magical gradient orbs */}
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
          className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-gradient-to-r from-pink-600/15 to-purple-600/15 rounded-full blur-3xl"
          animate={{
            x: [0, 90, 0],
            y: [0, -40, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 w-[320px] h-[320px] bg-gradient-to-r from-indigo-600/12 to-cyan-600/12 rounded-full blur-2xl"
          animate={{
            x: [0, -50, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />

        {/* Enhanced magical floating particles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${
              i % 4 === 0 
                ? 'w-2 h-2 bg-gradient-to-r from-indigo-400 to-purple-400' 
                : i % 4 === 1 
                ? 'w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-pink-400'
                : i % 4 === 2
                ? 'w-1 h-1 bg-gradient-to-r from-pink-400 to-rose-400'
                : 'w-0.5 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-400'
            }`}
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0,
            }}
            animate={{
              y: [null, -60, 15, 0],
              x: [null, Math.random() * 30 - 15, 0],
              opacity: [0, 0.7, 0.2, 0],
              scale: [0.2, 2, 1.2, 0.2],
              rotate: [0, 360]
            }}
            transition={{
              duration: 10 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 6,
            }}
          />
        ))}

        {/* Enhanced animated grid pattern */}
        <motion.div 
          className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.04)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Radial gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-slate-950/10 to-slate-950/30"></div>
      </div>

      <NavHelper />
      
      <main className="flex-1 flex pt-16">
        <CollapsibleSidebar />
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Magical Header */}
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1 
                className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 flex items-center leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                style={{ lineHeight: '1.2' }}
              >
                <motion.span
                  className="flex items-center"
                  animate={{
                    textShadow: [
                      "0 0 0px rgba(147, 51, 234, 0)",
                      "0 0 20px rgba(147, 51, 234, 0.3)",
                      "0 0 0px rgba(147, 51, 234, 0)"
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <motion.span 
                    className="text-4xl md:text-5xl lg:text-6xl mr-3"
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    📊
                  </motion.span>
                  Usage & Analytics
                </motion.span>
                <motion.span 
                  className="ml-3 text-xs font-normal rounded-full bg-gradient-to-r from-indigo-900/40 to-purple-900/40 text-indigo-300 px-3 py-1.5 hidden md:inline-block shadow-lg border border-indigo-700/50 backdrop-blur-sm"
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  Monitor AI Usage
                </motion.span>
              </motion.h1>
              
              <motion.p 
                className="text-lg text-neutral-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Track your AI token consumption and manage your personal usage settings
              </motion.p>
            </motion.div>

            {/* Enhanced Navigation Tabs */}
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <nav className="flex space-x-1 bg-gradient-to-r from-neutral-900/60 to-neutral-800/60 backdrop-blur-md p-1 rounded-2xl border border-neutral-700/60">
                {[
                  { id: 'overview', label: 'Usage Overview', icon: ChartBarIcon },
                  { id: 'settings', label: 'Usage Settings', icon: CpuChipIcon }
                ].map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
                    }`}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20"
                        layoutId="activeTab"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.button>
                ))}
              </nav>
            </motion.div>

            {/* Enhanced Content Sections */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <UsageStats />
                </motion.div>
              )}
              
              {activeTab === 'settings' && (
                <motion.div 
                  className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md rounded-2xl p-8 border border-neutral-700/60 shadow-2xl"
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <motion.div
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CpuChipIcon className="h-6 w-6 mr-3 text-indigo-400" />
                    </motion.div>
                    Usage Settings
                  </h2>
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                    >
                      <CpuChipIcon className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-white mb-2">Usage Controls Coming Soon</h3>
                    <p className="text-neutral-300 mb-6">
                      Advanced usage management features in development:
                    </p>
                    <motion.ul 
                      className="text-left text-neutral-300 space-y-2 max-w-md mx-auto mb-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, staggerChildren: 0.1 }}
                    >
                      {[
                        'Usage alerts and notifications',
                        'Feature-specific limits',
                        'Team usage controls',
                        'Auto-pause when limits reached',
                        'Custom usage reporting'
                      ].map((item, index) => (
                        <motion.li 
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                        >
                          • {item}
                        </motion.li>
                      ))}
                    </motion.ul>
                    <motion.div 
                      className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/50 rounded-lg p-4 max-w-md mx-auto relative overflow-hidden"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/5 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
                      <p className="text-green-300 text-sm relative z-10 flex items-center justify-center">
                        <motion.span 
                          className="mr-2"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          ✅
                        </motion.span>
                        All AI features are currently enabled with standard rate limiting
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}