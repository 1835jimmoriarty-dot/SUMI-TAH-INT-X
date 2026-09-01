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