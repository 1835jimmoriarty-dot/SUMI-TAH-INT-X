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