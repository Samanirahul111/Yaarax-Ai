// ─── API CLIENT ───────────────────────────────────────────────────────────────
// All requests proxy through Vite to http://localhost:3001

function getToken() {
  return localStorage.getItem('yaarax_ai_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
    'x-gemini-key': localStorage.getItem('yaarax_gemini_key') || '',
    'x-groq-key': localStorage.getItem('yaarax_groq_key') || '',
    'x-openrouter-key': localStorage.getItem('yaarax_openrouter_key') || '',
    'x-cerebras-key': localStorage.getItem('yaarax_cerebras_key') || '',
  };
}

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(url, options = {}) {
  const res = await fetch(API_BASE + url, options);
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // ── AUTH ──────────────────────────────────────────────────────────────────
  register: ({ username, email, password }) =>
    request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    }),

  login: ({ email, password }) =>
    request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request('/api/auth/me', { headers: authHeaders() }),

  verify2FA: (data) =>
    request('/api/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  toggle2FA: (data) =>
    request('/api/auth/toggle-2fa', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  // ── CONVERSATIONS ─────────────────────────────────────────────────────────
  getConversations: () =>
    request('/api/conversations', { headers: authHeaders() }),

  createConversation: (data = {}) =>
    request('/api/conversations', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  updateConversation: (id, data) =>
    request(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  deleteConversation: (id) =>
    request(`/api/conversations/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),

  getMessages: (convId) =>
    request(`/api/conversations/${convId}/messages`, { headers: authHeaders() }),

  clearMessages: (convId) =>
    request(`/api/conversations/${convId}/messages`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),

  // ── CHAT ──────────────────────────────────────────────────────────────────
  sendMessage: ({ conversationId, message, mode, files }) =>
    request('/api/chat', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ conversationId, message, mode, files }),
    }),

  generateVideo: (data) =>
    request('/api/chat/video/generate', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  generateReplicateVideo: (data, replicateKey) =>
    request('/api/chat/video/replicate/generate', {
      method: 'POST',
      headers: { ...authHeaders(), 'x-replicate-key': replicateKey || '' },
      body: JSON.stringify(data),
    }),

  pollReplicateVideo: (id, replicateKey) =>
    request(`/api/chat/video/replicate/status/${id}`, {
      method: 'GET',
      headers: { ...authHeaders(), 'x-replicate-key': replicateKey || '' },
    }),

  /**
   * Specialist function for reading NDJSON stream
   */
  async *streamMessage({ conversationId, message, mode, files }) {
    const res = await fetch(API_BASE + '/api/chat', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ conversationId, message, mode, files }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(data.error || 'Failed to connect to AI');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep partial line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line);
        } catch (e) {
          console.warn('Failed to parse NDJSON line:', line);
        }
      }
    }
  },

  // ── MEMORY ────────────────────────────────────────────────────────────────
  getMemory: () => request('/api/memory', { headers: authHeaders() }),

  saveMemory: (key, value) =>
    request('/api/memory', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ key, value }),
    }),

  deleteMemory: (key) =>
    request(`/api/memory/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),

  clearMemory: () =>
    request('/api/memory', {
      method: 'DELETE',
      headers: authHeaders(),
    }),

  // ── TASKS ─────────────────────────────────────────────────────────────────
  getTasks: (type) => {
    const url = type ? `/api/tasks?type=${type}` : '/api/tasks';
    return request(url, { headers: authHeaders() });
  },

  createTask: (data) =>
    request('/api/tasks', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  updateTask: (id, data) =>
    request(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  deleteTask: (id) =>
    request(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
};

