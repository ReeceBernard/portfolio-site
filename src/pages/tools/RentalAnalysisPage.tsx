import React from 'react';
import { Link } from 'react-router-dom';
import RentalAnalysisTool from './components/RentalAnalysis';

export const RentalAnalysisPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/tools" className="text-green-600 hover:text-green-700 font-semibold transition-colors">
              ← Back to Tools
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Single Family Home Rental Analysis</h1>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RentalAnalysisTool />
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Reece Bernard • Financial Tools</p>
            <Link to="/" className="text-green-600 hover:text-green-700 text-sm transition-colors">
              Return to Portfolio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
