'use client';
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePostSignupSetup } from "@/hooks/usePostSignupSetup";
import { useAuth, ProfileCompletionState } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/images/logo.png";
import { UserIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { authenticatedFetch } from "@/lib/api-client";

export default function CompleteSignupPage() {
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [localError, setLocalError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'create' | 'join' | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const router = useRouter();
  const { user, userProfile, profileState, error: authError, clearError, setupUserProfile } = useAuth();
  const { needsSetup, isSettingUp, completeSetup } = usePostSignupSetup();

  // Combined error state
  const error = localError || authError;

  // Debug logging
  console.log('Complete-signup state:', { 
    user: !!user, 
    userProfile: !!userProfile, 
    profileState, 
    needsSetup, 
    error 
  });

  // Handle redirects based on profile state
  useEffect(() => {
    if (profileState === ProfileCompletionState.EMAIL_UNCONFIRMED) {
      setLocalError('Please confirm your email address before continuing.');
      return;
    }

    if (profileState === ProfileCompletionState.COMPLETE) {
      router.push('/manual-mode');
      return;
    }

    if (!user && profileState !== ProfileCompletionState.LOADING) {
      router.push('/login');
      return;
    }
  }, [user, profileState, router]);

  // Clear errors when user starts typing
  useEffect(() => {
    if (error && (fullName || organizationName)) {
      setLocalError('');
      clearError();
    }
  }, [fullName, organizationName, error, clearError]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    // Validate legal agreements
    if (!agreedToTerms || !agreedToPrivacy) {
      setLocalError("You must agree to our Terms of Service and Privacy Policy to continue.");
      return;
    }

    setIsSubmitting(true);
    setSuccess("Setting up your profile...");

    try {
      const success = await completeSetup(fullName || undefined, organizationName || undefined);
      
      if (success) {
        setSuccess("Profile setup complete! Redirecting to the app...");
        // Router push will be handled by useEffect when profileState changes
      } else {
        // Check if there's a specific error from AuthContext
        if (authError) {
          setLocalError(authError);
        } else {
          setLocalError("Failed to setup profile. Please try again.");
        }
        setSuccess("");
      }
    } catch (error) {
      console.error('Setup error:', error);
      if (authError) {
        setLocalError(authError);
      } else {
        setLocalError("An unexpected error occurred. Please try again.");
      }
      setSuccess("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWithInvite = async () => {
    if (!user || !inviteCode.trim()) return;

    setLocalError("");
    clearError();

    // Validate legal agreements
    if (!agreedToTerms || !agreedToPrivacy) {
      setLocalError("You must agree to our Terms of Service and Privacy Policy to continue.");
      return;
    }

    setIsSubmitting(true);
    setSuccess("Joining organization...");

    try {
      const response = await authenticatedFetch('/api/invitations/join', {
        method: 'POST',
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${data.message}! Setting up your profile...`);
        
        // Complete the profile setup
        const profileSuccess = await completeSetup(fullName || undefined, undefined);
        if (profileSuccess) {
          setSuccess("Successfully joined organization! Redirecting to the app...");
        } else {
          setLocalError("Joined organization but failed to complete profile setup.");
          setSuccess("");
        }
      } else {
        setLocalError(data.error || 'Failed to join organization');
        setSuccess("");
      }
    } catch (error) {
      console.error('Join error:', error);
      setLocalError("Network error occurred. Please try again.");
      setSuccess("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setLocalError("");
    clearError();

    // Validate legal agreements
    if (!agreedToTerms || !agreedToPrivacy) {
      setLocalError("You must agree to our Terms of Service and Privacy Policy to continue.");
      return;
    }

    setIsSubmitting(true);
    setSuccess("Creating minimal profile...");

    try {
      // Create profile with minimal info
      const success = await completeSetup(undefined, undefined);
      
      if (success) {
        setSuccess("Profile created! Redirecting to the app...");
      } else {
        // Check if there's a specific error from AuthContext
        if (authError) {
          setLocalError(authError);
        } else {
          setLocalError("Failed to create profile. Please try the full setup instead.");
        }
        setSuccess("");
      }
    } catch (error) {
      console.error('Skip setup error:', error);
      if (authError) {
        setLocalError(authError);
      } else {
        setLocalError("An unexpected error occurred. Please try again.");
      }
      setSuccess("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading states based on profile state
  if (profileState === ProfileCompletionState.LOADING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            className="rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div className="text-neutral-300">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (profileState === ProfileCompletionState.COMPLETE) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center text-neutral-300">Profile complete, redirecting...</div>
      </div>
    );
  }

  if (profileState === ProfileCompletionState.EMAIL_UNCONFIRMED) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-yellow-400/30 rounded-3xl shadow-2xl shadow-yellow-500/20 p-8 max-w-md text-center">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-yellow-300 mb-4">Verify Your Email</h1>
          <p className="text-neutral-300 mb-6">
            Please check your email and click the verification link before completing your profile setup.
          </p>
          <Link 
            href="/login" 
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

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

        {/* Enhanced floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
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
        {/* Enhanced Setup Card */}
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
                Complete Your Profile ✨
              </motion.h1>
              
              <motion.p 
                className="text-neutral-300 text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                {!selectedMode ? 'Choose how to get started' : 
                 selectedMode === 'create' ? 'Create a new organization' : 
                 'Join an existing organization'}
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

            {/* Setup Content */}
            {!selectedMode ? (
              /* Mode Selection */
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
              >
                <div className="grid gap-4">
                  <motion.button
                    type="button"
                    onClick={() => setSelectedMode('create')}
                    className="p-6 border-2 border-purple-500/30 rounded-xl bg-gradient-to-r from-purple-600/10 to-indigo-600/10 hover:from-purple-600/20 hover:to-indigo-600/20 transition-all duration-300 text-left group"
                    whileHover={{ scale: 1.02, borderColor: "rgba(147, 51, 234, 0.5)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="bg-purple-600 p-3 rounded-full">
                        <BuildingOfficeIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Create New Organization</h3>
                        <p className="text-neutral-300 text-sm">Start fresh with your own organization and invite team members later.</p>
                      </div>
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setSelectedMode('join')}
                    className="p-6 border-2 border-indigo-500/30 rounded-xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 hover:from-indigo-600/20 hover:to-purple-600/20 transition-all duration-300 text-left group"
                    whileHover={{ scale: 1.02, borderColor: "rgba(99, 102, 241, 0.5)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="bg-indigo-600 p-3 rounded-full">
                        <UserIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Join Existing Organization</h3>
                        <p className="text-neutral-300 text-sm">Use an invitation code to join your team's organization.</p>
                      </div>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            ) : selectedMode === 'create' ? (
              /* Create Organization Form */
              <motion.form 
                onSubmit={handleSetup} 
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
              >
              {/* Full Name Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
              >
                <motion.label 
                  htmlFor="fullName" 
                  className="block text-sm font-medium text-neutral-200 mb-2"
                  whileHover={{ scale: 1.02 }}
                >
                  Full Name 👤
                </motion.label>
                <motion.div 
                  className="relative group"
                  whileFocus={{ scale: 1.02 }}
                >
                  <motion.div 
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                    animate={{ 
                      color: fullName ? "rgb(168, 85, 247)" : "rgb(163, 163, 163)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <UserIcon className="h-5 w-5" />
                  </motion.div>
                  <motion.input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-neutral-600 rounded-lg bg-neutral-800/50 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    placeholder="Enter your full name (optional)"
                    whileFocus={{ 
                      scale: 1.02,
                      boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)"
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-indigo-600/10 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </motion.div>
              </motion.div>

              {/* Organization Name Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.2 }}
              >
                <motion.label 
                  htmlFor="organizationName" 
                  className="block text-sm font-medium text-neutral-200 mb-2"
                  whileHover={{ scale: 1.02 }}
                >
                  Organization Name 🏢
                </motion.label>
                <motion.div 
                  className="relative group"
                  whileFocus={{ scale: 1.02 }}
                >
                  <motion.div 
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                    animate={{ 
                      color: organizationName ? "rgb(168, 85, 247)" : "rgb(163, 163, 163)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <BuildingOfficeIcon className="h-5 w-5" />
                  </motion.div>
                  <motion.input
                    id="organizationName"
                    type="text"
                    value={organizationName}
                    onChange={e => setOrganizationName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-neutral-600 rounded-lg bg-neutral-800/50 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    placeholder="Enter organization name (optional)"
                    whileFocus={{ 
                      scale: 1.02,
                      boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)"
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-indigo-600/10 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </motion.div>
                <motion.p 
                  className="mt-1 text-xs text-neutral-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3 }}
                >
                  ✨ If this organization exists, you&apos;ll join it. Otherwise, we&apos;ll create a new one.
                </motion.p>
              </motion.div>

              {/* Legal Agreements */}
              <motion.div
                className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-neutral-600/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.3 }}
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
                  transition={{ delay: 1.4 }}
                >
                  ✨ By checking these boxes, you confirm your agreement to our legal terms and data processing practices.
                </motion.p>
              </motion.div>

              {/* Complete Setup Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.4 }}
              >
                <motion.button
                  type="submit"
                  disabled={isSubmitting || isSettingUp || !agreedToTerms || !agreedToPrivacy}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-neutral-600 disabled:to-neutral-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none relative overflow-hidden group"
                  whileHover={{ 
                    scale: (isSubmitting || isSettingUp || !agreedToTerms || !agreedToPrivacy) ? 1 : 1.05,
                    boxShadow: (isSubmitting || isSettingUp || !agreedToTerms || !agreedToPrivacy) ? "0 10px 25px -5px rgba(0, 0, 0, 0.2)" : "0 20px 40px -10px rgba(147, 51, 234, 0.4)"
                  }}
                  whileTap={{ scale: (isSubmitting || isSettingUp || !agreedToTerms || !agreedToPrivacy) ? 1 : 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {(isSubmitting || isSettingUp) ? (
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
                        Setting up... ✨
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
                      🚀 Complete Setup
                    </motion.span>
                  )}
                  
                  {/* Magic shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                    animate={{
                      x: (isSubmitting || isSettingUp) ? 0 : ["-100%", "100%"]
                    }}
                    transition={{
                      duration: (isSubmitting || isSettingUp) ? 0 : 1.5,
                      repeat: (isSubmitting || isSettingUp) ? 0 : Infinity,
                      repeatDelay: 3,
                      ease: "easeInOut"
                    }}
                  />
                </motion.button>
              </motion.div>
            </motion.form>
            ) : (
              /* Join Organization Form */
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
              >
                {/* Full Name Input */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.1 }}
                >
                  <motion.label 
                    htmlFor="fullName" 
                    className="block text-sm font-medium text-neutral-200 mb-2"
                    whileHover={{ scale: 1.02 }}
                  >
                    Full Name 👤
                  </motion.label>
                  <motion.div 
                    className="relative group"
                    whileFocus={{ scale: 1.02 }}
                  >
                    <motion.div 
                      className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      animate={{ 
                        color: fullName ? "rgb(168, 85, 247)" : "rgb(163, 163, 163)"
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <UserIcon className="h-5 w-5" />
                    </motion.div>
                    <motion.input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-neutral-600 rounded-lg bg-neutral-800/50 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter your full name (optional)"
                      whileFocus={{ 
                        scale: 1.02,
                        boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)"
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-indigo-600/10 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </motion.div>
                </motion.div>

                {/* Invite Code Input */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  <motion.label 
                    htmlFor="inviteCode" 
                    className="block text-sm font-medium text-neutral-200 mb-2"
                    whileHover={{ scale: 1.02 }}
                  >
                    Invitation Code 🎫
                  </motion.label>
                  <motion.div 
                    className="relative group"
                    whileFocus={{ scale: 1.02 }}
                  >
                    <motion.input
                      id="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value.toUpperCase())}
                      className="block w-full px-4 py-3 border border-neutral-600 rounded-lg bg-neutral-800/50 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm font-mono text-center text-lg tracking-widest"
                      placeholder="XXXXXXXX"
                      maxLength={8}
                      whileFocus={{ 
                        scale: 1.02,
                        boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)"
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-transparent to-purple-600/10 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </motion.div>
                  <motion.p 
                    className="mt-1 text-xs text-neutral-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3 }}
                  >
                    ✨ Enter the 8-character code provided by your organization admin
                  </motion.p>
                </motion.div>

                {/* Legal Agreements */}
                <motion.div
                  className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-neutral-600/30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.3 }}
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
                      className="mt-1 w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded focus:ring-indigo-500 focus:ring-2"
                      whileFocus={{ scale: 1.1 }}
                    />
                    <span className="text-sm text-neutral-300 leading-relaxed">
                      I agree to the{" "}
                      <Link 
                        href="/terms" 
                        target="_blank"
                        className="text-indigo-400 hover:text-indigo-300 underline transition-colors duration-200"
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
                      className="mt-1 w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded focus:ring-indigo-500 focus:ring-2"
                      whileFocus={{ scale: 1.1 }}
                    />
                    <span className="text-sm text-neutral-300 leading-relaxed">
                      I acknowledge that I have read and agree to the{" "}
                      <Link 
                        href="/privacy" 
                        target="_blank"
                        className="text-indigo-400 hover:text-indigo-300 underline transition-colors duration-200"
                      >
                        Privacy Policy
                      </Link>
                      {" "}and{" "}
                      <Link 
                        href="/cookies" 
                        target="_blank"
                        className="text-indigo-400 hover:text-indigo-300 underline transition-colors duration-200"
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
                    transition={{ delay: 1.4 }}
                  >
                    ✨ By checking these boxes, you confirm your agreement to our legal terms and data processing practices.
                  </motion.p>
                </motion.div>

                {/* Join Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.4 }}
                >
                  <motion.button
                    type="button"
                    onClick={handleJoinWithInvite}
                    disabled={isSubmitting || isSettingUp || !inviteCode.trim() || !agreedToTerms || !agreedToPrivacy}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-neutral-600 disabled:to-neutral-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none relative overflow-hidden group"
                    whileHover={{ 
                      scale: (isSubmitting || isSettingUp || !inviteCode.trim() || !agreedToTerms || !agreedToPrivacy) ? 1 : 1.05,
                      boxShadow: (isSubmitting || isSettingUp || !inviteCode.trim() || !agreedToTerms || !agreedToPrivacy) ? "0 10px 25px -5px rgba(0, 0, 0, 0.2)" : "0 20px 40px -10px rgba(99, 102, 241, 0.4)"
                    }}
                    whileTap={{ scale: (isSubmitting || isSettingUp || !inviteCode.trim() || !agreedToTerms || !agreedToPrivacy) ? 1 : 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {(isSubmitting || isSettingUp) ? (
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
                          Joining Organization... ✨
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
                        🚀 Join Organization
                      </motion.span>
                    )}
                    
                    {/* Magic shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                      animate={{
                        x: (isSubmitting || isSettingUp) ? 0 : ["-100%", "100%"]
                      }}
                      transition={{
                        duration: (isSubmitting || isSettingUp) ? 0 : 1.5,
                        repeat: (isSubmitting || isSettingUp) ? 0 : Infinity,
                        repeatDelay: 3,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {/* Back Button */}
            {selectedMode && (
              <motion.div
                className="mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.6 }}
              >
                <motion.button
                  type="button"
                  onClick={() => setSelectedMode(null)}
                  className="text-neutral-400 hover:text-neutral-200 text-sm transition-colors duration-200 inline-flex items-center space-x-2"
                  whileHover={{ scale: 1.05, x: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.span
                    animate={{ x: [-2, 0, -2] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    ←
                  </motion.span>
                  <span>Back to choices</span>
                </motion.button>
              </motion.div>
            )}

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

            {/* Skip Setup Link */}
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
                Want to skip for now?{" "}
                <motion.span className="inline-block">
                  <button
                    onClick={handleSkip}
                    disabled={isSubmitting || isSettingUp || !agreedToTerms || !agreedToPrivacy}
                    className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-200 hover:underline relative disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
                  >
                    <motion.span
                      whileHover={{ 
                        scale: (isSubmitting || isSettingUp || !agreedToTerms || !agreedToPrivacy) ? 1 : 1.1,
                        textShadow: (isSubmitting || isSettingUp || !agreedToTerms || !agreedToPrivacy) ? "none" : "0 0 8px rgba(168, 85, 247, 0.6)"
                      }}
                      whileTap={{ scale: (isSubmitting || isSettingUp || !agreedToTerms || !agreedToPrivacy) ? 1 : 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className="relative z-10"
                    >
                      ✨ Continue to app
                    </motion.span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded -z-10"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ opacity: (isSubmitting || isSettingUp || !agreedToTerms || !agreedToPrivacy) ? 0 : 1, scale: (isSubmitting || isSettingUp || !agreedToTerms || !agreedToPrivacy) ? 0.8 : 1.1 }}
                      transition={{ duration: 0.2 }}
                    />
                  </button>
                </motion.span>
              </motion.p>
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced Back to Login */}
        <motion.div 
          className="text-center mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 2 }}
        >
          <Link 
            href="/login" 
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
              <span>Back to Login</span>
            </motion.span>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}