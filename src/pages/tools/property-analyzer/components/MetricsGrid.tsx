import React from 'react';
import type { ScenarioMetrics } from '../types';

interface Props {
  metrics: ScenarioMetrics;
}

const fmt = (n: number, prefix = '', suffix = '', decimals = 0) => {
  const abs = Math.abs(n);
  const formatted = abs >= 1000
    ? `${prefix}${abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
    : `${prefix}${abs.toFixed(decimals)}${suffix}`;
  return n < 0 ? `-${formatted}` : formatted;
};

const red = (n: number) => n < 0 ? 'text-red-600' : 'text-gray-900';

export const MetricsGrid: React.FC<Props> = ({ metrics }) => {
  const items = [
    { label: 'Total Cash In', value: fmt(metrics.totalCashDown, '$'), class: 'text-gray-900' },
    { label: 'Annual Cash Flow', value: fmt(metrics.annualCashFlow, '$'), class: red(metrics.annualCashFlow) },
    { label: 'Cash-on-Cash Return', value: fmt(metrics.cashOnCashReturn, '', '%', 1), class: red(metrics.cashOnCashReturn) },
    { label: 'Debt Coverage Ratio', value: fmt(metrics.debtCoverageRatio, '', '', 2), class: metrics.debtCoverageRatio >= 1.25 ? 'text-green-600' : metrics.debtCoverageRatio >= 1 ? 'text-yellow-600' : 'text-red-600' },
    { label: 'Gross Rent Multiplier', value: fmt(metrics.grossRentMultiplier, '', 'x', 1), class: 'text-gray-900' },
    { label: 'Yr1 Principal Paydown', value: fmt(metrics.year1PrincipalPaydown, '$'), class: 'text-gray-900' },
    { label: 'Yr1 Appreciation', value: fmt(metrics.year1Appreciation, '$'), class: 'text-gray-900' },
    { label: 'Yr1 Net Worth Gain', value: fmt(metrics.year1TotalNetWorthGain, '$'), class: red(metrics.year1TotalNetWorthGain) },
    { label: 'Total Return (Yr1)', value: fmt(metrics.totalReturn, '', '%', 1), class: red(metrics.totalReturn) },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">{item.label}</div>
          <div className={`text-base font-bold ${item.class}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
};
