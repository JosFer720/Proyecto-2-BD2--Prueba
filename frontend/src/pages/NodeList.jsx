import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

const NODE_CONFIG = {
  users: {
    label: 'Users', singular: 'User',
    columns: [{ key: 'username', label: 'Username' }, { key: 'karmaPoints', label: 'Karma' }, { key: 'isPremium', label: 'Premium' }, { key: 'joinDate', label: 'Join Date' }],
    fields: [
      { name: 'username', label: 'Username', type: 'text' },
      { name: 'joinDate', label: 'Join Date', type: 'date' },
      { name: 'karmaPoints', label: 'Karma Points', type: 'number' },
      { name: 'isPremium', label: 'Premium', type: 'boolean' },
      { name: 'favoriteGenres', label: 'Favorite Genres (comma-separated)', type: 'list' },
    ],
    extraLabels: ['Moderator', 'Admin', 'Bot'],
    searchKey: 'username',
  },
  posts: {
    label: 'Posts', singular: 'Post',
    columns: [{ key: 'title', label: 'Title' }, { key: 'upvotes', label: 'Upvotes' }, { key: 'isPinned', label: 'Pinned' }, { key: 'createdAt', label: 'Created' }],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'body', label: 'Body', type: 'text' },
      { name: 'createdAt', label: 'Created At', type: 'date' },
      { name: 'upvotes', label: 'Upvotes', type: 'number' },
      { name: 'isPinned', label: 'Pinned', type: 'boolean' },
      { name: 'flairs', label: 'Flairs (comma-separated)', type: 'list' },
    ],
    extraLabels: ['Pinned', 'Archived', 'Featured'],
    searchKey: 'title',
  },
  communities: {
    label: 'Communities', singular: 'Community',
    columns: [{ key: 'name', label: 'Name' }, { key: 'memberCount', label: 'Members' }, { key: 'isNSFW', label: 'NSFW' }, { key: 'createdDate', label: 'Created' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'createdDate', label: 'Created Date', type: 'date' },
      { name: 'memberCount', label: 'Member Count', type: 'number' },
      { name: 'isNSFW', label: 'NSFW', type: 'boolean' },
      { name: 'rules', label: 'Rules (comma-separated)', type: 'list' },
    ],
    extraLabels: ['Official', 'Verified', 'Premium'],
    searchKey: 'name',
  },
  games: {
    label: 'Games', singular: 'Game',
    columns: [{ key: 'title', label: 'Title' }, { key: 'metacriticScore', label: 'Metacritic' }, { key: 'isMultiplayer', label: 'Multiplayer' }, { key: 'releaseDate', label: 'Release' }],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'releaseDate', label: 'Release Date', type: 'date' },
      { name: 'metacriticScore', label: 'Metacritic Score', type: 'number' },
      { name: 'isMultiplayer', label: 'Multiplayer', type: 'boolean' },
      { name: 'platforms', label: 'Platforms (comma-separated)', type: 'list' },
    ],
    extraLabels: ['Indie', 'AAA', 'EarlyAccess'],
    searchKey: 'title',
  },
  tags: {
    label: 'Tags', singular: 'Tag',
    columns: [{ key: 'name', label: 'Name' }, { key: 'usageCount', label: 'Usage' }, { key: 'isOfficial', label: 'Official' }, { key: 'createdAt', label: 'Created' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'createdAt', label: 'Created At', type: 'date' },
      { name: 'usageCount', label: 'Usage Count', type: 'number' },
      { name: 'isOfficial', label: 'Official', type: 'boolean' },
      { name: 'relatedTags', label: 'Related Tags (comma-separated)', type: 'list' },
    ],
    extraLabels: ['Official', 'Trending', 'Deprecated'],
    searchKey: 'name',
  },
  awards: {
    label: 'Awards', singular: 'Award',
    columns: [{ key: 'name', label: 'Name' }, { key: 'coinCost', label: 'Cost' }, { key: 'isRare', label: 'Rare' }, { key: 'grantedAt', label: 'Granted' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'grantedAt', label: 'Granted At', type: 'date' },
      { name: 'coinCost', label: 'Coin Cost', type: 'number' },
      { name: 'isRare', label: 'Rare', type: 'boolean' },
      { name: 'description', label: 'Description', type: 'text' },
    ],
    extraLabels: ['Rare', 'Premium', 'Seasonal'],
    searchKey: 'name',
  },
};

function NodeList() {
  const { nodeType } = useParams();
  const navigate = useNavigate();
  const config = NODE_CONFIG[nodeType];

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [multiLabel, setMultiLabel] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [formData, setFormData] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [aggregate, setAggregate] = useState(null);
  const limit = 25;

  const fetchNodes = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    try {
      const params = { skip: page * limit, limit };
      if (search) params[config.searchKey] = search;
      const res = await api.get(`/${nodeType}/search`, { params });
      setNodes(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [nodeType, page, search, config]);

  const fetchAggregate = useCallback(async () => {
    try {
      const res = await api.get(`/${nodeType}/aggregate`);
      setAggregate(res.data);
    } catch (e) {
      console.error(e);
    }
  }, [nodeType]);

  useEffect(() => {
    setNodes([]);
    setPage(0);
    setSearch('');
    setSelected(new Set());
    setShowCreate(false);
    fetchAggregate();
  }, [nodeType, fetchAggregate]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  if (!config) {
    return <div className="text-gray-400">Unknown node type: {nodeType}</div>;
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = {};
      config.fields.forEach(f => {
        const val = formData[f.name];
        if (val === undefined || val === '') return;
        if (f.type === 'number') data[f.name] = Number(val);
        else if (f.type === 'boolean') data[f.name] = val === true || val === 'true';
        else if (f.type === 'list') data[f.name] = val.split(',').map(s => s.trim()).filter(Boolean);
        else data[f.name] = val;
      });

      if (multiLabel && selectedLabels.length > 0) {
        await api.post(`/${nodeType}/multi-label`, {
          labels: [config.singular, ...selectedLabels],
          properties: data,
        });
      } else {
        await api.post(`/${nodeType}`, data);
      }
      setShowCreate(false);
      setFormData({});
      setMultiLabel(false);
      setSelectedLabels([]);
      fetchNodes();
      fetchAggregate();
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} nodes?`)) return;
    try {
      for (const id of selected) {
        await api.delete(`/${nodeType}/${id}`);
      }
      setSelected(new Set());
      fetchNodes();
      fetchAggregate();
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || e.message));
    }
  };

  const formatValue = (val) => {
    if (val === true) return 'Yes';
    if (val === false) return 'No';
    if (Array.isArray(val)) return val.join(', ');
    if (val && typeof val === 'object') return JSON.stringify(val);
    return String(val ?? '');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{config.label}</h1>
          {aggregate && (
            <p className="text-sm text-gray-400 mt-1">
              Total: {aggregate.count} | {Object.entries(aggregate).filter(([k]) => k !== 'count').map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(1) : v}`).join(' | ')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              Delete ({selected.size})
            </button>
          )}
          <button onClick={() => { setShowCreate(true); setFormData({}); }} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
            + Create {config.singular}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder={`Search by ${config.searchKey}...`}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="w-full max-w-md px-4 py-2 bg-[#252631] border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-[#1e1f2a] border border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100">
              {multiLabel ? 'Create with Multiple Labels' : `Create ${config.singular}`}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setMultiLabel(!multiLabel)} className="text-sm text-indigo-400 hover:text-indigo-300">
                {multiLabel ? 'Single Label' : 'Multi-Label'}
              </button>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-200">X</button>
            </div>
          </div>
          {multiLabel && (
            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-2">Additional Labels:</label>
              <div className="flex gap-2 flex-wrap">
                {config.extraLabels.map(l => (
                  <label key={l} className="flex items-center gap-1 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={selectedLabels.includes(l)}
                      onChange={e => {
                        if (e.target.checked) setSelectedLabels([...selectedLabels, l]);
                        else setSelectedLabels(selectedLabels.filter(x => x !== l));
                      }}
                      className="rounded"
                    />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            {config.fields.map(f => (
              <div key={f.name}>
                <label className="text-sm text-gray-400 block mb-1">{f.label}</label>
                {f.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={formData[f.name] || false}
                    onChange={e => setFormData({ ...formData, [f.name]: e.target.checked })}
                    className="rounded"
                  />
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    value={formData[f.name] || ''}
                    onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#252631] border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-indigo-500"
                    step={f.type === 'number' ? 'any' : undefined}
                  />
                )}
              </div>
            ))}
            <div className="col-span-2">
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">Create</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[#1e1f2a] border border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  onChange={e => {
                    if (e.target.checked) setSelected(new Set(nodes.map(n => n.id)));
                    else setSelected(new Set());
                  }}
                  checked={nodes.length > 0 && selected.size === nodes.length}
                  className="rounded"
                />
              </th>
              {config.columns.map(c => (
                <th key={c.key} className="p-3 text-left text-gray-400 font-medium">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={config.columns.length + 1} className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : nodes.length === 0 ? (
              <tr><td colSpan={config.columns.length + 1} className="p-8 text-center text-gray-500">No {config.label.toLowerCase()} found</td></tr>
            ) : (
              nodes.map(node => (
                <tr
                  key={node.id}
                  className="border-b border-gray-800 hover:bg-[#252631] cursor-pointer"
                  onClick={() => navigate(`/${nodeType}/${node.id}`)}
                >
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(node.id)}
                      onChange={e => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(node.id);
                        else next.delete(node.id);
                        setSelected(next);
                      }}
                      className="rounded"
                    />
                  </td>
                  {config.columns.map(c => (
                    <td key={c.key} className="p-3 text-gray-300">{formatValue(node[c.key])}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-3 py-1 bg-[#252631] text-gray-300 rounded disabled:opacity-50 text-sm"
        >
          Previous
        </button>
        <span className="text-sm text-gray-400">Page {page + 1}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={nodes.length < limit}
          className="px-3 py-1 bg-[#252631] text-gray-300 rounded disabled:opacity-50 text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default NodeList;
