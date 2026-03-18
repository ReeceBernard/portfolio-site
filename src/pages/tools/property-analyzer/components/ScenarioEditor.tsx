import React, { useState } from 'react';
import type { Scenario, ScenarioParams } from '../types';
import { CurrencyInput } from '../../../../components/CurrencyInput';

interface Props {
  scenario: Scenario;
  onSave: (params: ScenarioParams) => void;
  onClose: () => void;
}

interface FieldDef {
  key: keyof ScenarioParams;
  label: string;
  type: 'currency' | 'pct' | 'int';
  min?: number;
  max?: number;
  step?: number;
}

const sections: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Purchase',
    fields: [
      { key: 'purchasePrice', label: 'Purchase Price', type: 'currency' },
      { key: 'renovationCosts', label: 'Renovation Costs', type: 'currency' },
      { key: 'downPaymentPct', label: 'Down Payment %', type: 'pct', min: 0, max: 100, step: 0.5 },
      { key: 'interestRate', label: 'Interest Rate %', type: 'pct', min: 0, max: 20, step: 0.05 },
      { key: 'loanTermYears', label: 'Loan Term (years)', type: 'int', min: 5, max: 30, step: 5 },
    ],
  },
  {
    title: 'Income',
    fields: [
      { key: 'monthlyGrossRent', label: 'Monthly Gross Rent', type: 'currency' },
      { key: 'vacancyPct', label: 'Vacancy Rate %', type: 'pct', min: 0, max: 50, step: 0.5 },
    ],
  },
  {
    title: 'Expenses',
    fields: [
      { key: 'monthlyInsurance', label: 'Monthly Insurance', type: 'currency' },
      { key: 'annualPropertyTaxPct', label: 'Property Tax % (annual)', type: 'pct', min: 0, max: 5, step: 0.05 },
      { key: 'annualMaintenancePct', label: 'Maintenance % (annual)', type: 'pct', min: 0, max: 5, step: 0.05 },
    ],
  },
  {
    title: 'Growth Rates',
    fields: [
      { key: 'rentAppreciationPct', label: 'Rent Appreciation %', type: 'pct', min: 0, max: 10, step: 0.1 },
      { key: 'propertyAppreciationPct', label: 'Property Appreciation %', type: 'pct', min: 0, max: 10, step: 0.1 },
      { key: 'taxInsuranceGrowthPct', label: 'Tax & Insurance Growth %', type: 'pct', min: 0, max: 10, step: 0.1 },
      { key: 'otherExpenseGrowthPct', label: 'Other Expense Growth %', type: 'pct', min: 0, max: 10, step: 0.1 },
    ],
  },
];

export const ScenarioEditor: React.FC<Props> = ({ scenario, onSave, onClose }) => {
  const [params, setParams] = useState<ScenarioParams>({ ...scenario.params });

  const set = (key: keyof ScenarioParams, value: number) => setParams((p) => ({ ...p, [key]: value }));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Edit: {scenario.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {sections.map(({ title, fields }) => (
            <div key={title}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
              <div className="space-y-3">
                {fields.map(({ key, label, type, min, max, step }) => (
                  <div key={key}>
                    {type === 'currency' ? (
                      <CurrencyInput
                        label={label}
                        value={params[key] as number}
                        onChange={(v) => set(key, v)}
                      />
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {label}: {(params[key] as number).toFixed(type === 'int' ? 0 : 2)}
                          {type === 'int' ? '' : '%'}
                        </label>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={params[key] as number}
                          onChange={(e) => set(key, parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                          <span>{min}{type === 'int' ? '' : '%'}</span>
                          <span>{max}{type === 'int' ? '' : '%'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(params); onClose(); }}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
          >
            Save & Recalculate
          </button>
        </div>
      </div>
    </>
  );
};
