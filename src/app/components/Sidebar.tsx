import Image from 'next/image';
import Link from 'next/link';
import { HomeIcon, CogIcon, BookOpenIcon, DocumentTextIcon, PuzzlePieceIcon, UserIcon } from '@heroicons/react/24/outline';
import logo from '@/assets/images/logo.png';

const Sidebar = () => {
  return (
    <aside className="sticky top-0 h-screen w-64 bg-neutral-900/50 backdrop-blur-md border-r border-neutral-800 text-neutral-100 flex flex-col">
      <div className="flex items-center justify-center py-6 border-b border-neutral-800">
        <Image
          src={logo}
          alt="TicketWizard Logo"
          width={32}
          height={32}
          priority
        />
        <span className="ml-3 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
          TicketWizard
        </span>
      </div>
      
      <nav className="flex-1 px-4 py-6">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2 px-2">Main</p>
          <ul className="space-y-2">
            <li>
              <Link href="/manual-mode" className="flex items-center space-x-3 px-2 py-2 rounded-lg bg-neutral-800/50 text-purple-400">
                <HomeIcon className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link href="#" className="flex items-center space-x-3 px-2 py-2 rounded-lg hover:bg-neutral-800/50 transition-colors">
                <DocumentTextIcon className="h-5 w-5" />
                <span>My Tickets</span>
              </Link>
            </li>
            <li>
              <Link href="#" className="flex items-center space-x-3 px-2 py-2 rounded-lg hover:bg-neutral-800/50 transition-colors">
                <PuzzlePieceIcon className="h-5 w-5" />
                <span>Templates</span>
              </Link>
            </li>
          </ul>
        </div>
        
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2 px-2">Settings</p>
          <ul className="space-y-2">
            <li>
              <Link href="#" className="flex items-center space-x-3 px-2 py-2 rounded-lg hover:bg-neutral-800/50 transition-colors">
                <UserIcon className="h-5 w-5" />
                <span>Profile</span>
              </Link>
            </li>
            <li>
              <Link href="#" className="flex items-center space-x-3 px-2 py-2 rounded-lg hover:bg-neutral-800/50 transition-colors">
                <CogIcon className="h-5 w-5" />
                <span>Settings</span>
              </Link>
            </li>
          </ul>
        </div>
        
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2 px-2">Help</p>
          <ul className="space-y-2">
            <li>
              <Link href="#" className="flex items-center space-x-3 px-2 py-2 rounded-lg hover:bg-neutral-800/50 transition-colors">
                <BookOpenIcon className="h-5 w-5" />
                <span>Documentation</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      
      <div className="p-4 border-t border-neutral-800">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium">
            U
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">User Name</p>
            <p className="text-xs text-neutral-500">Premium Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
