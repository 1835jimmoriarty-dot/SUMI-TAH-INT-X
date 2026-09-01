'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  IOC: 'bg-jade-900/50 text-jade-300 border-jade-700',
  HUNT: 'bg-blue-900/50 text-blue-300 border-blue-700',
  CASE: 'bg-red-900/50 text-red-300 border-red-700',
  HYPOTHESIS: 'bg-purple-900/50 text-purple-300 border-purple-700',
  ACTOR: 'bg-orange-900/50 text-orange-300 border-orange-700',
  'ATT&CK': 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
};

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Auto-focus on open; clear on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (link: string) => {
    onClose();
    router.push(link);
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-charcoal-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-charcoal-900 border border-charcoal-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-charcoal-800">
          <Search className="w-5 h-5 text-jade-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search IOCs, hunts, cases, actors, ATT&CK techniques..."
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-gray-400 hover:text-gray-200 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-[10px] bg-charcoal-950 text-gray-400 rounded border border-charcoal-700 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[28rem] overflow-y-auto p-2">
          {isSearching && (
            <div className="py-8 text-center text-xs text-gray-400 font-mono animate-pulse">
              Querying enterprise telemetry...
            </div>
          )}

          {!isSearching && query && results.length === 0 && (
            <div className="py-8 text-center text-xs text-gray-400 font-mono">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {!isSearching && !query && (
            <div className="py-8 text-center text-xs text-gray-500 font-mono">
              Start typing to search across all platform entities
            </div>
          )}

          {results.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(item.link)}
              className="w-full p-3 rounded-xl hover:bg-charcoal-800 transition-colors cursor-pointer flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
                    CATEGORY_COLORS[item.category] || 'bg-charcoal-800 text-gray-400 border-charcoal-600'
                  }`}
                >
                  {item.category}
                </span>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-gray-200 group-hover:text-jade-400 transition-colors truncate">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono truncate">
                    {item.subtitle}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-jade-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}