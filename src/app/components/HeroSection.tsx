"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

const HeroSection = () => {
  const router = useRouter();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const handleGetStarted = () => {
    router.push('/register');
  };

  return (
    <>
      <section className="relative min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 text-white overflow-hidden">
        {/* Enhanced Magical Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Multi-layered gradient mesh */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/40 to-indigo-600/40 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-gradient-to-r from-pink-600/30 to-purple-600/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 w-[320px] h-[320px] bg-gradient-to-r from-indigo-600/25 to-cyan-600/25 rounded-full blur-2xl animate-pulse delay-2000"></div>
            <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-full blur-xl animate-pulse delay-3000"></div>
          </div>

          {/* Enhanced floating particles */}
          {Array.from({ length: 25 }).map((_, i) => {
            // Use deterministic positioning based on index to avoid hydration issues
            const xPos = (i * 173 + 37) % 1200; // Deterministic x position
            const yPos = (i * 127 + 71) % 800;  // Deterministic y position
            const duration = 5 + (i % 4); // Deterministic duration
            const delay = (i * 0.3) % 4; // Deterministic delay
            
            return (
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
                  x: xPos,
                  y: yPos,
                  opacity: 0,
                }}
                animate={{
                  y: [yPos, yPos - 40, yPos],
                  opacity: [0, 0.8, 0],
                  scale: [0.3, 1.8, 0.3],
                }}
                transition={{
                  duration: duration,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: delay,
                }}
              />
            );
          })}

          {/* Enhanced grid pattern with animated glow */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.05)_1px,transparent_1px)] bg-[size:60px_60px] animate-pulse"></div>
          
          {/* Dynamic spotlight effects */}
          <motion.div 
            className="absolute top-1/4 left-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-full blur-3xl"
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
          
          {/* Subtle radial gradient overlay with depth */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-slate-950/20 to-slate-950/80"></div>
          
          {/* Animated noise texture overlay */}
          <motion.div 
            className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxmaWx0ZXIgaWQ9Im5vaXNlIj4KICAgICAgPGZlVHVyYnVsZW5jZSBiYXNlRnJlcXVlbmN5PSIuOSIgbnVtT2N0YXZlcz0iNCIgc2VlZD0iMiIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPgogICAgPC9maWx0ZXI+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9Ii4zIi8+Cjwvc3ZnPg==')]"
            animate={{ 
              backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] 
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 container mx-auto px-6 lg:px-8 pt-20 pb-16">
          {/* Header Section */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 leading-tight mb-6 relative">
                <motion.span
                  initial={{ opacity: 0, y: 30, rotateX: -15 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 0.9, delay: 0.1, ease: "easeOut" }}
                  className="inline-block perspective-1000"
                >
                  <motion.span
                    animate={{ 
                      textShadow: [
                        "0 0 0px rgba(147, 51, 234, 0)",
                        "0 0 20px rgba(147, 51, 234, 0.3)",
                        "0 0 0px rgba(147, 51, 234, 0)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    ✨ Streamline Your
                  </motion.span>
                </motion.span>
                <br />
                <motion.span
                  initial={{ opacity: 0, y: 30, rotateX: -15 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
                  className="inline-block perspective-1000"
                >
                  <motion.span
                    animate={{ 
                      textShadow: [
                        "0 0 0px rgba(236, 72, 153, 0)",
                        "0 0 25px rgba(236, 72, 153, 0.4)",
                        "0 0 0px rgba(236, 72, 153, 0)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                  >
                    Ticket Workflow
                  </motion.span>
                </motion.span>
                {/* Enhanced glow effect */}
                <div className="absolute inset-0 text-4xl md:text-6xl lg:text-7xl font-bold text-purple-400/20 blur-sm -z-10 animate-pulse">
                  ✨ Transform Ideas into Perfect Jira Tickets
                </div>
              </h1>
              <motion.p 
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                className="text-xl md:text-2xl text-neutral-200 max-w-3xl mx-auto leading-relaxed"
              >
                Empower development teams to create{" "}
                <motion.span 
                  className="text-purple-300 font-semibold bg-gradient-to-r from-purple-300/20 to-pink-300/20 px-3 py-1 rounded-xl backdrop-blur-sm border border-purple-300/20 relative whitespace-nowrap"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)",
                    transition: { duration: 0.2 }
                  }}
                >
                  <motion.span
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-300/10 to-transparent bg-[length:200%_100%] rounded-xl"
                  />
                  <span className="relative z-10">high-quality tickets efficiently</span>
                </motion.span>{" "}
                with intelligent AI assistance.
              </motion.p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 text-white font-semibold py-4 px-10 rounded-full shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center space-x-2">
                  <span>🚀 Start Creating Better Tickets</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/50 to-pink-600/50 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 -z-10"></div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsVideoModalOpen(true)}
                className="border-2 border-purple-400 hover:border-indigo-300 text-white hover:text-indigo-200 font-semibold py-4 px-10 rounded-full transition-all backdrop-blur-md hover:bg-purple-500/20 hover:shadow-lg hover:shadow-purple-500/20 group relative overflow-hidden"
              >
                <span className="flex items-center justify-center space-x-2 relative z-10">
                  <motion.svg 
                    className="w-5 h-5 transition-transform" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                  </motion.svg>
                  <span>Watch Demo</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </motion.button>
            </motion.div>
          </div>

          {/* Video Showcase Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-5xl mx-auto mb-20"
          >
            <div className="relative group">
              {/* Enhanced Video Container with Multiple Magical Borders */}
              <div className="relative bg-gradient-to-r from-purple-600/30 to-indigo-600/30 p-[2px] rounded-3xl backdrop-blur-sm">
                <div className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 rounded-3xl overflow-hidden relative">
                  {/* Video Placeholder */}
                  <div className="aspect-video relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
                    {/* Enhanced Placeholder Content */}
                    <div className="text-center relative z-10">
                      <motion.div
                        whileHover={{ scale: 1.15, rotate: 3 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsVideoModalOpen(true)}
                        className="w-24 h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center cursor-pointer shadow-2xl mb-6 mx-auto group-hover:shadow-purple-500/60 transition-all duration-500 relative overflow-hidden"
                      >
                        <motion.svg 
                          className="w-10 h-10 text-white ml-1" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                          whileHover={{ scale: 1.1 }}
                        >
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                        </motion.svg>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      </motion.div>
                      <motion.h3 
                        className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent"
                        whileHover={{ scale: 1.05 }}
                      >
                        See TicketWizard in Action
                      </motion.h3>
                      <p className="text-neutral-300 text-lg">Watch how we transform messy ideas into perfect tickets</p>
                    </div>

                    {/* Enhanced animated borders */}
                    <div className="absolute inset-2 rounded-2xl border border-purple-500/30 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    <div className="absolute inset-4 rounded-xl border border-indigo-400/20 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-200"></div>
                    
                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 via-transparent to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                </div>
              </div>

              {/* Enhanced floating elements around video */}
              <motion.div 
                className="absolute -top-6 -left-6 w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-60"
                animate={{ 
                  y: [0, -10, 0],
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, 0]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute -bottom-6 -right-6 w-8 h-8 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-60"
                animate={{ 
                  y: [0, 10, 0],
                  scale: [1, 1.2, 1],
                  rotate: [0, -5, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />
              <motion.div 
                className="absolute top-1/2 -right-10 w-6 h-6 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full opacity-60"
                animate={{ 
                  x: [0, 5, 0],
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, 0]
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
              <motion.div 
                className="absolute top-1/4 -left-8 w-4 h-4 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full opacity-60"
                animate={{ 
                  x: [0, -5, 0],
                  y: [0, -5, 0],
                  scale: [1, 1.4, 1]
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              />
            </div>
          </motion.div>

          {/* Feature Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
          >
            {[
              { text: "70% Time Savings", icon: "⚡", color: "from-yellow-400 to-orange-500", description: "Reduce time spent on ticket creation" },
              { text: "Context-Aware AI", icon: "🧠", color: "from-purple-400 to-indigo-500", description: "Understands your project needs" },
              { text: "Direct Jira Integration", icon: "🔄", color: "from-blue-400 to-cyan-500", description: "Push tickets straight to Jira" },
              { text: "Team-Aware AI", icon: "🎭", color: "from-green-400 to-emerald-500", description: "Adapts to your team's conventions and style" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-md border border-slate-700/60 hover:border-purple-400/60 rounded-3xl p-8 transition-all duration-500 group hover:bg-gradient-to-br hover:from-slate-800/70 hover:to-slate-700/70 relative overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.15, duration: 0.6 }}
                whileHover={{ 
                  y: -8, 
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color.replace('from-', 'from-').replace('to-', 'to-')} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 rounded-3xl`}></div>
                
                <motion.div 
                  className="text-4xl mb-4 group-hover:scale-125 transition-all duration-500"
                  whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.5 }}}
                >
                  {stat.icon}
                </motion.div>
                
                <h3 className={`font-bold text-xl mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300`}>
                  {stat.text}
                </h3>
                
                <p className="text-neutral-400 text-sm mb-4 group-hover:text-neutral-300 transition-colors duration-300">
                  {stat.description}
                </p>
                
                {/* Enhanced progress bar */}
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
                    initial={{ width: "0%" }}
                    whileInView={{ width: "100%" }}
                    transition={{ duration: 1.5, delay: 1 + i * 0.2 }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-30 blur-sm`}></div>
                </div>
                
                {/* Subtle corner accent */}
                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${stat.color} opacity-5 rounded-tr-3xl`}></div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, rotateX: -15 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.7, opacity: 0, rotateX: -15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative max-w-5xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Enhanced modal container */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-600/50 relative">
              {/* Magical border glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-pink-600/20 p-[2px] rounded-3xl">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl h-full"></div>
              </div>
              
              <div className="relative aspect-video flex items-center justify-center">
                <div className="text-center text-white relative z-10">
                  <motion.div 
                    className="text-8xl mb-6"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    🎬
                  </motion.div>
                  <motion.h3 
                    className="text-3xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Demo Video Coming Soon
                  </motion.h3>
                  <motion.p 
                    className="text-slate-300 text-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    We're preparing a demo showcasing TicketWizard's powerful capabilities
                  </motion.p>
                  
                  {/* Loading animation */}
                  <motion.div 
                    className="flex justify-center mt-8 space-x-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
                
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-indigo-900/10"></div>
              </div>
            </div>
            
            {/* Enhanced close button */}
            <motion.button
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-xl border border-slate-600"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

export default HeroSection;
