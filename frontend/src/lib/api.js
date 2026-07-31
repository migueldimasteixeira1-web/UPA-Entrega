// Em produção (gateway nginx) a API é same-origin: paths /api/... relativos.
// Em desenvolvimento o Vite faz proxy de /api para o backend (vite.config.js).
const API_URL = import.meta.env.VITE_API_URL ?? '';

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

  // Não usa request(): a resposta é CSV, não JSON — e precisa do nome do
  // arquivo que o backend sugeriu (Content-Disposition), não um fixo.
  exportOrdersReport: async (params = {}) => {
    const token = localStorage.getItem('upa_token');
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/api/orders/report${query ? `?${query}` : ''}`, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.error || 'Erro ao exportar relatório', response.status);
    }

    const disposition = response.headers.get('Content-Disposition') || '';
    const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] || 'pedidos.csv';
    return { blob: await response.blob(), filename };
  },

  getOrderHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/orders/history${query ? `?${query}` : ''}`);
  },

  getOrder: (id) => request(`/api/orders/${id}`),

  // multipart/form-data (receita + os demais campos como um único campo
  // "data" em JSON) — não usa request(): o navegador precisa definir o
  // Content-Type com o boundary do multipart sozinho, não "application/json".
  createOrder: async (data, prescriptionFile) => {
    const token = localStorage.getItem('upa_token');
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('prescription', prescriptionFile);

    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(responseData.error || 'Erro na requisição', response.status);
    }
    return responseData;
  },

  updateOrder: (id, data) =>
    request(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateStatus: (id, data) =>
    request(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  confirmDelivery: (id, pin) =>
    request(`/api/orders/${id}/confirm-delivery`, { method: 'POST', body: JSON.stringify({ pin }) }),

  addNote: (id, note) =>
    request(`/api/orders/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),

  resendConfirmationEmail: (id) => request(`/api/orders/${id}/resend-email`, { method: 'POST' }),

  getPrescriptionUrl: (id) => request(`/api/orders/${id}/prescription`),

  getPatientByCpf: (cpf) => request(`/api/patients/by-cpf/${cpf}`),

  getPatient: (id) => request(`/api/patients/${id}`),

  createPatient: (data) =>
    request('/api/patients', { method: 'POST', body: JSON.stringify(data) }),

  updatePatient: (id, data) =>
    request(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  addPatientAddress: (patientId, data) =>
    request(`/api/patients/${patientId}/addresses`, { method: 'POST', body: JSON.stringify(data) }),

  updatePatientAddress: (patientId, addressId, data) =>
    request(`/api/patients/${patientId}/addresses/${addressId}`, { method: 'PUT', body: JSON.stringify(data) }),

  getDeliveryRoutes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/delivery-routes${query ? `?${query}` : ''}`);
  },

  getMyDeliveryRoutes: () => request('/api/delivery-routes/mine'),

  getDeliveryRoute: (id) => request(`/api/delivery-routes/${id}`),

  createDeliveryRoute: (data) =>
    request('/api/delivery-routes', { method: 'POST', body: JSON.stringify(data) }),

  getMedications: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/medications${query ? `?${query}` : ''}`);
  },

  createMedication: (data) =>
    request('/api/medications', { method: 'POST', body: JSON.stringify(data) }),

  updateMedication: (id, data) =>
    request(`/api/medications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getUsers: () => request('/api/users'),

  getCouriers: () => request('/api/couriers'),

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
