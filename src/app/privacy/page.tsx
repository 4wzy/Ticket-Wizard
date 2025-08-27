'use client';
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/images/logo.png";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 10,
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
              className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-3xl shadow-xl shadow-indigo-500/25 inline-block"
              whileHover={{ scale: 1.05, rotate: -5 }}
            >
              <Image src={logo} alt="TicketWizard Logo" width={48} height={48} />
            </motion.div>
          </Link>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <p className="text-neutral-300 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
        </motion.div>

        {/* Content */}
        <motion.div 
          className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-indigo-400/30 rounded-3xl shadow-2xl shadow-indigo-500/20 p-8 space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">1. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-indigo-200 mb-2">Personal Information</h3>
                <p className="text-neutral-300 leading-relaxed mb-2">When you register for Jira Wizard, we collect:</p>
                <ul className="text-neutral-300 space-y-1 ml-6">
                  <li>• Email address (required for account creation)</li>
                  <li>• Full name (optional, for profile completion)</li>
                  <li>• Organization and team information (when applicable)</li>
                  <li>• Profile preferences and settings</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-indigo-200 mb-2">Usage Data</h3>
                <p className="text-neutral-300 leading-relaxed mb-2">We automatically collect information about how you use our Service:</p>
                <ul className="text-neutral-300 space-y-1 ml-6">
                  <li>• Feature usage patterns (manual mode, guided mode, etc.)</li>
                  <li>• Token consumption and API usage statistics</li>
                  <li>• Session duration and frequency of use</li>
                  <li>• Error logs and performance metrics</li>
                  <li>• Browser type, operating system, and device information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-indigo-200 mb-2">Content Data</h3>
                <p className="text-neutral-300 leading-relaxed mb-2">Content you create or upload to the Service:</p>
                <ul className="text-neutral-300 space-y-1 ml-6">
                  <li>• Jira ticket content (titles, descriptions, acceptance criteria)</li>
                  <li>• Project contexts and templates</li>
                  <li>• Chat messages and AI interactions</li>
                  <li>• Team and organization shared content</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">2. How We Use Your Information</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">We use the collected information to:</p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• Provide, maintain, and improve our Service</li>
              <li>• Process your content through AI systems to generate recommendations and improvements</li>
              <li>• Enable team collaboration and organization management features</li>
              <li>• Generate usage analytics and insights for you and your organization administrators</li>
              <li>• Communicate with you about your account, updates, and support</li>
              <li>• Detect, prevent, and address technical issues and security threats</li>
              <li>• Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">3. AI Processing and Third-Party Services</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              Our Service uses artificial intelligence to process your content. Specifically:
            </p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• We use Google Gemini AI services to analyze and improve your Jira tickets</li>
              <li>• Your content may be processed by these AI systems to provide recommendations</li>
              <li>• We use Supabase for authentication and database services</li>
              <li>• These third-party services have their own privacy policies and data handling practices</li>
              <li>• We do not train AI models on your personal data</li>
              <li>• AI processing is performed in real-time and content is not permanently stored by AI providers for training</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">We share your information in the following circumstances:</p>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-indigo-200 mb-2">Within Your Organization/Team</h3>
                <ul className="text-neutral-300 space-y-1 ml-6">
                  <li>• Content marked as "organization" or "team" visibility is shared with respective members</li>
                  <li>• Usage analytics are accessible to team and organization administrators</li>
                  <li>• Organization and team admins can see member lists and basic profile information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-indigo-200 mb-2">Third-Party Service Providers</h3>
                <ul className="text-neutral-300 space-y-1 ml-6">
                  <li>• AI processing services (Google Gemini) - for content analysis and improvement</li>
                  <li>• Authentication and database services (Supabase) - for account management</li>
                  <li>• Hosting and infrastructure providers - for Service operation</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-indigo-200 mb-2">Legal Requirements</h3>
                <p className="text-neutral-300 leading-relaxed">
                  We may disclose your information if required by law, court order, or to protect our rights, property, or safety, or that of our users or the public.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">5. Data Storage and Security</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              We implement appropriate security measures to protect your information:
            </p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• Data is stored in secure, encrypted databases</li>
              <li>• We use industry-standard encryption for data transmission</li>
              <li>• Access to your data is restricted to authorized personnel only</li>
              <li>• We regularly monitor our systems for security vulnerabilities</li>
              <li>• Row-level security policies protect your data from unauthorized access</li>
              <li>• However, no method of transmission over the internet is 100% secure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">6. Data Retention</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">We retain your information as follows:</p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• Account information: Until you delete your account</li>
              <li>• Content data: Until you delete the content or your account</li>
              <li>• Usage analytics: Up to 2 years for operational purposes</li>
              <li>• Shared team/organization content: According to team/organization policies</li>
              <li>• Legal compliance data: As required by applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">7. Your Rights and Choices</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">You have the following rights regarding your personal information:</p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• <strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li>• <strong>Correction:</strong> Update or correct your personal information through your account settings</li>
              <li>• <strong>Deletion:</strong> Delete your content or request account deletion</li>
              <li>• <strong>Data Portability:</strong> Export your data in a machine-readable format</li>
              <li>• <strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li>• <strong>Visibility Control:</strong> Manage who can see your content through visibility settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">8. Cookies and Tracking</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="text-neutral-300 space-y-2 ml-6">
              <li>• Maintain your login session and authenticate your requests</li>
              <li>• Remember your preferences and settings</li>
              <li>• Analyze usage patterns and improve the Service</li>
              <li>• Provide security features and prevent fraud</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed mt-4">
              You can control cookies through your browser settings, but disabling cookies may affect Service functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">9. International Data Transfers</h2>
            <p className="text-neutral-300 leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">10. Children's Privacy</h2>
            <p className="text-neutral-300 leading-relaxed">
              Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-neutral-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">12. Contact Us</h2>
            <p className="text-neutral-300 leading-relaxed">
              If you have any questions about this Privacy Policy, your data, or your rights, please contact us through the Service or at our support channels. We will respond to your inquiry within a reasonable timeframe.
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
            className="text-indigo-400 hover:text-indigo-300 transition-colors duration-200 inline-flex items-center space-x-2"
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