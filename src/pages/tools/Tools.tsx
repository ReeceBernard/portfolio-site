import React from 'react';
import { Link } from 'react-router-dom';
import RentalAnalysisTool from './components/RentalAnalysis';


export const ToolsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="text-green-600 hover:text-green-700 font-semibold transition-colors"
              >
                ← Back to Terminal
              </Link>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Analysis Tools</h1>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-gray-600 max-w-2xl">
            A collection of analysis tools to help with investment decisions.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid gap-8">
          {/* Single Family Home Rental Analysis Tool */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b">
              <h3 className="text-lg font-semibold text-green-800">
                Single Family Home Rental Analysis
              </h3>
              <p className="text-green-600 text-sm mt-1">
                Analyze the potential profitability of rental property investments
              </p>
            </div>
            <div className="p-6">
              <RentalAnalysisTool />
            </div>
          </div>

          {/* Placeholder for future tools */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden opacity-50">
            <div className="px-6 py-4 bg-blue-50 border-b">
              <h3 className="text-lg font-semibold text-blue-800">
                More Tools Coming Soon
              </h3>
              <p className="text-blue-600 text-sm mt-1">
                Additional financial calculators and analysis tools
              </p>
            </div>
            <div className="p-6">
              <p className="text-gray-500 italic">Under development...</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">
              © 2025 Reece Bernard • Financial Tools
            </p>
            <Link 
              to="/" 
              className="text-green-600 hover:text-green-700 text-sm transition-colors"
            >
              Return to Portfolio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};