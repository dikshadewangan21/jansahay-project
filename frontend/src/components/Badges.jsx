/**
 * Badge components — CategoryBadge, SourceBadge, StatusBadge
 * Covers all categories, sources, and statuses used in the app.
 */

const CATEGORY_STYLE = {
  // Original NGO categories
  food:           { label: '🌾 Food',           cls: 'bg-amber-900/30 text-amber-300 border-amber-700/30' },
  water:          { label: '💧 Water',          cls: 'bg-blue-900/30 text-blue-300 border-blue-700/30' },
  health:         { label: '🏥 Health',         cls: 'bg-red-900/30 text-red-300 border-red-700/30' },
  shelter:        { label: '🏠 Shelter',        cls: 'bg-purple-900/30 text-purple-300 border-purple-700/30' },
  infrastructure: { label: '🔧 Infrastructure', cls: 'bg-gray-800/50 text-gray-300 border-gray-600/30' },
  air:            { label: '💨 Air Quality',    cls: 'bg-teal-900/30 text-teal-300 border-teal-700/30' },
  // Civic complaint categories (new)
  electricity:    { label: '⚡ Electricity',    cls: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/30' },
  roads:          { label: '🛣️ Roads',          cls: 'bg-stone-800/50 text-stone-300 border-stone-600/30' },
  sanitation:     { label: '🗑️ Sanitation',     cls: 'bg-lime-900/30 text-lime-300 border-lime-700/30' },
};

const SOURCE_STYLE = {
  whatsapp:     { label: '💬 WhatsApp',     cls: 'bg-green-900/30 text-green-300 border-green-700/30' },
  paper_survey: { label: '📋 Paper Survey', cls: 'bg-orange-900/30 text-orange-300 border-orange-700/30' },
  ngo_upload:   { label: '🏢 NGO Upload',   cls: 'bg-violet-900/30 text-violet-300 border-violet-700/30' },
  iot:          { label: '📡 IoT Sensor',   cls: 'bg-cyan-900/30 text-cyan-300 border-cyan-700/30' },
  // New sources
  web:          { label: '🌐 Web Form',     cls: 'bg-sky-900/30 text-sky-300 border-sky-700/30' },
  mobile:       { label: '📱 Mobile App',   cls: 'bg-indigo-900/30 text-indigo-300 border-indigo-700/30' },
};

const STATUS_STYLE = {
  open:        { label: 'Open',        cls: 'bg-blue-900/30 text-blue-300 border-blue-700/30' },
  assigned:    { label: 'Assigned',    cls: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/30' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-900/30 text-amber-300 border-amber-700/30' },
  // Legacy hyphen form — keep for any old data
  'in-progress':{ label: 'In Progress',cls: 'bg-amber-900/30 text-amber-300 border-amber-700/30' },
  completed:   { label: '✓ Resolved',  cls: 'bg-green-900/30 text-green-300 border-green-700/30' },
  rejected:    { label: 'Rejected',    cls: 'bg-red-900/30 text-red-300 border-red-700/30' },
  // Volunteer statuses
  available:   { label: 'Available',   cls: 'bg-green-900/30 text-green-300 border-green-700/30' },
  'on-task':   { label: 'On Task',     cls: 'bg-amber-900/30 text-amber-300 border-amber-700/30' },
  inactive:    { label: 'Inactive',    cls: 'bg-gray-800/50 text-gray-400 border-gray-600/30' },
};

const FALLBACK = 'bg-gray-800/50 text-gray-400 border-gray-600/30';

export function CategoryBadge({ category }) {
  const c = CATEGORY_STYLE[category] || { label: category || 'Unknown', cls: FALLBACK };
  return <span className={`badge border ${c.cls}`}>{c.label}</span>;
}

export function SourceBadge({ source }) {
  const s = SOURCE_STYLE[source] || { label: source || 'Unknown', cls: FALLBACK };
  return <span className={`badge border ${s.cls}`}>{s.label}</span>;
}

export function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { label: status || 'Unknown', cls: FALLBACK };
  return <span className={`badge border ${s.cls}`}>{s.label}</span>;
}
