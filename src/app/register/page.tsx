'use client';
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/images/logo.png";
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon } from "@heroicons/react/24/outline";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Client-side validation
    if (!agreedToTerms || !agreedToPrivacy) {
      setError("You must agree to our Terms of Service and Privacy Policy to create an account.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      if (data.user && !data.user.email_confirmed_at) {
        // Email confirmation required
        setSuccess("Account created! Please check your email for verification. You'll be redirected to complete your profile after verification.");
        setTimeout(() => {
          router.push("/login");
        }, 6000);
      } else {
        // User is already confirmed (unlikely for new registrations)
        setSuccess("Account created successfully! Redirecting to setup...");
        setTimeout(() => {
          router.push("/complete-signup");
        }, 2000);
      }
    }
    setLoading(false);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Enhanced Magical Background */}
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
        <motion.div 
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-indigo-600/10 to-cyan-600/10 rounded-full blur-3xl"
          animate={{
            x: [0, 60, 0],
            y: [0, -40, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />

        {/* Enhanced floating particles */}
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${
              i % 4 === 0 
                ? 'w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400' 
                : i % 4 === 1 
                ? 'w-1.5 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400'
                : i % 4 === 2
                ? 'w-1 h-1 bg-gradient-to-r from-cyan-400 to-indigo-400'
                : 'w-0.5 h-0.5 bg-gradient-to-r from-pink-400 to-cyan-400'
            }`}
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0,
            }}
            animate={{
              y: [null, -80, 0],
              opacity: [0, 0.8, 0],
              scale: [0.2, 2.5, 0.2],
            }}
            transition={{
              duration: 7 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 6,
            }}
          />
        ))}

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40"></div>
      </div>
      
      <motion.div 
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Enhanced Register Card */}
        <motion.div 
          className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-purple-400/30 rounded-3xl shadow-2xl shadow-purple-500/20 p-8 relative overflow-hidden"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          {/* Magical border glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 p-[1px] rounded-3xl">
            <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 rounded-3xl h-full"></div>
          </div>

          <div className="relative z-10">
            {/* Enhanced Logo and Header */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <motion.div 
                className="flex justify-center mb-6"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <motion.div 
                  className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-3xl shadow-xl shadow-purple-500/25 relative overflow-hidden group"
                  whileHover={{ boxShadow: "0 25px 50px -12px rgba(147, 51, 234, 0.5)" }}
                >
                  <Image
                    src={logo}
                    alt="TicketWizard Logo"
                    width={48}
                    height={48}
                    className="drop-shadow-sm relative z-10"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </motion.div>
              </motion.div>
              
              <motion.h1 
                className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                Join TicketWizard ✨
              </motion.h1>
              
              <motion.p 
                className="text-neutral-300 text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                Create your magical account to get started
              </motion.p>
            </motion.div>

            {/* Enhanced Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    ❌ {error}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Success Message */}
            <AnimatePresence>
              {success && (
                <motion.div 
                  className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    ✨ {success}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Register Form */}
            <motion.form 
              onSubmit={handleRegister} 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              {/* Enhanced Email Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
              >
                <motion.label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-neutral-200 mb-2"
                  whileHover={{ scale: 1.02 }}
                >
                  Email Address ✉️
                </motion.label>
                <motion.div 
                  className="relative group"
                  whileFocus={{ scale: 1.02 }}
                >
                  <motion.div 
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                    animate={{ 
                      color: email ? "rgb(168, 85, 247)" : "rgb(163, 163, 163)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <EnvelopeIcon className="h-5 w-5" />
                  </motion.div>
                  <motion.input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-neutral-600 rounded-lg bg-neutral-800/50 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    placeholder="Enter your email"
                    whileFocus={{ 
                      scale: 1.02,
                      boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)"
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  />
                  {/* Magic glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-indigo-600/10 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </motion.div>
              </motion.div>

              {/* Enhanced Password Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.2 }}
              >
                <motion.label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-neutral-200 mb-2"
                  whileHover={{ scale: 1.02 }}
                >
                  Password 🔐
                </motion.label>
                <motion.div 
                  className="relative group"
                  whileFocus={{ scale: 1.02 }}
                >
                  <motion.div 
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                    animate={{ 
                      color: password ? "rgb(168, 85, 247)" : "rgb(163, 163, 163)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <LockClosedIcon className="h-5 w-5" />
                  </motion.div>
                  <motion.input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-neutral-600 rounded-lg bg-neutral-800/50 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    placeholder="Create a password"
                    whileFocus={{ 
                      scale: 1.02,
                      boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)"
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-200 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ rotate: showPassword ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <motion.div
                      animate={{ opacity: showPassword ? 0 : 1 }}
                      className="absolute"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </motion.div>
                    <motion.div
                      animate={{ opacity: showPassword ? 1 : 0 }}
                      className="absolute"
                    >
                      <EyeSlashIcon className="h-5 w-5" />
                    </motion.div>
                  </motion.button>
                  {/* Magic glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-indigo-600/10 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </motion.div>
                <motion.p 
                  className="mt-1 text-xs text-neutral-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3 }}
                >
                  ✨ Must be at least 6 characters long
                </motion.p>
              </motion.div>

              {/* Enhanced Confirm Password Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.3 }}
              >
                <motion.label 
                  htmlFor="confirmPassword" 
                  className="block text-sm font-medium text-neutral-200 mb-2"
                  whileHover={{ scale: 1.02 }}
                >
                  Confirm Password 🔒
                </motion.label>
                <motion.div 
                  className="relative group"
                  whileFocus={{ scale: 1.02 }}
                >
                  <motion.div 
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                    animate={{ 
                      color: confirmPassword ? 
                        (password === confirmPassword ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)") : 
                        "rgb(163, 163, 163)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <LockClosedIcon className="h-5 w-5" />
                  </motion.div>
                  <motion.input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`block w-full pl-10 pr-12 py-3 border rounded-lg bg-neutral-800/50 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 backdrop-blur-sm ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-500/50 focus:ring-red-500'
                        : confirmPassword && password === confirmPassword
                        ? 'border-green-500/50 focus:ring-green-500'
                        : 'border-neutral-600 focus:ring-purple-500'
                    }`}
                    placeholder="Confirm your password"
                    whileFocus={{ 
                      scale: 1.02,
                      boxShadow: confirmPassword && password !== confirmPassword
                        ? "0 0 20px rgba(239, 68, 68, 0.3)"
                        : confirmPassword && password === confirmPassword
                        ? "0 0 20px rgba(34, 197, 94, 0.3)"
                        : "0 0 20px rgba(147, 51, 234, 0.3)"
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-200 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ rotate: showConfirmPassword ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <motion.div
                      animate={{ opacity: showConfirmPassword ? 0 : 1 }}
                      className="absolute"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </motion.div>
                    <motion.div
                      animate={{ opacity: showConfirmPassword ? 1 : 0 }}
                      className="absolute"
                    >
                      <EyeSlashIcon className="h-5 w-5" />
                    </motion.div>
                  </motion.button>
                  {/* Magic glow effect */}
                  <div className={`absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none ${
                    confirmPassword && password !== confirmPassword
                      ? 'bg-gradient-to-r from-red-600/10 via-transparent to-red-600/10'
                      : confirmPassword && password === confirmPassword
                      ? 'bg-gradient-to-r from-green-600/10 via-transparent to-green-600/10'
                      : 'bg-gradient-to-r from-purple-600/10 via-transparent to-indigo-600/10'
                  }`}></div>
                </motion.div>
                
                {/* Password match indicator */}
                <AnimatePresence>
                  {confirmPassword && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className={`mt-1 text-xs flex items-center space-x-1 ${
                        password === confirmPassword ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      <span>{password === confirmPassword ? '✓' : '❌'}</span>
                      <span>{password === confirmPassword ? 'Passwords match!' : 'Passwords do not match'}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Legal Agreements */}
              <motion.div
                className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-neutral-600/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.35 }}
              >
                <h3 className="text-lg font-medium text-neutral-200 mb-3">Legal Agreements</h3>
                
                <motion.label 
                  className="flex items-start space-x-3 cursor-pointer group"
                  whileHover={{ scale: 1.01 }}
                >
                  <motion.input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-purple-600 bg-neutral-800 border-neutral-600 rounded focus:ring-purple-500 focus:ring-2"
                    whileFocus={{ scale: 1.1 }}
                  />
                  <span className="text-sm text-neutral-300 leading-relaxed">
                    I agree to the{" "}
                    <Link 
                      href="/terms" 
                      target="_blank"
                      className="text-purple-400 hover:text-purple-300 underline transition-colors duration-200"
                    >
                      Terms of Service
                    </Link>
                    {" "}and understand my rights and obligations.
                  </span>
                </motion.label>

                <motion.label 
                  className="flex items-start space-x-3 cursor-pointer group"
                  whileHover={{ scale: 1.01 }}
                >
                  <motion.input
                    type="checkbox"
                    checked={agreedToPrivacy}
                    onChange={e => setAgreedToPrivacy(e.target.checked)}
                    className="mt-1 w-4 h-4 text-purple-600 bg-neutral-800 border-neutral-600 rounded focus:ring-purple-500 focus:ring-2"
                    whileFocus={{ scale: 1.1 }}
                  />
                  <span className="text-sm text-neutral-300 leading-relaxed">
                    I acknowledge that I have read and agree to the{" "}
                    <Link 
                      href="/privacy" 
                      target="_blank"
                      className="text-purple-400 hover:text-purple-300 underline transition-colors duration-200"
                    >
                      Privacy Policy
                    </Link>
                    {" "}and{" "}
                    <Link 
                      href="/cookies" 
                      target="_blank"
                      className="text-purple-400 hover:text-purple-300 underline transition-colors duration-200"
                    >
                      Cookie Policy
                    </Link>
                    .
                  </span>
                </motion.label>

                <motion.p 
                  className="text-xs text-neutral-400 mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.45 }}
                >
                  ✨ By checking these boxes, you confirm your agreement to our legal terms and data processing practices.
                </motion.p>
              </motion.div>

              {/* Enhanced Register Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.4 }}
              >
                <motion.button
                  type="submit"
                  disabled={loading || !agreedToTerms || !agreedToPrivacy}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-neutral-600 disabled:to-neutral-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none relative overflow-hidden group"
                  whileHover={{ 
                    scale: (loading || !agreedToTerms || !agreedToPrivacy) ? 1 : 1.05,
                    boxShadow: (loading || !agreedToTerms || !agreedToPrivacy) ? "0 10px 25px -5px rgba(0, 0, 0, 0.2)" : "0 20px 40px -10px rgba(147, 51, 234, 0.4)"
                  }}
                  whileTap={{ scale: (loading || !agreedToTerms || !agreedToPrivacy) ? 1 : 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {loading ? (
                    <motion.div 
                      className="flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div 
                        className="rounded-full h-5 w-5 border-b-2 border-white mr-2"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      ></motion.div>
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Creating Account... ✨
                      </motion.span>
                    </motion.div>
                  ) : (
                    <motion.span
                      className="relative z-10"
                      animate={{ 
                        textShadow: [
                          "0 0 0px rgba(255, 255, 255, 0)",
                          "0 0 10px rgba(255, 255, 255, 0.3)",
                          "0 0 0px rgba(255, 255, 255, 0)"
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      🎆 Create Account
                    </motion.span>
                  )}
                  
                  {/* Magic shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                    animate={{
                      x: loading ? 0 : ["-100%", "100%"]
                    }}
                    transition={{
                      duration: loading ? 0 : 1.5,
                      repeat: loading ? 0 : Infinity,
                      repeatDelay: 3,
                      ease: "easeInOut"
                    }}
                  />
                </motion.button>
              </motion.div>
            </motion.form>

            {/* Enhanced Divider */}
            <motion.div 
              className="my-6 flex items-center"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.6, delay: 1.5 }}
            >
              <motion.div 
                className="flex-grow border-t border-neutral-600"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8, delay: 1.6 }}
              ></motion.div>
              <motion.span 
                className="flex-shrink-0 px-4 text-neutral-400 text-sm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.7, type: "spring", stiffness: 300 }}
              >
                ✨ or ✨
              </motion.span>
              <motion.div 
                className="flex-grow border-t border-neutral-600"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8, delay: 1.6 }}
              ></motion.div>
            </motion.div>

            {/* Enhanced Login Link */}
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.8 }}
            >
              <motion.p 
                className="text-neutral-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.9 }}
              >
                Already have an account?{" "}
                <motion.span className="inline-block">
                  <Link 
                    href="/login" 
                    className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-200 hover:underline relative"
                  >
                    <motion.span
                      whileHover={{ 
                        scale: 1.1,
                        textShadow: "0 0 8px rgba(168, 85, 247, 0.6)"
                      }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className="relative z-10"
                    >
                      ✨ Sign in here
                    </motion.span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded -z-10"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ opacity: 1, scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    />
                  </Link>
                </motion.span>
              </motion.p>
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced Back to Landing */}
        <motion.div 
          className="text-center mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 2 }}
        >
          <Link 
            href="/" 
            className="text-neutral-400 hover:text-neutral-200 text-sm transition-colors duration-200 inline-block"
          >
            <motion.span
              whileHover={{ 
                scale: 1.05,
                x: -5,
                color: "rgb(192, 132, 252)"
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex items-center space-x-1"
            >
              <motion.span
                animate={{ x: [-2, 0, -2] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                ←
              </motion.span>
              <span>Back to Homepage</span>
            </motion.span>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}