import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import logo from "@images/logo.png";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { PerformanceProvider } from "@/context/PerformanceContext";
import ThemeToggle from "./components/ThemeToggle";
import PerformanceToggle from "./components/PerformanceToggle";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "TicketWizard - AI-Powered Ticket Creation",
  description: "Purpose-built AI-powered tool for development teams to create high-quality Jira tickets efficiently while maintaining enterprise standards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
            className="antialiased text-neutral-100 font-sans"
            style={{ fontFamily: 'Inter Variable, Inter, sans-serif' }}
          >
      <ThemeProvider>
        <PerformanceProvider>
          <AuthProvider>
          
          <header className="sticky top-0 z-50 backdrop-blur-lg bg-gradient-to-r from-indigo-900/40 via-purple-900/45 to-pink-900/40 border-b border-purple-800/30 shadow-[0_0_25px_rgba(124,58,237,0.3)] navbar-highlight-animation">
            <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-3 sm:py-4 sm:px-6 lg:px-12">
              {/* Left: Logo with improved animation */}
              <Link
                href="/guided-mode"
                className="flex items-center space-x-2 sm:space-x-3 hover:opacity-90 transition-all group"
              >
                <div className="relative">
                  <Image 
                    src={logo} 
                    alt="TicketWizard Logo" 
                    width={36} 
                    height={36} 
                    className="sm:w-10 sm:h-10 group-hover:scale-110 transition-transform duration-300" 
                  />
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 filter blur-md group-hover:bg-purple-500/30 group-hover:scale-125 transition-all duration-300 -z-10"></div>
                </div>
                <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 group-hover:from-indigo-300 group-hover:via-purple-300 group-hover:to-pink-300 transition-all duration-300">
                  TicketWizard
                </span>
              </Link>

              {/* Right: CTA */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Performance Toggle */}
                <PerformanceToggle />
                
                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Subtle tooltip to explain navigation - hidden on small screens */}
                <div className="hidden lg:flex items-center p-1.5 px-3 rounded-full bg-indigo-900/30 border border-indigo-800/30 text-xs text-indigo-300">
                  <span className="mr-1">✨ TicketWizard</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                  </svg>
                </div>
                
                {/* JPMC Access button */}
                <Link
                  href="/guided-mode"
                  className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:from-violet-500 hover:to-fuchsia-500 hover:scale-105 shadow-lg shadow-purple-900/30 hover:shadow-purple-600/40 transition-all duration-300 relative overflow-hidden group text-sm sm:text-base"
                >
                  <span className="relative z-10">
                    <span className="hidden sm:inline">🚀 Get Started</span>
                    <span className="sm:hidden">Start</span>
                  </span>
                  {/* Enhanced shine effect */}
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></span>
                  <span className="absolute inset-0 bg-gradient-to-r from-violet-400/0 via-white/20 to-violet-400/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                </Link>
              </div>
            </div>
          </header>
          {/* Background gradient will be applied in each page as needed */}
          {children}
          <Footer />
        
          </AuthProvider>
        </PerformanceProvider>
      </ThemeProvider>
      </body>
    </html>
  );
}
