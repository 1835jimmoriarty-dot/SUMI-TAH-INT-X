const { write } = require('./writer');

// 1. Login Page
write('src/app/(auth)/login/page.tsx', `
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@sumitah.local');
  const [password, setPassword] = useState('AdminPassword123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-jade-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-jade-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="mx-auto w-12 h-12 rounded-xl bg-jade-500/10 border border-jade-500/40 flex items-center justify-center text-jade-400 mb-4 shadow-lg">
          <ShieldAlert className="w-7 h-7 text-jade-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-100 font-sans">
          SUMI-TAH <span className="text-jade-400 text-sm font-mono uppercase bg-jade-950 px-2 py-0.5 rounded border border-jade-800">SOC</span>
        </h2>
        <p className="mt-2 text-xs text-gray-400 font-mono">
          Automated Threat Hunting & Adversary Intelligence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-charcoal-900 border border-charcoal-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center space-x-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Input
                label="Analyst Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@sumitah.local"
              />
            </div>

            <div>
              <Input
                label="Passphrase"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full py-2.5" isLoading={loading}>
              Authenticate to SOC Platform
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Seeded Credentials Quick Fill */}
          <div className="mt-6 pt-6 border-t border-charcoal-800">
            <h4 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2 text-center">
              Quick Switch Demo Roles
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@sumitah.local');
                  setPassword('AdminPassword123!');
                }}
                className="px-2.5 py-1.5 bg-charcoal-950 hover:bg-charcoal-800 border border-charcoal-700 rounded text-[11px] font-mono text-gray-300 text-left transition-colors"
              >
                <span className="font-semibold text-jade-400 block">Security Admin</span>
                admin@sumitah.local
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('hunter@sumitah.local');
                  setPassword('HunterPassword123!');
                }}
                className="px-2.5 py-1.5 bg-charcoal-950 hover:bg-charcoal-800 border border-charcoal-700 rounded text-[11px] font-mono text-gray-300 text-left transition-colors"
              >
                <span className="font-semibold text-jade-400 block">Threat Hunter</span>
                hunter@sumitah.local
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`);

// 2. Setup Page
write('src/app/(auth)/setup/page.tsx', `
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SetupPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('Global Security Operations Center');
  const [adminName, setAdminName] = useState('Alex Sterling');
  const [adminEmail, setAdminEmail] = useState('admin@sumitah.local');
  const [adminPassword, setAdminPassword] = useState('AdminPassword123!');
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => setIsInitialized(d.isInitialized))
      .catch(() => setIsInitialized(false));
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');

      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isInitialized === true) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-charcoal-900 border border-charcoal-800 p-8 rounded-2xl text-center">
          <CheckCircle2 className="w-12 h-12 text-jade-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-100">System Already Initialized</h2>
          <p className="text-xs text-gray-400 mt-2 mb-6">
            The SUMI-TAH environment is already configured with administrative credentials.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Proceed to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-charcoal-900 border border-charcoal-800 p-8 rounded-2xl shadow-2xl">
        <div className="flex items-center space-x-3 mb-6 border-b border-charcoal-800 pb-4">
          <ShieldCheck className="w-8 h-8 text-jade-400" />
          <div>
            <h2 className="text-lg font-bold text-gray-100">First-Run Platform Initialization</h2>
            <p className="text-xs text-gray-400">Configure root organization and primary administrator</p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-950/60 border border-red-800 rounded-lg flex items-center space-x-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSetup} className="space-y-4">
          <Input
            label="Organization / Company Name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
          <Input
            label="Security Administrator Name"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            required
          />
          <Input
            label="Admin Email"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
          />
          <Input
            label="Initial Master Password"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" className="w-full mt-4" isLoading={loading}>
            Initialize SUMI-TAH Platform
          </Button>
        </form>
      </div>
    </div>
  );
}
`);

// 3. Dashboard Shell Layout
write('src/app/(dashboard)/layout.tsx', `
import React from 'react';
import { Sidebar } from '@/components/shell/sidebar';
import { TopBar } from '@/components/shell/topbar';
import { DemoBanner } from '@/components/shell/demo-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-charcoal-950 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <DemoBanner />
        <TopBar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
`);

// 4. Executive & SOC Overview Dashboard Page
write('src/app/(dashboard)/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Crosshair,
  Compass,
  FolderGit2,
  Search,
  Grid,
  Zap,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Shield,
  Activity,
  Cpu
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeHunts: 3,
    openCases: 2,
    totalIOCs: 18,
    coveragePercent: 46,
    pendingSOAR: 1,
    siemStatus: 'HEALTHY' as const,
  });

  const [recentHunts, setRecentHunts] = useState<any[]>([]);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [recentIOCs, setRecentIOCs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/hunts')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setRecentHunts(d.slice(0, 4)))
      .catch(() => {});

    fetch('/api/cases')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setRecentCases(d.slice(0, 3)))
      .catch(() => {});

    fetch('/api/iocs')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setRecentIOCs(d.slice(0, 5)))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <span>Threat Hunting & Intelligence Posture</span>
            <Badge variant="jade">LIVE SOC</Badge>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Real-time adversary detection telemetry across multi-SIEM environments & enterprise endpoints.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/queries">
            <Button variant="secondary" size="sm">
              <Cpu className="w-3.5 h-3.5 mr-1.5 text-jade-400" />
              SIEM Workbench
            </Button>
          </Link>
          <Link href="/hunts">
            <Button variant="primary" size="sm">
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              Launch New Hunt
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-jade-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400 uppercase">Active Hunts</span>
              <Compass className="w-4 h-4 text-jade-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-gray-100 mt-2">{stats.activeHunts}</div>
            <p className="text-[11px] text-jade-400 mt-1 font-mono">1 completed today</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400 uppercase">Open Incidents</span>
              <FolderGit2 className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-gray-100 mt-2">{stats.openCases}</div>
            <p className="text-[11px] text-red-400 mt-1 font-mono">1 Critical (P1) Active</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400 uppercase">SOAR Approvals</span>
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="text-2xl font-bold font-mono text-gray-100 mt-2">{stats.pendingSOAR}</div>
            <p className="text-[11px] text-amber-400 mt-1 font-mono">Host Isolation Pending</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400 uppercase">ATT&CK Coverage</span>
              <Grid className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-gray-100 mt-2">{stats.coveragePercent}%</div>
            <p className="text-[11px] text-blue-400 mt-1 font-mono">24 mapped techniques</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400 uppercase">Tracked IOCs</span>
              <Search className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-gray-100 mt-2">{stats.totalIOCs}</div>
            <p className="text-[11px] text-purple-400 mt-1 font-mono">15 indicator types</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Active Hunts & Threat Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Hunts Column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active & Priority Threat Hunts</CardTitle>
                <CardDescription>Structured hypothesis-driven investigations across the fleet</CardDescription>
              </div>
              <Link href="/hunts" className="text-xs text-jade-400 hover:text-jade-300 flex items-center font-mono">
                View All Hunts <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-charcoal-800">
                {recentHunts.map((hunt) => (
                  <div key={hunt.id} className="p-4 hover:bg-charcoal-850/50 transition-colors flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Link href={\`/hunts\`}>
                          <h4 className="text-sm font-semibold text-gray-200 hover:text-jade-400 transition-colors">{hunt.title}</h4>
                        </Link>
                        <Badge variant={hunt.stage === 'ACTIVE' ? 'active' : 'completed'}>{hunt.stage}</Badge>
                        {hunt.verdict && <Badge variant="malicious">{hunt.verdict}</Badge>}
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1">{hunt.description || hunt.conclusion}</p>
                      <div className="text-[11px] text-gray-400 font-mono">
                        Lead: {hunt.lead?.name || 'Morgan Vance'} • {hunt.findings?.length || 0} Findings recorded
                      </div>
                    </div>
                    <Link href="/queries">
                      <Button variant="outline" size="sm">Execute Queries</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Incident Cases */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Incident Investigations</CardTitle>
                <CardDescription>Escalated cases requiring containment and forensic response</CardDescription>
              </div>
              <Link href="/cases" className="text-xs text-jade-400 hover:text-jade-300 flex items-center font-mono">
                View Cases <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-charcoal-800">
                {recentCases.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-charcoal-850/50 transition-colors flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-semibold text-gray-200">{c.title}</h4>
                        <Badge variant={c.severity === 'CRITICAL' ? 'critical' : 'high'}>{c.severity}</Badge>
                        <Badge variant="neutral">{c.priority}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{c.description}</p>
                    </div>
                    <Link href="/cases">
                      <Button variant="secondary" size="sm">Investigate</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: High Risk IOCs & SIEM Connector Health */}
        <div className="space-y-6">
          {/* Connector Health Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center space-x-2">
                <Activity className="w-4 h-4 text-jade-400" />
                <span>Multi-SIEM Telemetry Connectors</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="p-3 bg-charcoal-950 rounded-lg border border-charcoal-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-200">CrowdStrike Falcon (EDR)</div>
                  <div className="text-[10px] text-gray-400 font-mono">OAuth2 REST API • 78ms</div>
                </div>
                <StatusIndicator status="HEALTHY" />
              </div>
              <div className="p-3 bg-charcoal-950 rounded-lg border border-charcoal-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-200">Falcon LogScale (LQL)</div>
                  <div className="text-[10px] text-gray-400 font-mono">Humio Repository • 45ms</div>
                </div>
                <StatusIndicator status="HEALTHY" />
              </div>
              <div className="p-3 bg-charcoal-950 rounded-lg border border-charcoal-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-200">Microsoft Sentinel (KQL)</div>
                  <div className="text-[10px] text-gray-400 font-mono">Log Analytics • 62ms</div>
                </div>
                <StatusIndicator status="HEALTHY" />
              </div>
              <div className="p-3 bg-charcoal-950 rounded-lg border border-charcoal-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-200">Splunk Enterprise (SPL)</div>
                  <div className="text-[10px] text-gray-400 font-mono">HEC / REST • 54ms</div>
                </div>
                <StatusIndicator status="HEALTHY" />
              </div>
            </CardContent>
          </Card>

          {/* High-Risk Indicators Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">High-Risk Indicators (IOCs)</CardTitle>
                <CardDescription>Recent malicious detections</CardDescription>
              </div>
              <Link href="/iocs" className="text-xs text-jade-400 hover:text-jade-300 font-mono">
                All IOCs →
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {recentIOCs.map((ioc) => (
                <div key={ioc.id} className="p-2.5 bg-charcoal-950 rounded-lg border border-charcoal-800 flex items-center justify-between">
                  <div className="overflow-hidden mr-2">
                    <div className="text-xs font-mono text-gray-200 truncate">{ioc.defangedVal}</div>
                    <div className="text-[10px] font-mono text-gray-400">{ioc.type} • Score {ioc.score}/100</div>
                  </div>
                  <Badge variant={ioc.reputation === 'MALICIOUS' ? 'malicious' : 'high'}>{ioc.reputation}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
`);