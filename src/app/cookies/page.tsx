'use client';
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/images/logo.png";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-pink-600/10 to-purple-600/10 rounded-full blur-3xl"
          animate={{
            x: [0, 60, 0],
            y: [0, -40, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/" className="inline-block mb-6">
            <motion.div 
              className="bg-gradient-to-br from-pink-500 to-purple-600 p-4 rounded-3xl shadow-xl shadow-pink-500/25 inline-block"
              whileHover={{ scale: 1.05, rotate: 3 }}
            >
              <Image src={logo} alt="TicketWizard Logo" width={48} height={48} />
            </motion.div>
          </Link>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-pink-200 to-purple-200 bg-clip-text text-transparent mb-4">
            Cookie Policy
          </h1>
          <p className="text-neutral-300 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
        </motion.div>

        {/* Content */}
        <motion.div 
          className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-pink-400/30 rounded-3xl shadow-2xl shadow-pink-500/20 p-8 space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <section>
            <h2 className="text-2xl font-semibold text-pink-300 mb-4">What Are Cookies?</h2>
            <p className="text-neutral-300 leading-relaxed">
              Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and enabling core functionality of our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-pink-300 mb-4">How We Use Cookies</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              Jira Wizard uses cookies for several purposes:
            </p>

            <div className="space-y-6">
              <div className="bg-slate-800/50 rounded-lg p-6 border border-pink-400/20">
                <h3 className="text-lg font-medium text-pink-200 mb-3 flex items-center">
                  🔐 Essential Cookies (Always Active)
                </h3>
                <p className="text-neutral-300 leading-relaxed mb-3">
                  These cookies are necessary for the Service to function properly and cannot be disabled.
                </p>
                <ul className="text-neutral-300 space-y-2 ml-4">
                  <li>• <strong>Authentication:</strong> Keep you logged in during your session</li>
                  <li>• <strong>Security:</strong> Protect against fraud and ensure secure connections</li>
                  <li>• <strong>Session Management:</strong> Remember your actions within a session</li>
                  <li>• <strong>CSRF Protection:</strong> Prevent cross-site request forgery attacks</li>
                </ul>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-purple-400/20">
                <h3 className="text-lg font-medium text-purple-200 mb-3 flex items-center">
                  ⚙️ Functional Cookies
                </h3>
                <p className="text-neutral-300 leading-relaxed mb-3">
                  These cookies enhance your experience by remembering your preferences.
                </p>
                <ul className="text-neutral-300 space-y-2 ml-4">
                  <li>• <strong>User Preferences:</strong> Remember your settings and customizations</li>
                  <li>• <strong>Theme Settings:</strong> Store your preferred display options</li>
                  <li>• <strong>Language Preferences:</strong> Remember your language selection</li>
                  <li>• <strong>Form Data:</strong> Temporarily store form inputs to prevent data loss</li>
                </ul>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-indigo-400/20">
                <h3 className="text-lg font-medium text-indigo-200 mb-3 flex items-center">
                  📊 Analytics Cookies
                </h3>
                <p className="text-neutral-300 leading-relaxed mb-3">
                  These cookies help us understand how you use our Service so we can improve it.
                </p>
                <ul className="text-neutral-300 space-y-2 ml-4">
                  <li>• <strong>Usage Analytics:</strong> Track feature usage and user journeys</li>
                  <li>• <strong>Performance Monitoring:</strong> Identify and fix technical issues</li>
                  <li>• <strong>Error Tracking:</strong> Help us diagnose and resolve problems</li>
                  <li>• <strong>A/B Testing:</strong> Test improvements to the Service</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-pink-300 mb-4">Third-Party Cookies</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              Some cookies are set by third-party services we use:
            </p>
            <ul className="text-neutral-300 space-y-3 ml-6">
              <li>
                <strong className="text-pink-200">Supabase:</strong> Our authentication and database provider may set cookies for user authentication and session management.
              </li>
              <li>
                <strong className="text-pink-200">Google Services:</strong> When using AI features, Google may set cookies related to API usage and security.
              </li>
              <li>
                <strong className="text-pink-200">CDN Providers:</strong> Content delivery networks may set cookies to optimize content delivery.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-pink-300 mb-4">Cookie Duration</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              We use both session and persistent cookies:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 rounded-lg p-4 border border-pink-400/20">
                <h3 className="text-lg font-medium text-pink-200 mb-2">Session Cookies</h3>
                <p className="text-neutral-300 text-sm leading-relaxed">
                  Temporary cookies that expire when you close your browser. Used for authentication and session management.
                </p>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-400/20">
                <h3 className="text-lg font-medium text-purple-200 mb-2">Persistent Cookies</h3>
                <p className="text-neutral-300 text-sm leading-relaxed">
                  Stored on your device for a specified period (typically 30 days to 1 year). Used for preferences and analytics.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-pink-300 mb-4">Managing Your Cookie Preferences</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              You have several options for managing cookies:
            </p>

            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4 border border-pink-400/20">
                <h3 className="text-lg font-medium text-pink-200 mb-2">Browser Settings</h3>
                <p className="text-neutral-300 text-sm leading-relaxed mb-2">
                  Most browsers allow you to control cookies through their settings:
                </p>
                <ul className="text-neutral-300 text-sm space-y-1 ml-4">
                  <li>• Block all cookies (may break functionality)</li>
                  <li>• Block third-party cookies only</li>
                  <li>• Delete existing cookies</li>
                  <li>• Set cookies to expire when you close your browser</li>
                </ul>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-400/20">
                <h3 className="text-lg font-medium text-purple-200 mb-2">Account Settings</h3>
                <p className="text-neutral-300 text-sm leading-relaxed">
                  When logged in, you can manage some cookie preferences through your account settings, including opting out of non-essential analytics cookies.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-200 text-sm leading-relaxed">
                <strong>⚠️ Important:</strong> Disabling essential cookies will prevent you from using core features of the Service, including logging in and managing your account.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-pink-300 mb-4">Browser-Specific Instructions</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              Here's how to manage cookies in popular browsers:
            </p>

            <div className="grid gap-4">
              <details className="bg-slate-800/50 rounded-lg border border-pink-400/20">
                <summary className="p-4 cursor-pointer text-pink-200 font-medium hover:bg-slate-700/50 rounded-lg transition-colors">
                  Google Chrome
                </summary>
                <div className="p-4 pt-0 text-neutral-300 text-sm">
                  <p>Settings → Privacy and security → Cookies and other site data</p>
                </div>
              </details>

              <details className="bg-slate-800/50 rounded-lg border border-purple-400/20">
                <summary className="p-4 cursor-pointer text-purple-200 font-medium hover:bg-slate-700/50 rounded-lg transition-colors">
                  Mozilla Firefox
                </summary>
                <div className="p-4 pt-0 text-neutral-300 text-sm">
                  <p>Settings → Privacy & Security → Cookies and Site Data</p>
                </div>
              </details>

              <details className="bg-slate-800/50 rounded-lg border border-indigo-400/20">
                <summary className="p-4 cursor-pointer text-indigo-200 font-medium hover:bg-slate-700/50 rounded-lg transition-colors">
                  Safari
                </summary>
                <div className="p-4 pt-0 text-neutral-300 text-sm">
                  <p>Preferences → Privacy → Manage Website Data</p>
                </div>
              </details>

              <details className="bg-slate-800/50 rounded-lg border border-cyan-400/20">
                <summary className="p-4 cursor-pointer text-cyan-200 font-medium hover:bg-slate-700/50 rounded-lg transition-colors">
                  Microsoft Edge
                </summary>
                <div className="p-4 pt-0 text-neutral-300 text-sm">
                  <p>Settings → Cookies and site permissions → Cookies and site data</p>
                </div>
              </details>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-pink-300 mb-4">Updates to This Policy</h2>
            <p className="text-neutral-300 leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-pink-300 mb-4">Contact Us</h2>
            <p className="text-neutral-300 leading-relaxed">
              If you have any questions about our use of cookies or this Cookie Policy, please contact us through the Service or at our support channels.
            </p>
          </section>
        </motion.div>

        {/* Back to Home */}
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link 
            href="/" 
            className="text-pink-400 hover:text-pink-300 transition-colors duration-200 inline-flex items-center space-x-2"
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