import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import NodeList from './pages/NodeList';
import NodeDetail from './pages/NodeDetail';
import RelationshipManager from './pages/RelationshipManager';
import QueryExplorer from './pages/QueryExplorer';
import CsvUpload from './pages/CsvUpload';
import GraphView from './pages/GraphView';
import GDSPage from './pages/GDSPage';

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#0f1117]">
        <Navbar />
        <main className="flex-1 p-6 ml-64 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/:nodeType" element={<NodeList />} />
            <Route path="/:nodeType/:id" element={<NodeDetail />} />
            <Route path="/relationships" element={<RelationshipManager />} />
            <Route path="/queries" element={<QueryExplorer />} />
            <Route path="/csv-upload" element={<CsvUpload />} />
            <Route path="/graph" element={<GraphView />} />
            <Route path="/gds" element={<GDSPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
