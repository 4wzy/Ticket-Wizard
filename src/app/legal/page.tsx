'use client';
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/images/logo.png";
import { DocumentTextIcon, ShieldCheckIcon, CogIcon } from "@heroicons/react/24/outline";

export default function LegalPage() {
  const legalPages = [
    {
      title: "Terms of Service",
      description: "Our terms and conditions for using Jira Wizard, including user responsibilities and service limitations.",
      href: "/terms",
      icon: DocumentTextIcon,
      color: "from-purple-500 to-indigo-600",
      borderColor: "border-purple-400/30",
      shadowColor: "shadow-purple-500/20",
      textColor: "text-purple-300"
    },
    {
      title: "Privacy Policy", 
      description: "How we collect, use, and protect your personal information and data when you use our Service.",
      href: "/privacy",
      icon: ShieldCheckIcon,
      color: "from-indigo-500 to-purple-600",
      borderColor: "border-indigo-400/30", 
      shadowColor: "shadow-indigo-500/20",
      textColor: "text-indigo-300"
    },
    {
      title: "Cookie Policy",
      description: "Information about how we use cookies and similar technologies to enhance your experience.",
      href: "/cookies",
      icon: CogIcon,
      color: "from-pink-500 to-purple-600",
      borderColor: "border-pink-400/30",
      shadowColor: "shadow-pink-500/20", 
      textColor: "text-pink-300"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 rounded-full blur-3xl"
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
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-600/10 to-purple-600/10 rounded-full blur-3xl"
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
        <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/" className="inline-block mb-8">
            <motion.div 
              className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-3xl shadow-xl shadow-purple-500/25 inline-block"
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <Image src={logo} alt="TicketWizard Logo" width={56} height={56} />
            </motion.div>
          </Link>
          
          <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-6">
            Legal Center
          </h1>
          <p className="text-neutral-300 text-xl max-w-3xl mx-auto leading-relaxed">
            Understanding our policies and your rights is important to us. Here you'll find all the legal documents that govern your use of Jira Wizard.
          </p>
        </motion.div>

        {/* Legal Documents Grid */}
        <motion.div 
          className="grid lg:grid-cols-3 gap-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {legalPages.map((page, index) => {
            const IconComponent = page.icon;
            return (
              <motion.div key={page.href}>
                <Link href={page.href}>
                  <motion.div 
                    className={`bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border ${page.borderColor} rounded-3xl shadow-2xl ${page.shadowColor} p-8 h-full transition-all duration-300 hover:border-opacity-50 group cursor-pointer`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                    whileHover={{ 
                      scale: 1.02,
                      y: -5,
                      boxShadow: `0 25px 50px -12px ${page.shadowColor.includes('purple') ? 'rgba(147, 51, 234, 0.4)' : page.shadowColor.includes('indigo') ? 'rgba(99, 102, 241, 0.4)' : 'rgba(236, 72, 153, 0.4)'}`
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Icon */}
                    <motion.div 
                      className={`bg-gradient-to-r ${page.color} p-4 rounded-2xl inline-block mb-6 group-hover:scale-110 transition-transform duration-300`}
                      whileHover={{ rotate: 5 }}
                    >
                      <IconComponent className="h-8 w-8 text-white" />
                    </motion.div>

                    {/* Content */}
                    <h2 className={`text-2xl font-bold ${page.textColor} mb-4 group-hover:text-opacity-90 transition-colors duration-300`}>
                      {page.title}
                    </h2>
                    <p className="text-neutral-300 leading-relaxed group-hover:text-neutral-200 transition-colors duration-300">
                      {page.description}
                    </p>

                    {/* Read More Indicator */}
                    <motion.div 
                      className="flex items-center mt-6 text-neutral-400 group-hover:text-neutral-200 transition-colors duration-300"
                      whileHover={{ x: 5 }}
                    >
                      <span className="text-sm font-medium">Read full document</span>
                      <motion.span
                        className="ml-2"
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        →
                      </motion.span>
                    </motion.div>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Info Section */}
        <motion.div 
          className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-neutral-400/30 rounded-3xl shadow-2xl shadow-neutral-500/10 p-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-neutral-200 mb-6 text-center">
            Quick Information ✨
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-purple-300 mb-4">🔒 Your Data Security</h3>
              <ul className="text-neutral-300 space-y-2 text-sm">
                <li>• End-to-end encryption for all data transmission</li>
                <li>• Row-level security policies protect your information</li>
                <li>• Regular security audits and monitoring</li>
                <li>• GDPR and privacy regulation compliance</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-indigo-300 mb-4">🤖 AI & Processing</h3>
              <ul className="text-neutral-300 space-y-2 text-sm">
                <li>• AI processing uses Google Gemini services</li>
                <li>• Your data is not used to train AI models</li>
                <li>• Real-time processing with minimal data retention</li>
                <li>• You maintain ownership of all your content</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-pink-300 mb-4">👥 Team & Organizations</h3>
              <ul className="text-neutral-300 space-y-2 text-sm">
                <li>• Granular permission controls for shared content</li>
                <li>• Organization admins have limited access rights</li>
                <li>• You can leave teams/organizations anytime</li>
                <li>• Private content remains private to you</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-cyan-300 mb-4">📊 Analytics & Usage</h3>
              <ul className="text-neutral-300 space-y-2 text-sm">
                <li>• Usage analytics help improve the service</li>
                <li>• You can opt out of non-essential cookies</li>
                <li>• Data retention policies limit storage duration</li>
                <li>• Export your data anytime in machine-readable format</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Contact Section */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <h3 className="text-2xl font-semibold text-neutral-200 mb-4">
            Questions About Our Policies?
          </h3>
          <p className="text-neutral-300 mb-6 max-w-2xl mx-auto">
            We believe in transparency and are here to help. If you have any questions about our legal policies or your rights, please don't hesitate to reach out.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              href="/contact" 
              className="inline-flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Contact Support
            </Link>
          </motion.div>
        </motion.div>

        {/* Back to Home */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <Link 
            href="/" 
            className="text-neutral-400 hover:text-neutral-200 transition-colors duration-200 inline-flex items-center space-x-2"
          >
            <motion.span
              whileHover={{ scale: 1.05, x: -5 }}
              className="flex items-center space-x-2"
            >
              <span>← Back to Home</span>
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}