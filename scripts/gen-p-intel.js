const { write } = require('./writer');

// Threat Actors Page
write('src/app/(dashboard)/actors/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { Users2, Shield, Globe, Target, Calculator } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

export default function ActorsPage() {
  const [actors, setActors] = useState<any[]>([]);
  const [selectedActor, setSelectedActor] = useState<any | null>(null);
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [attrResult, setAttrResult] = useState<any | null>(null);
  const [attrInput, setAttrInput] = useState({
    observedTechniques: 'T1059.001, T1003.001, T1558.003',
    observedMalware: 'Cobalt Strike Beacon, Mimikatz',
    observedIOCs: '185.220.101.5, darkgate-payload-delivery.com',
    victimSector: 'Defense',
  });

  const loadActors = () => {
    fetch('/api/actors')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setActors(d);
          if (d.length > 0) setSelectedActor(d[0]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadActors();
  }, []);

  const handleCalculateAttribution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/attribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observedTechniques: attrInput.observedTechniques.split(',').map((s) => s.trim()).filter(Boolean),
          observedMalware: attrInput.observedMalware.split(',').map((s) => s.trim()).filter(Boolean),
          observedIOCs: attrInput.observedIOCs.split(',').map((s) => s.trim()).filter(Boolean),
          victimSector: attrInput.victimSector,
        }),
      });
      const data = await res.json();
      setAttrResult(data);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Users2 className="w-6 h-6 text-jade-400" />
            <span>Adversary Intelligence & Threat Actors</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Nation-state APT dossiers, cybercrime syndicates, malware associations, and evidence-weighted attribution.
          </p>
        </div>
        <Button onClick={() => setIsAttrModalOpen(true)} variant="primary" size="sm">
          <Calculator className="w-4 h-4 mr-1.5" />
          Run Attribution Engine
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Tracked Threat Groups</h3>
          {actors.map((actor) => (
            <div
              key={actor.id}
              onClick={() => setSelectedActor(actor)}
              className={\`p-4 rounded-xl border transition-all cursor-pointer \${
                selectedActor?.id === actor.id
                  ? 'bg-charcoal-900 border-jade-500 shadow-md ring-1 ring-jade-500/20'
                  : 'bg-charcoal-950 border-charcoal-800 hover:border-charcoal-700'
              }\`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Badge variant="jade">{actor.originCountry || 'Unknown Origin'}</Badge>
                <span className="text-[11px] font-mono text-jade-400 font-bold">{actor.confidenceRate}% Confidence</span>
              </div>
              <h4 className="text-sm font-semibold text-gray-200">{actor.name}</h4>
              <p className="text-xs text-gray-400 line-clamp-1 mt-1">{actor.motivation}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedActor ? (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2 mb-1">
                  <Badge variant="jade">{selectedActor.originCountry}</Badge>
                  <Badge variant="neutral">Active Since {selectedActor.firstObserved || '2010'}</Badge>
                </div>
                <CardTitle className="text-xl">{selectedActor.name}</CardTitle>
                <CardDescription className="mt-1">{selectedActor.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Aliases */}
                {selectedActor.aliases && selectedActor.aliases.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Known Industry Aliases</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedActor.aliases.map((al: any) => (
                        <span key={al.id} className="px-2.5 py-1 bg-charcoal-950 border border-charcoal-700 rounded text-xs font-mono text-gray-300">
                          {al.alias}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Associated Campaigns */}
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase block mb-2">Tracked Operations & Campaigns</span>
                  <div className="space-y-2">
                    {selectedActor.campaigns && selectedActor.campaigns.map((c: any) => (
                      <div key={c.id} className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-200">{c.name}</div>
                          <p className="text-gray-400 text-[11px]">{c.description}</p>
                        </div>
                        <Badge variant="active">{c.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center text-gray-400 border border-charcoal-800 rounded-xl bg-charcoal-900">
              Select a threat actor to review intelligence dossier.
            </div>
          )}
        </div>
      </div>

      {/* Attribution Calculator Modal */}
      <Modal isOpen={isAttrModalOpen} onClose={() => setIsAttrModalOpen(false)} title="Evidence-Based Threat Attribution Engine" maxWidth="2xl">
        <form onSubmit={handleCalculateAttribution} className="space-y-4">
          <Input
            label="Observed MITRE ATT&CK Techniques (comma separated)"
            value={attrInput.observedTechniques}
            onChange={(e) => setAttrInput({ ...attrInput, observedTechniques: e.target.value })}
          />
          <Input
            label="Observed Malware Payload Signatures (comma separated)"
            value={attrInput.observedMalware}
            onChange={(e) => setAttrInput({ ...attrInput, observedMalware: e.target.value })}
          />
          <Input
            label="Observed Threat Indicators / C2 IPs / Domains"
            value={attrInput.observedIOCs}
            onChange={(e) => setAttrInput({ ...attrInput, observedIOCs: e.target.value })}
          />
          <Input
            label="Target / Victim Industry Sector"
            value={attrInput.victimSector}
            onChange={(e) => setAttrInput({ ...attrInput, victimSector: e.target.value })}
          />

          <Button type="submit" variant="primary" className="w-full">
            Calculate Attribution Confidence
          </Button>

          {attrResult && (
            <div className="mt-4 pt-4 border-t border-charcoal-800 space-y-3">
              <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Attribution Confidence Results</h4>
              {attrResult.attributions?.map((item: any) => (
                <div key={item.actorId} className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-100">{item.actorName}</span>
                    <Badge variant={item.confidenceRating === 'HIGH' ? 'critical' : item.confidenceRating === 'MEDIUM' ? 'high' : 'neutral'}>
                      {item.confidenceScore}% ({item.confidenceRating})
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-300">{item.summary}</p>
                </div>
              ))}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
`);

// Malware Page
write('src/app/(dashboard)/malware/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { Bug, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MalwarePage() {
  const [malwareList, setMalwareList] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/malware')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setMalwareList(d))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Bug className="w-6 h-6 text-jade-400" />
            <span>Malware Families & Payload Signatures</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Tracking C2 beacons, ransomware loaders, stealers, and weaponized post-exploitation tooling.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {malwareList.map((mw) => {
          let platforms: string[] = [];
          if (mw.platforms) {
            try { platforms = JSON.parse(mw.platforms); } catch {}
          }
          return (
            <Card key={mw.id} className="hover:border-jade-500/40 flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="critical">{mw.category}</Badge>
                  <span className="text-[10px] font-mono text-gray-400">Seen: {mw.firstSeen || '2020'}</span>
                </div>
                <CardTitle className="text-base">{mw.name}</CardTitle>
                <CardDescription className="mt-1">{mw.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {platforms.length > 0 && (
                  <div className="flex gap-1.5">
                    {platforms.map((p, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-charcoal-950 text-gray-300 border border-charcoal-700 rounded text-[10px] font-mono">
                        {p}
                      </span>
                    ))}
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

// Campaigns Page
write('src/app/(dashboard)/campaigns/page.tsx', `
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
`);