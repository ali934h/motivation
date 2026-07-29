const PANEL_SECRET = import.meta.env.VITE_PANEL_PATH;

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Panel-Secret': PANEL_SECRET,
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // No JSON body (e.g. 404 from a mismatched secret path).
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  authStatus: () => request('/auth/status'),
  setupPassword: (password) =>
    request('/auth/setup', { method: 'POST', body: JSON.stringify({ password }) }),
  login: (password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  checkSession: () => request('/auth/session'),

  listCards: () => request('/cards'),
  createCard: (card) => request('/cards', { method: 'POST', body: JSON.stringify(card) }),
  updateCard: (id, card) =>
    request(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(card) }),
  deleteCard: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  reorderCards: (orderedIds) =>
    request('/cards/reorder', { method: 'POST', body: JSON.stringify({ orderedIds }) }),
};
