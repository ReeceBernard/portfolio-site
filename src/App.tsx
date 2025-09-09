import { Terminal } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToolsPage } from './pages/tools/Tools';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Terminal />} />
        <Route path="/tools" element={<ToolsPage />} />
      </Routes>
    </Router>
  );
}

export default App;