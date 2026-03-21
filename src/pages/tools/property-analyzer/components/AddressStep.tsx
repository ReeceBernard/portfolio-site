import React, { useState, useEffect, useRef } from 'react';
import type { NominatimResult, ResolvedAddress, HistoryItem } from '../types';
import { searchAddress } from '../lib/geocode';

interface Props {
  onSubmit: (address: ResolvedAddress) => void;
  loading: boolean;
  error: string | null;
  history: HistoryItem[];
  onLoadHistory: (item: HistoryItem) => void;
  callsRemaining: number | null;
}

const MANUAL_MAX_CHARS = 120;

// Starts with a house number, has some content, contains a 5-digit zip
const isValidStreetAddress = (addr: string) => /^\d+,?\s+\S.+\b\d{5}\b/.test(addr);

// Extra checks for the free-text manual field: not too long, not too many words
const isValidManualAddress = (addr: string) =>
  addr.length <= MANUAL_MAX_CHARS &&
  addr.trim().split(/\s+/).length <= 12 &&
  isValidStreetAddress(addr);

export const AddressStep: React.FC<Props> = ({ onSubmit, loading, error, history, onLoadHistory, callsRemaining }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [selected, setSelected] = useState<ResolvedAddress | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected || manualMode) return;
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
  }, [query, selected, manualMode]);

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
    setAddressError(null);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
    setAddressError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (manualMode) {
      if (!isValidManualAddress(manualQuery)) {
        setAddressError('Please enter a valid street address including zip code (e.g. 123 Main St, Austin, TX 78701).');
        return;
      }
      setAddressError(null);
      setGeocoding(true);
      try {
        const results = await searchAddress(manualQuery);
        const first = results[0];
        if (!first) {
          setAddressError("Couldn't find that address. Double-check the street number, city, and zip.");
          return;
        }
        onSubmit({ displayName: manualQuery, lat: parseFloat(first.lat), lon: parseFloat(first.lon) });
      } finally {
        setGeocoding(false);
      }
      return;
    }

    if (!selected) return;
    if (!isValidStreetAddress(selected.displayName)) {
      setAddressError('Please select a specific street address (e.g. 123 Main St, Austin, TX 78701).');
      return;
    }
    setAddressError(null);
    onSubmit(selected);
  };

  const enterManualMode = () => {
    setManualMode(true);
    setSelected(null);
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setAddressError(null);
  };

  const exitManualMode = () => {
    setManualMode(false);
    setManualQuery('');
    setAddressError(null);
  };

  const isSubmitDisabled = loading || geocoding || callsRemaining === 0 ||
    (manualMode ? !manualQuery.trim() : !selected);

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyze a Property</h2>
      <p className="text-gray-500 mb-6">Enter a US address to get AI-powered rental comps and investment projections.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {manualMode ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Property Address</label>
              <button type="button" onClick={exitManualMode} className="text-xs text-blue-500 hover:text-blue-700 hover:underline bg-transparent border-0 p-0 cursor-pointer">
                ← Back to search
              </button>
            </div>
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => { setManualQuery(e.target.value); setAddressError(null); }}
              placeholder="123 Main St, Austin, TX 78701"
              maxLength={MANUAL_MAX_CHARS}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              autoComplete="off"
              autoFocus
            />
            <div className="flex justify-between mt-1">
              {addressError
                ? <p className="text-xs text-red-500">{addressError}</p>
                : <span />}
              <p className={`text-xs ${manualQuery.length >= MANUAL_MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
                {manualQuery.length}/{MANUAL_MAX_CHARS}
              </p>
            </div>
          </div>
        ) : (
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
            {addressError && <p className="text-xs text-red-500 mt-1">{addressError}</p>}
            <button type="button" onClick={enterManualMode} className="text-xs text-blue-500 hover:text-blue-700 hover:underline mt-1 transition-colors bg-transparent border-0 p-0 cursor-pointer">
              Can't find your property? Enter address manually
            </button>
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
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
        >
          {(loading || geocoding) ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {geocoding ? 'Looking up address...' : 'Analyzing with Claude...'}
            </>
          ) : 'Analyze Property'}
        </button>

        {callsRemaining !== null && (
          <p className={`text-xs text-center ${
            callsRemaining === 0 ? 'text-red-500 font-medium' :
            callsRemaining <= 10 ? 'text-amber-500' :
            'text-gray-400'
          }`}>
            {callsRemaining === 0
              ? 'Daily limit reached. Try again tomorrow.'
              : `${callsRemaining} / 100 analyses remaining today`}
          </p>
        )}
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
