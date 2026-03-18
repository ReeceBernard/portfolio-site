import React from 'react';
import type { ResolvedAddress, ClaudeAnalysisResult, RentTier } from '../types';
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

export const CompsStep: React.FC<Props> = ({ subject, analysis, onContinue, onBack }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{subject.displayName.split(',').slice(0, 2).join(',')}</h2>
        <p className="text-gray-500 text-sm mt-1">Est. value: <span className="font-semibold text-gray-800">${analysis.estimatedValue.toLocaleString()}</span></p>
        <p className="text-gray-600 text-sm mt-2 italic">{analysis.summary}</p>
      </div>

      <CompsMap subject={subject} comps={analysis.comps} salesComps={analysis.salesComps ?? []} />

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-400"></span> Rental comps ({analysis.comps.length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-violet-400"></span> Sales comps ({(analysis.salesComps ?? []).length})
        </span>
      </div>

      {/* Rental comps table */}
      {analysis.comps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Rental Comps</h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-blue-50 text-gray-500 text-left">
                  <th className="px-3 py-2 font-medium">Address</th>
                  <th className="px-3 py-2 font-medium">Beds/Baths</th>
                  <th className="px-3 py-2 font-medium">Sqft</th>
                  <th className="px-3 py-2 font-medium">Listed</th>
                  <th className="px-3 py-2 font-medium text-right">Monthly Rent</th>
                </tr>
              </thead>
              <tbody>
                {analysis.comps.map((comp, i) => (
                  <tr key={i} className="border-t border-gray-100 bg-white hover:bg-blue-50">
                    <td className="px-3 py-2 text-gray-800">{comp.address}</td>
                    <td className="px-3 py-2 text-gray-600">{comp.bedrooms}bd / {comp.bathrooms}ba</td>
                    <td className="px-3 py-2 text-gray-600">{comp.squareFeet ? comp.squareFeet.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{comp.listingDate ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-blue-700">${comp.monthlyRent.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
                    <td className="px-3 py-2 text-gray-600">{comp.bedrooms}bd / {comp.bathrooms}ba</td>
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
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Rent estimates</h3>
        <div className="grid grid-cols-3 gap-3">
          {tiers.map(({ tier, label, color }) => (
            <div key={tier} className={`border-2 rounded-lg p-4 text-center transition-colors ${color}`}>
              <div className="font-semibold text-gray-900">{label}</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
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
