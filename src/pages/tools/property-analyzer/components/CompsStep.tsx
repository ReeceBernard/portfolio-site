import React from 'react';
import type { ResolvedAddress, ClaudeAnalysisResult, RentTier, SubjectProperty, HudFmr } from '../types';
import { CompsMap } from './CompsMap';

interface Props {
  subject: ResolvedAddress;
  analysis: ClaudeAnalysisResult;
  onContinue: () => void;
  onBack: () => void;
}

const tiers: { tier: RentTier; label: string; color: string }[] = [
  { tier: 'conservative', label: 'Conservative', color: 'border-blue-200 bg-blue-50 hover:bg-blue-100' },
  { tier: 'median', label: 'Median', color: 'border-green-200 bg-green-50 hover:bg-green-100' },
  { tier: 'optimistic', label: 'Optimistic', color: 'border-purple-200 bg-purple-50 hover:bg-purple-100' },
];

function fmt(val: number | null | undefined, suffix = '') {
  return val != null ? `${val.toLocaleString()}${suffix}` : '—';
}

function PropertyStats({ p }: { p: SubjectProperty }) {
  const stats = [
    { label: 'Beds', value: fmt(p.bedrooms) },
    { label: 'Baths', value: fmt(p.bathrooms) },
    { label: 'Living Area', value: p.squareFeet != null ? `${p.squareFeet.toLocaleString()} sqft` : '—' },
    { label: 'Lot Size', value: p.lotSizeSqFt != null ? `${p.lotSizeSqFt.toLocaleString()} sqft` : '—' },
    { label: 'Year Built', value: p.yearBuilt != null ? String(p.yearBuilt) : '—' },
    { label: 'Type', value: p.propertyType ?? '—' },
    { label: 'Zoning', value: p.zoning ?? '—' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
          <div className="text-xs text-gray-400 mb-0.5">{label}</div>
          <div className="text-sm font-semibold text-gray-800">{value}</div>
        </div>
      ))}
    </div>
  );
}

const HUD_ROWS: { key: keyof Omit<HudFmr, 'year'>; label: string }[] = [
  { key: 'Efficiency', label: 'Studio' },
  { key: 'One-Bedroom', label: '1 BR' },
  { key: 'Two-Bedroom', label: '2 BR' },
  { key: 'Three-Bedroom', label: '3 BR' },
  { key: 'Four-Bedroom', label: '4 BR' },
];

function HudFmrTable({ hud, subjectBeds }: { hud: HudFmr; subjectBeds?: number | null }) {
  function bedsToKey(beds: number | null | undefined): keyof Omit<HudFmr, 'year'> | null {
    if (beds == null) return null;
    if (beds <= 0) return 'Efficiency';
    if (beds === 1) return 'One-Bedroom';
    if (beds === 2) return 'Two-Bedroom';
    if (beds === 3) return 'Three-Bedroom';
    return 'Four-Bedroom';
  }
  const highlightKey = bedsToKey(subjectBeds);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">HUD Fair Market Rents ({hud.year})</h3>
        <span className="text-xs text-gray-400">±20% range</span>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="bg-amber-50 text-gray-500 text-left">
              <th className="px-3 py-2 font-medium">Bedrooms</th>
              <th className="px-3 py-2 font-medium text-right">Low (−20%)</th>
              <th className="px-3 py-2 font-medium text-right">HUD FMR</th>
              <th className="px-3 py-2 font-medium text-right">High (+20%)</th>
            </tr>
          </thead>
          <tbody>
            {HUD_ROWS.map(({ key, label }) => {
              const fmr = hud[key];
              if (fmr == null) return null;
              const isSubject = key === highlightKey;
              return (
                <tr key={key} className={`border-t border-gray-100 ${isSubject ? 'bg-amber-50 font-semibold' : 'bg-white hover:bg-amber-50'}`}>
                  <td className="px-3 py-2 text-gray-800">
                    {label}{isSubject && <span className="ml-1.5 text-amber-600 text-xs">(subject)</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">${Math.round(fmr * 0.8).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-amber-700 font-semibold">${fmr.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-500">${Math.round(fmr * 1.2).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-1.5">Source: HUD Office of Policy Development and Research. Rent estimates use the subject property's bedroom count.</p>
    </div>
  );
}

export const CompsStep: React.FC<Props> = ({ subject, analysis, onContinue, onBack }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{subject.displayName.split(',').slice(0, 2).join(',')}</h2>
        <p className="text-gray-500 text-sm mt-1">Est. value: <span className="font-semibold text-gray-800">${analysis.estimatedValue.toLocaleString()}</span></p>
      </div>

      {analysis.subjectProperty && <PropertyStats p={analysis.subjectProperty} />}

      <p className="text-gray-600 text-sm italic">{analysis.summary}</p>

      <CompsMap subject={subject} comps={[]} salesComps={analysis.salesComps ?? []} />

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-violet-400"></span> Sales comps ({(analysis.salesComps ?? []).length})
        </span>
      </div>

      {/* HUD FMR table */}
      {analysis.hudFmr && typeof analysis.hudFmr.Efficiency === 'number' && (
        <HudFmrTable hud={analysis.hudFmr} subjectBeds={analysis.subjectProperty?.bedrooms} />
      )}

      {/* Sales comps table */}
      {(analysis.salesComps ?? []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Sales</h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-violet-50 text-gray-500 text-left">
                  <th className="px-3 py-2 font-medium">Address</th>
                  <th className="px-3 py-2 font-medium">Beds/Baths</th>
                  <th className="px-3 py-2 font-medium">Sqft</th>
                  <th className="px-3 py-2 font-medium">Sold</th>
                  <th className="px-3 py-2 font-medium text-right">Sale Price</th>
                </tr>
              </thead>
              <tbody>
                {(analysis.salesComps ?? []).map((comp, i) => (
                  <tr key={i} className="border-t border-gray-100 bg-white hover:bg-violet-50">
                    <td className="px-3 py-2 text-gray-800">{comp.address}</td>
                    <td className="px-3 py-2 text-gray-600">{comp.bedrooms != null ? `${comp.bedrooms}bd` : '—'} / {comp.bathrooms != null ? `${comp.bathrooms}ba` : '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{comp.squareFeet ? comp.squareFeet.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{comp.saleDate ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-violet-700">${comp.salePrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Rent estimates</h3>
        <p className="text-xs text-gray-400 mb-3">
          {analysis.hudFmr ? 'Derived from HUD FMR ±20% for this bedroom count.' : 'AI estimate — no HUD data available for this zip.'}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {tiers.map(({ tier, label, color }) => (
            <div key={tier} className={`border-2 rounded-lg p-2 sm:p-4 text-center transition-colors ${color}`}>
              <div className="font-semibold text-gray-900 text-xs sm:text-sm">{label}</div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                ${analysis.rentRanges[tier].toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">/mo</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onContinue}
          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
        >
          Build Scenarios →
        </button>
      </div>
    </div>
  );
};
