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
                    className={`block p-2 rounded border text-xs transition-colors ${
                      t.detectionCount > 0
                        ? 'bg-jade-950/40 border-jade-700/60 hover:border-jade-500 text-gray-100'
                        : 'bg-charcoal-950 border-charcoal-800 hover:border-charcoal-700 text-gray-400'
                    }`}
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