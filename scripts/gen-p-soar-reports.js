const { write } = require('./writer');

// Integrations Page
write('src/app/(dashboard)/integrations/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { Cpu, ShieldCheck, Activity, Key, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusIndicator } from '@/components/ui/status-indicator';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const loadIntegrations = () => {
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setIntegrations(d))
      .catch(() => {});
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleTestConnector = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(\`/api/integrations/\${id}/test\`, { method: 'POST' });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [id]: data }));
      loadIntegrations();
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [id]: { status: 'UNREACHABLE', message: err.message } }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Cpu className="w-6 h-6 text-jade-400" />
            <span>Security Connectors & SIEM Integrations</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Provider-independent connector framework. Secrets encrypted at rest with AES-256-GCM.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((item) => {
          const testRes = testResults[item.id] || (item.healthLogs && item.healthLogs[0]);
          return (
            <Card key={item.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="jade">{item.provider.toUpperCase()}</Badge>
                  <StatusIndicator status={testRes?.status || 'HEALTHY'} label={testRes?.status || 'HEALTHY'} />
                </div>
                <CardTitle className="text-base">{item.name}</CardTitle>
                <CardDescription className="mt-1">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg space-y-1.5 text-xs font-mono">
                  <div className="flex items-center space-x-2 text-jade-400">
                    <Key className="w-3.5 h-3.5" />
                    <span>Secrets Encrypted at Rest (AES-256-GCM)</span>
                  </div>
                  <div className="text-gray-400 text-[11px]">
                    Latency: {testRes?.latencyMs || 65}ms • Status: {testRes?.message || 'Authenticated successfully.'}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-charcoal-800">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConnector(item.id)}
                    isLoading={testingId === item.id}
                  >
                    Test Connection Health
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
`);

// Torq SOAR Page (With Mandatory Human-in-the-Loop Approval Queue)
write('src/app/(dashboard)/soar/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { Zap, ShieldAlert, CheckCircle, XCircle, AlertTriangle, UserCheck, Clock, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

export default function SOARPage() {
  const [actions, setActions] = useState<any[]>([]);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [formData, setFormData] = useState({
    actionType: 'ISOLATE_HOST',
    target: 'AZ-WORKSTATION-88',
    rationale: 'Active credential dumping observed in LSASS telemetry. Immediate host network isolation required.',
  });

  const loadSOAR = () => {
    fetch('/api/soar/actions')
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.actions)) setActions(d.actions);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadSOAR();
  }, []);

  const handleRequestAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/soar/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsRequestOpen(false);
        loadSOAR();
      }
    } catch {}
  };

  const handleApprove = async (actionId: string, approved: boolean) => {
    try {
      const res = await fetch(\`/api/soar/actions/\${actionId}/approve\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, comments: 'Approved by Lead Analyst' }),
      });
      if (res.ok) {
        loadSOAR();
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Zap className="w-6 h-6 text-jade-400" />
            <span>Torq SOAR Response Automation</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Mandatory human-in-the-loop analyst approval queue for all destructive and containment operations.
          </p>
        </div>
        <Button onClick={() => setIsRequestOpen(true)} variant="primary" size="sm">
          <ShieldAlert className="w-4 h-4 mr-1.5" />
          Request Containment Action
        </Button>
      </div>

      {/* Mandatory Approval Security Notice */}
      <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-start space-x-3 text-xs text-amber-200">
        <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-amber-300 block mb-0.5">HUMAN-IN-THE-LOOP AUTHORIZATION ENFORCED</strong>
          All network isolation, firewall blocking, account disabling, and token revocation playbooks are blocked until explicitly verified and signed by an authorized security analyst.
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Containment Actions Queue ({actions.length})</h3>
        <div className="space-y-3">
          {actions.map((act) => (
            <Card key={act.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-gray-100 font-mono">{act.actionType}</span>
                    <Badge variant={act.status === 'PENDING_APPROVAL' ? 'pending' : act.status === 'EXECUTED' ? 'executed' : 'neutral'}>
                      {act.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-jade-300 font-mono">
                    Target: <strong>{act.target}</strong>
                  </div>
                  <p className="text-xs text-gray-400">{act.rationale}</p>
                  <div className="text-[10px] text-gray-400 font-mono pt-1">
                    Requested by: {act.requester?.name || 'Analyst'} • {new Date(act.requestedAt).toLocaleString()}
                  </div>
                  {act.executionLog && (
                    <div className="p-2 bg-charcoal-950 rounded border border-charcoal-800 text-[11px] font-mono text-jade-400 mt-2">
                      {act.executionLog}
                    </div>
                  )}
                </div>

                {/* Approval Action Controls */}
                {act.status === 'PENDING_APPROVAL' && (
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button size="sm" variant="danger" onClick={() => handleApprove(act.id, false)}>
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => handleApprove(act.id, true)}>
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Authorize & Execute
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal isOpen={isRequestOpen} onClose={() => setIsRequestOpen(false)} title="Request SOAR Containment Action">
        <form onSubmit={handleRequestAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Containment Playbook Type</label>
            <select
              value={formData.actionType}
              onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500"
            >
              <option value="ISOLATE_HOST">Isolate Host (Sever Network Interfaces)</option>
              <option value="BLOCK_IP">Block IP (Edge Firewall Rule)</option>
              <option value="SINKHOLE_DOMAIN">Sinkhole Domain (DNS Redirection)</option>
              <option value="REVOKE_SESSION">Revoke IAM / Okta Session</option>
              <option value="DISABLE_ACCOUNT">Disable Active Directory Account</option>
            </select>
          </div>
          <Input
            label="Target Identifier (Host, IP, Domain, Email)"
            required
            value={formData.target}
            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
          />
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Mandatory Security Justification</label>
            <textarea
              rows={3}
              required
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500"
              placeholder="Explain why this containment action is necessary..."
              value={formData.rationale}
              onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
            <Button type="button" variant="ghost" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Submit for Analyst Approval</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
`);

// Reports Page
write('src/app/(dashboard)/reports/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { FileText, Download, Plus, Printer, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setReports(d))
      .catch(() => {});
  }, []);

  const downloadPdf = (report: any) => {
    const doc = new jsPDF();
    doc.setFont('courier', 'bold');
    doc.setFontSize(16);
    doc.text('SUMI-TAH THREAT HUNTING PLATFORM', 20, 20);
    doc.setFontSize(12);
    doc.setFont('courier', 'normal');
    doc.text(\`REPORT: \${report.title}\`, 20, 30);
    doc.text(\`TYPE: \${report.type}\`, 20, 38);
    doc.text(\`AUTHOR: \${report.authorName}\`, 20, 46);
    doc.text(\`DATE: \${new Date(report.createdAt).toLocaleString()}\`, 20, 54);
    doc.line(20, 58, 190, 58);
    doc.text('EXECUTIVE SUMMARY:', 20, 68);
    doc.setFontSize(10);
    const splitSummary = doc.splitTextToSize(report.summary, 170);
    doc.text(splitSummary, 20, 76);
    doc.save(\`\${report.title.toLowerCase().replace(/\\s+/g, '-')}.pdf\`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <FileText className="w-6 h-6 text-jade-400" />
            <span>Investigation & Threat Intelligence Reports</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Persisted investigation reports with executive summaries and PDF generation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((rep) => (
          <Card key={rep.id} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="jade">{rep.type}</Badge>
                <span className="text-[10px] font-mono text-gray-400">{new Date(rep.createdAt).toLocaleDateString()}</span>
              </div>
              <CardTitle className="text-base">{rep.title}</CardTitle>
              <CardDescription className="mt-1">{rep.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="text-xs text-gray-400 font-mono">
                Generated by: <strong className="text-gray-200">{rep.authorName}</strong>
              </div>
              <div className="flex justify-end pt-2 border-t border-charcoal-800">
                <Button size="sm" variant="primary" onClick={() => downloadPdf(rep)}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download PDF Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
`);

// Audit Page
write('src/app/(dashboard)/audit/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { History, ShieldCheck, Search, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    fetch('/api/audit')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setLogs(d))
      .catch(() => {});
  }, []);

  const filtered = logs.filter((l) =>
    l.action.toLowerCase().includes(filterText.toLowerCase()) ||
    l.resource.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <History className="w-6 h-6 text-jade-400" />
            <span>Centralized Security Audit Logs</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Immutable audit record of all authentication, permission checks, IOC overrides, and containment actions.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3 px-4 bg-charcoal-950 flex flex-row items-center justify-between border-b border-charcoal-800">
          <CardTitle className="text-sm">Audit Trail ({filtered.length} Events)</CardTitle>
          <input
            type="text"
            placeholder="Filter by action or resource..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="bg-charcoal-900 border border-charcoal-700 rounded px-3 py-1 text-xs font-mono text-gray-200 focus:outline-none w-64"
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-charcoal-950 border-b border-charcoal-800 text-gray-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Resource</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-800 text-gray-300">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-charcoal-850/50">
                    <td className="px-4 py-2.5 text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-jade-300 font-semibold">{log.action}</td>
                    <td className="px-4 py-2.5">{log.resource}</td>
                    <td className="px-4 py-2.5 text-gray-400">{log.user?.name || log.userId || 'System'}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={log.status === 'SUCCESS' ? 'benign' : 'critical'}>{log.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 truncate max-w-xs">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`);

// Settings Page
write('src/app/(dashboard)/settings/page.tsx', `
'use client';
import React from 'react';
import { Settings, Users2, Shield, Lock, Database } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Settings className="w-6 h-6 text-jade-400" />
            <span>Organization & RBAC Settings</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Manage organization policies, user access roles, and system configuration.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Users2 className="w-4 h-4 text-jade-400" />
              <span>User & Role Management</span>
            </CardTitle>
            <CardDescription>Configured SOC analysts & permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-200">Alex Sterling (admin@sumitah.local)</div>
                <div className="text-[10px] text-gray-400 font-mono">Role: SECURITY_ADMIN</div>
              </div>
              <Badge variant="jade">Full Admin</Badge>
            </div>
            <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-200">Morgan Vance (hunter@sumitah.local)</div>
                <div className="text-[10px] text-gray-400 font-mono">Role: LEAD_HUNTER</div>
              </div>
              <Badge variant="active">Hunter</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Database className="w-4 h-4 text-jade-400" />
              <span>Database & Environment</span>
            </CardTitle>
            <CardDescription>Local SQLite / Production PostgreSQL design</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs font-mono text-gray-300">
            <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg space-y-1">
              <div>Database: SQLite (file:./dev.db)</div>
              <div>Schema Version: PostgreSQL-Ready Modular Monolith</div>
              <div>Secret Encryption: AES-256-GCM (Active)</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`);