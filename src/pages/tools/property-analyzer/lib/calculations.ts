import type { ScenarioParams, ScenarioMetrics, ProjectionRow, Scenario, RentTier } from '../types';

export function monthlyPayment(principal: number, annualRatePct: number, termYears: number): number {
  if (annualRatePct === 0) return principal / (termYears * 12);
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function loanBalance(principal: number, annualRatePct: number, termYears: number, monthsElapsed: number): number {
  if (monthsElapsed >= termYears * 12) return 0;
  if (annualRatePct === 0) return principal - (principal / (termYears * 12)) * monthsElapsed;
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const m = monthsElapsed;
  return principal * (Math.pow(1 + r, n) - Math.pow(1 + r, m)) / (Math.pow(1 + r, n) - 1);
}

export function yearlyPrincipalPaydown(
  principal: number,
  annualRatePct: number,
  termYears: number,
  yearIndex: number
): number {
  const startBalance = loanBalance(principal, annualRatePct, termYears, (yearIndex - 1) * 12);
  const endBalance = loanBalance(principal, annualRatePct, termYears, yearIndex * 12);
  return startBalance - endBalance;
}

export function computeMetrics(params: ScenarioParams): ScenarioMetrics {
  const {
    purchasePrice, renovationCosts, downPaymentPct, interestRate, loanTermYears,
    monthlyGrossRent, vacancyPct, monthlyInsurance, annualPropertyTaxPct,
    annualMaintenancePct, propertyAppreciationPct,
  } = params;

  const totalCashDown = purchasePrice * (downPaymentPct / 100) + renovationCosts;
  const loanAmt = purchasePrice - purchasePrice * (downPaymentPct / 100);

  const mortgage = monthlyPayment(loanAmt, interestRate, loanTermYears);
  const monthlyEffRent = monthlyGrossRent * (1 - vacancyPct / 100);
  const monthlyTax = (purchasePrice * annualPropertyTaxPct / 100) / 12;
  const monthlyMaint = (purchasePrice * annualMaintenancePct / 100) / 12;
  const monthlyExpenses = mortgage + monthlyTax + monthlyInsurance + monthlyMaint;

  const annualCashFlow = (monthlyEffRent - monthlyExpenses) * 12;
  const annualNOI = (monthlyEffRent - monthlyTax - monthlyInsurance - monthlyMaint) * 12;
  const annualDebtService = mortgage * 12;
  const debtCoverageRatio = annualDebtService > 0 ? annualNOI / annualDebtService : 0;
  const grossRentMultiplier = (monthlyGrossRent * 12) > 0 ? purchasePrice / (monthlyGrossRent * 12) : 0;
  const cashOnCashReturn = totalCashDown > 0 ? (annualCashFlow / totalCashDown) * 100 : 0;

  const year1PrincipalPaydown = yearlyPrincipalPaydown(loanAmt, interestRate, loanTermYears, 1);
  const year1Appreciation = purchasePrice * (propertyAppreciationPct / 100);
  const year1TotalNetWorthGain = annualCashFlow + year1PrincipalPaydown + year1Appreciation;
  const totalReturn = totalCashDown > 0 ? (year1TotalNetWorthGain / totalCashDown) * 100 : 0;

  return {
    totalCashDown,
    annualCashFlow,
    cashOnCashReturn,
    debtCoverageRatio,
    grossRentMultiplier,
    year1PrincipalPaydown,
    year1Appreciation,
    year1TotalNetWorthGain,
    totalReturn,
  };
}

export function compute30YearProjection(params: ScenarioParams): ProjectionRow[] {
  const {
    purchasePrice, downPaymentPct, interestRate, loanTermYears,
    monthlyGrossRent, vacancyPct, monthlyInsurance, annualPropertyTaxPct,
    annualMaintenancePct, rentAppreciationPct, propertyAppreciationPct,
    taxInsuranceGrowthPct, otherExpenseGrowthPct,
  } = params;

  const loanAmt = purchasePrice - purchasePrice * (downPaymentPct / 100);
  const totalCashDown = purchasePrice * (downPaymentPct / 100) + params.renovationCosts;
  const mortgage = monthlyPayment(loanAmt, interestRate, loanTermYears);

  const rows: ProjectionRow[] = [];
  let cumulativeCashFlow = 0;
  let cumulativeNetWorth = 0;
  let prevPropertyValue = purchasePrice;

  for (let year = 1; year <= 30; year++) {
    const propertyValue = purchasePrice * Math.pow(1 + propertyAppreciationPct / 100, year);
    const balance = loanBalance(loanAmt, interestRate, loanTermYears, year * 12);
    const equity = propertyValue - balance;

    const annualRent = monthlyGrossRent * 12 * Math.pow(1 + rentAppreciationPct / 100, year - 1);
    const effectiveRent = annualRent * (1 - vacancyPct / 100);

    const annualPropTax = (purchasePrice * annualPropertyTaxPct / 100) * Math.pow(1 + taxInsuranceGrowthPct / 100, year - 1);
    const annualIns = (monthlyInsurance * 12) * Math.pow(1 + taxInsuranceGrowthPct / 100, year - 1);
    const annualMaint = (purchasePrice * annualMaintenancePct / 100) * Math.pow(1 + otherExpenseGrowthPct / 100, year - 1);
    const annualMortgage = year <= loanTermYears ? mortgage * 12 : 0;

    const annualExpenses = annualMortgage + annualPropTax + annualIns + annualMaint;
    const annualCashFlow = effectiveRent - annualExpenses;

    const appreciation = propertyValue - prevPropertyValue;
    const principalPaydown = yearlyPrincipalPaydown(loanAmt, interestRate, loanTermYears, year);
    const totalNetWorthGain = annualCashFlow + principalPaydown + appreciation;

    cumulativeCashFlow += annualCashFlow;
    cumulativeNetWorth += totalNetWorthGain;

    const cocReturn = totalCashDown > 0 ? (annualCashFlow / totalCashDown) * 100 : 0;
    const totalROI = totalCashDown > 0 ? (totalNetWorthGain / totalCashDown) * 100 : 0;

    rows.push({
      year,
      propertyValue,
      loanBalance: balance,
      equity,
      annualRent,
      annualExpenses,
      annualCashFlow,
      cumulativeCashFlow,
      principalPaydown,
      appreciation,
      totalNetWorthGain,
      cumulativeNetWorth,
      cocReturn,
      totalROI,
    });

    prevPropertyValue = propertyValue;
  }

  return rows;
}

export function buildScenario(id: string, name: string, tier: RentTier, params: ScenarioParams): Scenario {
  return {
    id,
    name,
    tier,
    params,
    metrics: computeMetrics(params),
    projection: compute30YearProjection(params),
  };
}
