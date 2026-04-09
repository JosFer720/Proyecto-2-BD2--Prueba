import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getUsersAggregate,
  getPostsAggregate,
  getCommunitiesAggregate,
  getGamesAggregate,
  getTagsAggregate,
  getAwardsAggregate,
  healthCheck,
} from '../api/client';

const SECTIONS = [
  { key: 'users', label: 'Users', icon: '\u263A', color: 'bg-blue-500', path: '/users' },
  { key: 'posts', label: 'Posts', icon: '\u270E', color: 'bg-green-500', path: '/posts' },
  { key: 'communities', label: 'Communities', icon: '\u2691', color: 'bg-orange-500', path: '/communities' },
  { key: 'games', label: 'Games', icon: '\u265F', color: 'bg-red-500', path: '/games' },
  { key: 'tags', label: 'Tags', icon: '\u2605', color: 'bg-purple-500', path: '/tags' },
  { key: 'awards', label: 'Awards', icon: '\u2655', color: 'bg-yellow-500', path: '/awards' },
];

const aggregateFns = {
  users: getUsersAggregate,
  posts: getPostsAggregate,
  communities: getCommunitiesAggregate,
  games: getGamesAggregate,
  tags: getTagsAggregate,
  awards: getAwardsAggregate,
};

function Dashboard() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const results = {};
      await Promise.allSettled(
        SECTIONS.map(async (s) => {
          try {
            const res = await aggregateFns[s.key]();
            results[s.key] = res.data?.count ?? res.data?.total ?? '?';
          } catch {
            results[s.key] = '?';
          }
        })
      );
      setCounts(results);
      setLoading(false);
    };

    const checkHealth = async () => {
      try {
        await healthCheck();
        setDbStatus('connected');
      } catch {
        setDbStatus('error');
      }
    };

    fetchAll();
    checkHealth();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">GGBoard</h1>
        <p className="text-gray-400 mt-1">Gaming Community Dashboard</p>
        {dbStatus && (
          <span
            className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
              dbStatus === 'connected'
                ? 'bg-green-900/40 text-green-400'
                : 'bg-red-900/40 text-red-400'
            }`}
          >
            Neo4j: {dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SECTIONS.map((s) => (
          <Link
            key={s.key}
            to={s.path}
            className="bg-[#1e1f2a] border border-gray-700 rounded-xl p-5 hover:border-indigo-500/50 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`${s.color} w-10 h-10 rounded-lg flex items-center justify-center text-lg text-white`}
              >
                {s.icon}
              </span>
              <span className="text-xs text-gray-500 group-hover:text-indigo-400 transition-colors">
                View all &rarr;
              </span>
            </div>
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold text-gray-100 mt-1">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-gray-700 rounded animate-pulse" />
              ) : (
                counts[s.key] ?? '?'
              )}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Relationships', path: '/relationships', icon: '\u2194' },
          { label: 'Queries', path: '/queries', icon: '\u2315' },
          { label: 'CSV Upload', path: '/csv-upload', icon: '\u21E7' },
          { label: 'Graph View', path: '/graph', icon: '\u25C8' },
          { label: 'GDS Algorithms', path: '/gds', icon: '\u2699' },
        ].map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="bg-[#1e1f2a] border border-gray-700 rounded-lg px-4 py-3 flex items-center gap-3 hover:border-indigo-500/50 transition-colors"
          >
            <span className="text-xl text-indigo-400">{link.icon}</span>
            <span className="text-sm text-gray-300 font-medium">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
