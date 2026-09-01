'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SetupPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('Global Security Operations Center');
  const [adminName, setAdminName] = useState('Alex Sterling');
  const [adminEmail, setAdminEmail] = useState('admin@sumitah.local');
  const [adminPassword, setAdminPassword] = useState('AdminPassword123!');
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => setIsInitialized(d.isInitialized))
      .catch(() => setIsInitialized(false));
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');

      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isInitialized === true) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-charcoal-900 border border-charcoal-800 p-8 rounded-2xl text-center">
          <CheckCircle2 className="w-12 h-12 text-jade-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-100">System Already Initialized</h2>
          <p className="text-xs text-gray-400 mt-2 mb-6">
            The SUMI-TAH environment is already configured with administrative credentials.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Proceed to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-charcoal-900 border border-charcoal-800 p-8 rounded-2xl shadow-2xl">
        <div className="flex items-center space-x-3 mb-6 border-b border-charcoal-800 pb-4">
          <ShieldCheck className="w-8 h-8 text-jade-400" />
          <div>
            <h2 className="text-lg font-bold text-gray-100">First-Run Platform Initialization</h2>
            <p className="text-xs text-gray-400">Configure root organization and primary administrator</p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-950/60 border border-red-800 rounded-lg flex items-center space-x-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSetup} className="space-y-4">
          <Input
            label="Organization / Company Name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
          <Input
            label="Security Administrator Name"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            required
          />
          <Input
            label="Admin Email"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
          />
          <Input
            label="Initial Master Password"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" className="w-full mt-4" isLoading={loading}>
            Initialize SUMI-TAH Platform
          </Button>
        </form>
      </div>
    </div>
  );
}