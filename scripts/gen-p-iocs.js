const { write } = require('./writer');

write('src/app/(dashboard)/iocs/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, Upload, Edit3, CheckCircle, AlertTriangle, ShieldCheck, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

export default function IOCsPage() {
  const [iocs, setIocs] = useState<any[]>([]);
  const [selectedIoc, setSelectedIoc] = useState<any | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReputation, setOverrideReputation] = useState('ALLOWLISTED');
  const [filterType, setFilterType] = useState('ALL');

  const loadIOCs = () => {
    fetch('/api/iocs')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setIocs(d);
          if (d.length > 0) {
            setSelectedIoc((prev: any) => d.find((i) => i.id === prev?.id) || d[0]);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadIOCs();
  }, []);

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = importText.split('\\n').map((l) => l.trim()).filter(Boolean);
    const indicators = lines.map((val) => ({ value: val }));

    try {
      const res = await fetch('/api/iocs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicators }),
      });
      if (res.ok) {
        setIsImportOpen(false);
        setImportText('');
        loadIOCs();
      }
    } catch {}
  };

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIoc) return;
    try {
      const res = await fetch(\`/api/iocs/\${selectedIoc.id}/override\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reputation: overrideReputation,
          reason: overrideReason,
        }),
      });
      if (res.ok) {
        setIsOverrideOpen(false);
        setOverrideReason('');
        loadIOCs();
      }
    } catch {}
  };

  const filteredIocs = filterType === 'ALL' ? iocs : iocs.filter((i) => i.type === filterType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Search className="w-6 h-6 text-jade-400" />
            <span>IOC Threat Intelligence Engine</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Parsing, defanging normalization, observation tracking & multi-factor reputation scoring for 15 indicator types.
          </p>
        </div>
        <Button onClick={() => setIsImportOpen(true)} variant="primary" size="sm">
          <Upload className="w-4 h-4 mr-1.5" />
          Bulk Import Indicators
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Filterable IOC List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Indicator Catalog ({filteredIocs.length})</h3>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-charcoal-900 border border-charcoal-700 rounded px-2 py-1 text-[11px] font-mono text-gray-300"
            >
              <option value="ALL">All 15 Types</option>
              <option value="IPV4">IPv4</option>
              <option value="IPV6">IPv6</option>
              <option value="DOMAIN">Domain</option>
              <option value="URL">URL</option>
              <option value="SHA256">SHA256</option>
              <option value="MD5">MD5</option>
              <option value="FILENAME">Filename</option>
              <option value="CVE">CVE</option>
              <option value="JA4">JA4</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {filteredIocs.map((ioc) => (
              <div
                key={ioc.id}
                onClick={() => setSelectedIoc(ioc)}
                className={\`p-3 rounded-xl border transition-all cursor-pointer \${
                  selectedIoc?.id === ioc.id
                    ? 'bg-charcoal-900 border-jade-500 shadow-md ring-1 ring-jade-500/20'
                    : 'bg-charcoal-950 border-charcoal-800 hover:border-charcoal-700'
                }\`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Badge variant="jade">{ioc.type}</Badge>
                  <Badge variant={ioc.reputation.toLowerCase()}>{ioc.reputation}</Badge>
                </div>
                <div className="text-xs font-mono text-gray-200 truncate">{ioc.defangedVal}</div>
                <div className="mt-2 text-[10px] font-mono text-gray-400 flex items-center justify-between">
                  <span>Score: {ioc.score}/100</span>
                  <span>Seen: {new Date(ioc.lastSeen).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Deep IOC Intel & Scoring Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {selectedIoc ? (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge variant="jade">{selectedIoc.type}</Badge>
                    <Badge variant={selectedIoc.reputation.toLowerCase()}>{selectedIoc.reputation}</Badge>
                    {selectedIoc.isOverridden && <Badge variant="neutral">ANALYST OVERRIDDEN</Badge>}
                  </div>
                  <CardTitle className="text-base font-mono break-all">{selectedIoc.value}</CardTitle>
                  <CardDescription className="font-mono text-xs text-jade-300">
                    Defanged: {selectedIoc.defangedVal}
                  </CardDescription>
                </div>

                <Button size="sm" variant="outline" onClick={() => setIsOverrideOpen(true)}>
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  Override Reputation
                </Button>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Score & Confidence Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-charcoal-950 rounded-lg border border-charcoal-800">
                    <span className="text-[10px] font-mono text-gray-400 uppercase block">Reputation Score</span>
                    <span className="text-xl font-bold font-mono text-jade-400">{selectedIoc.score}/100</span>
                  </div>
                  <div className="p-3 bg-charcoal-950 rounded-lg border border-charcoal-800">
                    <span className="text-[10px] font-mono text-gray-400 uppercase block">Confidence Rate</span>
                    <span className="text-xl font-bold font-mono text-gray-200">{selectedIoc.confidence}%</span>
                  </div>
                  <div className="p-3 bg-charcoal-950 rounded-lg border border-charcoal-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-mono text-gray-400 uppercase block">Internal Observations</span>
                    <span className="text-xl font-bold font-mono text-gray-200">{selectedIoc.observations?.length || 1} hits</span>
                  </div>
                </div>

                {/* Explainable Scoring Factors */}
                <div>
                  <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">
                    Explainable Multi-Factor Scoring Rationale
                  </h4>
                  <div className="p-4 bg-charcoal-950 border border-charcoal-800 rounded-lg space-y-2 text-xs">
                    {selectedIoc.isOverridden ? (
                      <div className="text-amber-300">
                        <strong>Analyst Override:</strong> {selectedIoc.overrideReason} (by {selectedIoc.overrideActor})
                      </div>
                    ) : (
                      <p className="text-gray-300 leading-relaxed">
                        Deterministic score computed across threat intelligence feeds, internal endpoint telemetry observations, and behavioral heuristics.
                      </p>
                    )}
                  </div>
                </div>

                {/* Telemetry Observations */}
                <div>
                  <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">
                    Internal Observation Telemetry
                  </h4>
                  <div className="space-y-2">
                    {selectedIoc.observations && selectedIoc.observations.map((obs: any) => (
                      <div key={obs.id} className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-200">{obs.source}</div>
                          <p className="text-gray-400 text-[11px]">{obs.context}</p>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">{new Date(obs.observedAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center text-gray-400 border border-charcoal-800 rounded-xl bg-charcoal-900">
              Select an indicator to inspect reputation breakdown.
            </div>
          )}
        </div>
      </div>

      {/* Bulk Import Modal */}
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Bulk Import Threat Indicators">
        <form onSubmit={handleBulkImport} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Paste Indicators (One per line - automatically defanged & normalized)
            </label>
            <textarea
              rows={6}
              required
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-xs font-mono text-jade-300 placeholder-gray-500 focus:border-jade-500"
              placeholder="185.220.101.5&#10;hxxps://evil-domain[.]com/payload.exe&#10;e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855&#10;CVE-2024-3400"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
            <Button type="button" variant="ghost" onClick={() => setIsImportOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Import & Score Indicators</Button>
          </div>
        </form>
      </Modal>

      {/* Analyst Override Modal */}
      <Modal isOpen={isOverrideOpen} onClose={() => setIsOverrideOpen(false)} title="Analyst Reputation Override">
        <form onSubmit={handleOverride} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">New Authoritative Verdict</label>
            <select
              value={overrideReputation}
              onChange={(e) => setOverrideReputation(e.target.value)}
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500"
            >
              <option value="ALLOWLISTED">Allowlisted (Known Benign / Internal Asset)</option>
              <option value="BENIGN">Benign</option>
              <option value="SUSPICIOUS">Suspicious</option>
              <option value="HIGH_RISK">High Risk</option>
              <option value="MALICIOUS">Confirmed Malicious</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Mandatory Justification / Reason</label>
            <textarea
              rows={3}
              required
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500"
              placeholder="Provide evidence rationale for overriding automated reputation score..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
            <Button type="button" variant="ghost" onClick={() => setIsOverrideOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Apply Audited Override</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
`);