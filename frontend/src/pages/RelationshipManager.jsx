import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const REL_TYPES = [
  'MEMBER_OF', 'WROTE', 'POSTED_IN', 'UPVOTED', 'COMMENTED_ON',
  'FOLLOWS', 'ABOUT', 'TAGGED_WITH', 'RELATED_TO', 'RECEIVED_AWARD', 'CROSSPOSTED_TO',
];

const NODE_LABELS = ['User', 'Post', 'Community', 'Game', 'Tag', 'Award'];

function parseValue(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (!isNaN(val) && String(val).trim() !== '') return Number(val);
  return val;
}

function RelationshipManager() {
  // Browse state
  const [selectedType, setSelectedType] = useState(REL_TYPES[0]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    from_label: 'User',
    from_id: '',
    to_label: 'Community',
    to_id: '',
    type: REL_TYPES[0],
  });
  const [createProps, setCreateProps] = useState([
    { name: '', value: '' },
    { name: '', value: '' },
    { name: '', value: '' },
  ]);

  // Inline edit
  const [editingIdx, setEditingIdx] = useState(null);
  const [editProps, setEditProps] = useState([{ name: '', value: '' }]);

  // Batch operations
  const [showBatch, setShowBatch] = useState(false);
  const [batchOp, setBatchOp] = useState('update');
  const [batchForm, setBatchForm] = useState({
    type: REL_TYPES[0],
    from_label: '',
    from_id: '',
    to_label: '',
    to_id: '',
  });
  const [batchProps, setBatchProps] = useState([{ name: '', value: '' }]);
  const [batchPropNames, setBatchPropNames] = useState(['']);

  const fetchRelationships = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/relationships', { params: { type: selectedType, limit: 50 } });
      setRelationships(res.data || []);
    } catch (err) {
      console.error('Failed to fetch relationships:', err);
      setRelationships([]);
    }
    setLoading(false);
  }, [selectedType]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  // --- Create ---
  const handleCreate = async () => {
    if (!createForm.from_id || !createForm.to_id) return;
    try {
      const properties = {};
      createProps.forEach((p) => {
        if (p.name.trim()) properties[p.name] = parseValue(p.value);
      });
      const body = { ...createForm };
      if (Object.keys(properties).length > 0) body.properties = properties;
      await api.post('/relationships', body);
      setShowCreate(false);
      setCreateForm({ from_label: 'User', from_id: '', to_label: 'Community', to_id: '', type: REL_TYPES[0] });
      setCreateProps([{ name: '', value: '' }, { name: '', value: '' }, { name: '', value: '' }]);
      fetchRelationships();
    } catch (err) {
      alert('Failed to create relationship: ' + (err.response?.data?.detail || err.message));
    }
  };

  const addCreateProp = () => setCreateProps([...createProps, { name: '', value: '' }]);
  const updateCreateProp = (i, field, val) => {
    const next = [...createProps];
    next[i] = { ...next[i], [field]: val };
    setCreateProps(next);
  };

  // --- Edit inline ---
  const startEdit = (idx) => {
    const rel = relationships[idx];
    const props = rel.properties && Object.keys(rel.properties).length > 0
      ? Object.entries(rel.properties).map(([name, value]) => ({ name, value: String(value) }))
      : [{ name: '', value: '' }];
    setEditProps(props);
    setEditingIdx(idx);
  };

  const handleSaveEdit = async (rel) => {
    try {
      const properties = {};
      editProps.forEach((p) => {
        if (p.name.trim()) properties[p.name] = parseValue(p.value);
      });
      await api.patch('/relationships/properties', {
        type: rel.type,
        from_label: rel.from_label,
        from_id: rel.from_id,
        to_label: rel.to_label,
        to_id: rel.to_id,
        properties,
      });
      setEditingIdx(null);
      fetchRelationships();
    } catch (err) {
      alert('Failed to update properties: ' + (err.response?.data?.detail || err.message));
    }
  };

  const addEditProp = () => setEditProps([...editProps, { name: '', value: '' }]);
  const updateEditProp = (i, field, val) => {
    const next = [...editProps];
    next[i] = { ...next[i], [field]: val };
    setEditProps(next);
  };

  // --- Delete single ---
  const handleDelete = async (rel) => {
    if (!window.confirm('Delete this relationship?')) return;
    try {
      await api.delete('/relationships/single', {
        data: {
          type: rel.type,
          from_label: rel.from_label,
          from_id: rel.from_id,
          to_label: rel.to_label,
          to_id: rel.to_id,
        },
      });
      fetchRelationships();
    } catch (err) {
      alert('Failed to delete relationship: ' + (err.response?.data?.detail || err.message));
    }
  };

  // --- Batch operations ---
  const buildBatchFilter = () => {
    const filter = { type: batchForm.type };
    if (batchForm.from_label) filter.from_label = batchForm.from_label;
    if (batchForm.from_id) filter.from_id = batchForm.from_id;
    if (batchForm.to_label) filter.to_label = batchForm.to_label;
    if (batchForm.to_id) filter.to_id = batchForm.to_id;
    return filter;
  };

  const handleBatchSubmit = async () => {
    const filter = buildBatchFilter();
    try {
      if (batchOp === 'update') {
        const properties = {};
        batchProps.forEach((p) => {
          if (p.name.trim()) properties[p.name] = parseValue(p.value);
        });
        if (Object.keys(properties).length === 0) return;
        await api.patch('/relationships/properties/batch', { ...filter, properties });
      } else if (batchOp === 'deleteProps') {
        const names = batchPropNames.filter((n) => n.trim());
        if (names.length === 0) return;
        await api.delete('/relationships/properties/batch', { data: { ...filter, property_names: names } });
      } else if (batchOp === 'deleteRels') {
        if (!window.confirm('Delete ALL matching relationships? This cannot be undone.')) return;
        await api.delete('/relationships/batch', { data: filter });
      }
      fetchRelationships();
      alert('Batch operation completed.');
    } catch (err) {
      alert('Batch operation failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const inputCls = 'px-3 py-2 bg-[#252631] border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-indigo-500';
  const btnPrimary = 'px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors';
  const btnSecondary = 'px-3 py-1.5 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors';
  const btnDanger = 'px-3 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Relationship Manager</h1>

      {/* Type selector + action buttons */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <label className="text-sm text-gray-400">Relationship Type:</label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={inputCls}
        >
          {REL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button onClick={() => setShowCreate(!showCreate)} className={btnPrimary}>
          {showCreate ? 'Cancel' : 'Create Relationship'}
        </button>
        <button
          onClick={() => setShowBatch(!showBatch)}
          className={btnSecondary}
        >
          {showBatch ? 'Hide Batch' : 'Batch Operations'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-[#1e1f2a] border border-gray-700 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Create Relationship</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">From Label</label>
              <select
                value={createForm.from_label}
                onChange={(e) => setCreateForm({ ...createForm, from_label: e.target.value })}
                className={`w-full ${inputCls}`}
              >
                {NODE_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">From ID</label>
              <input
                type="text"
                placeholder="Node ID"
                value={createForm.from_id}
                onChange={(e) => setCreateForm({ ...createForm, from_id: e.target.value })}
                className={`w-full ${inputCls}`}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To Label</label>
              <select
                value={createForm.to_label}
                onChange={(e) => setCreateForm({ ...createForm, to_label: e.target.value })}
                className={`w-full ${inputCls}`}
              >
                {NODE_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To ID</label>
              <input
                type="text"
                placeholder="Node ID"
                value={createForm.to_id}
                onChange={(e) => setCreateForm({ ...createForm, to_id: e.target.value })}
                className={`w-full ${inputCls}`}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={createForm.type}
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                className={`w-full ${inputCls}`}
              >
                {REL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Properties */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Properties (optional)</label>
              <button onClick={addCreateProp} className="text-xs text-indigo-400 hover:text-indigo-300">
                + Add Property
              </button>
            </div>
            {createProps.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={p.name}
                  onChange={(e) => updateCreateProp(i, 'name', e.target.value)}
                  className={`flex-1 ${inputCls}`}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={p.value}
                  onChange={(e) => updateCreateProp(i, 'value', e.target.value)}
                  className={`flex-1 ${inputCls}`}
                />
              </div>
            ))}
          </div>

          <button onClick={handleCreate} className={btnPrimary}>Create</button>
        </div>
      )}

      {/* Batch Operations (collapsible) */}
      {showBatch && (
        <div className="bg-[#1e1f2a] border border-gray-700 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Batch Operations</h2>

          {/* Operation tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { key: 'update', label: 'Update Properties' },
              { key: 'deleteProps', label: 'Delete Properties' },
              { key: 'deleteRels', label: 'Delete Relationships' },
            ].map((op) => (
              <button
                key={op.key}
                onClick={() => setBatchOp(op.key)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  batchOp === op.key
                    ? op.key === 'deleteRels' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
                    : 'bg-[#252631] text-gray-400 hover:text-gray-100 border border-gray-600'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>

          {/* Filter fields */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={batchForm.type}
                onChange={(e) => setBatchForm({ ...batchForm, type: e.target.value })}
                className={`w-full ${inputCls}`}
              >
                {REL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">From Label (optional)</label>
              <select
                value={batchForm.from_label}
                onChange={(e) => setBatchForm({ ...batchForm, from_label: e.target.value })}
                className={`w-full ${inputCls}`}
              >
                <option value="">Any</option>
                {NODE_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">From ID (optional)</label>
              <input
                type="text"
                placeholder="Filter by from ID"
                value={batchForm.from_id}
                onChange={(e) => setBatchForm({ ...batchForm, from_id: e.target.value })}
                className={`w-full ${inputCls}`}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To Label (optional)</label>
              <select
                value={batchForm.to_label}
                onChange={(e) => setBatchForm({ ...batchForm, to_label: e.target.value })}
                className={`w-full ${inputCls}`}
              >
                <option value="">Any</option>
                {NODE_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To ID (optional)</label>
              <input
                type="text"
                placeholder="Filter by to ID"
                value={batchForm.to_id}
                onChange={(e) => setBatchForm({ ...batchForm, to_id: e.target.value })}
                className={`w-full ${inputCls}`}
              />
            </div>
          </div>

          {/* Operation-specific inputs */}
          {batchOp === 'update' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400">Properties to set</label>
                <button
                  onClick={() => setBatchProps([...batchProps, { name: '', value: '' }])}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  + Add
                </button>
              </div>
              {batchProps.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={p.name}
                    onChange={(e) => {
                      const next = [...batchProps];
                      next[i] = { ...next[i], name: e.target.value };
                      setBatchProps(next);
                    }}
                    className={`flex-1 ${inputCls}`}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={p.value}
                    onChange={(e) => {
                      const next = [...batchProps];
                      next[i] = { ...next[i], value: e.target.value };
                      setBatchProps(next);
                    }}
                    className={`flex-1 ${inputCls}`}
                  />
                </div>
              ))}
            </div>
          )}

          {batchOp === 'deleteProps' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400">Property names to delete</label>
                <button
                  onClick={() => setBatchPropNames([...batchPropNames, ''])}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  + Add
                </button>
              </div>
              {batchPropNames.map((name, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder="Property name"
                  value={name}
                  onChange={(e) => {
                    const next = [...batchPropNames];
                    next[i] = e.target.value;
                    setBatchPropNames(next);
                  }}
                  className={`w-full mb-2 ${inputCls}`}
                />
              ))}
            </div>
          )}

          {batchOp === 'deleteRels' && (
            <p className="text-sm text-red-400 mb-4">
              This will delete ALL relationships matching the filters above. This cannot be undone.
            </p>
          )}

          <button
            onClick={handleBatchSubmit}
            className={batchOp === 'deleteRels' ? `px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors` : btnPrimary}
          >
            {batchOp === 'update' ? 'Update Properties (Batch)' : batchOp === 'deleteProps' ? 'Delete Properties (Batch)' : 'Delete Relationships (Batch)'}
          </button>
        </div>
      )}

      {/* Relationships Table */}
      <div className="bg-[#1e1f2a] border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">From Node</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">To Node</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Properties</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : relationships.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No relationships found for type {selectedType}
                  </td>
                </tr>
              ) : (
                relationships.map((rel, idx) => (
                  <tr key={idx} className="border-b border-gray-700/50 hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-100">
                      <span className="text-xs text-gray-400 mr-1">{rel.from_label || '?'}</span>
                      <span className="font-mono text-gray-300">{rel.from_id || rel.startNode?.id || '?'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-100">
                      <span className="text-xs text-gray-400 mr-1">{rel.to_label || '?'}</span>
                      <span className="font-mono text-gray-300">{rel.to_id || rel.endNode?.id || '?'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-indigo-400 font-medium">{rel.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      {editingIdx === idx ? (
                        <div className="space-y-2">
                          {editProps.map((p, i) => (
                            <div key={i} className="flex gap-1">
                              <input
                                type="text"
                                placeholder="Name"
                                value={p.name}
                                onChange={(e) => updateEditProp(i, 'name', e.target.value)}
                                className="w-28 px-2 py-1 bg-[#252631] border border-gray-600 rounded text-gray-100 text-xs focus:outline-none focus:border-indigo-500"
                              />
                              <input
                                type="text"
                                placeholder="Value"
                                value={p.value}
                                onChange={(e) => updateEditProp(i, 'value', e.target.value)}
                                className="w-28 px-2 py-1 bg-[#252631] border border-gray-600 rounded text-gray-100 text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          ))}
                          <button onClick={addEditProp} className="text-xs text-indigo-400 hover:text-indigo-300">
                            + Add
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-mono">
                          {rel.properties && Object.keys(rel.properties).length > 0
                            ? JSON.stringify(rel.properties)
                            : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {editingIdx === idx ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(rel)}
                              className="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingIdx(null)}
                              className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(idx)}
                              className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                              title="Edit Properties"
                            >
                              &#9998;
                            </button>
                            <button
                              onClick={() => handleDelete(rel)}
                              className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white"
                              title="Delete"
                            >
                              &#10005;
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RelationshipManager;
