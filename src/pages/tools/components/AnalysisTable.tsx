import React, { useState } from 'react';
import { formatCurrency } from '../../../util/format';
import type { PropertyData, AnalysisResults } from '../types';

interface YearlyTableData {
  index: number;
  year: number;
  principal: number;
  cashFlow: number;
  totalReturn: number;
  totalReturnPercent: number;
  equity: number;
  equityMultiple: number;
  isPlaceholder?: boolean;
}

interface YearlyTableProps {
  data: PropertyData;
  results: AnalysisResults;
}

export default function YearlyTable({ data, results }: YearlyTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const yearlyTableData = React.useMemo((): YearlyTableData[] => {
    const loanAmount = data.purchasePrice * (1 - data.downPayment / 100);
    const monthlyRate = data.interestRate / 100 / 12;
    const numPayments = data.loanTerm * 12;
    const monthlyMortgage = results.monthlyMortgage;
    const currentYear = new Date().getFullYear();
    
    const yearlyData: YearlyTableData[] = [];
    
    for (let i = 1; i <= Math.min(data.loanTerm + 5, 30); i++) {
      // Calculate principal for this year
      let yearlyPrincipal = 0;
      
      for (let month = 1; month <= 12; month++) {
        const monthNumber = (i - 1) * 12 + month;
        if (monthNumber <= numPayments) {
          const remainingBalance = loanAmount * (
            (Math.pow(1 + monthlyRate, numPayments) - Math.pow(1 + monthlyRate, monthNumber - 1)) /
            (Math.pow(1 + monthlyRate, numPayments) - 1)
          );
          const monthlyInterest = remainingBalance * monthlyRate;
          const monthlyPrincipal = monthlyMortgage - monthlyInterest;
          
          yearlyPrincipal += monthlyPrincipal;
        }
      }
      
      // Use i-1 for appreciation/inflation so Year 1 = base values
      const appreciationYears = i - 1;
      
      // Calculate appreciated rent and property value
      const currentRent = data.monthlyRent * Math.pow(1 + data.rentAppreciation / 100, appreciationYears);
      const currentPropertyValue = data.purchasePrice * Math.pow(1 + data.propertyAppreciation / 100, appreciationYears);
      
      // Calculate expenses with inflation
      const annualPropertyTaxes = data.propertyTaxes * Math.pow(1.02, appreciationYears);
      const annualInsurance = data.insurance * Math.pow(1.03, appreciationYears);
      const annualMaintenance = data.maintenance * Math.pow(1.03, appreciationYears);
      const vacancyLoss = currentRent * 12 * (data.vacancy / 100);
      const managementFee = currentRent * 12 * (data.propertyManagement / 100);
      
      const totalAnnualExpenses = (yearlyPrincipal > 0 ? monthlyMortgage * 12 : 0) + 
        annualPropertyTaxes + annualInsurance + annualMaintenance + vacancyLoss + managementFee;
      
      const annualCashFlow = (currentRent * 12) - totalAnnualExpenses;
      
      // Total return = cash flow + principal paydown
      const totalReturn = annualCashFlow + yearlyPrincipal;
      
      // Total return percentage based on total cash invested
      const totalReturnPercent = results.totalCashInvested > 0 ? (totalReturn / results.totalCashInvested) * 100 : 0;
      
      // Calculate current loan balance
      const monthsElapsed = i * 12;
      let currentLoanBalance = 0;
      if (monthsElapsed < numPayments) {
        currentLoanBalance = loanAmount * (
          (Math.pow(1 + monthlyRate, numPayments) - Math.pow(1 + monthlyRate, monthsElapsed)) /
          (Math.pow(1 + monthlyRate, numPayments) - 1)
        );
      }
      
      const equity = currentPropertyValue - currentLoanBalance;
      
      // Equity multiple (equity / down payment + closing costs)
      const equityMultiple = results.totalCashInvested > 0 ? equity / results.totalCashInvested : 0;
      
      yearlyData.push({
        index: i,
        year: currentYear + i,
        principal: Math.round(yearlyPrincipal),
        cashFlow: Math.round(annualCashFlow),
        totalReturn: Math.round(totalReturn),
        totalReturnPercent: Math.round(totalReturnPercent * 100) / 100,
        equity: Math.round(equity),
        equityMultiple: Math.round(equityMultiple * 100) / 100,
        isPlaceholder: false
      });
    }
    
    return yearlyData;
  }, [data, results]);

  const displayData = React.useMemo(() => {
    if (isExpanded || yearlyTableData.length <= 5) {
      return yearlyTableData;
    }
    
    // Show first 2, then ..., then last 2
    const first2 = yearlyTableData.slice(0, 2);
    const last2 = yearlyTableData.slice(-2);
    
    // Create a placeholder row for "..."
    const placeholderRow: YearlyTableData = {
      index: -1,
      year: 0,
      principal: 0,
      cashFlow: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      equity: 0,
      equityMultiple: 0,
      isPlaceholder: true
    };
    
    return [...first2, placeholderRow, ...last2];
  }, [yearlyTableData, isExpanded]);

  return (
    <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm">
      <h4 className="font-semibold text-gray-900 mb-4 text-xl">Yearly Analysis</h4>
      <div 
        className="overflow-x-auto cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-900">Year</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-900">Principal</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-900">Cash Flow</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-900">Total Return</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-900">Return %</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-900">Equity</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-900">Equity Multiple</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((row) => 
              row.isPlaceholder ? (
                <tr key="placeholder" className="border-b border-gray-100">
                  <td className="py-3 px-2 text-center font-medium text-gray-500" colSpan={7}>
                    ⋯
                  </td>
                </tr>
              ) : (
                <tr key={row.index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium text-gray-900">{row.year}</td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(row.principal)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(row.cashFlow)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(row.totalReturn)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {row.totalReturnPercent.toFixed(2)}%
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(row.equity)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {row.equityMultiple.toFixed(2)}x
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        
        {!isExpanded && yearlyTableData.length > 5 && (
          <div className="text-center mt-2 text-sm text-gray-500">
            Click to view all {yearlyTableData.length} years
          </div>
        )}
        
        {isExpanded && (
          <div className="text-center mt-2 text-sm text-gray-500">
            Click to collapse
          </div>
        )}
      </div>
      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Principal:</strong> Annual mortgage principal paydown</p>
        <p><strong>Cash Flow:</strong> Annual rental income minus all expenses</p>
        <p><strong>Total Return:</strong> Cash flow + principal paydown (actual return on investment)</p>
        <p><strong>Return %:</strong> Total return as percentage of initial cash invested</p>
        <p><strong>Equity:</strong> Current property value minus remaining loan balance</p>
        <p><strong>Equity Multiple:</strong> Current equity divided by initial cash invested</p>
      </div>
    </div>
  );
}