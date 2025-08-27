'use client';
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/images/logo.png";

export default function TermsOfServicePage() {
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
              className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-3xl shadow-xl shadow-purple-500/25 inline-block"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Image src={logo} alt="TicketWizard Logo" width={48} height={48} />
            </motion.div>
          </Link>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
            Terms of Service
          </h1>
          <p className="text-neutral-300 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
        </motion.div>

        {/* Content */}
        <motion.div 
          className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-purple-400/30 rounded-3xl shadow-2xl shadow-purple-500/20 p-8 space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">1. Acceptance of Terms</h2>
            <p className="text-neutral-300 leading-relaxed">
              By accessing and using Jira Wizard ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">2. Description of Service</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              Jira Wizard is an AI-powered tool designed to help users create and refine high-quality Jira tickets. The Service includes:
            </p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• Manual Mode: Traditional ticket editing with AI refinement capabilities</li>
              <li>• Guided Mode: Step-by-step AI-assisted ticket creation with interactive chat</li>
              <li>• Team collaboration features and organization management</li>
              <li>• Usage analytics and reporting</li>
              <li>• Template and project context management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">3. User Accounts and Registration</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              To use certain features of the Service, you must register for an account. When you register, you agree to:
            </p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• Provide accurate, current, and complete information</li>
              <li>• Maintain and update your information to keep it accurate</li>
              <li>• Maintain the security of your password and account</li>
              <li>• Accept responsibility for all activities under your account</li>
              <li>• Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">4. Acceptable Use</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
            </p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• Use the Service for any illegal or unauthorized purpose</li>
              <li>• Violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
              <li>• Transmit or procure the sending of any advertising or promotional material without our consent</li>
              <li>• Impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity</li>
              <li>• Use the Service in any manner that could disable, overburden, damage, or impair the Service</li>
              <li>• Use any robot, spider, or other automatic device to access the Service for any purpose without our express written permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">5. AI and Data Processing</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              Our Service uses artificial intelligence to process and improve your content. By using the Service, you understand and agree that:
            </p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• AI processing may not always be perfect or accurate</li>
              <li>• You are responsible for reviewing and validating all AI-generated content</li>
              <li>• We use Google Gemini and other AI services that may process your data according to their own terms</li>
              <li>• You retain ownership of your content, but grant us license to process it for service provision</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">6. Organizations and Teams</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              When you create or join an organization or team:
            </p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• You may be granted different permission levels (admin, member, viewer)</li>
              <li>• Organization and team admins have additional responsibilities and powers</li>
              <li>• Shared content (templates, project contexts) may be visible to team/organization members</li>
              <li>• Usage analytics may be accessible to team and organization administrators</li>
              <li>• You can leave organizations and teams at any time, subject to data retention policies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">7. Content and Intellectual Property</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              You retain ownership of any content you create or upload to the Service. However, by using the Service, you grant us a limited license to:
            </p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• Process, analyze, and improve your content using AI systems</li>
              <li>• Store and transmit your content as necessary to provide the Service</li>
              <li>• Share content within your organization or team as per your visibility settings</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed mt-4">
              This license ends when you delete your content or close your account, except for content shared with teams or organizations, which may persist according to their policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">8. Privacy and Data Protection</h2>
            <p className="text-neutral-300 leading-relaxed">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices regarding your personal information and how we treat it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">9. Service Availability</h2>
            <p className="text-neutral-300 leading-relaxed">
              We strive to maintain the Service, but we do not guarantee that the Service will be available at all times. The Service may experience downtime for maintenance, updates, or due to factors beyond our control. We reserve the right to modify, suspend, or discontinue the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">10. Limitation of Liability</h2>
            <p className="text-neutral-300 leading-relaxed">
              To the fullest extent permitted by applicable law, Jira Wizard shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">11. Indemnification</h2>
            <p className="text-neutral-300 leading-relaxed">
              You agree to defend, indemnify, and hold harmless Jira Wizard and its officers, directors, employees, and agents from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees arising out of or relating to your violation of these Terms or your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">12. Termination</h2>
            <p className="text-neutral-300 leading-relaxed">
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms. You may also terminate your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">13. Changes to Terms</h2>
            <p className="text-neutral-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. If we make material changes, we will notify you through the Service or by email. Your continued use of the Service after such modifications constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">14. Governing Law</h2>
            <p className="text-neutral-300 leading-relaxed">
              These Terms shall be interpreted and governed by the laws of the jurisdiction in which Jira Wizard operates, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the courts of that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">15. Contact Information</h2>
            <p className="text-neutral-300 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through the Service or at our support channels.
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
            className="text-purple-400 hover:text-purple-300 transition-colors duration-200 inline-flex items-center space-x-2"
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