import { useState } from 'react';
import { getPageRank, getLouvain, getShortestPathGDS } from '../api/client';

const TABS = ['PageRank', 'Louvain Communities', 'Shortest Path'];

function GDSPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">GDS Algorithms</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#1e1f2a] rounded-lg p-1 mb-6 w-fit">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === i
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#252631]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && <PageRankTab />}
      {activeTab === 1 && <LouvainTab />}
      {activeTab === 2 && <ShortestPathTab />}
    </div>
  );
}

/* ───── PageRank Tab ───── */
function PageRankTab() {
  const [top, setTop] = useState(20);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPageRank({ top });
      setResults(res.data);
    } catch {
      setError('Failed to run PageRank.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <label className="text-gray-400 text-sm">Top</label>
        <input
          type="number"
          min={1}
          value={top}
          onChange={(e) => setTop(Number(e.target.value))}
          className="bg-[#252631] border border-gray-700 text-gray-100 rounded-lg px-3 py-2 w-24 focus:outline-none focus:border-indigo-400"
        />
        <button
          onClick={run}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run PageRank'}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {results && (
        <>
          <div className="flex gap-4 mb-6">
            <StatCard label="Total Nodes" value={results.totalNodes} />
            <StatCard label="Total Edges" value={results.totalEdges} />
          </div>

          <div className="bg-[#1e1f2a] border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium text-right">PageRank Score</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((row) => (
                  <tr key={row.rank} className="border-b border-gray-700/50 hover:bg-[#252631]">
                    <td className="px-4 py-3 text-gray-300">{row.rank}</td>
                    <td className="px-4 py-3 text-gray-100 font-medium">{row.username}</td>
                    <td className="px-4 py-3 text-indigo-400 text-right font-mono">
                      {row.pageRankScore.toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ───── Louvain Tab ───── */
function LouvainTab() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getLouvain();
      setResults(res.data);
    } catch {
      setError('Failed to detect communities.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={run}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Detecting...' : 'Detect Communities'}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {results && (
        <>
          <div className="flex gap-4 mb-6">
            <StatCard label="Total Clusters" value={results.totalClusters} />
            <StatCard label="Total Nodes" value={results.totalNodes} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.clusters.map((cluster) => (
              <div
                key={cluster.clusterId}
                className="bg-[#1e1f2a] border border-gray-700 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-100 font-semibold">Cluster {cluster.clusterId}</h3>
                  <span className="text-xs bg-[#252631] text-gray-400 px-2 py-1 rounded-full">
                    Size: {cluster.size}
                  </span>
                </div>

                {cluster.users && cluster.users.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Users ({cluster.userCount ?? cluster.users.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {cluster.users.slice(0, 10).map((u) => (
                        <span
                          key={u.id}
                          className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded"
                        >
                          {u.username}
                        </span>
                      ))}
                      {cluster.users.length > 10 && (
                        <span className="text-xs text-gray-500">
                          +{cluster.users.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {cluster.communities && cluster.communities.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Communities ({cluster.communityCount ?? cluster.communities.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {cluster.communities.map((c) => (
                        <span
                          key={c.id}
                          className="text-xs bg-orange-900/30 text-orange-300 px-2 py-0.5 rounded"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ───── Shortest Path Tab ───── */
function ShortestPathTab() {
  const [userA, setUserA] = useState('');
  const [userB, setUserB] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!userA.trim() || !userB.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await getShortestPathGDS({ user_a: userA.trim(), user_b: userB.trim() });
      setResult(res.data);
    } catch {
      setError('Failed to find shortest path.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="User A ID"
          value={userA}
          onChange={(e) => setUserA(e.target.value)}
          className="bg-[#252631] border border-gray-700 text-gray-100 rounded-lg px-4 py-2 w-44 placeholder-gray-500 focus:outline-none focus:border-indigo-400"
        />
        <input
          type="text"
          placeholder="User B ID"
          value={userB}
          onChange={(e) => setUserB(e.target.value)}
          className="bg-[#252631] border border-gray-700 text-gray-100 rounded-lg px-4 py-2 w-44 placeholder-gray-500 focus:outline-none focus:border-indigo-400"
        />
        <button
          onClick={run}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Finding...' : 'Find Path'}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="bg-[#1e1f2a] border border-gray-700 rounded-xl p-6">
          {result.found ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-gray-400 text-sm">Distance:</span>
                <span className="text-indigo-400 font-bold text-lg">{result.distance}</span>
                <span className="text-gray-500 text-sm">
                  {result.distance === 1 ? 'hop' : 'hops'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {result.pathNodes.map((node, i) => (
                  <div key={node.id} className="flex items-center gap-2">
                    <div className="bg-[#252631] border border-gray-600 rounded-lg px-3 py-2">
                      <p className="text-gray-100 font-medium text-sm">{node.username}</p>
                      <p className="text-gray-500 text-xs font-mono">{node.id}</p>
                    </div>
                    {i < result.pathNodes.length - 1 && (
                      <span className="text-indigo-400 font-bold text-lg select-none">&rarr;</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-4">
              No path found between these users.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ───── Shared Components ───── */
function StatCard({ label, value }) {
  return (
    <div className="bg-[#1e1f2a] border border-gray-700 rounded-xl px-5 py-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-100 mt-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
      {message}
    </div>
  );
}

export default GDSPage;
