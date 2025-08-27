"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  CogIcon, 
  DocumentTextIcon, 
  PuzzlePieceIcon, 
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import logo from '@/assets/images/logo.png';
import { useAuth } from '@/context/AuthContext';

const CollapsibleSidebar = () => {
  // On mobile, start collapsed by default
  const [collapsed, setCollapsed] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const { user, userRole, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Helper function to determine if a link is active
  const isActiveLink = (href: string) => {
    return pathname === href;
  };

  // Helper function to get link classes
  const getLinkClasses = (href: string) => {
    const baseClasses = `flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-2 py-2 rounded-lg transition-all duration-200 group relative overflow-hidden`;
    const activeClasses = 'bg-neutral-800/50 text-purple-400';
    const inactiveClasses = 'hover:bg-neutral-800/50';
    
    return `${baseClasses} ${isActiveLink(href) ? activeClasses : inactiveClasses}`;
  };
  
  // Create a ripple effect when clicking on navigation items
  const createRipple = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const link = event.currentTarget;
    
    const ripple = document.createElement('span');
    const rect = link.getBoundingClientRect();
    
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    ripple.className = 'absolute rounded-full bg-white/20 pointer-events-none';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple-effect 0.6s linear';
    
    link.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Auto-collapse on small screens
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial check
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <aside 
      className={`sticky top-0 h-screen ${collapsed ? 'w-16' : 'w-64'} bg-neutral-900/50 backdrop-blur-md border-r border-neutral-800 text-neutral-100 flex flex-col transition-all duration-300 ease-in-out z-20`}
    >
      {/* Toggle button */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-purple-600 hover:bg-purple-700 rounded-full p-1 shadow-lg shadow-purple-900/50 z-10 transition-all duration-200 hover:scale-110"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRightIcon className="h-4 w-4 text-white" />
        ) : (
          <ChevronLeftIcon className="h-4 w-4 text-white" />
        )}
      </button>

      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-center'} py-6 border-b border-neutral-800`}>
        <Image
          src={logo}
          alt="TicketWizard Logo"
          width={32}
          height={32}
          priority
          className="transition-transform duration-200 hover:scale-110"
        />
        {!collapsed && (
          <span className="ml-3 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            TicketWizard
          </span>
        )}
      </div>
      
      <nav className="flex-1 px-2 py-6">
        <div className="mb-6">
          {!collapsed && <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2 px-2">Main</p>}
          <ul className="space-y-2">
            <li>
              <Link
                href="/guided-mode"
                className={getLinkClasses('/guided-mode')}
                title="Guided Mode"
                onClick={createRipple}
              >
                <HomeIcon className={`${collapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isActiveLink('/guided-mode') ? 'text-purple-400' : 'group-hover:text-purple-300'}`} />
                {!collapsed && <span>Guided Mode</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/manual-mode"
                className={getLinkClasses('/manual-mode')}
                title="Manual Mode"
                onClick={createRipple}
              >
                <DocumentTextIcon className={`${collapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isActiveLink('/manual-mode') ? 'text-purple-400' : 'group-hover:text-purple-300'}`} />
                {!collapsed && <span>Manual Mode</span>}
              </Link>
            </li>
            <li>
              <Link 
                href="/project-context" 
                className={getLinkClasses('/project-context')}
                title="Project Context"
                onClick={createRipple}
              >
                <UserGroupIcon className={`${collapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isActiveLink('/project-context') ? 'text-purple-400' : 'group-hover:text-purple-300'}`} />
                {!collapsed && <span>Project Context</span>}
              </Link>
            </li>
            <li>
              <Link 
                href="/templates" 
                className={getLinkClasses('/templates')}
                title="Templates"
                onClick={createRipple}
              >
                <PuzzlePieceIcon className={`${collapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isActiveLink('/templates') ? 'text-purple-400' : 'group-hover:text-purple-300'}`} />
                {!collapsed && <span>Templates</span>}
              </Link>
            </li>
            <li>
              <Link 
                href="/usage" 
                className={getLinkClasses('/usage')}
                title="Usage Analytics"
                onClick={createRipple}
              >
                <ChartBarIcon className={`${collapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isActiveLink('/usage') ? 'text-purple-400' : 'group-hover:text-purple-300'}`} />
                {!collapsed && <span>Usage</span>}
              </Link>
            </li>
          </ul>
        </div>
        
        <div className="mb-6">
          {!collapsed && <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2 px-2">Settings</p>}
          <ul className="space-y-2">
            <li>
              <button 
                onClick={handleLogout}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-2 py-2 rounded-lg hover:bg-red-800/30 hover:text-red-300 transition-all duration-200 group relative overflow-hidden`}
                title="Sign Out"
              >
                <ArrowRightOnRectangleIcon className={`${collapsed ? 'h-6 w-6' : 'h-5 w-5'} group-hover:text-red-300`} />
                {!collapsed && <span>Sign Out</span>}
              </button>
            </li>
            <li>
              <Link 
                href="/settings" 
                className={getLinkClasses('/settings')}
                title="Settings"
                onClick={createRipple}
              >
                <CogIcon className={`${collapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isActiveLink('/settings') ? 'text-purple-400' : 'group-hover:text-purple-300'}`} />
                {!collapsed && <span>Settings</span>}
              </Link>
            </li>
            {userRole.isTeamAdmin && (
              <li>
                <Link 
                  href="/team-admin" 
                  className={getLinkClasses('/team-admin')}
                  title="Team Administration"
                  onClick={createRipple}
                >
                  <ShieldCheckIcon className={`${collapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isActiveLink('/team-admin') ? 'text-purple-400' : 'group-hover:text-purple-300'}`} />
                  {!collapsed && <span>Team Admin</span>}
                </Link>
              </li>
            )}
            {userRole.isOrgAdmin && (
              <li>
                <Link 
                  href="/org-admin" 
                  className={getLinkClasses('/org-admin')}
                  title="Organization Administration"
                  onClick={createRipple}
                >
                  <BuildingOfficeIcon className={`${collapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isActiveLink('/org-admin') ? 'text-purple-400' : 'group-hover:text-purple-300'}`} />
                  {!collapsed && <span>Org Admin</span>}
                </Link>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* User Info Section */}
      {!collapsed && user && (
        <div className="px-4 py-3 border-t border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.email}
              </p>
              <p className="text-xs text-neutral-400">
                Signed in
              </p>
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="mt-auto p-4 border-t border-neutral-800">
          <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-lg p-3 text-sm">
            <p className="text-purple-300 mb-2 font-medium">✨ Magical Tip</p>
            <p className="text-neutral-400 text-xs">The AI learns and improves your tickets with each refinement. Let the magic work for you!</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default CollapsibleSidebar;
