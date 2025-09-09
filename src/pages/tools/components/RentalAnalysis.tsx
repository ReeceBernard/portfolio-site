import React, { useState, useMemo } from 'react';
import { cn } from '../../home/lib/utils';


interface PropertyData {
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
}

interface AnalysisResults {
  monthlyMortgage: number;
  totalMonthlyExpenses: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  totalCashInvested: number;
  cashOnCashReturn: number;
  capRate: number;
  monthlyROI: number;
}

export const RentalAnalysisTool: React.FC = () => {
  const [data, setData] = useState<PropertyData>({
    purchasePrice: 300000,
    downPayment: 20,
    interestRate: 7.0,
    loanTerm: 30,
    monthlyRent: 2500,
    propertyTaxes: 3600,
    insurance: 1200,
    maintenance: 3000,
    vacancy: 8,
    propertyManagement: 10,
    closingCosts: 3000
  });

  const results = useMemo((): AnalysisResults => {
    const loanAmount = data.purchasePrice * (1 - data.downPayment / 100);
    const monthlyRate = data.interestRate / 100 / 12;
    const numPayments = data.loanTerm * 12;
    
    // Calculate monthly mortgage payment
    const monthlyMortgage = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    // Calculate monthly expenses
    const monthlyPropertyTaxes = data.propertyTaxes / 12;
    const monthlyInsurance = data.insurance / 12;
    const monthlyMaintenance = data.maintenance / 12;
    const vacancyLoss = data.monthlyRent * (data.vacancy / 100);
    const managementFee = data.monthlyRent * (data.propertyManagement / 100);

    const totalMonthlyExpenses = monthlyMortgage + monthlyPropertyTaxes + 
      monthlyInsurance + monthlyMaintenance + vacancyLoss + managementFee;

    const monthlyCashFlow = data.monthlyRent - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    const downPaymentAmount = data.purchasePrice * (data.downPayment / 100);
    const totalCashInvested = downPaymentAmount + data.closingCosts;

    const cashOnCashReturn = totalCashInvested > 0 ? 
      (annualCashFlow / totalCashInvested) * 100 : 0;

    const annualNetIncome = (data.monthlyRent * 12) - 
      (data.propertyTaxes + data.insurance + data.maintenance + 
       (data.monthlyRent * 12 * data.vacancy / 100) + 
       (data.monthlyRent * 12 * data.propertyManagement / 100));
    
    const capRate = (annualNetIncome / data.purchasePrice) * 100;
    const monthlyROI = totalCashInvested > 0 ? 
      (monthlyCashFlow / totalCashInvested) * 100 : 0;

    return {
      monthlyMortgage,
      totalMonthlyExpenses,
      monthlyCashFlow,
      annualCashFlow,
      totalCashInvested,
      cashOnCashReturn,
      capRate,
      monthlyROI
    };
  }, [data]);

  const updateField = (field: keyof PropertyData, value: number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  const formatPercent = (percent: number) => 
    `${percent.toFixed(2)}%`;

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Property Details */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 border-b pb-2">Property Details</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price
            </label>
            <input
              type="number"
              value={data.purchasePrice}
              onChange={(e) => updateField('purchasePrice', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="300000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Down Payment: {data.downPayment}%
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={data.downPayment}
              onChange={(e) => updateField('downPayment', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interest Rate: {data.interestRate.toFixed(2)}%
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="0.01"
              value={data.interestRate}
              onChange={(e) => updateField('interestRate', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>20%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loan Term
            </label>
            <select
              value={data.loanTerm}
              onChange={(e) => updateField('loanTerm', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-slate-800"
            >
              <option value={5}>5 years</option>
              <option value={10}>10 years</option>
              <option value={15}>15 years</option>
              <option value={20}>20 years</option>
              <option value={25}>25 years</option>
              <option value={30}>30 years</option>
              <option value={40}>40 years</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Closing Costs
            </label>
            <input
              type="number"
              value={data.closingCosts}
              onChange={(e) => updateField('closingCosts', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="3000"
            />
          </div>
        </div>

        {/* Income */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 border-b pb-2">Income</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Rent
            </label>
            <input
              type="number"
              value={data.monthlyRent}
              onChange={(e) => updateField('monthlyRent', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="2500"
            />
          </div>
        </div>

        {/* Expenses */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 border-b pb-2">Annual Expenses</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Taxes
            </label>
            <input
              type="number"
              value={data.propertyTaxes}
              onChange={(e) => updateField('propertyTaxes', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="3600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance
            </label>
            <input
              type="number"
              value={data.insurance}
              onChange={(e) => updateField('insurance', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="1200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maintenance & Repairs
            </label>
            <input
              type="number"
              value={data.maintenance}
              onChange={(e) => updateField('maintenance', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="3000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vacancy Rate: {data.vacancy}%
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={data.vacancy}
              onChange={(e) => updateField('vacancy', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>20%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Management: {data.propertyManagement}%
            </label>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={data.propertyManagement}
              onChange={(e) => updateField('propertyManagement', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>25%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-6 text-xl">Analysis Results</h4>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h5 className="font-medium text-gray-700 mb-2">Monthly Cash Flow</h5>
            <p className={cn(
              "text-2xl font-bold",
              results.monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(results.monthlyCashFlow)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h5 className="font-medium text-gray-700 mb-2">Annual Cash Flow</h5>
            <p className={cn(
              "text-2xl font-bold",
              results.annualCashFlow >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(results.annualCashFlow)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h5 className="font-medium text-gray-700 mb-2">Cash-on-Cash Return</h5>
            <p className={cn(
              "text-2xl font-bold",
              results.cashOnCashReturn >= 8 ? "text-green-600" : 
              results.cashOnCashReturn >= 5 ? "text-yellow-600" : "text-red-600"
            )}>
              {formatPercent(results.cashOnCashReturn)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h5 className="font-medium text-gray-700 mb-2">Cap Rate</h5>
            <p className={cn(
              "text-2xl font-bold",
              results.capRate >= 6 ? "text-green-600" : 
              results.capRate >= 4 ? "text-yellow-600" : "text-red-600"
            )}>
              {formatPercent(results.capRate)}
            </p>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
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
              <div className="flex justify-between font-semibold">
                <span className="text-slate-700">Total Cash Invested:</span>
                <span>{formatCurrency(results.totalCashInvested)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-700">Loan Amount:</span>
                <span>{formatCurrency(data.purchasePrice * (1 - data.downPayment / 100))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add custom slider styles */}
      <style>{`
        input[type="range"] {
          background: #AFAFAF;
        }
        
        input[type="range"]::-webkit-slider-track {
          background: #e5e7eb;
          height: 8px;
          border-radius: 4px;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        input[type="range"]::-moz-range-track {
          background: #e5e7eb;
          height: 8px;
          border-radius: 4px;
          border: none;
        }
        
        input[type="range"]::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        input[type="range"]:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
        
        input[type="range"]:focus::-moz-range-thumb {
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
      `}</style>
    </div>
  );
};