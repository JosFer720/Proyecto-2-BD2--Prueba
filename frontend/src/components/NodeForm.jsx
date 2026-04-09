import { useState } from 'react';

function NodeForm({ fields = [], initialValues = {}, onSubmit, submitLabel = 'Save' }) {
  const [values, setValues] = useState(() => {
    const init = {};
    fields.forEach((f) => {
      if (f.name in initialValues) {
        init[f.name] =
          f.type === 'list' && Array.isArray(initialValues[f.name])
            ? initialValues[f.name].join(', ')
            : initialValues[f.name];
      } else {
        init[f.name] = f.type === 'boolean' ? false : '';
      }
    });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (name, type, raw) => {
    let value = raw;
    if (type === 'boolean') value = raw;
    else if (type === 'number') value = raw;
    else value = raw;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const parsed = {};
      fields.forEach((f) => {
        const v = values[f.name];
        if (f.type === 'number') parsed[f.name] = v === '' ? null : Number(v);
        else if (f.type === 'boolean') parsed[f.name] = Boolean(v);
        else if (f.type === 'list')
          parsed[f.name] = typeof v === 'string'
            ? v.split(',').map((s) => s.trim()).filter(Boolean)
            : v;
        else parsed[f.name] = v;
      });
      await onSubmit(parsed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {field.label}
          </label>

          {field.type === 'boolean' ? (
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!values[field.name]}
                onChange={(e) => handleChange(field.name, 'boolean', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-[#0f1117] text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-400">Enabled</span>
            </label>
          ) : (
            <input
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={values[field.name] ?? ''}
              onChange={(e) => handleChange(field.name, field.type, e.target.value)}
              placeholder={field.type === 'list' ? 'Comma-separated values' : ''}
              className="w-full px-3 py-2 bg-[#0f1117] border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}

export default NodeForm;
