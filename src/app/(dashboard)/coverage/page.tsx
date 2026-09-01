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
                        style={{ width: `${t.coveragePercentage}%` }}
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