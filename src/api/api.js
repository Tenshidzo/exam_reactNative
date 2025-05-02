import { API_URL } from '../api/config.js';

export const api = {
  login: async ({ email, password }) => {
    console.log('[Client] Отправка запроса на', `${API_URL}/login`);
    console.log('[Client] Данные:', { email, password });
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) throw new Error('Login failed');
    return await response.json();
  },

  register: async ({ firstName, lastName, email, password }) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password })
    });
    if (!response.ok) throw new Error('Registration failed');
    return await response.json();
  }
};
