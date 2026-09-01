'use client';
import React, { useEffect, useState } from 'react';
import { Compass, Plus, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

export default function HypothesesPage() {
  const [hypotheses, setHypotheses] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    statement: '',
    rationale: '',
    confidence: 'MEDIUM',
    status: 'DRAFT',
    attackTags: 'T1558.003, T1078',
  });

  const loadHypotheses = () => {
    fetch('/api/hypotheses')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setHypotheses(d))
      .catch(() => {});
  };

  useEffect(() => {
    loadHypotheses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const attackTagsArray = formData.attackTags.split(',').map((t) => t.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/hypotheses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          attackTags: attackTagsArray,
        }),
      });
      if (res.ok) {
        setIsCreateOpen(false);
        setFormData({ title: '', statement: '', rationale: '', confidence: 'MEDIUM', status: 'DRAFT', attackTags: 'T1558.003, T1078' });
        loadHypotheses();
      }
    } catch {}
  };

  const handleAiAssist = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability: 'HYPOTHESIS_GEN',
          prompt: formData.title || 'Generate Kerberos and Active Directory hunting hypothesis',
        }),
      });
      const data = await res.json();
      setAiSuggestions(data.recommendations || []);
    } catch {} finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Compass className="w-6 h-6 text-jade-400" />
            <span>Threat Hunting Hypotheses</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Structured adversary behavior models mapped to MITRE ATT&CK techniques.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Hypothesis
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hypotheses.map((item) => {
          let tags: string[] = [];
          if (item.attackTags) {
            try { tags = JSON.parse(item.attackTags); } catch {}
          }
          return (
            <Card key={item.id} className="flex flex-col justify-between hover:border-jade-500/40">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant={item.status === 'VALIDATED' ? 'approved' : 'draft'}>{item.status}</Badge>
                  <span className="text-[11px] font-mono text-gray-400">Confidence: {item.confidence}</span>
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription className="line-clamp-2 mt-2">{item.statement}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="p-2.5 bg-charcoal-950 rounded-lg border border-charcoal-800 text-xs text-gray-300">
                  <strong className="text-gray-400 block text-[10px] font-mono uppercase mb-0.5">Rationale:</strong>
                  <p className="line-clamp-2 text-xs">{item.rationale}</p>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-jade-950 text-jade-300 border border-jade-800 rounded text-[10px] font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="pt-2 border-t border-charcoal-800 flex items-center justify-between text-[11px] text-gray-400 font-mono">
                  <span>Author: {item.author?.name || 'Morgan Vance'}</span>
                  <span>{item.hunts?.length || 0} Hunts linked</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Develop Hunting Hypothesis" maxWidth="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Hypothesis Title"
            placeholder="e.g. LSASS Memory Access via Non-Standard Backup Account"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Hypothesis Statement</label>
            <textarea
              rows={3}
              required
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500"
              placeholder="State what adversary technique is suspected..."
              value={formData.statement}
              onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Security Rationale</label>
            <textarea
              rows={2}
              required
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500"
              placeholder="Why is this hunt necessary? Reference recent threat intel..."
              value={formData.rationale}
              onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
            />
          </div>
          <Input
            label="MITRE ATT&CK Technique Tags (comma separated)"
            value={formData.attackTags}
            onChange={(e) => setFormData({ ...formData, attackTags: e.target.value })}
          />

          <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-jade-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Advisory Assistant</span>
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleAiAssist} isLoading={isAiLoading}>
                Generate Suggestions
              </Button>
            </div>
            {aiSuggestions.length > 0 && (
              <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                {aiSuggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Hypothesis</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}