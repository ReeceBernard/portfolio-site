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
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              defaultValue=""
            >
              <option value="" disabled>+ Add Scenario</option>
              <option value="conservative">Conservative</option>
              <option value="median">Median</option>
              <option value="optimistic">Optimistic</option>
            </select>
            <div className="px-2 sm:px-3 py-2 border border-green-600 rounded-md text-sm text-green-600 bg-white hover:bg-green-50 font-medium flex items-center gap-1.5 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Scenario</span>
            </div>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Download Report"
            className="px-2 sm:px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md transition-colors flex items-center gap-2"
          >
            {downloading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="hidden sm:inline">Generating...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                <span className="hidden sm:inline">Download Report</span>
              </>
            )}
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
