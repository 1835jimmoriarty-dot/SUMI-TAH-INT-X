'use client';
import React, { useEffect, useState } from 'react';
import { FileCheck, ShieldCheck, Plus, Lock, Hash } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

export default function EvidencePage() {
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'LOG_SNIPPET',
    content: '',
  });

  const loadEvidence = () => {
    fetch('/api/evidence')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setEvidenceList(d))
      .catch(() => {});
  };

  useEffect(() => {
    loadEvidence();
  }, []);

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setFormData({ title: '', type: 'LOG_SNIPPET', content: '' });
        loadEvidence();
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <FileCheck className="w-6 h-6 text-jade-400" />
            <span>Forensic Evidence Vault</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Immutable forensic artifacts with cryptographic SHA-256 integrity verification.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Preserve Evidence
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {evidenceList.map((ev) => (
          <Card key={ev.id} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="jade">{ev.type}</Badge>
                <span className="text-[10px] text-gray-400 font-mono">{new Date(ev.createdAt).toLocaleDateString()}</span>
              </div>
              <CardTitle className="text-base">{ev.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <pre className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg text-[11px] font-mono text-gray-300 overflow-x-auto max-h-32">
                {ev.content}
              </pre>
              <div className="p-2 bg-charcoal-950 rounded border border-charcoal-800 flex items-center space-x-2 text-[10px] font-mono text-jade-400">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">SHA256: {ev.sha256Hash}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Preserve Forensic Evidence">
        <form onSubmit={handleAddEvidence} className="space-y-4">
          <Input
            label="Artifact Title"
            required
            placeholder="e.g. Kerberos TGS Ticket Capture Log"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Evidence Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500"
            >
              <option value="LOG_SNIPPET">Log Snippet</option>
              <option value="PACKET_CAPTURE">Packet Capture</option>
              <option value="MEMORY_DUMP">Memory Dump</option>
              <option value="IOC_LIST">IOC List</option>
              <option value="REPORT">Triage Report</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Evidence Payload / Raw Content</label>
            <textarea
              rows={5}
              required
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-xs font-mono text-jade-300 placeholder-gray-500 focus:border-jade-500"
              placeholder="Paste raw log lines, base64 payload, or forensic notes..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Cryptographically Store Evidence</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}