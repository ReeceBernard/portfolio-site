export interface PropertyData {
  purchasePrice: number;
  downPayment: number;
  interestRate: number;
  loanTerm: number;
  monthlyRent: number;
  propertyTaxes: number;
  insurance: number;
  maintenance: number;
  vacancy: number;
  propertyManagement: number;
  closingCosts: number;
  rentAppreciation: number;
  propertyAppreciation: number;
}

export interface AnalysisResults {
  monthlyMortgage: number;
  totalMonthlyExpenses: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  totalCashInvested: number;
  cashOnCashReturn: number;
  year1Return: number;
  monthlyROI: number;
  year1Principal: number;
  year1Interest:number;
  year1TotalMortgage:number;
}

export interface RentalChartDataPoint {
  year: number;
  cashFlow: number;
  propertyValue: number;
  equity: number;
  loanBalance: number;
}