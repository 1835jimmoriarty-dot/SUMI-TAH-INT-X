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