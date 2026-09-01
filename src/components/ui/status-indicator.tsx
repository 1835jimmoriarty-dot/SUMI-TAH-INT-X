import React from 'react';
import { clsx } from 'clsx';

export interface StatusIndicatorProps {
  status: 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE' | 'NOT_CONFIGURED';
  label?: string;
  pulse?: boolean;
}

export function StatusIndicator({ status, label, pulse = true }: StatusIndicatorProps) {
  const colors = {
    HEALTHY: 'bg-emerald-500 text-emerald-400',
    DEGRADED: 'bg-amber-500 text-amber-400',
    UNREACHABLE: 'bg-red-500 text-red-400',
    NOT_CONFIGURED: 'bg-gray-500 text-gray-400',
  };

  const ringColors = {
    HEALTHY: 'bg-emerald-500/20',
    DEGRADED: 'bg-amber-500/20',
    UNREACHABLE: 'bg-red-500/20',
    NOT_CONFIGURED: 'bg-gray-500/20',
  };

  return (
    <div className="inline-flex items-center space-x-2">
      <span className="relative flex h-2.5 w-2.5">
        {pulse && status === 'HEALTHY' && (
          <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', colors[status].split(' ')[0])} />
        )}
        <span className={clsx('relative inline-flex rounded-full h-2.5 w-2.5', colors[status].split(' ')[0])} />
      </span>
      {label && <span className={clsx('text-xs font-mono font-medium', colors[status].split(' ')[1])}>{label}</span>}
    </div>
  );
}