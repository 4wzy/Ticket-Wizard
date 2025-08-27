"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Check if user has completed signup
        if (!userProfile) {
          // User is authenticated but hasn't completed signup
          router.push('/complete-signup');
        } else {
          // User is authenticated and setup is complete, redirect to guided mode
          router.push('/guided-mode');
        }
      } else {
        // User is not authenticated, redirect to landing page
        router.push('/landing');
      }
    }
  }, [user, userProfile, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return null;
}
