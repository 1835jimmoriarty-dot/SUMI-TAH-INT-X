const { write } = require('./writer');

// Hunts Page
write('src/app/(dashboard)/hunts/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FlameKindling, Plus, Terminal, AlertTriangle, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

export default function HuntsPage() {
  const [hunts, setHunts] = useState<any[]>([]);
  const [selectedHunt, setSelectedHunt] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFindingOpen, setIsFindingOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    telemetryReq: 'Windows Event Log 4769, Sysmon Event 1',
    stage: 'PLANNING',
  });

  const [findingData, setFindingData] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    rawEvent: '',
  });

  const loadHunts = () => {
    fetch('/api/hunts')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setHunts(d);
          if (!selectedHunt && d.length > 0) setSelectedHunt(d[0]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadHunts();
  }, []);

  const handleCreateHunt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hunts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsCreateOpen(false);
        loadHunts();
      }
    } catch {}
  };

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHunt) return;
    try {
      const res = await fetch(\`/api/hunts/\${selectedHunt.id}/findings\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(findingData),
      });
      if (res.ok) {
        setIsFindingOpen(false);
        setFindingData({ title: '', description: '', severity: 'HIGH', rawEvent: '' });
        loadHunts();
      }
    } catch {}
  };

  const handleStageTransition = async (stage: string, verdict?: string) => {
    if (!selectedHunt) return;
    try {
      const res = await fetch(\`/api/hunts/\${selectedHunt.id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, verdict }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedHunt(updated);
        loadHunts();
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <FlameKindling className="w-6 h-6 text-jade-400" />
            <span>Threat Hunt Operations & Workbench</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Execute queries, record forensic findings, attach evidence, and escalate confirmed threats.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Initialize Hunt
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Hunts Pipeline</h3>
          {hunts.map((hunt) => (
            <div
              key={hunt.id}
              onClick={() => setSelectedHunt(hunt)}
              className={\`p-4 rounded-xl border transition-all cursor-pointer \${
                selectedHunt?.id === hunt.id
                  ? 'bg-charcoal-900 border-jade-500 shadow-md ring-1 ring-jade-500/20'
                  : 'bg-charcoal-950 border-charcoal-800 hover:border-charcoal-700'
              }\`}
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant={hunt.stage === 'ACTIVE' ? 'active' : 'completed'}>{hunt.stage}</Badge>
                {hunt.verdict && <Badge variant="malicious">{hunt.verdict}</Badge>}
              </div>
              <h4 className="text-sm font-semibold text-gray-200">{hunt.title}</h4>
              <p className="text-xs text-gray-400 line-clamp-1 mt-1">{hunt.description || hunt.conclusion}</p>
              <div className="mt-3 pt-2 border-t border-charcoal-800 flex items-center justify-between text-[11px] text-gray-400 font-mono">
                <span>Findings: {hunt.findings?.length || 0}</span>
                <span>Lead: {hunt.lead?.name || 'Morgan Vance'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedHunt ? (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge variant="jade">HUNT ID: {selectedHunt.id.slice(0, 8)}</Badge>
                    <Badge variant={selectedHunt.stage === 'ACTIVE' ? 'active' : 'neutral'}>{selectedHunt.stage}</Badge>
                    {selectedHunt.verdict && <Badge variant="malicious">{selectedHunt.verdict}</Badge>}
                  </div>
                  <CardTitle className="text-xl">{selectedHunt.title}</CardTitle>
                  <CardDescription className="mt-1">{selectedHunt.description || 'Enterprise threat hunting sweep.'}</CardDescription>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedHunt.stage === 'PLANNING' && (
                    <Button size="sm" variant="primary" onClick={() => handleStageTransition('ACTIVE')}>
                      Activate Hunt
                    </Button>
                  )}
                  {selectedHunt.stage === 'ACTIVE' && (
                    <Button size="sm" variant="secondary" onClick={() => handleStageTransition('COMPLETED', 'THREAT_CONFIRMED')}>
                      Complete (Threat Confirmed)
                    </Button>
                  )}
                  <Link href="/queries">
                    <Button size="sm" variant="outline">
                      <Terminal className="w-3.5 h-3.5 mr-1.5 text-jade-400" />
                      Run Queries
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">Expected Telemetry Sources</span>
                  <p className="text-xs text-gray-200 font-mono">{selectedHunt.telemetryReq || 'Sysmon, Windows Security Logs'}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Recorded Hunt Findings ({selectedHunt.findings?.length || 0})</span>
                    </h4>
                    <Button size="sm" variant="outline" onClick={() => setIsFindingOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Record Finding
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {selectedHunt.findings && selectedHunt.findings.length > 0 ? (
                      selectedHunt.findings.map((finding: any) => (
                        <div key={finding.id} className="p-4 bg-charcoal-950 border border-charcoal-800 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold text-gray-100">{finding.title}</h5>
                            <Badge variant={finding.severity === 'CRITICAL' ? 'critical' : 'high'}>{finding.severity}</Badge>
                          </div>
                          <p className="text-xs text-gray-300">{finding.description}</p>
                          {finding.rawEvent && (
                            <pre className="p-2.5 bg-charcoal-900 border border-charcoal-800 rounded text-[11px] font-mono text-jade-300 overflow-x-auto">
                              {finding.rawEvent}
                            </pre>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-gray-400 bg-charcoal-950 border border-charcoal-800 rounded-lg">
                        No findings recorded yet. Execute queries to identify suspicious events.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center text-gray-400 border border-charcoal-800 rounded-xl bg-charcoal-900">
              Select a hunt from the pipeline to review workbench findings.
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isFindingOpen} onClose={() => setIsFindingOpen(false)} title="Record Threat Finding">
        <form onSubmit={handleCreateFinding} className="space-y-4">
          <Input
            label="Finding Title"
            required
            placeholder="e.g. Malicious TGS Ticket Request Burst"
            value={findingData.title}
            onChange={(e) => setFindingData({ ...findingData, title: e.target.value })}
          />
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Description & Evidence Context</label>
            <textarea
              rows={3}
              required
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500"
              placeholder="Detail the anomalous behavior observed in telemetry..."
              value={findingData.description}
              onChange={(e) => setFindingData({ ...findingData, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Severity</label>
            <select
              value={findingData.severity}
              onChange={(e) => setFindingData({ ...findingData, severity: e.target.value })}
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500"
            >
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Raw Event Log (JSON or Text)</label>
            <textarea
              rows={3}
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-xs font-mono text-jade-300 placeholder-gray-500 focus:border-jade-500"
              placeholder='{"EventId": 4769, "TargetUserName": "svc_admin"}'
              value={findingData.rawEvent}
              onChange={(e) => setFindingData({ ...findingData, rawEvent: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
            <Button type="button" variant="ghost" onClick={() => setIsFindingOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Record Finding</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Initialize New Threat Hunt">
        <form onSubmit={handleCreateHunt} className="space-y-4">
          <Input
            label="Hunt Title"
            required
            placeholder="e.g. Operation NightWatch: LSASS Dumping Sweep"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Description & Scope</label>
            <textarea
              rows={3}
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500"
              placeholder="Scope of endpoints and domain controllers being analyzed..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <Input
            label="Required Telemetry Types"
            value={formData.telemetryReq}
            onChange={(e) => setFormData({ ...formData, telemetryReq: e.target.value })}
          />
          <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Launch Hunt</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
`);

// Hunt Packages Page
write('src/app/(dashboard)/hunt-packages/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function HuntPackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/hunt-packages')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setPackages(d))
      .catch(() => {});
  }, []);

  const launchHuntFromPackage = async (pkg: any) => {
    try {
      const res = await fetch('/api/hunts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: \`Hunt: \${pkg.title}\`,
          packageId: pkg.id,
          description: pkg.summary,
          telemetryReq: pkg.telemetryReq,
          stage: 'ACTIVE',
        }),
      });
      if (res.ok) {
        router.push('/hunts');
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Package className="w-6 h-6 text-jade-400" />
            <span>Pre-Packaged Threat Hunting Playbooks</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Standardized, battle-tested hunting packages with pre-built SIEM queries and execution guides.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packages.map((pkg) => {
          let tags: string[] = [];
          try { tags = JSON.parse(pkg.attackTags); } catch {}
          return (
            <Card key={pkg.id} className="hover:border-jade-500/40 flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="jade">{pkg.category}</Badge>
                  <span className="text-[11px] font-mono text-gray-400">SIEM: {pkg.targetSIEM}</span>
                </div>
                <CardTitle className="text-base">{pkg.title}</CardTitle>
                <CardDescription className="mt-1">{pkg.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg text-xs space-y-1.5">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">Analyst Playbook Instructions</div>
                  <p className="text-gray-300 font-mono whitespace-pre-line text-xs">{pkg.instructions}</p>
                </div>

                {pkg.defaultQuery && (
                  <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg text-xs font-mono text-jade-300 overflow-x-auto">
                    {pkg.defaultQuery}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-charcoal-800">
                  <div className="flex gap-1.5">
                    {tags.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-jade-950 text-jade-300 border border-jade-800 rounded text-[10px] font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                  <Button variant="primary" size="sm" onClick={() => launchHuntFromPackage(pkg)}>
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Deploy Hunt
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