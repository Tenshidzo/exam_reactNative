import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

const VIOLATIONS_KEY = 'offlineViolations';
const LOGINS_KEY     = 'offlineLogins';
const CACHED_VIOLATIONS = 'cachedViolations';
const CACHED_LOGINS     = 'cachedLogins';

/**
 * Сохранить новое нарушение в локальное хранилище
 */
export const saveViolationOffline = async (violation) => {
  try {
    const raw  = await AsyncStorage.getItem(VIOLATIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(violation);
    await AsyncStorage.setItem(VIOLATIONS_KEY, JSON.stringify(list));
    console.log('[offlineStorage] ✔ saveViolationOffline:', violation);
  } catch (error) {
    console.error('[offlineStorage] saveViolationOffline error:', error);
  }
};

/**
 * Синхронизировать накопленные офлайн‑нарушения с сервером
 */
export const syncOfflineViolations = async (token, apiUrl) => {
  try {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('[syncOfflineViolations] 🚫 No connection, aborting');
      return { synced: 0, failed: 0 };
    }

    const raw  = await AsyncStorage.getItem(VIOLATIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    console.log(`[syncOfflineViolations] 🔄 Found ${list.length} offline violation(s)`);

    const successful = [];
    const failed     = [];

    for (const violation of list) {
      const formData = new FormData();
      formData.append('description', violation.description);
      formData.append('latitude', violation.latitude);
      formData.append('longitude', violation.longitude);
      formData.append('image', {
        uri: violation.imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });

      try {
        console.log('[syncOfflineViolations] → Sending violation:', violation);
        const res = await axios.post(
          `${apiUrl}/violations`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        if (res.status === 200) {
          console.log('[syncOfflineViolations] ✔ Synced violation');
          successful.push(violation);
        } else {
          throw new Error(`Status ${res.status}`);
        }
      } catch (err) {
        console.error('[syncOfflineViolations] ❌ Failed to sync violation:', err.message);
        failed.push(violation);
      }
    }

    // сохраняем только те, что не удалось синхронизировать
    await AsyncStorage.setItem(VIOLATIONS_KEY, JSON.stringify(failed));
    console.log(`[syncOfflineViolations] 📊 ${successful.length} synced, ${failed.length} failed`);
    return { synced: successful.length, failed: failed.length };
  } catch (err) {
    console.error('[syncOfflineViolations] Sync error:', err);
    return { synced: 0, failed: 0 };
  }
};
export const getOfflineViolations = async () => {
  const json = await AsyncStorage.getItem('offline_violations');
  return json ? JSON.parse(json) : [];
};
/**
 * Сохранить попытку логина в локальное хранилище
 */
export const saveLoginOffline = async (login) => {
  try {
    const raw  = await AsyncStorage.getItem(LOGINS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(login);
    await AsyncStorage.setItem(LOGINS_KEY, JSON.stringify(list));
    console.log('[offlineStorage] ✔ saveLoginOffline:', login);
  } catch (err) {
    console.error('[offlineStorage] saveLoginOffline error:', err);
  }
};

/**
 * Синхронизировать накопленные попытки логина с сервером
 */
export const syncOfflineLogins = async (token, apiUrl) => {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    console.log('[syncOfflineLogins] 🚫 No connection, aborting');
    return { synced: 0, failed: 0 };
  }

  const raw  = await AsyncStorage.getItem(LOGINS_KEY);
  const list = raw ? JSON.parse(raw) : [];
  console.log(`[syncOfflineLogins] 🔄 Found ${list.length} offline login attempt(s)`);

  const successful = [];
  const failed     = [];

  for (const login of list) {
    try {
      console.log('[syncOfflineLogins] → Sending login attempt:', login);
      const res = await axios.post(
        `${apiUrl}/sync/logins`,
        { logins: [login] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 200) {
        console.log('[syncOfflineLogins] ✔ Synced login localId=' + login.localId);
        successful.push(login);
      } else {
        throw new Error(`Status ${res.status}`);
      }
    } catch (err) {
      console.error('[syncOfflineLogins] ❌ Failed to sync login:', err.message);
      failed.push(login);
    }
  }

  await AsyncStorage.setItem(LOGINS_KEY, JSON.stringify(failed));
  console.log(`[syncOfflineLogins] 📊 ${successful.length} synced, ${failed.length} failed`);
  return { synced: successful.length, failed: failed.length };
};

/**
 * Получить закешированные с сервера нарушения
 */
export const fetchAndCacheViolations = async (token, apiUrl) => {
  try {
    const res = await axios.get(`${apiUrl}/violations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 200 && Array.isArray(res.data)) {
      await AsyncStorage.setItem(CACHED_VIOLATIONS, JSON.stringify(res.data));
      console.log('[offlineStorage] ✔ Cached violations:', res.data.length);
      return res.data;
    }
    throw new Error(`Unexpected status ${res.status}`);
  } catch (err) {
    console.warn('[offlineStorage] Could not fetch violations:', err.message);
    return null;
  }
};

/**
 * Получить закешированные с сервера логины
 * (предварительно реализуйте на сервере GET /sync/logins)
 */
export const fetchAndCacheLogins = async (token, apiUrl) => {
  try {
    const res = await axios.get(`${apiUrl}/sync/logins`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 200 && Array.isArray(res.data)) {
      await AsyncStorage.setItem(CACHED_LOGINS, JSON.stringify(res.data));
      console.log('[offlineStorage] ✔ Cached logins:', res.data.length);
      return res.data;
    }
    throw new Error(`Unexpected status ${res.status}`);
  } catch (err) {
    console.warn('[offlineStorage] Could not fetch logins:', err.message);
    return null;
  }
};

/**
 * Получить из AsyncStorage последние кэшированные нарушения
 */
export const getCachedViolations = async () => {
  try {
    const json = await AsyncStorage.getItem('violations_cache');
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.warn('[offlineStorage] ❌ Ошибка при чтении из кэша:', e);
    return [];
  }
};


/**
 * Получить из AsyncStorage последние кэшированные логины
 */
export const getCachedLogins = async () => {
  const raw = await AsyncStorage.getItem(CACHED_LOGINS);
  return raw ? JSON.parse(raw) : [];
};
