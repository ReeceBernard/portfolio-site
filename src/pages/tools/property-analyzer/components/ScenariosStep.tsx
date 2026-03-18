import React, { useState, useRef } from 'react';
import type { Scenario, ScenarioParams, RentTier, ResolvedAddress, RentalComp, SalesComp } from '../types';
import { ScenarioCard } from './ScenarioCard';
import { ScenarioEditor } from './ScenarioEditor';
import { generatePDF } from '../lib/pdf';
import { ReportView } from './ReportView';

interface Props {
  scenarios: Scenario[];
  onUpdateScenario: (id: string, params: ScenarioParams) => void;
  onAddScenario: (tier: RentTier) => void;
  onDeleteScenario: (id: string) => void;
  subjectAddress: string;
  subject: ResolvedAddress;
  comps: RentalComp[];
  salesComps: SalesComp[];
}

export const ScenariosStep: React.FC<Props> = ({
  scenarios,
  onUpdateScenario,
  onAddScenario,
  onDeleteScenario,
  subjectAddress,
  subject,
  comps,
  salesComps,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const editingScenario = editingId ? scenarios.find((s) => s.id === editingId) : null;

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      await generatePDF(reportRef.current, 'property-analysis.pdf');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Investment Scenarios</h2>
          <p className="text-sm text-gray-500 mt-0.5">{subjectAddress.split(',').slice(0, 2).join(',')}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select
              onChange={(e) => { if (e.target.value) { onAddScenario(e.target.value as RentTier); e.target.value = ''; } }}
              className="px-3 py-2 border border-green-600 rounded-md text-sm text-green-600 bg-white hover:bg-green-50 cursor-pointer appearance-none pr-8 font-medium"
              defaultValue=""
            >
              <option value="" disabled>+ Add Scenario</option>
              <option value="conservative">Conservative</option>
              <option value="median">Median</option>
              <option value="optimistic">Optimistic</option>
            </select>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md transition-colors flex items-center gap-2"
          >
            {downloading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating...
              </>
            ) : '↓ Download Report'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            onEdit={() => setEditingId(scenario.id)}
            onDelete={() => onDeleteScenario(scenario.id)}
            canDelete={scenarios.length > 1}
          />
        ))}
      </div>

      {editingScenario && (
        <ScenarioEditor
          scenario={editingScenario}
          onSave={(params) => onUpdateScenario(editingScenario.id, params)}
          onClose={() => setEditingId(null)}
        />
      )}

      {/* Off-screen report for PDF — fixed so it doesn't add scroll height */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <ReportView ref={reportRef} scenarios={scenarios} subjectAddress={subjectAddress} subject={subject} comps={comps} salesComps={salesComps} />
      </div>
    </div>
  );
};
