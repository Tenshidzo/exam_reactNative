import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../api/config';

export const addViolation = async ({ description, imageUrl, latitude, longitude }) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('Користувач не авторизований');

  const response = await fetch(`${API_URL}/violations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      description,
      imageUrl,
      latitude,
      longitude
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error || 'Помилка при створенні правопорушення');
  }

  return await response.json();
};
export const getViolations = async () => {
  const response = await fetch(`${API_URL}/violations`);
  if (!response.ok) throw new Error('Не вдалося завантажити правопорушення');
  return await response.json();
};