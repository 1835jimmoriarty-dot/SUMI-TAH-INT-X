'use client';
import React, { useEffect, useState } from 'react';
import { Zap, ShieldAlert, CheckCircle, XCircle, AlertTriangle, UserCheck, Clock, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

export default function SOARPage() {
  const [actions, setActions] = useState<any[]>([]);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [formData, setFormData] = useState({
    actionType: 'ISOLATE_HOST',
    target: 'AZ-WORKSTATION-88',
    rationale: 'Active credential dumping observed in LSASS telemetry. Immediate host network isolation required.',
  });

  const loadSOAR = () => {
    fetch('/api/soar/actions')
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.actions)) setActions(d.actions);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadSOAR();
  }, []);

  const handleRequestAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/soar/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsRequestOpen(false);
        loadSOAR();
      }
    } catch {}
  };

  const handleApprove = async (actionId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/soar/actions/${actionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, comments: 'Approved by Lead Analyst' }),
      });
      if (res.ok) {
        loadSOAR();
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Zap className="w-6 h-6 text-jade-400" />
            <span>Torq SOAR Response Automation</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Mandatory human-in-the-loop analyst approval queue for all destructive and containment operations.
          </p>
        </div>
        <Button onClick={() => setIsRequestOpen(true)} variant="primary" size="sm">
          <ShieldAlert className="w-4 h-4 mr-1.5" />
          Request Containment Action
        </Button>
      </div>

      {/* Mandatory Approval Security Notice */}
      <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-start space-x-3 text-xs text-amber-200">
        <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-amber-300 block mb-0.5">HUMAN-IN-THE-LOOP AUTHORIZATION ENFORCED</strong>
          All network isolation, firewall blocking, account disabling, and token revocation playbooks are blocked until explicitly verified and signed by an authorized security analyst.
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Containment Actions Queue ({actions.length})</h3>
        <div className="space-y-3">
          {actions.map((act) => (
            <Card key={act.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-gray-100 font-mono">{act.actionType}</span>
                    <Badge variant={act.status === 'PENDING_APPROVAL' ? 'pending' : act.status === 'EXECUTED' ? 'executed' : 'neutral'}>
                      {act.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-jade-300 font-mono">
                    Target: <strong>{act.target}</strong>
                  </div>
                  <p className="text-xs text-gray-400">{act.rationale}</p>
                  <div className="text-[10px] text-gray-400 font-mono pt-1">
                    Requested by: {act.requester?.name || 'Analyst'} • {new Date(act.requestedAt).toLocaleString()}
                  </div>
                  {act.executionLog && (
                    <div className="p-2 bg-charcoal-950 rounded border border-charcoal-800 text-[11px] font-mono text-jade-400 mt-2">
                      {act.executionLog}
                    </div>
                  )}
                </div>

                {/* Approval Action Controls */}
                {act.status === 'PENDING_APPROVAL' && (
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button size="sm" variant="danger" onClick={() => handleApprove(act.id, false)}>
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => handleApprove(act.id, true)}>
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Authorize & Execute
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal isOpen={isRequestOpen} onClose={() => setIsRequestOpen(false)} title="Request SOAR Containment Action">
        <form onSubmit={handleRequestAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Containment Playbook Type</label>
            <select
              value={formData.actionType}
              onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500"
            >
              <option value="ISOLATE_HOST">Isolate Host (Sever Network Interfaces)</option>
              <option value="BLOCK_IP">Block IP (Edge Firewall Rule)</option>
              <option value="SINKHOLE_DOMAIN">Sinkhole Domain (DNS Redirection)</option>
              <option value="REVOKE_SESSION">Revoke IAM / Okta Session</option>
              <option value="DISABLE_ACCOUNT">Disable Active Directory Account</option>
            </select>
          </div>
          <Input
            label="Target Identifier (Host, IP, Domain, Email)"
            required
            value={formData.target}
            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
          />
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Mandatory Security Justification</label>
            <textarea
              rows={3}
              required
              className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500"
              placeholder="Explain why this containment action is necessary..."
              value={formData.rationale}
              onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
            <Button type="button" variant="ghost" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Submit for Analyst Approval</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}