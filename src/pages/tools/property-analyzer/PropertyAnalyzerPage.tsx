import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  AnalyzerStep, ResolvedAddress, ClaudeAnalysisResult,
  Scenario, ScenarioParams, RentTier, HistoryItem,
} from './types';
import { buildScenario } from './lib/calculations';
import { analyzeProperty, fetchCallsRemaining } from './lib/claude';
import { useLocalStorage, TTL } from '../../../hooks/use-local-storage';
import { AddressStep } from './components/AddressStep';
import { CompsStep } from './components/CompsStep';
import { ScenariosStep } from './components/ScenariosStep';

interface FredApiResponse { series: string; rate: number; date: string; timestamp: string; fallback?: boolean; }

const FALLBACK_RATE = 7.2;

interface AnalyzerState {
  step: AnalyzerStep;
  address: ResolvedAddress | null;
  analysis: ClaudeAnalysisResult | null;
  scenarios: Scenario[];
}

function makeDefaultParams(
  analysis: ClaudeAnalysisResult,
  tier: RentTier,
  interestRate: number
): ScenarioParams {
  return {
    purchasePrice: analysis.estimatedValue,
    renovationCosts: 0,
    downPaymentPct: 25,
    interestRate,
    loanTermYears: 30,
    monthlyGrossRent: analysis.rentRanges[tier],
    vacancyPct: 5,
    monthlyInsurance: 150,
    annualPropertyTaxPct: 1.5,
    annualMaintenancePct: 1,
    rentAppreciationPct: 2,
    propertyAppreciationPct: 2.5,
    taxInsuranceGrowthPct: 1.5,
    otherExpenseGrowthPct: 2.5,
  };
}

const TIERS: RentTier[] = ['conservative', 'median', 'optimistic'];
const TIER_NAMES: Record<RentTier, string> = {
  conservative: 'Conservative',
  median: 'Median',
  optimistic: 'Optimistic',
};

const STEPS: AnalyzerStep[] = ['address', 'comps', 'scenarios'];
const STEP_LABELS: Record<AnalyzerStep, string> = {
  address: 'Address',
  comps: 'Comps',
  scenarios: 'Scenarios',
};

function getProxyBase() {
  return process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://rb-dev-api.vercel.app';
}

export const PropertyAnalyzerPage: React.FC = () => {
  const [state, setState] = useState<AnalyzerState>({
    step: 'address',
    address: null,
    analysis: null,
    scenarios: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interestRate, setInterestRate] = useState(FALLBACK_RATE);
  const [callsRemaining, setCallsRemaining] = useState<number | null>(null);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('property-analyzer-history', [], TTL.ONE_MONTH);
  const [cachedRates, setCachedRates] = useLocalStorage(
    'fred-rate-cache',
    {} as Record<string, FredApiResponse>,
    TTL.ONE_DAY
  );

  // Fetch FRED rate on mount
  useEffect(() => {
    const series = 'MORTGAGE30US';
    const cached = cachedRates[series];
    if (cached) {
      const age = Date.now() - new Date(cached.timestamp).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        setInterestRate(Number(cached.rate.toFixed(2)));
        return;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      setInterestRate(FALLBACK_RATE);
      return;
    }

    fetch(`${getProxyBase()}/api/fred-proxy?series=${series}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: FredApiResponse) => {
        if (data.rate && !isNaN(data.rate)) {
          const rate = Number(data.rate.toFixed(2));
          setInterestRate(rate);
          setCachedRates((prev) => ({ ...prev, [series]: data }));
        }
      })
      .catch(() => setInterestRate(FALLBACK_RATE));
  }, []);

  useEffect(() => {
    fetchCallsRemaining().then(setCallsRemaining);
  }, []);

  const handleAnalyze = async (address: ResolvedAddress) => {
    setLoading(true);
    setError(null);
    try {
      const { result: analysis, callsRemaining: remaining } = await analyzeProperty(address);
      setCallsRemaining(remaining);
      const scenarios = TIERS.map((tier) =>
        buildScenario(
          crypto.randomUUID(),
          TIER_NAMES[tier],
          tier,
          makeDefaultParams(analysis, tier, interestRate)
        )
      );
      const historyItem: HistoryItem = { id: crypto.randomUUID(), address, analysis, searchedAt: new Date().toISOString() };
      setHistory((prev) => [historyItem, ...prev.filter((h) => h.address.displayName !== address.displayName)].slice(0, 10));
      setState({ step: 'comps', address, analysis, scenarios });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateScenario = (id: string, params: ScenarioParams) => {
    setState((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) =>
        s.id === id ? buildScenario(id, s.name, s.tier, params) : s
      ),
    }));
  };

  const handleAddScenario = (tier: RentTier) => {
    if (!state.analysis) return;
    const count = state.scenarios.filter((s) => s.tier === tier).length;
    const name = count === 0 ? TIER_NAMES[tier] : `${TIER_NAMES[tier]} ${count + 1}`;
    const newScenario = buildScenario(
      crypto.randomUUID(),
      name,
      tier,
      makeDefaultParams(state.analysis, tier, interestRate)
    );
    setState((prev) => ({ ...prev, scenarios: [...prev.scenarios, newScenario] }));
  };

  const handleLoadHistory = (item: HistoryItem) => {
    const scenarios = TIERS.map((tier) =>
      buildScenario(crypto.randomUUID(), TIER_NAMES[tier], tier, makeDefaultParams(item.analysis, tier, interestRate))
    );
    setState({ step: 'comps', address: item.address, analysis: item.analysis, scenarios });
  };

  const handleDeleteScenario = (id: string) => {
    setState((prev) => ({ ...prev, scenarios: prev.scenarios.filter((s) => s.id !== id) }));
  };

  const currentStepIndex = STEPS.indexOf(state.step);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/tools" className="text-green-600 hover:text-green-700 font-semibold transition-colors">
              ← Back to Tools
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Property Analyzer</h1>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <ol className="flex items-center gap-2 text-sm">
            {STEPS.map((step, i) => (
              <React.Fragment key={step}>
                {i > 0 && <li className="text-gray-400">→</li>}
                <li>
                  {i < currentStepIndex ? (
                    <button
                      onClick={() => setState((p) => ({ ...p, step }))}
                      className="font-medium text-gray-500 hover:text-green-600 transition-colors underline-offset-2 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                    >
                      {i + 1}. {STEP_LABELS[step]}
                    </button>
                  ) : (
                    <span className={`font-medium ${i === currentStepIndex ? 'text-green-600' : 'text-gray-300'}`}>
                      {i + 1}. {STEP_LABELS[step]}
                    </span>
                  )}
                </li>
              </React.Fragment>
            ))}
          </ol>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {state.step === 'address' && (
          <AddressStep
            onSubmit={handleAnalyze}
            loading={loading}
            error={error}
            history={history}
            onLoadHistory={handleLoadHistory}
            callsRemaining={callsRemaining}
          />
        )}

        {state.step === 'comps' && state.address && state.analysis && (
          <CompsStep
            subject={state.address}
            analysis={state.analysis}
            onContinue={() => setState((p) => ({ ...p, step: 'scenarios' }))}
            onBack={() => setState((p) => ({ ...p, step: 'address' }))}
          />
        )}

        {state.step === 'scenarios' && state.address && state.analysis && (
          <ScenariosStep
            scenarios={state.scenarios}
            onUpdateScenario={handleUpdateScenario}
            onAddScenario={handleAddScenario}
            onDeleteScenario={handleDeleteScenario}
            subjectAddress={state.address.displayName}
            subject={state.address}
            comps={state.analysis.comps}
            salesComps={state.analysis.salesComps ?? []}
          />
        )}
      </main>
    </div>
  );
};
