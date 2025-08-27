import { useEffect, useState } from 'react';
import { useAuth, ProfileCompletionState } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export const usePostSignupSetup = () => {
  const { user, userProfile, setupUserProfile, loading, profileState } = useAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null); // null = undetermined
  const [isSettingUp, setIsSettingUp] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('usePostSignupSetup effect:', { 
      loading, 
      user: !!user, 
      userProfile: !!userProfile, 
      profileState 
    });
    
    // Use profileState to determine setup needs
    if (!loading) {
      if (profileState === ProfileCompletionState.PROFILE_INCOMPLETE || 
          profileState === ProfileCompletionState.ORGANIZATION_PENDING) {
        setNeedsSetup(true);
      } else if (profileState === ProfileCompletionState.COMPLETE) {
        setNeedsSetup(false);
      } else if (profileState === ProfileCompletionState.EMAIL_UNCONFIRMED) {
        setNeedsSetup(false); // Will be handled by complete-signup page
      } else {
        setNeedsSetup(false);
      }
    }
  }, [user, userProfile, loading, profileState]);

  const completeSetup = async (fullName?: string, organizationName?: string) => {
    if (!user) return false;

    setIsSettingUp(true);
    try {
      const success = await setupUserProfile(fullName, organizationName);
      if (success) {
        setNeedsSetup(false);
        // Redirect to main app
        router.push('/manual-mode');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error during setup:', error);
      return false;
    } finally {
      setIsSettingUp(false);
    }
  };

  return {
    needsSetup,
    isSettingUp,
    completeSetup,
    user,
    userProfile
  };
};