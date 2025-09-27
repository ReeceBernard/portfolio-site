import { useMemo } from "react";
import { TTL, useLocalStorage } from "../../../hooks/use-local-storage";
import type {
  AnalysisResults,
  PropertyData,
  RentalChartDataPoint,
} from "../types";
import AnalysisCards from "./AnalysisCards";
import YearlyTable from "./AnalysisTable";
import { ChartSection } from "./ChartSection";
import PropertyDetails from "./PropertyDetails";

const defaultPropertyData: Omit<PropertyData, "interestRate"> = {
  purchasePrice: 300000,
  downPayment: 20,
  loanTerm: 30,
  monthlyRent: 3000,
  propertyTaxes: 3600,
  insurance: 1200,
  maintenance: 3000,
  vacancy: 8,
  propertyManagement: 10,
  closingCosts: 3000,
  rentAppreciation: 3.0,
  propertyAppreciation: 3.5,
};

const defaultInterestRate = 7.0;

export default function RentalAnalysisTool() {
  const [propertyData, setPropertyData] = useLocalStorage(
    "rental-analysis-property-data",
    defaultPropertyData,
    TTL.ONE_WEEK
  );

  const [interestRate, setInterestRate] = useLocalStorage(
    "rental-analysis-interest-rate",
    defaultInterestRate,
    TTL.ONE_DAY
  );

  const data: PropertyData = {
    ...propertyData,
    interestRate,
  };

  const updateField = (field: keyof PropertyData, value: number) => {
    if (field === "interestRate") {
      setInterestRate(value);
    } else {
      setPropertyData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const results = useMemo((): AnalysisResults => {
    const loanAmount = data.purchasePrice * (1 - data.downPayment / 100);
    const monthlyRate = data.interestRate / 100 / 12;
    const numPayments = data.loanTerm * 12;

    const monthlyMortgage =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const monthlyPropertyTaxes = data.propertyTaxes / 12;
    const monthlyInsurance = data.insurance / 12;
    const monthlyMaintenance = data.maintenance / 12;
    const vacancyLoss = data.monthlyRent * (data.vacancy / 100);
    const managementFee = data.monthlyRent * (data.propertyManagement / 100);

    const totalMonthlyExpenses =
      monthlyMortgage +
      monthlyPropertyTaxes +
      monthlyInsurance +
      monthlyMaintenance +
      vacancyLoss +
      managementFee;

    const monthlyCashFlow = data.monthlyRent - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    const downPaymentAmount = data.purchasePrice * (data.downPayment / 100);
    const totalCashInvested = downPaymentAmount + data.closingCosts;

    const cashOnCashReturn =
      totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

    let year1Principal = 0;
    let year1Interest = 0;
    for (let month = 1; month <= 12; month++) {
      const remainingBalance =
        loanAmount *
        ((Math.pow(1 + monthlyRate, numPayments) -
          Math.pow(1 + monthlyRate, month - 1)) /
          (Math.pow(1 + monthlyRate, numPayments) - 1));
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyMortgage - interestPayment;
      year1Principal += principalPayment;
      year1Interest += interestPayment;
    }

    const year1TotalMortgage = monthlyMortgage * 12;

    const year1Return =
      totalCashInvested > 0
        ? ((annualCashFlow + year1Principal) / totalCashInvested) * 100
        : 0;

    const monthlyROI =
      totalCashInvested > 0 ? (monthlyCashFlow / totalCashInvested) * 100 : 0;

    return {
      monthlyMortgage,
      totalMonthlyExpenses,
      monthlyCashFlow,
      annualCashFlow,
      totalCashInvested,
      cashOnCashReturn,
      year1Return,
      monthlyROI,
      year1Principal,
      year1Interest,
      year1TotalMortgage,
    };
  }, [data]);

  const chartData = useMemo((): RentalChartDataPoint[] => {
    const currentYear = new Date().getFullYear();
    const projectionYears = data.loanTerm + 5;
    const loanAmount = data.purchasePrice * (1 - data.downPayment / 100);
    const monthlyRate = data.interestRate / 100 / 12;
    const numPayments = data.loanTerm * 12;

    const monthlyMortgage =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const chartPoints: RentalChartDataPoint[] = [];

    for (let yearOffset = 0; yearOffset <= projectionYears; yearOffset++) {
      const displayYear = currentYear + yearOffset;

      const currentRent =
        data.monthlyRent *
        Math.pow(1 + data.rentAppreciation / 100, yearOffset);
      const currentPropertyValue =
        data.purchasePrice *
        Math.pow(1 + data.propertyAppreciation / 100, yearOffset);

      const monthsElapsed = yearOffset * 12;
      let loanBalance = loanAmount;

      if (monthsElapsed < numPayments) {
        loanBalance =
          loanAmount *
          ((Math.pow(1 + monthlyRate, numPayments) -
            Math.pow(1 + monthlyRate, monthsElapsed)) /
            (Math.pow(1 + monthlyRate, numPayments) - 1));
      } else {
        loanBalance = 0;
      }

      const annualPropertyTaxes =
        data.propertyTaxes * Math.pow(1.02, yearOffset);

      const annualInsurance = data.insurance * Math.pow(1.03, yearOffset);
      const annualMaintenance = data.maintenance * Math.pow(1.03, yearOffset);
      const vacancyLoss = currentRent * 12 * (data.vacancy / 100);
      const managementFee = currentRent * 12 * (data.propertyManagement / 100);

      const totalAnnualExpenses =
        (monthsElapsed < numPayments ? monthlyMortgage * 12 : 0) +
        annualPropertyTaxes +
        annualInsurance +
        annualMaintenance +
        vacancyLoss +
        managementFee;

      const annualCashFlow = currentRent * 12 - totalAnnualExpenses;
      const equity = currentPropertyValue - loanBalance;

      chartPoints.push({
        year: displayYear,
        cashFlow: Math.round(annualCashFlow),
        propertyValue: Math.round(currentPropertyValue),
        equity: Math.round(equity),
        loanBalance: Math.round(loanBalance),
      });
    }

    return chartPoints;
  }, [data, results]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <PropertyDetails data={data} updateField={updateField} />
      <AnalysisCards data={data} results={results} />
      <ChartSection chartData={chartData} />
      <YearlyTable data={data} results={results} />
      {/* IMPORTANT FRED API Attribution Notice */}
      <div className="mt-8 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          *This product uses the FRED® API but is not endorsed or certified by
          the Federal Reserve Bank of St. Louis.
        </div>
      </div>
    </div>
  );
}
