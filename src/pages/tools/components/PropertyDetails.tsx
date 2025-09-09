import { CurrencyInput } from "../../../components/CurrencyInput";
import type { PropertyData } from "../types";

interface PropertyDetailsProps {
  data: PropertyData;
  updateField: (field: keyof PropertyData, value: number) => void;
}

export default function PropertyDetails({ data, updateField }: PropertyDetailsProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Property Details */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 border-b pb-2 text-lg">Property Details</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price
            </label>
            <CurrencyInput
              value={data.purchasePrice}
              onChange={(value) => updateField('purchasePrice', value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900"
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
              Closing Costs & Initial Repairs
            </label>
            <CurrencyInput
              value={data.closingCosts}
              onChange={(value) => updateField('closingCosts', value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="3000"
            />
          </div>
        </div>

        {/* Income & Appreciation */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 border-b pb-2 text-lg">Income & Appreciation</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Rent
            </label>
            <CurrencyInput
              value={data.monthlyRent}
              onChange={(value) => updateField('monthlyRent', value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="2500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rent Appreciation: {data.rentAppreciation.toFixed(1)}%/year
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={data.rentAppreciation}
              onChange={(e) => updateField('rentAppreciation', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>10%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Appreciation: {data.propertyAppreciation.toFixed(1)}%/year
            </label>
            <input
              type="range"
              min="0"
              max="15"
              step="0.1"
              value={data.propertyAppreciation}
              onChange={(e) => updateField('propertyAppreciation', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>15%</span>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 border-b pb-2 text-lg">Annual Expenses</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Taxes
            </label>
            <CurrencyInput
              value={data.propertyTaxes}
              onChange={(value) => updateField('propertyTaxes', value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="3600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance
            </label>
            <CurrencyInput
              value={data.insurance}
              onChange={(value) => updateField('insurance', value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="1200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maintenance & Repairs
            </label>
            <CurrencyInput
              value={data.maintenance}
              onChange={(value) => updateField('maintenance',value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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

      {/* Custom slider styles */}
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
          border: none;
        }
        
        input[type="range"]:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
        
        input[type="range"]:focus::-moz-range-thumb {
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
      `}</style>
    </>
  );
}