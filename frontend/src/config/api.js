export const DEFAULT_API_URL = 'http://localhost:3001/api';
export const API_URL = import.meta.env?.VITE_API_URL || DEFAULT_API_URL;

export const buildApiUrl = (baseUrl, endpoint) => {
  const normalizedBase = String(baseUrl || DEFAULT_API_URL).replace(/\/+$/, '');
  let normalizedEndpoint = String(endpoint || '').replace(/^\/+/, '');
  if (normalizedBase.endsWith('/api') && normalizedEndpoint.startsWith('api/')) {
    normalizedEndpoint = normalizedEndpoint.slice(4);
  }
  return normalizedEndpoint ? `${normalizedBase}/${normalizedEndpoint}` : normalizedBase;
};

const api = {
  get: async (endpoint, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(buildApiUrl(API_URL, endpoint), { headers });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },
  
  post: async (endpoint, data, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(buildApiUrl(API_URL, endpoint), {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },
  
  put: async (endpoint, data, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(buildApiUrl(API_URL, endpoint), {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },
  
  delete: async (endpoint, token = null) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(buildApiUrl(API_URL, endpoint), {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }
};

export default api;
