import React from 'react';
import type { Scenario } from '../types';
import { MetricsGrid } from './MetricsGrid';
import { ThirtyYearTable } from './ThirtyYearTable';

interface Props {
  scenario: Scenario;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

const tierBadge: Record<string, string> = {
  conservative: 'bg-blue-100 text-blue-700',
  median: 'bg-green-100 text-green-700',
  optimistic: 'bg-purple-100 text-purple-700',
};

export const ScenarioCard: React.FC<Props> = ({ scenario, onEdit, onDelete, canDelete }) => {
  const [showTable, setShowTable] = React.useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{scenario.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierBadge[scenario.tier]}`}>
              {scenario.tier}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            ${scenario.params.monthlyGrossRent.toLocaleString()}/mo
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="text-sm px-3 py-1 border border-green-600 rounded-md bg-white hover:bg-green-50 text-green-600 transition-colors"
          >
            Edit
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              className="text-sm px-3 py-1 border border-red-300 rounded-md bg-white hover:bg-red-50 text-red-600 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <MetricsGrid metrics={scenario.metrics} />

        <button
          onClick={() => setShowTable((v) => !v)}
          className="text-sm text-green-600 hover:text-green-700 font-medium bg-transparent border-0 p-0 cursor-pointer"
        >
          {showTable ? '▲ Hide' : '▼ Show'} 30-Year Projection
        </button>

        {showTable && <ThirtyYearTable projection={scenario.projection} />}
      </div>
    </div>
  );
};
