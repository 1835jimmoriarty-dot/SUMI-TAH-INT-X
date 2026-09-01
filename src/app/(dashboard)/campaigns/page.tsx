'use client';
import React, { useEffect, useState } from 'react';
import { Flame, Clock, Users2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/campaigns')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCampaigns(d))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Flame className="w-6 h-6 text-jade-400" />
            <span>Adversary Threat Campaigns</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Correlated multi-phase threat operations, intrusion timelines, and targeted industry scopes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant={c.status === 'ACTIVE' ? 'critical' : 'completed'}>{c.status}</Badge>
                <span className="text-[11px] font-mono text-gray-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  <span>{c.timeline}</span>
                </span>
              </div>
              <CardTitle className="text-base">{c.name}</CardTitle>
              <CardDescription className="mt-1">{c.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {c.threatActor && (
                <div className="p-2.5 bg-charcoal-950 border border-charcoal-800 rounded text-xs flex items-center justify-between">
                  <span className="text-gray-400">Attributed Actor:</span>
                  <span className="font-semibold text-jade-300">{c.threatActor.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}