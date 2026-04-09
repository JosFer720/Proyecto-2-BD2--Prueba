import { useState } from 'react';
import {
  queryTopPosts,
  querySuggestedUsers,
  queryActiveCommunities,
  queryGameCommunityStats,
  queryShortestPath,
  queryRareAwardPosts,
} from '../api/client';

function QueryCard({ title, description, inputs, onRun, columns, renderResults, children }) {
  const [params, setParams] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await onRun(params);
      setResults(res.data);
      setOpen(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1e1f2a] border border-gray-700 rounded-lg p-5 mb-4">
      <h3 className="text-lg font-semibold text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">{description}</p>

      {inputs && inputs.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {inputs.map((input) => (
            <div key={input.key} className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">{input.label}</label>
              <input
                type="text"
                placeholder={input.placeholder || input.label}
                value={params[input.key] || ''}
                onChange={(e) => setParams({ ...params, [input.key]: e.target.value })}
                className="bg-[#252631] border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-400 w-48"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={handleRun}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          {loading ? 'Running...' : 'Run Query'}
        </button>
        {results !== null && (
          <button
            onClick={() => setOpen(!open)}
            className="text-indigo-400 text-sm hover:underline"
          >
            {open ? 'Hide Results' : 'Show Results'}
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      {open && results !== null && (
        <div className="mt-4">
          {renderResults ? (
            renderResults(results)
          ) : (
            <ResultsTable data={Array.isArray(results) ? results : results?.data || []} columns={columns} />
          )}
        </div>
      )}
    </div>
  );
}

function ResultsTable({ data, columns }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-400 text-sm italic">No results found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-700">
            {columns.map((col) => (
              <th key={col.key} className="py-2 px-3 text-gray-400 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-[#252631]">
              {columns.map((col) => (
                <td key={col.key} className="py-2 px-3 text-gray-100">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QueryExplorer() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Query Explorer</h1>
      <p className="text-gray-400 mb-6">Run predefined queries against the database.</p>

      {/* 1. Top Posts by Game */}
      <QueryCard
        title="Top Posts by Game"
        description="Find the top-rated posts for a specific game, filtered by user."
        inputs={[
          { key: 'user_id', label: 'User ID', placeholder: 'e.g. u_1' },
          { key: 'game_id', label: 'Game ID', placeholder: 'e.g. g_1' },
        ]}
        onRun={(params) => queryTopPosts(params)}
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'upvotes', label: 'Upvotes' },
          { key: 'community', label: 'Community' },
          { key: 'author', label: 'Author' },
        ]}
      />

      {/* 2. Suggested Users */}
      <QueryCard
        title="Suggested Users"
        description="Get user suggestions based on shared community memberships."
        inputs={[
          { key: 'user_id', label: 'User ID', placeholder: 'e.g. u_1' },
        ]}
        onRun={(params) => querySuggestedUsers(params)}
        columns={[
          { key: 'username', label: 'Username' },
          { key: 'sharedCommunities', label: 'Shared Communities' },
        ]}
      />

      {/* 3. Active Communities */}
      <QueryCard
        title="Active Communities"
        description="List the most active communities by post count and average upvotes."
        inputs={[]}
        onRun={() => queryActiveCommunities()}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'postCount', label: 'Post Count' },
          { key: 'avgUpvotes', label: 'Avg Upvotes' },
        ]}
      />

      {/* 4. Game Community Stats */}
      <QueryCard
        title="Game Community Stats"
        description="Statistics about communities grouped by game."
        inputs={[]}
        onRun={() => queryGameCommunityStats()}
        columns={[
          { key: 'title', label: 'Game Title' },
          { key: 'communityCount', label: 'Community Count' },
          { key: 'avgKarma', label: 'Avg Karma' },
        ]}
      />

      {/* 5. Shortest Path */}
      <QueryCard
        title="Shortest Path"
        description="Find the shortest path between two users in the graph."
        inputs={[
          { key: 'user_a_id', label: 'User A ID', placeholder: 'e.g. u_1' },
          { key: 'user_b_id', label: 'User B ID', placeholder: 'e.g. u_5' },
        ]}
        onRun={(params) => queryShortestPath({ user_a_id: params.user_a_id, user_b_id: params.user_b_id })}
        renderResults={(results) => {
          const data = results?.data || results;
          if (!data || (!data.pathNodes && !data.distance)) {
            return <p className="text-gray-400 text-sm italic">No path found between these users.</p>;
          }
          const pathNodes = data.pathNodes || [];
          return (
            <div className="text-sm text-gray-100 space-y-2">
              <p>
                <span className="text-gray-400">Distance:</span> {data.distance}
              </p>
              {pathNodes.length > 0 && (
                <div>
                  <span className="text-gray-400">Path:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {pathNodes.map((node, i) => (
                      <span
                        key={i}
                        className="bg-[#252631] border border-gray-700 rounded px-2 py-1 text-xs"
                      >
                        {typeof node === 'object' ? node.username || node.id || JSON.stringify(node) : node}
                        {i < pathNodes.length - 1 && (
                          <span className="text-indigo-400 ml-2">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }}
      />

      {/* 6. Rare Award Posts */}
      <QueryCard
        title="Rare Award Posts"
        description="Find posts that have received rare awards, grouped by community."
        inputs={[]}
        onRun={() => queryRareAwardPosts()}
        columns={[
          { key: 'community', label: 'Community' },
          {
            key: 'posts',
            label: 'Posts',
            render: (val) =>
              Array.isArray(val) ? val.join(', ') : String(val ?? ''),
          },
          { key: 'rareAwardCount', label: 'Rare Award Count' },
        ]}
      />
    </div>
  );
}

export default QueryExplorer;
