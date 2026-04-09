import { useState } from 'react';

function PropertyEditor({ properties = {}, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');

  const entries = Object.entries(properties);

  const handleAdd = () => {
    if (!newKey.trim()) return;
    onAdd?.(newKey.trim(), newValue);
    setNewKey('');
    setNewValue('');
    setAdding(false);
  };

  const startEdit = (key) => {
    setEditingKey(key);
    setEditValue(
      typeof properties[key] === 'object'
        ? JSON.stringify(properties[key])
        : String(properties[key])
    );
  };

  const handleUpdate = (key) => {
    onUpdate?.(key, editValue);
    setEditingKey(null);
    setEditValue('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Properties</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors"
        >
          {adding ? 'Cancel' : '+ Add Property'}
        </button>
      </div>

      {adding && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Key</label>
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#0f1117] border border-gray-700 rounded text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
              placeholder="property_name"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Value</label>
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#0f1117] border border-gray-700 rounded text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
              placeholder="value"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-500 transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {entries.length === 0 && !adding && (
        <p className="text-sm text-gray-600">No properties set.</p>
      )}

      <ul className="space-y-1">
        {entries.map(([key, value]) => (
          <li
            key={key}
            className="flex items-center gap-2 px-3 py-2 bg-[#0f1117] rounded border border-gray-700/50 group"
          >
            <span className="text-xs font-mono text-indigo-400 min-w-[100px]">
              {key}
            </span>

            {editingKey === key ? (
              <>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 px-2 py-1 bg-[#1a1b23] border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate(key)}
                />
                <button
                  onClick={() => handleUpdate(key)}
                  className="text-xs px-2 py-1 text-green-400 hover:bg-green-400/10 rounded transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingKey(null)}
                  className="text-xs px-2 py-1 text-gray-500 hover:bg-white/5 rounded transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-300 truncate">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
                <button
                  onClick={() => startEdit(key)}
                  className="text-xs px-2 py-1 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-indigo-400 hover:bg-indigo-600/10 rounded transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete?.(key)}
                  className="text-xs px-2 py-1 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-600/10 rounded transition-all"
                >
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PropertyEditor;
