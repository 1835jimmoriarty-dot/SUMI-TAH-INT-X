'use client';
import React from 'react';
import { Settings, Users2, Shield, Lock, Database } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
            <Settings className="w-6 h-6 text-jade-400" />
            <span>Organization & RBAC Settings</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Manage organization policies, user access roles, and system configuration.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Users2 className="w-4 h-4 text-jade-400" />
              <span>User & Role Management</span>
            </CardTitle>
            <CardDescription>Configured SOC analysts & permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-200">Alex Sterling (admin@sumitah.local)</div>
                <div className="text-[10px] text-gray-400 font-mono">Role: SECURITY_ADMIN</div>
              </div>
              <Badge variant="jade">Full Admin</Badge>
            </div>
            <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-200">Morgan Vance (hunter@sumitah.local)</div>
                <div className="text-[10px] text-gray-400 font-mono">Role: LEAD_HUNTER</div>
              </div>
              <Badge variant="active">Hunter</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Database className="w-4 h-4 text-jade-400" />
              <span>Database & Environment</span>
            </CardTitle>
            <CardDescription>Local SQLite / Production PostgreSQL design</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs font-mono text-gray-300">
            <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg space-y-1">
              <div>Database: SQLite (file:./dev.db)</div>
              <div>Schema Version: PostgreSQL-Ready Modular Monolith</div>
              <div>Secret Encryption: AES-256-GCM (Active)</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}