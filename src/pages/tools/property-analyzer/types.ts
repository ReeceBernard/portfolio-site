export type AnalyzerStep = 'address' | 'comps' | 'scenarios';
export type RentTier = 'conservative' | 'median' | 'optimistic';

export interface ResolvedAddress {
  displayName: string;
  lat: number;
  lon: number;
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export interface RentalComp {
  address: string;
  lat: number;
  lon: number;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  squareFeet?: number;
  listingDate?: string; // YYYY-MM format
}

export interface SalesComp {
  address: string;
  lat: number;
  lon: number;
  bedrooms: number;
  bathrooms: number;
  salePrice: number;
  squareFeet?: number;
  saleDate?: string; // YYYY-MM
}

export interface SubjectProperty {
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  lotSizeSqFt: number | null;
  yearBuilt: number | null;
  propertyType: string | null;
  zoning: string | null;
}

export interface ClaudeAnalysisResult {
  subjectProperty: SubjectProperty;
  estimatedValue: number;
  rentRanges: { conservative: number; median: number; optimistic: number };
  comps: RentalComp[];
  salesComps: SalesComp[];
  summary: string;
}

export interface ScenarioParams {
  purchasePrice: number;
  renovationCosts: number;
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
  monthlyGrossRent: number;
  vacancyPct: number;
  monthlyInsurance: number;
  annualPropertyTaxPct: number;
  annualMaintenancePct: number;
  rentAppreciationPct: number;
  propertyAppreciationPct: number;
  taxInsuranceGrowthPct: number;
  otherExpenseGrowthPct: number;
}

export interface ScenarioMetrics {
  totalCashDown: number;
  annualCashFlow: number;
  cashOnCashReturn: number;
  debtCoverageRatio: number;
  grossRentMultiplier: number;
  year1PrincipalPaydown: number;
  year1Appreciation: number;
  year1TotalNetWorthGain: number;
  totalReturn: number;
}

export interface ProjectionRow {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  annualRent: number;
  annualExpenses: number;
  annualCashFlow: number;
  cumulativeCashFlow: number;
  principalPaydown: number;
  appreciation: number;
  totalNetWorthGain: number;
  cumulativeNetWorth: number;
  cocReturn: number;
  totalROI: number;
}

export interface Scenario {
  id: string;
  name: string;
  tier: RentTier;
  params: ScenarioParams;
  metrics: ScenarioMetrics;
  projection: ProjectionRow[];
}

export interface HistoryItem {
  id: string;
  address: ResolvedAddress;
  analysis: ClaudeAnalysisResult;
  searchedAt: string;
}
