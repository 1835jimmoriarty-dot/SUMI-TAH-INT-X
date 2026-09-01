import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant = 
  | 'critical' | 'high' | 'medium' | 'low'
  | 'malicious' | 'suspicious' | 'benign' | 'unknown' | 'conflicting'
  | 'pending' | 'approved' | 'executed' | 'rejected'
  | 'active' | 'completed' | 'draft'
  | 'jade' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium tracking-wide uppercase border';

  const variants: Record<BadgeVariant, string> = {
    critical: 'bg-red-950/60 text-red-400 border-red-800/60',
    high: 'bg-orange-950/60 text-orange-400 border-orange-800/60',
    medium: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    low: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
    
    malicious: 'bg-red-950/70 text-red-300 border-red-700',
    suspicious: 'bg-amber-950/60 text-amber-300 border-amber-700',
    benign: 'bg-emerald-950/60 text-emerald-400 border-emerald-800',
    unknown: 'bg-charcoal-800 text-gray-400 border-charcoal-700',
    conflicting: 'bg-purple-950/60 text-purple-300 border-purple-800',

    pending: 'bg-amber-950/80 text-amber-300 border-amber-600 animate-pulse',
    approved: 'bg-jade-950/60 text-jade-300 border-jade-600',
    executed: 'bg-emerald-950/70 text-emerald-300 border-emerald-600',
    rejected: 'bg-charcoal-800 text-gray-400 border-charcoal-700 line-through',

    active: 'bg-jade-950/70 text-jade-400 border-jade-700',
    completed: 'bg-charcoal-800 text-gray-300 border-charcoal-600',
    draft: 'bg-charcoal-850 text-gray-400 border-charcoal-700 border-dashed',

    jade: 'bg-jade-950/80 text-jade-400 border-jade-600',
    neutral: 'bg-charcoal-800 text-gray-300 border-charcoal-700',
  };

  return (
    <span className={twMerge(clsx(base, variants[variant], className))} {...props}>
      {children}
    </span>
  );
}