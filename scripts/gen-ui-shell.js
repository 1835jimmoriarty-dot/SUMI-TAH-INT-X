const { write } = require('./writer');

// 1. globals.css
write('src/app/globals.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0a0a0a;
  --foreground: #f3f4f6;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  overflow-x: hidden;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #0a0a0a;
}
::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fadeIn {
  animation: fadeIn 0.15s ease-out forwards;
}
`);

// 2. Root layout
write('src/app/layout.tsx', `
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUMI-TAH — Automated Threat Hunting & Adversary Intelligence Platform",
  description: "Enterprise SOC & Threat Hunting Platform with Multi-SIEM Workbench, MITRE ATT&CK, IOC Engine, and SOAR Automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-charcoal-950 text-gray-100 min-h-screen antialiased selection:bg-jade-500/30 selection:text-jade-200">
        {children}
      </body>
    </html>
  );
}
`);

// 3. UI Components
write('src/components/ui/button.tsx', `
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'jade';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-charcoal-900 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-jade-500 hover:bg-jade-600 text-charcoal-950 font-semibold focus:ring-jade-500 shadow-sm',
      jade: 'bg-jade-600 hover:bg-jade-500 text-white font-semibold focus:ring-jade-400',
      secondary: 'bg-charcoal-800 hover:bg-charcoal-700 text-gray-200 border border-charcoal-700 focus:ring-charcoal-600',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      outline: 'bg-transparent hover:bg-charcoal-800 text-gray-300 border border-charcoal-700 hover:border-charcoal-600 focus:ring-jade-500',
      ghost: 'bg-transparent hover:bg-charcoal-800 text-gray-300 hover:text-white focus:ring-charcoal-700',
    };

    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs font-mono',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(base, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
`);

write('src/components/ui/badge.tsx', `
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant = 
  | 'critical' | 'high' | 'medium' | 'low'
  | 'malicious' | 'suspicious' | 'benign' | 'unknown' | 'conflicting'
  | 'pending' | 'approved' | 'executed' | 'rejected'
  | 'active' | 'completed' | 'draft'
  | 'jade' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium tracking-wide uppercase border';

  const variants: Record<BadgeVariant, string> = {
    critical: 'bg-red-950/60 text-red-400 border-red-800/60',
    high: 'bg-orange-950/60 text-orange-400 border-orange-800/60',
    medium: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    low: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
    
    malicious: 'bg-red-950/70 text-red-300 border-red-700',
    suspicious: 'bg-amber-950/60 text-amber-300 border-amber-700',
    benign: 'bg-emerald-950/60 text-emerald-400 border-emerald-800',
    unknown: 'bg-charcoal-800 text-gray-400 border-charcoal-700',
    conflicting: 'bg-purple-950/60 text-purple-300 border-purple-800',

    pending: 'bg-amber-950/80 text-amber-300 border-amber-600 animate-pulse',
    approved: 'bg-jade-950/60 text-jade-300 border-jade-600',
    executed: 'bg-emerald-950/70 text-emerald-300 border-emerald-600',
    rejected: 'bg-charcoal-800 text-gray-400 border-charcoal-700 line-through',

    active: 'bg-jade-950/70 text-jade-400 border-jade-700',
    completed: 'bg-charcoal-800 text-gray-300 border-charcoal-600',
    draft: 'bg-charcoal-850 text-gray-400 border-charcoal-700 border-dashed',

    jade: 'bg-jade-950/80 text-jade-400 border-jade-600',
    neutral: 'bg-charcoal-800 text-gray-300 border-charcoal-700',
  };

  return (
    <span className={twMerge(clsx(base, variants[variant], className))} {...props}>
      {children}
    </span>
  );
}
`);

write('src/components/ui/card.tsx', `
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-charcoal-900 border border-charcoal-800 rounded-xl shadow-lg transition-all hover:border-charcoal-700',
          className
        )
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={twMerge(clsx('px-6 py-4 border-b border-charcoal-800/80', className))} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={twMerge(clsx('text-lg font-semibold text-gray-100 tracking-tight', className))} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={twMerge(clsx('text-xs text-gray-400 mt-1', className))} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={twMerge(clsx('p-6', className))} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={twMerge(clsx('px-6 py-3 border-t border-charcoal-800/80 bg-charcoal-950/40 rounded-b-xl', className))} {...props} />;
}
`);

write('src/components/ui/modal.tsx', `
'use client';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export function Modal({ isOpen, onClose, title, description, children, maxWidth = 'lg' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm animate-fadeIn">
      <div className={\`w-full \${maxWClass} bg-charcoal-900 border border-charcoal-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]\`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
            {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-charcoal-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
`);

write('src/components/ui/input.tsx', `
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-medium text-gray-300 mb-1.5">{label}</label>}
        <input
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-jade-500 focus:border-jade-500 transition-colors',
              error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
              className
            )
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
`);

write('src/components/ui/status-indicator.tsx', `
import React from 'react';
import { clsx } from 'clsx';

export interface StatusIndicatorProps {
  status: 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE' | 'NOT_CONFIGURED';
  label?: string;
  pulse?: boolean;
}

export function StatusIndicator({ status, label, pulse = true }: StatusIndicatorProps) {
  const colors = {
    HEALTHY: 'bg-emerald-500 text-emerald-400',
    DEGRADED: 'bg-amber-500 text-amber-400',
    UNREACHABLE: 'bg-red-500 text-red-400',
    NOT_CONFIGURED: 'bg-gray-500 text-gray-400',
  };

  const ringColors = {
    HEALTHY: 'bg-emerald-500/20',
    DEGRADED: 'bg-amber-500/20',
    UNREACHABLE: 'bg-red-500/20',
    NOT_CONFIGURED: 'bg-gray-500/20',
  };

  return (
    <div className="inline-flex items-center space-x-2">
      <span className="relative flex h-2.5 w-2.5">
        {pulse && status === 'HEALTHY' && (
          <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', colors[status].split(' ')[0])} />
        )}
        <span className={clsx('relative inline-flex rounded-full h-2.5 w-2.5', colors[status].split(' ')[0])} />
      </span>
      {label && <span className={clsx('text-xs font-mono font-medium', colors[status].split(' ')[1])}>{label}</span>}
    </div>
  );
}
`);

// 4. Shell Layout Components (Sidebar, Topbar, Demo Banner, Global Search)
write('src/components/shell/demo-banner.tsx', `
'use client';
import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-amber-950/60 border-b border-amber-800/60 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-amber-200">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
        <span>
          <strong className="text-amber-300 font-semibold">DEMO ENVIRONMENT ACTIVE:</strong> Displaying seeded threat intelligence and simulated multi-SIEM telemetry.
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <ShieldCheck className="w-3.5 h-3.5 text-jade-400" />
        <span className="text-gray-400 text-[11px]">Enterprise Security Boundaries Enforced</span>
      </div>
    </div>
  );
}
`);

write('src/components/shell/sidebar.tsx', `
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Compass,
  Crosshair,
  Package,
  Terminal,
  FolderGit2,
  FileCheck,
  Search,
  Grid,
  ShieldHalf,
  BarChart3,
  Users2,
  Bug,
  Flame,
  Zap,
  Cpu,
  FileText,
  History,
  Settings,
  FlameKindling,
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { group: 'THREAT HUNTING', items: [
    { name: 'Overview', href: '/', icon: Crosshair },
    { name: 'Hypotheses', href: '/hypotheses', icon: Compass },
    { name: 'Active Hunts', href: '/hunts', icon: FlameKindling },
    { name: 'Hunt Packages', href: '/hunt-packages', icon: Package },
    { name: 'SIEM Workbench', href: '/queries', icon: Terminal },
  ]},
  { group: 'INVESTIGATION & EVIDENCE', items: [
    { name: 'Cases & Incidents', href: '/cases', icon: FolderGit2 },
    { name: 'Evidence Vault', href: '/evidence', icon: FileCheck },
    { name: 'IOC Intelligence', href: '/iocs', icon: Search },
  ]},
  { group: 'FRAMEWORKS & COVERAGE', items: [
    { name: 'MITRE ATT&CK', href: '/attack', icon: Grid },
    { name: 'MITRE D3FEND', href: '/defend', icon: ShieldHalf },
    { name: 'Detection Coverage', href: '/coverage', icon: BarChart3 },
  ]},
  { group: 'ADVERSARY INTEL', items: [
    { name: 'Threat Actors', href: '/actors', icon: Users2 },
    { name: 'Malware Families', href: '/malware', icon: Bug },
    { name: 'Campaigns', href: '/campaigns', icon: Flame },
  ]},
  { group: 'AUTOMATION & ADMIN', items: [
    { name: 'Torq SOAR', href: '/soar', icon: Zap },
    { name: 'Security Connectors', href: '/integrations', icon: Cpu },
    { name: 'Investigation Reports', href: '/reports', icon: FileText },
    { name: 'Audit Logs', href: '/audit', icon: History },
    { name: 'System Settings', href: '/settings', icon: Settings },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-charcoal-950 border-r border-charcoal-800 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-charcoal-800 bg-charcoal-900/50">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-jade-500/10 border border-jade-500/40 flex items-center justify-center text-jade-400 shadow-inner">
            <ShieldAlert className="w-5 h-5 text-jade-400" />
          </div>
          <div>
            <div className="font-bold tracking-wider text-sm text-gray-100 flex items-center space-x-1.5">
              <span>SUMI-TAH</span>
              <span className="text-[10px] bg-jade-950 text-jade-400 px-1.5 py-0.5 rounded border border-jade-700/60 font-mono">SOC</span>
            </div>
            <p className="text-[10px] text-gray-400 tracking-tight font-mono">Threat Hunting Platform</p>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_ITEMS.map((section, idx) => (
          <div key={idx}>
            <h4 className="px-3 text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold mb-2">
              {section.group}
            </h4>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-jade-950/80 text-jade-300 border border-jade-700/60 shadow-sm'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-charcoal-850 border border-transparent'
                    )}
                  >
                    <Icon className={clsx('w-4 h-4', isActive ? 'text-jade-400' : 'text-gray-400')} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-charcoal-800 bg-charcoal-900/30 text-[11px] font-mono text-gray-400 flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-jade-400 animate-pulse" />
          <span>SOC ENGINE v1.0</span>
        </span>
        <span className="text-gray-400">DEFCON 4</span>
      </div>
    </aside>
  );
}
`);

write('src/components/shell/topbar.tsx', `
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LogOut, User, Activity, Bell } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { GlobalSearchModal } from './global-search-modal';

export function TopBar() {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

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
                AS
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-gray-200">Alex Sterling</div>
                <div className="text-[10px] font-mono text-jade-400">Security Administrator</div>
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

write('src/components/shell/global-search-modal.tsx', `
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Shield, Crosshair, FolderGit2, Hash } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';

export function GlobalSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    matches: any[];
    extractedIndicators: any[];
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/iocs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (url: string) => {
    onClose();
    router.push(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Universal SOC Intelligence Search" maxWidth="2xl">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            autoFocus
            type="text"
            placeholder="Paste IP, Domain, Hash, URL (e.g. hxxps://evil[.]com), CVE, or keyword..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-jade-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 px-3 py-1 bg-jade-500 text-charcoal-950 font-semibold text-xs rounded hover:bg-jade-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {results && (
          <div className="space-y-4 mt-4 max-h-96 overflow-y-auto pr-1">
            {/* Extracted IOCs */}
            {results.extractedIndicators.length > 0 && (
              <div>
                <h5 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                  Detected & Normalized Indicators ({results.extractedIndicators.length})
                </h5>
                <div className="space-y-1.5">
                  {results.extractedIndicators.map((ioc: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => navigateTo(\`/iocs?search=\${encodeURIComponent(ioc.normalizedValue)}\`)}
                      className="p-3 bg-charcoal-950 hover:bg-charcoal-800 border border-charcoal-800 rounded-lg cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <Hash className="w-4 h-4 text-jade-400" />
                        <div>
                          <div className="text-xs font-mono text-gray-200">{ioc.normalizedValue}</div>
                          <div className="text-[10px] text-gray-400 font-mono">Defanged: {ioc.defangedValue}</div>
                        </div>
                      </div>
                      <Badge variant="jade">{ioc.type}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Database Matches */}
            {results.matches && results.matches.length > 0 && (
              <div>
                <h5 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                  Database Matches ({results.matches.length})
                </h5>
                <div className="space-y-1.5">
                  {results.matches.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => navigateTo('/iocs')}
                      className="p-3 bg-charcoal-950 hover:bg-charcoal-800 border border-charcoal-800 rounded-lg cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-mono text-gray-200">{item.value}</div>
                        <div className="text-[10px] text-gray-400">Score: {item.score}/100 • {item.observations?.length || 0} observations</div>
                      </div>
                      <Badge variant={item.reputation.toLowerCase()}>{item.reputation}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.extractedIndicators.length === 0 && (!results.matches || results.matches.length === 0) && (
              <div className="text-center py-8 text-gray-400 text-xs">
                No matching indicators or intelligence entities found.
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
`);