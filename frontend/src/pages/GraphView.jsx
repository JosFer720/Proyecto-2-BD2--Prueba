import { useState, useRef, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getSubgraph, getGraphOverview } from '../api/client';

const LABEL_COLORS = {
  User: '#3B82F6',
  Post: '#10B981',
  Community: '#F97316',
  Game: '#EF4444',
  Tag: '#8B5CF6',
  Award: '#F59E0B',
};

function GraphView() {
  const [searchId, setSearchId] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    setError('');
    setSelectedNode(null);
    try {
      const res = await getSubgraph({ center_id: searchId.trim(), depth: 2, limit: 200 });
      setGraphData(res.data);
    } catch (err) {
      setError('Failed to load subgraph. Check the node ID.');
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  }, [searchId]);

  const handleOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    setSelectedNode(null);
    try {
      const res = await getGraphOverview({ limit: 150 });
      setGraphData(res.data);
    } catch (err) {
      setError('Failed to load graph overview.');
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Controls */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Node ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="bg-[#252631] border border-gray-700 text-gray-100 rounded-lg px-4 py-2 w-48 placeholder-gray-500 focus:outline-none focus:border-indigo-400"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Search
          </button>
          <button
            onClick={handleOverview}
            disabled={loading}
            className="bg-[#1e1f2a] hover:bg-[#252631] border border-gray-700 text-gray-100 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Random Overview
          </button>

          {/* Legend */}
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            {Object.entries(LABEL_COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Graph container */}
        <div
          ref={containerRef}
          className="flex-1 bg-[#0f1117] rounded-xl border border-gray-700 overflow-hidden relative"
        >
          {loading && (
            <div className="absolute inset-0 bg-[#0f1117]/80 flex items-center justify-center z-10">
              <div className="flex items-center gap-3 text-gray-300">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading graph...
              </div>
            </div>
          )}
          <ForceGraph2D
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#0f1117"
            nodeColor={(node) => node.color || '#6B7280'}
            nodeLabel={(node) => node.name || node.id}
            nodeVal={4}
            linkLabel={(link) => link.type || ''}
            linkColor={() => '#374151'}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            onNodeClick={handleNodeClick}
          />
        </div>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <div className="w-80 bg-[#1e1f2a] border border-gray-700 rounded-xl p-5 overflow-y-auto flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100">Node Details</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-200 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="space-y-3">
            {selectedNode.label && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Label</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: selectedNode.color || '#6B7280' }}
                  />
                  <span className="text-gray-100 font-medium">{selectedNode.label}</span>
                </div>
              </div>
            )}

            {selectedNode.name && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Name</span>
                <p className="text-gray-100 mt-1">{selectedNode.name}</p>
              </div>
            )}

            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">ID</span>
              <p className="text-gray-300 mt-1 text-sm font-mono">{selectedNode.id}</p>
            </div>

            {/* All other properties */}
            {Object.entries(selectedNode)
              .filter(([key]) => !['id', 'name', 'label', 'color', 'x', 'y', 'vx', 'vy', 'fx', 'fy', 'index', '__indexColor'].includes(key))
              .map(([key, value]) => (
                <div key={key}>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">{key}</span>
                  <p className="text-gray-300 mt-1 text-sm break-all">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphView;
