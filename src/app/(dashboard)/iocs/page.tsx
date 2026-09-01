'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Upload, Edit3 } from 'lucide-react';

function IOCsContent() {
  const searchParams = useSearchParams();
  const searchParamVal = searchParams?.get('search') || '';

  const [iocs, setIocs] = useState<any[]>([]);
  const [selectedIoc, setSelectedIoc] = useState<any | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReputation, setOverrideReputation] = useState('ALLOWLISTED');
  const [filterType, setFilterType] = useState('ALL');
  const [textSearch, setTextSearch] = useState(searchParamVal);

  const loadIOCs = () => {
    fetch('/api/iocs')
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d)) return;
        setIocs(d);
        // Auto-select IOC if search param was provided
        if (searchParamVal) {
          const matched = d.find(
            (i) =>
              i.value.toLowerCase().includes(searchParamVal.toLowerCase()) ||
              i.defangedVal.toLowerCase().includes(searchParamVal.toLowerCase())
          );
          if (matched) setSelectedIoc(matched);
          else if (d.length > 0) setSelectedIoc(d[0]);
        } else if (d.length > 0) {
          setSelectedIoc((prev: any) => d.find((i) => i.id === prev?.id) || d[0]);
        }
      })
      .catch(() => {});
  };

  // Sync URL search param into filter input
  useEffect(() => {
    setTextSearch(searchParamVal);
  }, [searchParamVal]);

  useEffect(() => {
    loadIOCs();
  }, []);

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const indicators = importText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((value) => ({ value }));

    const res = await fetch('/api/iocs/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ indicators }),
    }).catch(() => null);
    if (res?.ok) {
      setIsImportOpen(false);
      setImportText('');
      loadIOCs();
    }
  };

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIoc) return;
    const res = await fetch(`/api/iocs/${selectedIoc.id}/override`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reputation: overrideReputation, reason: overrideReason }),
    }).catch(() => null);
    if (res?.ok) {
      setIsOverrideOpen(false);
      setOverrideReason('');
      loadIOCs();
    }
  };

  const filteredIocs = iocs.filter((i) => {
    const matchesType = filterType === 'ALL' || i.type === filterType;
    const matchesSearch =
      !textSearch ||
      i.value.toLowerCase().includes(textSearch.toLowerCase()) ||
      i.defangedVal.toLowerCase().includes(textSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Search className="w-6 h-6 text-jade-400" />
            <span>IOC Threat Intelligence Engine</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Defanging normalization, multi-factor reputation scoring, and analyst override workflow.
          </p>
        </div>
        <button
          onClick={() => setIsImportOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-jade-600 hover:bg-jade-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Bulk Import Indicators</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IOC List */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Filter indicators..."
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-charcoal-950 border border-charcoal-700 rounded-lg text-xs font-mono text-gray-100 placeholder-gray-500 focus:outline-none focus:border-jade-500"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-charcoal-900 border border-charcoal-700 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-300 focus:outline-none"
            >
              <option value="ALL">All Types</option>
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

          <div className="space-y-2 max-h-[72vh] overflow-y-auto pr-1">
            {filteredIocs.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-500 font-mono">
                No indicators found
              </div>
            )}
            {filteredIocs.map((ioc) => (
              <div
                key={ioc.id}
                onClick={() => setSelectedIoc(ioc)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedIoc?.id === ioc.id
                    ? 'bg-charcoal-900 border-jade-500 ring-1 ring-jade-500/20'
                    : 'bg-charcoal-950 border-charcoal-800 hover:border-charcoal-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-jade-900/50 text-jade-300 border border-jade-700">
                    {ioc.type}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      ioc.reputation === 'MALICIOUS'
                        ? 'bg-red-900/50 text-red-300 border-red-700'
                        : ioc.reputation === 'HIGH_RISK'
                        ? 'bg-orange-900/50 text-orange-300 border-orange-700'
                        : ioc.reputation === 'SUSPICIOUS'
                        ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700'
                        : ioc.reputation === 'BENIGN' || ioc.reputation === 'ALLOWLISTED'
                        ? 'bg-green-900/50 text-green-300 border-green-700'
                        : 'bg-charcoal-800 text-gray-400 border-charcoal-600'
                    }`}
                  >
                    {ioc.reputation}
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-200 truncate">{ioc.defangedVal}</div>
                <div className="mt-2 text-[10px] font-mono text-gray-400 flex items-center justify-between">
                  <span>Score: {ioc.score}/100</span>
                  <span>{new Date(ioc.lastSeen).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IOC Detail */}
        <div className="lg:col-span-2">
          {selectedIoc ? (
            <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-jade-900/50 text-jade-300 border border-jade-700">
                      {selectedIoc.type}
                    </span>
                    {selectedIoc.isOverridden && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-900/50 text-amber-300 border border-amber-700">
                        ANALYST OVERRIDE
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm font-bold font-mono text-gray-100 break-all">{selectedIoc.value}</h2>
                  <p className="text-xs font-mono text-jade-300 mt-0.5">Defanged: {selectedIoc.defangedVal}</p>
                </div>
                <button
                  onClick={() => setIsOverrideOpen(true)}
                  className="flex items-center space-x-2 px-3 py-1.5 border border-charcoal-600 hover:border-jade-500 text-gray-300 hover:text-jade-300 rounded-lg text-xs transition-colors shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Override Reputation</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Reputation Score', value: `${selectedIoc.score}/100`, color: 'text-jade-400' },
                  { label: 'Confidence', value: `${selectedIoc.confidence}%`, color: 'text-gray-200' },
                  { label: 'Observations', value: `${selectedIoc.observations?.length || 1}`, color: 'text-gray-200' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 bg-charcoal-950 rounded-lg border border-charcoal-800">
                    <div className="text-[10px] font-mono text-gray-400 uppercase mb-1">{label}</div>
                    <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              {selectedIoc.isOverridden && (
                <div className="p-3 bg-amber-950/30 border border-amber-700/50 rounded-lg text-xs text-amber-300">
                  <strong>Analyst Override:</strong> {selectedIoc.overrideReason}
                  {selectedIoc.overrideActor ? ` — by ${selectedIoc.overrideActor}` : ''}
                </div>
              )}

              {selectedIoc.observations?.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">
                    Internal Observation Telemetry
                  </h4>
                  <div className="space-y-2">
                    {selectedIoc.observations.map((obs: any) => (
                      <div
                        key={obs.id}
                        className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-gray-200">{obs.source}</div>
                          <div className="text-gray-400 text-[11px]">{obs.context}</div>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                          {new Date(obs.observedAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 border border-charcoal-800 rounded-2xl bg-charcoal-900">
              Select an indicator from the list to inspect its reputation breakdown
            </div>
          )}
        </div>
      </div>

      {/* Bulk Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-charcoal-950/80">
          <div className="w-full max-w-lg bg-charcoal-900 border border-charcoal-700 rounded-2xl p-6">
            <h3 className="text-base font-bold text-gray-100 mb-4">Bulk Import Threat Indicators</h3>
            <form onSubmit={handleBulkImport} className="space-y-4">
              <textarea
                rows={6}
                required
                className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-xs font-mono text-jade-300 placeholder-gray-500 focus:border-jade-500 focus:outline-none"
                placeholder="One indicator per line — IPs, domains, hashes, CVEs automatically parsed and defanged..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-jade-600 hover:bg-jade-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Import & Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reputation Override Modal */}
      {isOverrideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-charcoal-950/80">
          <div className="w-full max-w-lg bg-charcoal-900 border border-charcoal-700 rounded-2xl p-6">
            <h3 className="text-base font-bold text-gray-100 mb-4">Analyst Reputation Override</h3>
            <form onSubmit={handleOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">New Verdict</label>
                <select
                  value={overrideReputation}
                  onChange={(e) => setOverrideReputation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500 focus:outline-none"
                >
                  <option value="ALLOWLISTED">Allowlisted (Known Benign)</option>
                  <option value="BENIGN">Benign</option>
                  <option value="SUSPICIOUS">Suspicious</option>
                  <option value="HIGH_RISK">High Risk</option>
                  <option value="MALICIOUS">Confirmed Malicious</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Mandatory Justification
                </label>
                <textarea
                  rows={3}
                  required
                  className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500 focus:outline-none"
                  placeholder="Evidence-based rationale for overriding automated score..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
                <button
                  type="button"
                  onClick={() => setIsOverrideOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-jade-600 hover:bg-jade-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Apply Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IOCsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs font-mono text-gray-400 animate-pulse">
          Loading Threat Intelligence Engine...
        </div>
      }
    >
      <IOCsContent />
    </Suspense>
  );
}