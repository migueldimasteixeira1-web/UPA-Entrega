const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem('upa_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || 'Erro na requisição', response.status);
  }

  return data;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request('/api/auth/me'),

  getStats: () => request('/api/dashboard/stats'),

  getOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/orders${query ? `?${query}` : ''}`);
  },

  getOrder: (id) => request(`/api/orders/${id}`),

  createOrder: (data) =>
    request('/api/orders', { method: 'POST', body: JSON.stringify(data) }),

  updateOrder: (id, data) =>
    request(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  confirmPayment: (id) =>
    request(`/api/orders/${id}/confirm-payment`, { method: 'POST' }),

  updateStatus: (id, data) =>
    request(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  registerUberFlash: (id, data) =>
    request(`/api/orders/${id}/register-uber-flash`, { method: 'POST', body: JSON.stringify(data) }),

  addNote: (id, note) =>
    request(`/api/orders/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),

  getMedications: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/medications${query ? `?${query}` : ''}`);
  },

  createMedication: (data) =>
    request('/api/medications', { method: 'POST', body: JSON.stringify(data) }),

  updateMedication: (id, data) =>
    request(`/api/medications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  adjustStock: (id, adjustment, reason) =>
    request(`/api/medications/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ adjustment, reason }),
    }),

  getUsers: () => request('/api/users'),

  createUser: (data) =>
    request('/api/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id, data) =>
    request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  resetPassword: (id, password) =>
    request(`/api/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  getPublicOrder: (token) => request(`/api/public/orders/${token}`),
};

export { ApiError };
