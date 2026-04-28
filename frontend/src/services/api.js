/**
 * JanSahay API service layer.
 * Reads JWT from localStorage and attaches it to every authenticated request.
 */

const BASE_URL  = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'js_token';

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status  = status;
    this.details = details;
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token   = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new ApiError('Cannot connect to server. Is the backend running?', 0);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(`Server returned invalid response (${res.status})`, res.status);
  }

  if (!res.ok) {
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.details);
  }

  return data;
}

async function requestMultipart(path, formData) {
  const token   = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res  = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  let data;
  try { data = await res.json(); } catch { throw new ApiError(`Upload failed (${res.status})`, res.status); }
  if (!res.ok) throw new ApiError(data.error || `Upload failed (${res.status})`, res.status);
  return data;
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login:    (payload) => request('/auth/login',    { method: 'POST', body: JSON.stringify(payload) }),
  me:       ()        => request('/auth/me'),
  updateMe: (payload) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
};

// ── Reports ────────────────────────────────────────────────────────────────────
export const reportsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return request(`/reports${qs ? `?${qs}` : ''}`);
  },
  get:          (id)      => request(`/reports/${id}`),
  create:       (payload) => request('/reports', { method: 'POST', body: JSON.stringify(payload) }),
  updateStatus: (id, status) =>
    request(`/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  heatmap:   () => request('/reports/heatmap'),
  analytics: () => request('/reports/analytics/summary'),
  vote: (id) => request(`/reports/${id}/vote`, { method: 'POST' }),
  uploadImages: (id, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    return requestMultipart(`/reports/${id}/images`, fd);
  },
  feedback: (id, payload) =>
    request(`/reports/${id}/feedback`, { method: 'POST', body: JSON.stringify(payload) }),
  classify: (id) => request(`/reports/${id}/classify`, { method: 'POST' }),
};

// ── Volunteers ─────────────────────────────────────────────────────────────────
export const volunteersApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return request(`/volunteers${qs ? `?${qs}` : ''}`);
  },
  get:          (id)     => request(`/volunteers/${id}`),
  register:     (payload) => request('/volunteers', { method: 'POST', body: JSON.stringify(payload) }),
  updateStatus: (id, status) =>
    request(`/volunteers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  matchForTask: (taskId) => request(`/volunteers/match/${taskId}`),
};

// ── Tasks ──────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },
  get:      (id)      => request(`/tasks/${id}`),
  create:   (payload) => request('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  assign:   (taskId, volunteerId) =>
    request(`/tasks/${taskId}/assign`, { method: 'POST', body: JSON.stringify({ volunteerId }) }),
  complete: (taskId, payload = {}) =>
    request(`/tasks/${taskId}/complete`, { method: 'POST', body: JSON.stringify(payload) }),
};

// ── Dashboard ──────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats:     () => request('/dashboard/stats'),
  needGraph: () => request('/dashboard/need-graph'),
  forecast:  () => request('/dashboard/forecast'),
};

// ── SDG ────────────────────────────────────────────────────────────────────────
export const sdgApi = {
  scores: () => request('/sdg/scores'),
};

// ── AI Engine ──────────────────────────────────────────────────────────────────
export const aiApi = {
  recommend:         (reportId) => request(`/ai/recommend/${reportId}`),
  recommendInline:   (payload)  => request('/ai/recommend', { method: 'POST', body: JSON.stringify(payload) }),
  dispatch:          (taskId)   => request(`/ai/dispatch/${taskId}`, { method: 'POST' }),
  crisisPredictions: ()         => request('/ai/crisis-predictions'),
};

// ── Notifications (NEW) ────────────────────────────────────────────────────────
export const notificationsApi = {
  /** List notifications. Pass { unreadOnly: true } to filter. */
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return request(`/notifications${qs ? `?${qs}` : ''}`);
  },

  /** Lightweight unread count — used for badge polling */
  unreadCount: () => request('/notifications/unread-count'),

  /** Mark a single notification as read */
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),

  /** Mark all notifications as read */
  markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),

  /** Delete a notification */
  delete: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
};

export { ApiError, TOKEN_KEY };
