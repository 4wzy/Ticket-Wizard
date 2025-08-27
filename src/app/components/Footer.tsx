'use client';
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/images/logo.png";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const legalLinks = [
    { name: "Terms of Service", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Cookie Policy", href: "/cookies" },
    { name: "Legal Center", href: "/legal" }
  ];

  const productLinks = [
    { name: "Manual Mode", href: "/manual-mode" },
    { name: "Guided Mode", href: "/guided-mode" },
    { name: "Usage Analytics", href: "/usage" },
    { name: "Team Admin", href: "/team-admin" }
  ];

  return (
    <footer className="relative mt-20 border-t border-purple-800/30 bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 backdrop-blur-xl">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="inline-flex items-center space-x-3 mb-4 group">
              <motion.div 
                className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <Image src={logo} alt="TicketWizard Logo" width={32} height={32} />
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                TicketWizard
              </span>
            </Link>
            
            <p className="text-neutral-300 leading-relaxed mb-6 max-w-md">
              A purpose-built tool for development teams to create high-quality Jira tickets efficiently while maintaining enterprise standards.
            </p>

            <div className="flex space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/legal"
                  className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 hover:border-purple-400/50 text-purple-300 hover:text-purple-200 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
                >
                  Legal Center
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Product Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-neutral-200 mb-4">Product</h3>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-purple-300 transition-colors duration-200 text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Legal Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-neutral-200 mb-4">Legal</h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-purple-300 transition-colors duration-200 text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div 
          className="border-t border-purple-800/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-neutral-400 text-sm mb-4 md:mb-0">
            © {currentYear} TicketWizard. Internal Development Tool.
          </p>
          
          <div className="flex items-center space-x-6 text-sm">
            <span className="text-neutral-500">
              Built for Engineering Excellence
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs">All systems operational</span>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}