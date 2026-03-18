import React from 'react';
import type { ProjectionRow } from '../types';

interface Props {
  projection: ProjectionRow[];
}

const k = (n: number) => {
  const abs = Math.abs(n);
  const s = abs >= 1000000 ? `${(abs / 1000000).toFixed(1)}M` : abs >= 1000 ? `${(abs / 1000).toFixed(0)}k` : abs.toFixed(0);
  return (n < 0 ? '-$' : '$') + s;
};

const pct = (n: number) => `${n >= 0 ? '' : ''}${n.toFixed(1)}%`;
const red = (n: number) => n < 0 ? 'text-red-600' : '';

export const ThirtyYearTable: React.FC<Props> = ({ projection }) => {
  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full border-collapse text-gray-900">
        <thead>
          <tr className="bg-gray-100 text-gray-600 text-left">
            <th className="px-2 py-1.5 sticky left-0 bg-gray-100 font-medium">Yr</th>
            <th className="px-2 py-1.5 font-medium">Value</th>
            <th className="px-2 py-1.5 font-medium">Equity</th>
            <th className="px-2 py-1.5 font-medium">Cash Flow</th>
            <th className="px-2 py-1.5 font-medium">Cum CF</th>
            <th className="px-2 py-1.5 font-medium">Principal</th>
            <th className="px-2 py-1.5 font-medium">Apprec.</th>
            <th className="px-2 py-1.5 font-medium">NW Gain</th>
            <th className="px-2 py-1.5 font-medium">Cum NW</th>
            <th className="px-2 py-1.5 font-medium">CoC</th>
            <th className="px-2 py-1.5 font-medium">ROI (ann)</th>
          </tr>
        </thead>
        <tbody>
          {projection.map((row) => (
            <tr key={row.year} className={`border-t border-gray-100 ${row.year % 5 === 0 ? 'bg-green-50' : 'bg-white hover:bg-gray-50'}`}>
              <td className="px-2 py-1 sticky left-0 bg-inherit font-medium text-gray-700 border-r border-gray-100">{row.year}</td>
              <td className="px-2 py-1">{k(row.propertyValue)}</td>
              <td className="px-2 py-1">{k(row.equity)}</td>
              <td className={`px-2 py-1 ${red(row.annualCashFlow)}`}>{k(row.annualCashFlow)}</td>
              <td className={`px-2 py-1 ${red(row.cumulativeCashFlow)}`}>{k(row.cumulativeCashFlow)}</td>
              <td className="px-2 py-1">{k(row.principalPaydown)}</td>
              <td className="px-2 py-1">{k(row.appreciation)}</td>
              <td className={`px-2 py-1 ${red(row.totalNetWorthGain)}`}>{k(row.totalNetWorthGain)}</td>
              <td className={`px-2 py-1 ${red(row.cumulativeNetWorth)}`}>{k(row.cumulativeNetWorth)}</td>
              <td className={`px-2 py-1 ${red(row.cocReturn)}`}>{pct(row.cocReturn)}</td>
              <td className={`px-2 py-1 ${red(row.totalROI)}`}>{pct(row.totalROI)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
