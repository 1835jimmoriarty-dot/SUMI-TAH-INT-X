'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@sumitah.local');
  const [password, setPassword] = useState('AdminPassword123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-jade-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-jade-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="mx-auto w-12 h-12 rounded-xl bg-jade-500/10 border border-jade-500/40 flex items-center justify-center text-jade-400 mb-4 shadow-lg">
          <ShieldAlert className="w-7 h-7 text-jade-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-100 font-sans">
          SUMI-TAH <span className="text-jade-400 text-sm font-mono uppercase bg-jade-950 px-2 py-0.5 rounded border border-jade-800">SOC</span>
        </h2>
        <p className="mt-2 text-xs text-gray-400 font-mono">
          Automated Threat Hunting & Adversary Intelligence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-charcoal-900 border border-charcoal-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center space-x-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Input
                label="Analyst Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@sumitah.local"
              />
            </div>

            <div>
              <Input
                label="Passphrase"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full py-2.5" isLoading={loading}>
              Authenticate to SOC Platform
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Seeded Credentials Quick Fill */}
          <div className="mt-6 pt-6 border-t border-charcoal-800">
            <h4 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2 text-center">
              Quick Switch Demo Roles
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@sumitah.local');
                  setPassword('AdminPassword123!');
                }}
                className="px-2.5 py-1.5 bg-charcoal-950 hover:bg-charcoal-800 border border-charcoal-700 rounded text-[11px] font-mono text-gray-300 text-left transition-colors"
              >
                <span className="font-semibold text-jade-400 block">Security Admin</span>
                admin@sumitah.local
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('hunter@sumitah.local');
                  setPassword('HunterPassword123!');
                }}
                className="px-2.5 py-1.5 bg-charcoal-950 hover:bg-charcoal-800 border border-charcoal-700 rounded text-[11px] font-mono text-gray-300 text-left transition-colors"
              >
                <span className="font-semibold text-jade-400 block">Threat Hunter</span>
                hunter@sumitah.local
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}