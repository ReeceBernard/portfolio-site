import React, { useState, useEffect, useRef } from 'react';
import type { NominatimResult, ResolvedAddress, HistoryItem } from '../types';
import { searchAddress } from '../lib/geocode';

interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onSubmit: (address: ResolvedAddress) => void;
  loading: boolean;
  error: string | null;
  history: HistoryItem[];
  onLoadHistory: (item: HistoryItem) => void;
}

export const AddressStep: React.FC<Props> = ({ apiKey, onApiKeyChange, onSubmit, loading, error, history, onLoadHistory }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [selected, setSelected] = useState<ResolvedAddress | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) return;
    const timer = setTimeout(async () => {
      if (query.length >= 3) {
        const results = await searchAddress(query);
        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selected]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (result: NominatimResult) => {
    setSelected({ displayName: result.display_name, lat: parseFloat(result.lat), lon: parseFloat(result.lon) });
    setQuery(result.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !apiKey.trim()) return;
    onSubmit(selected);
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyze a Property</h2>
      <p className="text-gray-500 mb-6">Enter a US address and your Claude API key to get AI-powered rental comps and investment projections.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Address field */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (selected) setSelected(null); }}
              placeholder="123 Main St, Austin, TX"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 pr-8"
              autoComplete="off"
            />
            {selected && (
              <button type="button" onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
            )}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
              {suggestions.map((s) => (
                <li
                  key={s.place_id}
                  onClick={() => handleSelect(s)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-green-50 cursor-pointer"
                >
                  {s.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* API Key field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Claude API Key</label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 pr-16 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-1"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Stored locally in your browser. Never sent to any server other than Anthropic.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
            {error}
          </div>
        )}

          <button
          type="submit"
          disabled={!selected || !apiKey.trim() || loading}
          className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Analyzing with Claude...
            </>
          ) : 'Analyze Property'}
        </button>
      </form>

      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Searches</h3>
          <ul className="space-y-2">
            {history.slice(0, 5).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onLoadHistory(item)}
                  className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.address.displayName.split(',').slice(0, 2).join(',')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(item.searchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}Est. ${item.analysis.estimatedValue.toLocaleString()}
                        {' · '}Median ${item.analysis.rentRanges.median.toLocaleString()}/mo
                      </p>
                    </div>
                    <span className="ml-3 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                      Load →
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-8 text-xs text-gray-400 text-center">
        For entertainment purposes only. Not financial or investment advice. Always do your own research and consult a qualified professional before making any investment decisions.
      </p>
    </div>
  );
};
