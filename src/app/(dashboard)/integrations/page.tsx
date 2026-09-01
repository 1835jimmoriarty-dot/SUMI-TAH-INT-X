'use client';
import React, { useEffect, useState } from 'react';
import { Cpu, Key, Plus } from 'lucide-react';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'logscale',
    description: '',
    baseUrl: '',
    apiKey: '',
  });

  const loadIntegrations = () => {
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setIntegrations(d))
      .catch(() => {});
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/integrations/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults((p) => ({ ...p, [id]: data }));
    } catch (err: any) {
      setTestResults((p) => ({ ...p, [id]: { status: 'UNREACHABLE', message: err.message } }));
    } finally {
      setTestingId(null);
      loadIntegrations();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        provider: formData.provider,
        description: formData.description,
        config: { baseUrl: formData.baseUrl },
        secrets: { apiKey: formData.apiKey },
      }),
    }).catch(() => null);
    if (res?.ok) {
      setIsAddOpen(false);
      setFormData({ name: '', provider: 'logscale', description: '', baseUrl: '', apiKey: '' });
      loadIntegrations();
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
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-jade-600 hover:bg-jade-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Integration</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.length === 0 && (
          <div className="col-span-2 py-12 text-center text-xs text-gray-400 font-mono border border-charcoal-800 rounded-xl">
            No integrations configured. Click &quot;Add Integration&quot; to connect a SIEM.
          </div>
        )}
        {integrations.map((item) => {
          const testRes = testResults[item.id] || item.healthLogs?.[0];
          const statusColor =
            testRes?.status === 'HEALTHY'
              ? 'text-emerald-400'
              : testRes?.status === 'NOT_CONFIGURED'
              ? 'text-gray-400'
              : 'text-red-400';

          return (
            <div
              key={item.id}
              className="bg-charcoal-900 border border-charcoal-700 rounded-2xl p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-jade-900/50 text-jade-300 border border-jade-700">
                    {item.provider.toUpperCase()}
                  </span>
                  <span className={`text-xs font-mono font-bold ${statusColor}`}>
                    {testRes?.status || 'HEALTHY'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-100">{item.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
              </div>
              <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg text-xs font-mono space-y-1">
                <div className="flex items-center space-x-2 text-jade-400">
                  <Key className="w-3.5 h-3.5" />
                  <span>Secrets encrypted AES-256-GCM</span>
                </div>
                {testRes?.message && (
                  <div className="text-gray-400 text-[11px] mt-1">{testRes.message}</div>
                )}
              </div>
              <div className="flex justify-end pt-2 border-t border-charcoal-800">
                <button
                  onClick={() => handleTest(item.id)}
                  disabled={testingId === item.id}
                  className="px-3 py-1.5 border border-charcoal-600 hover:border-jade-500 text-gray-300 hover:text-jade-300 rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  {testingId === item.id ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Integration Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-charcoal-950/80">
          <div className="w-full max-w-lg bg-charcoal-900 border border-charcoal-700 rounded-2xl p-6">
            <h3 className="text-base font-bold text-gray-100 mb-4">Configure Security Integration</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Integration Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Production CrowdStrike Falcon EDR"
                  className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Provider Type</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500 focus:outline-none"
                >
                  <option value="logscale">Falcon LogScale (LQL)</option>
                  <option value="sentinel">Microsoft Sentinel (KQL)</option>
                  <option value="splunk">Splunk Enterprise (SPL)</option>
                  <option value="elastic">Elasticsearch / Security (EQL)</option>
                  <option value="falcon">CrowdStrike Falcon (OAuth2)</option>
                  <option value="torq">Torq SOAR Automation (Webhook)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Base URL / Webhook Endpoint
                </label>
                <input
                  required
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://api.crowdstrike.com"
                  className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  API Key / Token (encrypted at rest)
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Enter secret API token..."
                  className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Description</label>
                <input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Primary SIEM telemetry collector..."
                  className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-jade-600 hover:bg-jade-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Encrypted Connector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}