import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToolsPage } from './pages/tools/Tools';
import { RentalAnalysisPage } from './pages/tools/RentalAnalysisPage';
import { Portfolio } from './pages/portfolio/Portfolio';
import { ProjectDetail } from './pages/projects/ProjectDetail';
import { PropertyAnalyzerPage } from './pages/tools/property-analyzer/PropertyAnalyzerPage';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Portfolio />} />
        <Route path="/projects/:slug" element={<ProjectDetail />} />
        <Route path="/tools/property-analyzer" element={<PropertyAnalyzerPage />} />
        <Route path="/tools/rental-analysis" element={<RentalAnalysisPage />} />
        <Route path="/tools" element={<ToolsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
