import { API_URL } from '@env';

const makeRequest = async (url, method, body, authRequired = false) => {
  const headers = {'Content-Type': 'application/json'};
  if (authRequired) {
    const token = await AsyncStorage.getItem('token');
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    method,
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

export const api = {
  login: (credentials) => makeRequest('/auth/login', 'POST', credentials),
  register: (userData) => makeRequest('/auth/register', 'POST', userData),
  addViolation: (data) => makeRequest('/violations', 'POST', data, true),
  getViolations: () => makeRequest('/violations', 'GET')
};