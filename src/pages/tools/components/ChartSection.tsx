import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '../../home/lib/utils';
import { formatCurrency } from '../../../util/format';

interface ChartDataPoint {
  year: number;
  cashFlow: number;
  propertyValue: number;
  equity: number;
  loanBalance: number;
}

interface ChartSectionProps {
  chartData: ChartDataPoint[];
}


export const ChartSection: React.FC<ChartSectionProps> = ({ chartData }) => {
  const [activeChart, setActiveChart] = useState<'cashflow' | 'equity'>('cashflow');

  return (
    <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm">
      {/* Chart Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900 text-lg lg:text-xl">
          {activeChart === 'cashflow' ? 'Annual Cash Flow Over Time' : 'Property Value & Equity Over Time'}
        </h4>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveChart('cashflow')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
              activeChart === 'cashflow'
                ? "bg-green-500 text-gray-900 shadow-sm"
                :"text-white hover:text-white"
            )}
          >
            Cash Flow
          </button>
          <button
            onClick={() => setActiveChart('equity')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
              activeChart === 'equity'
                ? "bg-green-500 text-gray-900 shadow-sm"
                : "text-white hover:text-white"
            )}
          >
            Property & Equity
          </button>
        </div>
      </div>
      
      <div className="h-64 lg:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {activeChart === 'cashflow' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="year" 
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => `Year ${value}`}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Annual Cash Flow']}
                labelFormatter={(label) => `Year ${label}`}
                labelStyle={{ color: '#000000' }}
                contentStyle={{ 
                  backgroundColor: '#f8f9fa', 
                  border: '1px solid #dee2e6',
                  borderRadius: '6px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="cashFlow" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              />
            </LineChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="year" 
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => `Year ${value}`}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name
                ]}
                labelFormatter={(label) => `Year ${label}`}
                labelStyle={{ color: '#000000' }}
                contentStyle={{ 
                  backgroundColor: '#f8f9fa', 
                  border: '1px solid #dee2e6',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="propertyValue" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Property Value"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="equity" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Total Equity"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="loanBalance" 
                stroke="#ef4444" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Loan Balance"
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};