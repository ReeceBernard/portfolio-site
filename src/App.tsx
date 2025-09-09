import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToolsPage } from './pages/tools/Tools';
import { Terminal } from './pages/home/Terminal';


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