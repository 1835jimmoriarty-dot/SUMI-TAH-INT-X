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
                        <Link href={`/hunts`}>
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