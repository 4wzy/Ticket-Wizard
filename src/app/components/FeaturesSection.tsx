"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const FeaturesSection = () => {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: "🧠",
      title: "AI-Refined Clarity",
      description: "Provide rough requirements and let the tool gather context to craft comprehensive tickets with proper titles, descriptions, and acceptance criteria.",
      color: "from-purple-400 to-indigo-500",
      bgGradient: "from-purple-500/10 to-indigo-500/10",
      details: ["Smart context gathering", "Automated refinement", "Perfect formatting"]
    },
    {
      icon: "⏱️",
      title: "Save Hours Every Sprint",
      description: "Reduce time spent in refinement meetings and clarification cycles. Focus your team on delivery instead of documentation.",
      color: "from-yellow-400 to-orange-500",
      bgGradient: "from-yellow-500/10 to-orange-500/10",
      details: ["70% time savings", "Fewer meetings", "Faster delivery"]
    },
    {
      icon: "🧩",
      title: "Team-Aware Learning",
      description: "The tool adapts to your team conventions, technical terminology, and organizational standards to ensure consistency.",
      color: "from-green-400 to-emerald-500",
      bgGradient: "from-green-500/10 to-emerald-500/10",
      details: ["Learns team style", "Consistent voice", "Smart adaptation"]
    },
    {
      icon: "🔄",
      title: "Direct Jira Integration",
      description: "Edit and push tickets straight to Jira with one click. No copy-paste, no manual work — just seamless workflow integration.",
      color: "from-blue-400 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      details: ["One-click publishing", "Real-time sync", "Zero manual work"]
    },
  ];

  return (
    <section className="relative py-32 px-6 md:px-16 lg:px-32 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs */}
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-600/15 to-purple-600/15 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />

        {/* Enhanced floating particles */}
        {Array.from({ length: 15 }).map((_, i) => {
          // Use deterministic positioning based on index to avoid hydration issues
          const xPos = (i * 193 + 73) % 1200; // Deterministic x position
          const yPos = (i * 149 + 97) % 800;  // Deterministic y position
          const duration = 6 + (i % 4); // Deterministic duration
          const delay = (i * 0.4) % 5; // Deterministic delay
          
          return (
            <motion.div
              key={i}
              className={`absolute rounded-full ${
                i % 3 === 0 
                  ? 'w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400' 
                  : i % 3 === 1 
                  ? 'w-1.5 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400'
                  : 'w-1 h-1 bg-gradient-to-r from-cyan-400 to-indigo-400'
              }`}
              initial={{
                x: xPos,
                y: yPos,
                opacity: 0,
              }}
              animate={{
                y: [yPos, yPos - 60, yPos],
                opacity: [0, 0.6, 0],
                scale: [0.3, 2, 0.3],
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

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.h2 
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Features Built for Development Teams
            <motion.div
              className="absolute inset-0 text-5xl md:text-6xl lg:text-7xl font-bold text-purple-400/15 blur-sm -z-10"
              animate={{ 
                textShadow: [
                  "0 0 0px rgba(147, 51, 234, 0)",
                  "0 0 30px rgba(147, 51, 234, 0.4)",
                  "0 0 0px rgba(147, 51, 234, 0)"
                ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              Features Built for Development Teams
            </motion.div>
          </motion.h2>
          
          <motion.p
            className="text-xl md:text-2xl text-neutral-300 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            Purpose-built features that address the needs of <span className="text-purple-300 font-semibold">modern development workflows</span> and enterprise standards.
          </motion.p>
        </motion.div>

        {/* Enhanced Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="group relative"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              viewport={{ once: true }}
              onMouseEnter={() => setHoveredFeature(index)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              {/* Card Container */}
              <motion.div
                className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 hover:border-purple-400/40 transition-all duration-500 relative overflow-hidden h-full"
                whileHover={{ 
                  y: -12, 
                  scale: 1.03,
                  boxShadow: "0 25px 50px -12px rgba(147, 51, 234, 0.25)"
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Dynamic background gradient */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`}
                />

                {/* Animated border on hover */}
                <motion.div
                  className="absolute inset-0 rounded-3xl"
                  initial={false}
                  animate={{
                    background: hoveredFeature === index 
                      ? `conic-gradient(from 0deg, transparent, ${feature.color.includes('purple') ? 'rgb(147, 51, 234)' : feature.color.includes('yellow') ? 'rgb(245, 158, 11)' : feature.color.includes('green') ? 'rgb(34, 197, 94)' : 'rgb(59, 130, 246)'}, transparent)`
                      : 'transparent'
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    padding: '2px',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'subtract'
                  }}
                />

                <div className="relative z-10">
                  {/* Icon with enhanced animation */}
                  <motion.div 
                    className="text-6xl mb-6 group-hover:scale-110 transition-all duration-500"
                    whileHover={{ 
                      rotate: [0, -10, 10, 0],
                      scale: 1.2
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    {feature.icon}
                  </motion.div>

                  {/* Title with gradient */}
                  <motion.h3 
                    className={`text-2xl font-bold mb-4 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300`}
                  >
                    {feature.title}
                  </motion.h3>

                  {/* Description */}
                  <p className="text-neutral-300 text-base leading-relaxed mb-6 group-hover:text-neutral-200 transition-colors duration-300">
                    {feature.description}
                  </p>

                  {/* Feature details list */}
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ 
                      opacity: hoveredFeature === index ? 1 : 0,
                      height: hoveredFeature === index ? 'auto' : 0
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {feature.details.map((detail, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center space-x-2 text-sm text-neutral-400"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ 
                          opacity: hoveredFeature === index ? 1 : 0,
                          x: hoveredFeature === index ? 0 : -10
                        }}
                        transition={{ duration: 0.2, delay: i * 0.1 }}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${feature.color}`} />
                        <span>{detail}</span>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Animated progress indicator */}
                  <motion.div 
                    className="absolute bottom-4 left-8 right-8 h-1 bg-slate-800 rounded-full overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: hoveredFeature === index ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div 
                      className={`h-full bg-gradient-to-r ${feature.color} rounded-full`}
                      initial={{ width: "0%" }}
                      animate={{ width: hoveredFeature === index ? "100%" : "0%" }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </motion.div>
                </div>

                {/* Corner accent */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${feature.bgGradient} opacity-30 rounded-tr-3xl`} />
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.p
            className="text-xl text-neutral-400 mb-8"
            whileInView={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Ready to transform your workflow?
          </motion.p>
          <motion.button
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 text-white font-semibold py-4 px-10 rounded-full shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 relative overflow-hidden group"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10">Access TicketWizard</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;