const { write } = require('./writer');

// Cases Page
write('src/app/(dashboard)/cases/page.tsx', `
'use client';
import React, { useEffect, useState } from 'react';
import { FolderGit2, Plus, MessageSquare, ShieldAlert, Send, Clock, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    priority: 'P1',
  });

  const loadCases = () => {
    fetch('/api/cases')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setCases(d);
          if (d.length > 0) {
            setSelectedCase((prev: any) => d.find((c) => c.id === prev?.id) || d[0]);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsCreateOpen(false);
        setFormData({ title: '', description: '', severity: 'HIGH', priority: 'P1' });
        loadCases();
      }
    } catch {}
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !commentText.trim()) return;
    try {
      const res = await fetch(\`/api/cases/\${selectedCase.id}/comments\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText }),
      });
      if (res.ok) {
        setCommentText('');
        loadCases();
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <FolderGit2 className="w-6 h-6 text-jade-400" />
            <span>Incident & Investigation Cases</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Collaborative case management, analyst timeline logs, forensic evidence, and containment actions.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Incident Case
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Active Incidents</h3>
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className={\`p-4 rounded-xl border transition-all cursor-pointer \${
                selectedCase?.id === c.id
                  ? 'bg-charcoal-900 border-jade-500 shadow-md ring-1 ring-jade-500/20'
                  : 'bg-charcoal-950 border-charcoal-800 hover:border-charcoal-700'
              }\`}
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant={c.severity === 'CRITICAL' ? 'critical' : 'high'}>{c.severity}</Badge>
                <Badge variant="neutral">{c.priority}</Badge>
                <Badge variant={c.status === 'OPEN' ? 'active' : 'completed'}>{c.status}</Badge>
              </div>
              <h4 className="text-sm font-semibold text-gray-200">{c.title}</h4>
              <p className="text-xs text-gray-400 line-clamp-1 mt-1">{c.description}</p>
              <div className="mt-3 pt-2 border-t border-charcoal-800 flex items-center justify-between text-[11px] text-gray-400 font-mono">
                <span>Assignee: {c.assignee?.name || 'Alex Sterling'}</span>
                <span>{c.comments?.length || 0} Notes</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedCase ? (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge variant="jade">CASE #{selectedCase.id.slice(0, 8)}</Badge>
                    <Badge variant={selectedCase.severity === 'CRITICAL' ? 'critical' : 'high'}>{selectedCase.severity}</Badge>
                    <Badge variant="neutral">{selectedCase.priority}</Badge>
                  </div>
                  <CardTitle className="text-xl">{selectedCase.title}</CardTitle>
                  <CardDescription className="mt-1">{selectedCase.description}</CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Timeline / Action Audit Trail */}
                <div>
                  <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-jade-400" />
                    <span>Case Activity Timeline</span>
                  </h4>
                  <div className="space-y-2 border-l-2 border-charcoal-800 ml-2 pl-4">
                    {selectedCase.actions && selectedCase.actions.map((act: any) => (
                      <div key={act.id} className="text-xs space-y-0.5">
                        <div className="font-semibold text-gray-200">{act.action}</div>
                        <p className="text-gray-400">{act.details}</p>
                        <span className="text-[10px] text-gray-400 font-mono">{act.actorName} • {new Date(act.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analyst Notes & Comments */}
                <div className="border-t border-charcoal-800 pt-4">
                  <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-jade-400" />
                    <span>Analyst Investigation Notes</span>
                  </h4>

                  <div className="space-y-3 mb-4">
                    {selectedCase.comments && selectedCase.comments.map((cm: any) => (
                      <div key={cm.id} className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between text-gray-400 font-mono text-[11px]">
                          <span className="font-semibold text-jade-300">{cm.author?.name || 'Analyst'}</span>
                          <span>{new Date(cm.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-gray-200">{cm.comment}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Input
                      placeholder="Add investigation note or containment update..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <Button type="submit" variant="primary" size="sm">
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Post
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center text-gray-400 border border-charcoal-800 rounded-xl bg-charcoal-900">
              Select an incident case to review notes and actions.
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Incident Case">
        <form onSubmit={handleCreateCase} className="space-y-4">
          <Input
            label="Case Title"
            required
            placeholder="e.g. Host Compromise and Credential Harvesting"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Incident Description</label>
            <textarea
              rows={3}
              required
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500"
              placeholder="Scope and initial observations..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500"
              >
                <option value="P1">P1 - Urgent</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Case</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
`);

// Evidence Vault Page
write('src/app/(dashboard)/evidence/page.tsx', `
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
`);