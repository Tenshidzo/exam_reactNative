  import axios from 'axios';
  import { getUnsyncedViolations, markAsSynced, getAllViolationIds, saveViolationToDB,getImageBase64ById } from './violationStorage';
  import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import {DELETE_QUEUE_KEY} from '@env'
async function base64ToFile(base64Data, fileName = 'upload.jpg') {
  const fileUri = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}
  export const isServerReachable = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/violations/all`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 3000,
      });
      return response.status === 200;
    } catch (err) {
      return false;
    }
  };

export const syncViolations = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token || token === 'offline-token') {
      console.warn('Недействительный токен');
      return;
    }
    const unsyncedViolations = await getUnsyncedViolations();
    console.log('Нарушений для синхронизации:', unsyncedViolations.length);

    for (const violation of unsyncedViolations) {
      try {
        let formData = new FormData();
        formData.append('description', violation.description);
        formData.append('latitude', Number(violation.latitude).toFixed(6));
        formData.append('longitude', Number(violation.longitude).toFixed(6));
        formData.append('date', violation.date);

        const base64 = await getImageBase64ById(violation.id);
        if (base64) {

          const fileUri = await base64ToFile(base64, `violation_${violation.id}.jpg`);

          formData.append('image', {
            uri: fileUri,
            type: 'image/jpeg',
            name: `violation_${violation.id}.jpg`,
          });
        }

        console.log(`Отправка на сервер: ID ${violation.id}`);

        const response = await axios.post(`${API_URL}/violations`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 15000,
        });

        if (response.status === 201) {
          await markAsSynced(violation.id);
          console.log(`Успешно синхронизировано: ${violation.id}`);
        }
        await FileSystem.deleteAsync(fileUri, { idempotent: true });

      } catch (err) {
        console.error(`Ошибка синхронизации ${violation.id}:`, {
          code: err.response?.status,
          message: err.response?.data?.error || err.message,
        });
      }
    }
  } catch (err) {
    console.error('Критическая ошибка синхронизации:', err);
  }
};
export const syncQueuedDeletions = async (token) => {
  try {
    const raw = await AsyncStorage.getItem(DELETE_QUEUE_KEY);
    if (!raw) return;

    const queued = JSON.parse(raw);
    const stillPending = [];

    for (const item of queued) {
      try {
        const res = await fetch(`${API_URL}/violations/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Ошибка получения данных с сервера');
        const all = await res.json();


        const match = all.find(v =>
          v.description === item.description &&
          new Date(v.date).toISOString() === new Date(item.date).toISOString()
        );

        if (match) {
          const del = await fetch(`${API_URL}/violations/${match.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!del.ok) throw new Error('Ошибка удаления с сервера');
          console.log('[syncQueuedDeletions] Удалено:', match.id);
        } else {
        
          stillPending.push(item);
        }
      } catch (e) {
        console.warn('[syncQueuedDeletions] Не удалось обработать:', item, e);
        stillPending.push(item); 
      }
    }

    if (stillPending.length > 0) {
      await AsyncStorage.setItem(DELETE_QUEUE_KEY, JSON.stringify(stillPending));
    } else {
      await AsyncStorage.removeItem(DELETE_QUEUE_KEY);
    }
  } catch (err) {
    console.error('[syncQueuedDeletions] Ошибка:', err);
  }
};
