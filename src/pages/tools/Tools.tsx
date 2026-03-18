import React from 'react';
import { Link } from 'react-router-dom';


export const ToolsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-green-600 hover:text-green-700 font-semibold transition-colors"
              >
                ← Back to Portfolio
              </Link>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Analysis Tools</h1>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-gray-600 max-w-2xl">
            A collection of analysis tools to help with investment decisions.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid gap-8">
          {/* Single Family Home Rental Analysis Tool */}
          <Link to="/tools/rental-analysis" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
            <div className="px-6 py-4 bg-green-50 border-b group-hover:bg-green-100 transition-colors">
              <h3 className="text-lg font-semibold text-green-800">Single Family Home Rental Analysis</h3>
              <p className="text-green-600 text-sm mt-1">Analyze the potential profitability of rental property investments</p>
            </div>
            <div className="p-6 flex items-center justify-between">
              <p className="text-gray-600 text-sm">Input purchase price, financing, rent, and expenses to model cash flow, CoC return, and 30-year projections.</p>
              <span className="ml-4 text-green-600 font-semibold whitespace-nowrap group-hover:translate-x-1 transition-transform">Open →</span>
            </div>
          </Link>

          {/* Property Analyzer */}
          <Link to="/tools/property-analyzer" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
            <div className="px-6 py-4 bg-blue-50 border-b group-hover:bg-blue-100 transition-colors">
              <h3 className="text-lg font-semibold text-blue-800">
                AI Property Analyzer
              </h3>
              <p className="text-blue-600 text-sm mt-1">
                AI-powered rental comps, market analysis, and 30-year investment projections
              </p>
            </div>
            <div className="p-6 flex items-center justify-between">
              <p className="text-gray-600 text-sm">Enter any US address to get rental market comps, multi-scenario analysis, and downloadable PDF reports — powered by Claude.</p>
              <span className="ml-4 text-blue-600 font-semibold whitespace-nowrap group-hover:translate-x-1 transition-transform">Open →</span>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} Reece Bernard • Financial Tools
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