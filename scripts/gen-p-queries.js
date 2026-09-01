const { write } = require('./writer');

write('src/app/(dashboard)/queries/page.tsx', `
'use client';
import React, { useState } from 'react';
import { Terminal, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusIndicator } from '@/components/ui/status-indicator';

export default function QueriesPage() {
  const [selectedSiem, setSelectedSiem] = useState<'LOGSCALE' | 'SENTINEL' | 'SPLUNK' | 'ELASTIC'>('LOGSCALE');
  const [rawQuery, setRawQuery] = useState('TargetProcess="lsass.exe" GrantedAccess=/0x1010|0x1438/ | groupBy(SourceProcess, function=[count()])');
  const [timeRange, setTimeRange] = useState('24h');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  const defaultTemplates = {
    LOGSCALE: 'TargetProcess="lsass.exe" GrantedAccess=/0x1010|0x1438/ | groupBy(SourceProcess, function=[count()])',
    SENTINEL: 'DeviceProcessEvents | where ProcessCommandLine contains "-EncodedCommand" | project TimeGenerated, DeviceName, AccountName, ProcessCommandLine',
    SPLUNK: 'index=wineventlog EventCode=4769 Ticket_Encryption_Type=0x17 Service_Name!="krbtgt" | stats count by TargetUserName, Service_Name, Client_Address',
    ELASTIC: 'process where process.name == "powershell.exe" and process.args == "-EncodedCommand"',
  };

  const handleSiemChange = (siem: any) => {
    setSelectedSiem(siem);
    setRawQuery(defaultTemplates[siem as keyof typeof defaultTemplates] || '');
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const res = await fetch('/api/queries/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siemType: selectedSiem,
          rawQuery,
          timeRange,
          limit: 100,
        }),
      });

      const data = await res.json();
      setExecutionResult(data);
    } catch (err: any) {
      setExecutionResult({ success: false, errorMessage: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Terminal className="w-6 h-6 text-jade-400" />
            <span>Multi-SIEM Query Workbench</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Author and execute LogScale (LQL), Sentinel (KQL), Splunk (SPL), and Elastic (EQL) queries.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 bg-charcoal-900 p-1 rounded-lg border border-charcoal-700">
          {(['LOGSCALE', 'SENTINEL', 'SPLUNK', 'ELASTIC'] as const).map((siem) => (
            <button
              key={siem}
              onClick={() => handleSiemChange(siem)}
              className={\`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors \${
                selectedSiem === siem
                  ? 'bg-jade-500 text-charcoal-950 shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }\`}
            >
              {siem}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Card className="border-charcoal-700 shadow-2xl">
          <CardHeader className="py-3 px-4 bg-charcoal-950 flex flex-row items-center justify-between border-b border-charcoal-800">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-jade-400 uppercase font-bold">{selectedSiem} SYNTAX EDITOR</span>
              <StatusIndicator status="HEALTHY" label="Live Connector Ready" />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-charcoal-900 border border-charcoal-700 rounded px-2.5 py-1 text-xs font-mono text-gray-200 focus:outline-none"
              >
                <option value="1h">Last 1 Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <Button size="sm" variant="primary" onClick={handleExecute} isLoading={isExecuting}>
                <Play className="w-3.5 h-3.5 mr-1" />
                Execute Query
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <textarea
              rows={5}
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              className="w-full p-4 bg-charcoal-950 font-mono text-xs text-jade-300 placeholder-gray-600 focus:outline-none focus:ring-0 border-none resize-y"
              placeholder="Enter SIEM query statement here..."
            />
          </CardContent>
        </Card>

        {executionResult && (
          <Card>
            <CardHeader className="py-3 px-4 bg-charcoal-950 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center space-x-2">
                  {executionResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span>Query Results ({executionResult.matchCount || 0} Events Returned)</span>
                </CardTitle>
                <CardDescription className="text-[11px] font-mono">
                  Execution Time: {executionResult.executionTimeMs}ms • Provider: {executionResult.provider}
                </CardDescription>
              </div>
              {executionResult.isDemoData && (
                <Badge variant="pending">SEEDED TELEMETRY RESULT</Badge>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {executionResult.errorMessage ? (
                <div className="p-4 bg-red-950/40 text-red-300 text-xs font-mono border-t border-red-800">
                  {executionResult.errorMessage}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-charcoal-950 border-b border-charcoal-800 text-gray-400 uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Timestamp</th>
                        <th className="px-4 py-2.5">Host</th>
                        <th className="px-4 py-2.5">User</th>
                        <th className="px-4 py-2.5">Process / Event</th>
                        <th className="px-4 py-2.5">Source IP</th>
                        <th className="px-4 py-2.5">Dest IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-800 text-gray-300">
                      {executionResult.events && executionResult.events.length > 0 ? (
                        executionResult.events.map((evt: any, idx: number) => (
                          <tr key={idx} className="hover:bg-charcoal-850/50">
                            <td className="px-4 py-2.5 text-gray-400">{evt.timestamp?.slice(0, 19)}</td>
                            <td className="px-4 py-2.5 text-jade-300 font-semibold">{evt.host || 'N/A'}</td>
                            <td className="px-4 py-2.5">{evt.user || 'SYSTEM'}</td>
                            <td className="px-4 py-2.5 text-gray-200">{evt.process || evt.action || JSON.stringify(evt)}</td>
                            <td className="px-4 py-2.5 text-gray-400">{evt.srcIp || '-'}</td>
                            <td className="px-4 py-2.5 text-gray-400">{evt.destIp || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            0 events matched the query in the specified time window.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
`);