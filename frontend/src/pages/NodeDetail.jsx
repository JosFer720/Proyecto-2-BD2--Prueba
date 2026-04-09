import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

const REL_TYPES = [
  'MEMBER_OF', 'WROTE', 'POSTED_IN', 'UPVOTED', 'COMMENTED_ON',
  'FOLLOWS', 'ABOUT', 'TAGGED_WITH', 'RELATED_TO', 'RECEIVED_AWARD', 'CROSSPOSTED_TO',
];

function NodeDetail() {
  const { nodeType, id } = useParams();
  const navigate = useNavigate();

  const [node, setNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relationships, setRelationships] = useState([]);
  const [relsLoading, setRelsLoading] = useState(false);

  const [newPropName, setNewPropName] = useState('');
  const [newPropValue, setNewPropValue] = useState('');
  const [editingProp, setEditingProp] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [showCreateRel, setShowCreateRel] = useState(false);
  const [relForm, setRelForm] = useState({
    type: 'MEMBER_OF',
    targetLabel: 'User',
    targetId: '',
    direction: 'outgoing',
  });

  const parseValue = (val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (!isNaN(val) && String(val).trim() !== '') return Number(val);
    return val;
  };

  const fetchNode = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/${nodeType}/${id}`);
      setNode(res.data);
    } catch (err) {
      console.error('Failed to fetch node:', err);
      setNode(null);
    }
    setLoading(false);
  }, [nodeType, id]);

  const fetchRelationships = useCallback(async () => {
    setRelsLoading(true);
    try {
      const requests = REL_TYPES.flatMap((type) => [
        api.get('/relationships', { params: { type, from_id: id, limit: 10 } })
          .then((res) => (res.data || []).map((r) => ({ ...r, type: r.type || type, direction: 'outgoing' })))
          .catch(() => []),
        api.get('/relationships', { params: { type, to_id: id, limit: 10 } })
          .then((res) => (res.data || []).map((r) => ({ ...r, type: r.type || type, direction: 'incoming' })))
          .catch(() => []),
      ]);
      const results = await Promise.all(requests);
      setRelationships(results.flat());
    } catch (err) {
      console.error('Failed to fetch relationships:', err);
    }
    setRelsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchNode();
    fetchRelationships();
  }, [fetchNode, fetchRelationships]);

  const handleAddProperty = async () => {
    if (!newPropName.trim()) return;
    try {
      await api.patch(`/${nodeType}/${id}/properties`, { [newPropName]: parseValue(newPropValue) });
      setNewPropName('');
      setNewPropValue('');
      fetchNode();
    } catch (err) {
      alert('Failed to add property: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditProperty = async (propName) => {
    try {
      await api.patch(`/${nodeType}/${id}/properties`, { [propName]: parseValue(editValue) });
      setEditingProp(null);
      setEditValue('');
      fetchNode();
    } catch (err) {
      alert('Failed to update property: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteProperty = async (propName) => {
    if (!window.confirm(`Delete property "${propName}"?`)) return;
    try {
      await api.delete(`/${nodeType}/${id}/properties`, {
        data: { property_names: [propName] },
      });
      fetchNode();
    } catch (err) {
      alert('Failed to delete property: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteNode = async () => {
    if (!window.confirm(`Delete this ${nodeType.slice(0, -1)}? This cannot be undone.`)) return;
    try {
      await api.delete(`/${nodeType}/${id}`);
      navigate(`/${nodeType}`);
    } catch (err) {
      alert('Failed to delete node: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCreateRelationship = async () => {
    if (!relForm.type || !relForm.targetId) return;
    try {
      const data = { type: relForm.type };
      if (relForm.direction === 'outgoing') {
        data.from_label = nodeType.charAt(0).toUpperCase() + nodeType.slice(1, -1);
        data.from_id = id;
        data.to_label = relForm.targetLabel;
        data.to_id = relForm.targetId;
      } else {
        data.from_label = relForm.targetLabel;
        data.from_id = relForm.targetId;
        data.to_label = nodeType.charAt(0).toUpperCase() + nodeType.slice(1, -1);
        data.to_id = id;
      }
      await api.post('/relationships', data);
      setShowCreateRel(false);
      setRelForm({ type: 'MEMBER_OF', targetLabel: 'User', targetId: '', direction: 'outgoing' });
      fetchRelationships();
    } catch (err) {
      alert('Failed to create relationship: ' + (err.response?.data?.detail || err.message));
    }
  };

  const formatValue = (val) => {
    if (val === true) return 'true';
    if (val === false) return 'false';
    if (Array.isArray(val)) return JSON.stringify(val);
    if (val && typeof val === 'object') return JSON.stringify(val);
    return String(val ?? '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">Node not found</p>
        <Link to={`/${nodeType}`} className="text-indigo-400 hover:text-indigo-300">
          Back to {nodeType}
        </Link>
      </div>
    );
  }

  const properties = Object.entries(node).filter(
    ([k]) => k !== 'id' && k !== '_id' && k !== 'labels' && k !== 'elementId'
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to={`/${nodeType}`}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#1e1f2a] border border-gray-700 text-gray-400 hover:text-gray-100 transition-colors"
          >
            &larr; Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-100 capitalize">
              {nodeType.slice(0, -1)} Detail
            </h1>
            <p className="text-sm text-gray-500 font-mono">ID: {id}</p>
          </div>
        </div>
        <button
          onClick={handleDeleteNode}
          className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
        >
          Delete Node
        </button>
      </div>

      {/* Labels */}
      {node.labels && node.labels.length > 0 && (
        <div className="flex gap-2 mb-4">
          {node.labels.map((lbl) => (
            <span
              key={lbl}
              className="px-2 py-0.5 text-xs rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
            >
              {lbl}
            </span>
          ))}
        </div>
      )}

      {/* Properties Card */}
      <div className="bg-[#1e1f2a] border border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Properties</h2>

        {properties.length === 0 ? (
          <p className="text-gray-500 text-sm">No properties</p>
        ) : (
          <div className="space-y-1">
            {properties.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 group"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-400 mr-3 font-medium">{key}:</span>
                  {editingProp === key ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditProperty(key);
                        if (e.key === 'Escape') setEditingProp(null);
                      }}
                      className="px-2 py-1 bg-[#252631] border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm text-gray-100 break-all">{formatValue(value)}</span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                  {editingProp === key ? (
                    <>
                      <button
                        onClick={() => handleEditProperty(key)}
                        className="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingProp(null)}
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingProp(key);
                          setEditValue(formatValue(value));
                        }}
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                        title="Edit"
                      >
                        &#9998;
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(key)}
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white"
                        title="Delete"
                      >
                        &#10005;
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Property */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Add Property</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Property name"
              value={newPropName}
              onChange={(e) => setNewPropName(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#252631] border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Value"
              value={newPropValue}
              onChange={(e) => setNewPropValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddProperty();
              }}
              className="flex-1 px-3 py-2 bg-[#252631] border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAddProperty}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Relationships */}
      <div className="bg-[#1e1f2a] border border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Relationships</h2>
          <button
            onClick={() => setShowCreateRel(!showCreateRel)}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
          >
            {showCreateRel ? 'Cancel' : 'Create Relationship'}
          </button>
        </div>

        {/* Create Relationship Form */}
        {showCreateRel && (
          <div className="mb-4 p-4 bg-[#252631] rounded-lg border border-gray-600">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Relationship Type</label>
                <select
                  value={relForm.type}
                  onChange={(e) => setRelForm({ ...relForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1e1f2a] border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-indigo-500"
                >
                  {REL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Direction</label>
                <select
                  value={relForm.direction}
                  onChange={(e) => setRelForm({ ...relForm, direction: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1e1f2a] border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="outgoing">Outgoing (this node &rarr; target)</option>
                  <option value="incoming">Incoming (target &rarr; this node)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Target Label</label>
                <select
                  value={relForm.targetLabel}
                  onChange={(e) => setRelForm({ ...relForm, targetLabel: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1e1f2a] border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-indigo-500"
                >
                  {['User', 'Post', 'Community', 'Game', 'Tag', 'Award'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Target ID</label>
                <input
                  type="text"
                  placeholder="Node ID"
                  value={relForm.targetId}
                  onChange={(e) => setRelForm({ ...relForm, targetId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1e1f2a] border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              onClick={handleCreateRelationship}
              className="mt-3 px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
            >
              Create
            </button>
          </div>
        )}

        {/* Relationships List */}
        {relsLoading ? (
          <p className="text-gray-500 text-sm">Loading relationships...</p>
        ) : relationships.length === 0 ? (
          <p className="text-gray-500 text-sm">No relationships found</p>
        ) : (
          <div className="space-y-2">
            {relationships.map((rel, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5"
              >
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    rel.direction === 'outgoing'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-blue-900/30 text-blue-400'
                  }`}
                >
                  {rel.direction === 'outgoing' ? 'OUT' : 'IN'}
                </span>
                <span className="text-sm text-indigo-400 font-medium">{rel.type}</span>
                <span className="text-sm text-gray-400">
                  {rel.direction === 'outgoing' ? (
                    <>
                      &rarr; {rel.to_label || rel.endNode?.labels?.[0] || '?'}
                      <span className="font-mono text-gray-500 ml-1">
                        ({rel.to_id || rel.endNode?.id || '?'})
                      </span>
                    </>
                  ) : (
                    <>
                      &larr; {rel.from_label || rel.startNode?.labels?.[0] || '?'}
                      <span className="font-mono text-gray-500 ml-1">
                        ({rel.from_id || rel.startNode?.id || '?'})
                      </span>
                    </>
                  )}
                </span>
                {rel.properties && Object.keys(rel.properties).length > 0 && (
                  <span className="text-xs text-gray-500 ml-auto font-mono">
                    {JSON.stringify(rel.properties)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NodeDetail;
