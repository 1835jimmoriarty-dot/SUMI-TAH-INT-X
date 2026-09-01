'use client';
import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-amber-950/60 border-b border-amber-800/60 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-amber-200">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
        <span>
          <strong className="text-amber-300 font-semibold">DEMO ENVIRONMENT ACTIVE:</strong> Displaying seeded threat intelligence and simulated multi-SIEM telemetry.
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <ShieldCheck className="w-3.5 h-3.5 text-jade-400" />
        <span className="text-gray-400 text-[11px]">Enterprise Security Boundaries Enforced</span>
      </div>
    </div>
  );
}