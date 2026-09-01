const { write } = require('./writer');

// ATT&CK Page
write('src/app/(dashboard)/attack/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { Grid, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AttackPage() {
  const [techniques, setTechniques] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/attack')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setTechniques(d))
      .catch(() => {});
  }, []);

  const downloadNavigatorJson = () => {
    window.location.href = '/api/attack/navigator';
  };

  const tactics = Array.from(new Set(techniques.map((t) => t.tactic)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Grid className="w-6 h-6 text-jade-400" />
            <span>MITRE Enterprise ATT&CK Matrix</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Correlated adversary tradecraft across all 14 tactics with active hunt & SIEM detection coverage.
          </p>
        </div>
        <Button onClick={downloadNavigatorJson} variant="primary" size="sm">
          <Download className="w-4 h-4 mr-1.5" />
          Export ATT&CK Navigator v4.3 Layer
        </Button>
      </div>

      {/* 14 Tactics Matrix Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        {tactics.map((tactic) => {
          const techList = techniques.filter((t) => t.tactic === tactic);
          return (
            <div key={tactic} className="bg-charcoal-900 border border-charcoal-800 rounded-xl overflow-hidden flex flex-col">
              <div className="p-3 bg-charcoal-950 border-b border-charcoal-800 font-mono text-xs font-bold text-jade-400 uppercase tracking-wide">
                {tactic} ({techList.length})
              </div>
              <div className="p-2 space-y-1.5 flex-1 overflow-y-auto max-h-[60vh]">
                {techList.map((t) => (
                  <a
                    key={t.id}
                    href={t.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className={\`block p-2 rounded border text-xs transition-colors \${
                      t.detectionCount > 0
                        ? 'bg-jade-950/40 border-jade-700/60 hover:border-jade-500 text-gray-100'
                        : 'bg-charcoal-950 border-charcoal-800 hover:border-charcoal-700 text-gray-400'
                    }\`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-jade-300 font-semibold">{t.techniqueId}</span>
                      {t.detectionCount > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-jade-400" title="Covered by detections" />
                      )}
                    </div>
                    <div className="font-medium text-xs mt-0.5 line-clamp-1">{t.name}</div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`);

// D3FEND Page
write('src/app/(dashboard)/defend/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { ShieldHalf, ExternalLink, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DefendPage() {
  const [defendItems, setDefendItems] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/defend')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setDefendItems(d))
      .catch(() => {});
  }, []);

  const tactics = Array.from(new Set(defendItems.map((d) => d.tactic)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <ShieldHalf className="w-6 h-6 text-jade-400" />
            <span>MITRE D3FEND Countermeasure Knowledge Base</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Matrix of defensive cybersecurity techniques, hardening tactics, and isolation mechanisms.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {defendItems.map((item) => {
          let mappedAttack: string[] = [];
          if (item.attackLinks) {
            try { mappedAttack = JSON.parse(item.attackLinks); } catch {}
          }
          return (
            <Card key={item.id} className="hover:border-jade-500/40">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="jade">{item.tactic}</Badge>
                  <span className="font-mono text-xs text-jade-300 font-bold">{item.defendId}</span>
                </div>
                <CardTitle className="text-base">{item.name}</CardTitle>
                <CardDescription className="mt-1">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {mappedAttack.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 uppercase block mb-1.5">Mitigates ATT&CK:</span>
                    <div className="flex flex-wrap gap-1">
                      {mappedAttack.map((atk, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-charcoal-950 text-gray-300 border border-charcoal-700 rounded text-[10px] font-mono">
                          {atk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
`);

// Coverage Page
write('src/app/(dashboard)/coverage/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { BarChart3, ShieldAlert, ArrowUpRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function CoveragePage() {
  const [coverageData, setCoverageData] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/coverage')
      .then((r) => r.json())
      .then((d) => setCoverageData(d))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-jade-400" />
            <span>Detection Coverage & Gap Recommendations</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Deterministic quantitative visibility scoring and prioritized engineering recommendations.
          </p>
        </div>
      </div>

      {coverageData && (
        <>
          {/* Header Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-jade-500">
              <CardContent className="p-4">
                <span className="text-xs font-mono text-gray-400 uppercase">Overall Fleet Coverage</span>
                <div className="text-3xl font-bold font-mono text-jade-400 mt-1">{coverageData.coveragePercentage}%</div>
                <p className="text-[11px] text-gray-400 mt-1 font-mono">{coverageData.totalCovered} of {coverageData.totalTechniques} techniques covered</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <span className="text-xs font-mono text-gray-400 uppercase">Prioritized Visibility Gaps</span>
                <div className="text-3xl font-bold font-mono text-red-400 mt-1">{coverageData.gaps?.length || 0}</div>
                <p className="text-[11px] text-red-400 mt-1 font-mono">Requires query engineering</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <span className="text-xs font-mono text-gray-400 uppercase">Covered Tactics</span>
                <div className="text-3xl font-bold font-mono text-blue-400 mt-1">14 / 14</div>
                <p className="text-[11px] text-blue-400 mt-1 font-mono">Enterprise ATT&CK Matrix</p>
              </CardContent>
            </Card>
          </div>

          {/* Tactic Breakdown Bars & Prioritized Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tactic Coverage Breakdown</CardTitle>
                <CardDescription>Coverage percentage by MITRE ATT&CK tactic</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {coverageData.tacticBreakdown?.map((t: any) => (
                  <div key={t.tactic} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-200">{t.tactic}</span>
                      <span className="text-jade-400 font-bold">{t.coveragePercentage}%</span>
                    </div>
                    <div className="h-2 bg-charcoal-950 rounded-full overflow-hidden border border-charcoal-800">
                      <div
                        className="h-full bg-jade-500 transition-all"
                        style={{ width: \`\${t.coveragePercentage}%\` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Prioritized Detection Engineering Gaps</CardTitle>
                <CardDescription>Recommended queries & hunt packages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {coverageData.gaps?.slice(0, 5).map((gap: any, idx: number) => (
                  <div key={idx} className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-200">{gap.techniqueId}: {gap.techniqueName}</span>
                      <Badge variant={gap.priority === 'CRITICAL' ? 'critical' : 'high'}>{gap.priority}</Badge>
                    </div>
                    <p className="text-xs text-gray-400">{gap.recommendation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
`);