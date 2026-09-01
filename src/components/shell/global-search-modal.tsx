'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Shield, Crosshair, FolderGit2, Hash } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';

export function GlobalSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    matches: any[];
    extractedIndicators: any[];
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/iocs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (url: string) => {
    onClose();
    router.push(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Universal SOC Intelligence Search" maxWidth="2xl">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            autoFocus
            type="text"
            placeholder="Paste IP, Domain, Hash, URL (e.g. hxxps://evil[.]com), CVE, or keyword..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-jade-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 px-3 py-1 bg-jade-500 text-charcoal-950 font-semibold text-xs rounded hover:bg-jade-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {results && (
          <div className="space-y-4 mt-4 max-h-96 overflow-y-auto pr-1">
            {/* Extracted IOCs */}
            {results.extractedIndicators.length > 0 && (
              <div>
                <h5 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                  Detected & Normalized Indicators ({results.extractedIndicators.length})
                </h5>
                <div className="space-y-1.5">
                  {results.extractedIndicators.map((ioc: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => navigateTo(`/iocs?search=${encodeURIComponent(ioc.normalizedValue)}`)}
                      className="p-3 bg-charcoal-950 hover:bg-charcoal-800 border border-charcoal-800 rounded-lg cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <Hash className="w-4 h-4 text-jade-400" />
                        <div>
                          <div className="text-xs font-mono text-gray-200">{ioc.normalizedValue}</div>
                          <div className="text-[10px] text-gray-400 font-mono">Defanged: {ioc.defangedValue}</div>
                        </div>
                      </div>
                      <Badge variant="jade">{ioc.type}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Database Matches */}
            {results.matches && results.matches.length > 0 && (
              <div>
                <h5 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                  Database Matches ({results.matches.length})
                </h5>
                <div className="space-y-1.5">
                  {results.matches.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => navigateTo('/iocs')}
                      className="p-3 bg-charcoal-950 hover:bg-charcoal-800 border border-charcoal-800 rounded-lg cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-mono text-gray-200">{item.value}</div>
                        <div className="text-[10px] text-gray-400">Score: {item.score}/100 • {item.observations?.length || 0} observations</div>
                      </div>
                      <Badge variant={item.reputation.toLowerCase()}>{item.reputation}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.extractedIndicators.length === 0 && (!results.matches || results.matches.length === 0) && (
              <div className="text-center py-8 text-gray-400 text-xs">
                No matching indicators or intelligence entities found.
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}