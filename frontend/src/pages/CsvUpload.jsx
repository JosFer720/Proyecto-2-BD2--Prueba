import { useState } from 'react';
import { uploadNodesCSV, uploadRelationshipsCSV } from '../api/client';

const NODE_LABELS = ['User', 'Post', 'Community', 'Game', 'Tag', 'Award'];

const RELATIONSHIP_TYPES = [
  'POSTED_IN',
  'AUTHORED',
  'MEMBER_OF',
  'MODERATES',
  'TAGGED_WITH',
  'RECEIVED_AWARD',
  'UPVOTED',
  'DOWNVOTED',
  'COMMENTED_ON',
  'FOLLOWS',
  'RELATED_TO',
];

function parseCSV(text) {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(',').map((c) => c.trim()));
  return { headers, rows };
}

function CsvPreview({ file }) {
  const [preview, setPreview] = useState(null);

  if (!file) return null;

  if (!preview) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      setPreview({
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 5),
        total: parsed.rows.length,
      });
    };
    reader.readAsText(file);
  }

  if (!preview) return <p className="text-gray-400 text-sm mt-2">Reading file...</p>;

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-400 mb-2">
        Preview (first 5 of {preview.total} rows)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-700">
              {preview.headers.map((h, i) => (
                <th key={i} className="py-1.5 px-3 text-gray-400 font-medium text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-700/50">
                {row.map((cell, j) => (
                  <td key={j} className="py-1.5 px-3 text-gray-100 text-xs">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CsvUpload() {
  const [activeTab, setActiveTab] = useState('nodes');

  // Nodes state
  const [nodeFile, setNodeFile] = useState(null);
  const [nodeLabel, setNodeLabel] = useState('User');
  const [nodeLoading, setNodeLoading] = useState(false);
  const [nodeResult, setNodeResult] = useState(null);
  const [nodeError, setNodeError] = useState(null);

  // Relationships state
  const [relFile, setRelFile] = useState(null);
  const [relType, setRelType] = useState(RELATIONSHIP_TYPES[0]);
  const [fromLabel, setFromLabel] = useState('User');
  const [toLabel, setToLabel] = useState('Post');
  const [relLoading, setRelLoading] = useState(false);
  const [relResult, setRelResult] = useState(null);
  const [relError, setRelError] = useState(null);

  const handleNodeUpload = async () => {
    if (!nodeFile) return;
    setNodeLoading(true);
    setNodeError(null);
    setNodeResult(null);
    try {
      const formData = new FormData();
      formData.append('file', nodeFile);
      formData.append('label', nodeLabel);
      const res = await uploadNodesCSV(formData);
      setNodeResult(res.data);
    } catch (err) {
      setNodeError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setNodeLoading(false);
    }
  };

  const handleRelUpload = async () => {
    if (!relFile) return;
    setRelLoading(true);
    setRelError(null);
    setRelResult(null);
    try {
      const formData = new FormData();
      formData.append('file', relFile);
      formData.append('rel_type', relType);
      formData.append('from_label', fromLabel);
      formData.append('to_label', toLabel);
      const res = await uploadRelationshipsCSV(formData);
      setRelResult(res.data);
    } catch (err) {
      setRelError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setRelLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">CSV Upload</h1>
      <p className="text-gray-400 mb-6">Upload CSV files to import nodes and relationships.</p>

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-[#1e1f2a] rounded-lg p-1 mb-6 w-fit border border-gray-700">
        <button
          onClick={() => setActiveTab('nodes')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'nodes'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-gray-100'
          }`}
        >
          Upload Nodes
        </button>
        <button
          onClick={() => setActiveTab('relationships')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'relationships'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-gray-100'
          }`}
        >
          Upload Relationships
        </button>
      </div>

      {/* Nodes Tab */}
      {activeTab === 'nodes' && (
        <div className="bg-[#1e1f2a] border border-gray-700 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Upload Nodes</h3>

          <div className="flex flex-wrap gap-4 mb-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  setNodeFile(e.target.files[0] || null);
                  setNodeResult(null);
                  setNodeError(null);
                }}
                className="bg-[#252631] border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 file:mr-3 file:bg-indigo-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:text-sm file:cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Label</label>
              <select
                value={nodeLabel}
                onChange={(e) => setNodeLabel(e.target.value)}
                className="bg-[#252631] border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-400"
              >
                {NODE_LABELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNodeUpload}
              disabled={!nodeFile || nodeLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded transition-colors h-fit"
            >
              {nodeLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>

          {nodeFile && <CsvPreview key={nodeFile.name + nodeFile.lastModified} file={nodeFile} />}

          {nodeError && <p className="text-red-400 text-sm mt-3">{nodeError}</p>}
          {nodeResult && (
            <div className="mt-3 bg-[#252631] border border-gray-700 rounded p-3">
              <p className="text-green-400 text-sm">
                Nodes created: {nodeResult.nodesCreated ?? nodeResult.count ?? JSON.stringify(nodeResult)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Relationships Tab */}
      {activeTab === 'relationships' && (
        <div className="bg-[#1e1f2a] border border-gray-700 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Upload Relationships</h3>

          <div className="flex flex-wrap gap-4 mb-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  setRelFile(e.target.files[0] || null);
                  setRelResult(null);
                  setRelError(null);
                }}
                className="bg-[#252631] border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 file:mr-3 file:bg-indigo-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:text-sm file:cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Relationship Type</label>
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value)}
                className="bg-[#252631] border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-400"
              >
                {RELATIONSHIP_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">From Label</label>
              <select
                value={fromLabel}
                onChange={(e) => setFromLabel(e.target.value)}
                className="bg-[#252631] border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-400"
              >
                {NODE_LABELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">To Label</label>
              <select
                value={toLabel}
                onChange={(e) => setToLabel(e.target.value)}
                className="bg-[#252631] border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-400"
              >
                {NODE_LABELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRelUpload}
              disabled={!relFile || relLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded transition-colors h-fit"
            >
              {relLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>

          {relFile && <CsvPreview key={relFile.name + relFile.lastModified} file={relFile} />}

          {relError && <p className="text-red-400 text-sm mt-3">{relError}</p>}
          {relResult && (
            <div className="mt-3 bg-[#252631] border border-gray-700 rounded p-3">
              <p className="text-green-400 text-sm">
                Relationships created: {relResult.relationshipsCreated ?? relResult.count ?? JSON.stringify(relResult)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CsvUpload;
