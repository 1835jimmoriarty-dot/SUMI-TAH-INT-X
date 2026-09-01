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
          title: `Hunt: ${pkg.title}`,
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