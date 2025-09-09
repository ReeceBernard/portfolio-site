
import { formatCurrency, formatPercent } from '../../../util/format';
import { cn } from '../../home/lib/utils';
import type { PropertyData, AnalysisResults} from '../types';



interface AnalysisResultsProps {
  data: PropertyData;
  results: AnalysisResults;
}


export default function AnalysisCards({ data, results }: AnalysisResultsProps) {
  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 lg:p-6">
      <h4 className="font-semibold text-gray-900 mb-4 lg:mb-6 text-xl">Analysis Results</h4>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
          <h5 className="font-medium text-gray-700 mb-2 text-sm lg:text-base">Monthly Cash Flow</h5>
          <p className={cn(
            "text-lg lg:text-2xl font-bold",
            results.monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(results.monthlyCashFlow)}
          </p>
        </div>

        <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
          <h5 className="font-medium text-gray-700 mb-2 text-sm lg:text-base">Annual Cash Flow</h5>
          <p className={cn(
            "text-lg lg:text-2xl font-bold",
            results.annualCashFlow >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(results.annualCashFlow)}
          </p>
        </div>

        <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
          <h5 className="font-medium text-gray-700 mb-2 text-sm lg:text-base">Cash-on-Cash Return</h5>
          <p className={cn(
            "text-lg lg:text-2xl font-bold",
            results.cashOnCashReturn >= 8 ? "text-green-600" : 
            results.cashOnCashReturn >= 5 ? "text-yellow-600" : "text-red-600"
          )}>
            {formatPercent(results.cashOnCashReturn)}
          </p>
        </div>

        <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
          <h5 className="font-medium text-gray-700 mb-2 text-sm lg:text-base">Year 1 Total Return</h5>
          <p className={cn(
            "text-lg lg:text-2xl font-bold",
            results.year1Return >= 10 ? "text-green-600" : 
            results.year1Return >= 6 ? "text-yellow-600" : "text-red-600"
          )}>
            {formatPercent(results.year1Return)}
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h5 className="font-medium text-gray-700 mb-3">Monthly Breakdown</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Monthly Rent:</span>
              <span className="font-medium text-green-600">+{formatCurrency(data.monthlyRent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mortgage Payment:</span>
              <span className="font-medium text-red-600">-{formatCurrency(results.monthlyMortgage)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Property Taxes:</span>
              <span className="font-medium text-red-600">-{formatCurrency(data.propertyTaxes / 12)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Insurance:</span>
              <span className="font-medium text-red-600">-{formatCurrency(data.insurance / 12)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Maintenance:</span>
              <span className="font-medium text-red-600">-{formatCurrency(data.maintenance / 12)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Vacancy ({data.vacancy}%):</span>
              <span className="font-medium text-red-600">-{formatCurrency(data.monthlyRent * data.vacancy / 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Management ({data.propertyManagement}%):</span>
              <span className="font-medium text-red-600">-{formatCurrency(data.monthlyRent * data.propertyManagement / 100)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-semibold">
              <span className="text-slate-700">Net Cash Flow:</span>
              <span className={results.monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(results.monthlyCashFlow)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm text-slate-800">
          <h5 className="font-medium text-gray-700 mb-3">Investment Summary</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Purchase Price:</span>
              <span className="font-medium">{formatCurrency(data.purchasePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Down Payment ({data.downPayment}%):</span>
              <span className="font-medium">{formatCurrency(data.purchasePrice * data.downPayment / 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Closing Costs:</span>
              <span className="font-medium">{formatCurrency(data.closingCosts)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between">
              <span className="text-slate-700">Total Cash Invested:</span>
              <span className='font-medium'>{formatCurrency(results.totalCashInvested)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Loan Amount:</span>
              <span className='font-medium'>{formatCurrency(data.purchasePrice * (1 - data.downPayment / 100))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Year 1 Mortgage Payments:</span>
              <span className="font-medium">{formatCurrency(results.year1TotalMortgage)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Year 1 Principal:</span>
              <span className="font-medium text-green-600">{formatCurrency(results.year1Principal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Year 1 Interest:</span>
              <span className="text-red-600">{formatCurrency(results.year1Interest)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}