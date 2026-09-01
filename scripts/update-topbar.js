const { write } = require('./writer');

write('src/components/shell/topbar.tsx', `
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LogOut, User, Activity, Bell } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { GlobalSearchModal } from './global-search-modal';

export function TopBar() {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; roles: string[] } | null>(null);
  const [notifCount, setNotifCount] = useState(3);

  useEffect(() => {
    // Fetch current user session
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.user) setUser(d.user);
      })
      .catch(() => {});

    // Ctrl+K / Cmd+K Global Shortcut Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const displayName = user?.name || 'Alex Sterling';
  const roleName = user?.roles?.[0] || 'SECURITY_ADMIN';
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <header className="h-16 bg-charcoal-900/90 backdrop-blur-md border-b border-charcoal-800 flex items-center justify-between px-6 sticky top-0 z-20">
        {/* Global Search Trigger */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center space-x-3 px-3.5 py-1.5 bg-charcoal-950 hover:bg-charcoal-800 border border-charcoal-700 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors w-72 shadow-inner"
          >
            <Search className="w-3.5 h-3.5 text-jade-400" />
            <span className="flex-1 text-left">Search IOCs, Hunts, Cases, ATT&CK...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-charcoal-800 text-gray-400 rounded border border-charcoal-700 font-mono">⌘K</kbd>
          </button>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center space-x-6">
          {/* SIEM Connector Health Indicator */}
          <div className="hidden lg:flex items-center space-x-2.5 bg-charcoal-950 px-3 py-1.5 rounded-lg border border-charcoal-800 text-xs">
            <Activity className="w-3.5 h-3.5 text-jade-400" />
            <StatusIndicator status="HEALTHY" label="CONNECTORS: 4/4 OPERATIONAL" />
          </div>

          {/* User & Session */}
          <div className="flex items-center space-x-4 border-l border-charcoal-800 pl-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-jade-950 border border-jade-600 flex items-center justify-center text-jade-300 font-bold text-xs">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-gray-200">{displayName}</div>
                <div className="text-[10px] font-mono text-jade-400 uppercase">{roleName.replace('_', ' ')}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-charcoal-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
`);