// Em produção (gateway nginx) a API é same-origin: paths /api/... relativos.
// Em desenvolvimento o Vite faz proxy de /api para o backend (vite.config.js).
// Exportado porque a página pública de acompanhamento monta o link do
// comprovante em PDF direto (sem passar por request()/token — a rota é
// pública, autorizada pelo próprio token do pedido na URL).
export const API_URL = import.meta.env.VITE_API_URL ?? '';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const NETWORK_ERROR_MESSAGE = 'Verifique sua conexão com a internet e tente novamente.';

// fetch() rejeita com um TypeError genérico quando a requisição nem chega a
// sair (sem conexão, DNS, etc.) — sem isso, esse caso ficava indistinguível
// de um erro de negócio de verdade na hora de decidir a mensagem pro usuário.
async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }
}

// Única fonte de mensagem de erro pra ação do usuário: erro de servidor (ou
// de rede, já que safeFetch os transforma em ApiError também) mostra a
// mensagem específica; qualquer outra coisa inesperada cai no genérico.
export function getErrorMessage(err) {
  return err instanceof ApiError ? err.message : 'Algo deu errado. Tente novamente.';
}

async function request(path, options = {}) {
  const token = localStorage.getItem('upa_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await safeFetch(`${API_URL}${path}`, {
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
    const response = await safeFetch(`${API_URL}/api/orders/report${query ? `?${query}` : ''}`, {
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

    const response = await safeFetch(`${API_URL}/api/orders`, {
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

  // multipart/form-data (issue #39) — foto de comprovação obrigatória junto
  // com o PIN, mesmo motivo de createOrder não usar request(): o navegador
  // precisa definir o Content-Type com o boundary do multipart sozinho.
  verifyDeliveryPin: (id, pin) =>
    request(`/api/orders/${id}/verify-pin`, { method: 'POST', body: JSON.stringify({ pin }) }),

  confirmDelivery: async (id, pin, proofFile) => {
    const token = localStorage.getItem('upa_token');
    const formData = new FormData();
    formData.append('pin', pin);
    formData.append('proof', proofFile);

    const response = await safeFetch(`${API_URL}/api/orders/${id}/confirm-delivery`, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(data.error || 'Erro na requisição', response.status);
    }
    return data;
  },

  addNote: (id, note) =>
    request(`/api/orders/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),

  resendConfirmationEmail: (id) => request(`/api/orders/${id}/resend-email`, { method: 'POST' }),

  getPrescriptionUrl: (id) => request(`/api/orders/${id}/prescription`),

  getDeliveryProofUrl: (id) => request(`/api/orders/${id}/delivery-proof`),

  // Não usa request(): a resposta é o PDF puro, não JSON (mesmo motivo de
  // exportOrdersReport) — issue #40.
  getReceiptPdf: async (id) => {
    const token = localStorage.getItem('upa_token');
    const response = await safeFetch(`${API_URL}/api/orders/${id}/receipt-pdf`, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.error || 'Erro ao gerar comprovante', response.status);
    }

    return response.blob();
  },

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
