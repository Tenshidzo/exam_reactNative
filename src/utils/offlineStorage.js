import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {OFFLINE_REGISTRATIONS_KEY, VIOLATIONS_KEY, LOGINS_KEY, CACHED_VIOLATIONS, CACHED_LOGINS, DELETE_QUEUE_KEY} from '@env';


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


export const syncOfflineViolations = async (token, apiUrl) => {
  try {
    const raw  = await AsyncStorage.getItem(VIOLATIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    console.log(`[syncOfflineViolations] Found ${list.length} offline violation(s)`);

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
        console.error('[syncOfflineViolations] Failed to sync violation:', err.message);
        failed.push(violation);
      }
    }
    await AsyncStorage.setItem(VIOLATIONS_KEY, JSON.stringify(failed));
    console.log(`[syncOfflineViolations] ${successful.length} synced, ${failed.length} failed`);
    return { synced: successful.length, failed: failed.length };
  } catch (err) {
    console.error('[syncOfflineViolations] Sync error:', err);
    return { synced: 0, failed: 0 };
  }
};
export const getOfflineViolations = async () => {
 const json = await AsyncStorage.getItem(VIOLATIONS_KEY);   
  return json ? JSON.parse(json) : [];};
export const saveLoginOffline = async (login) => {
  try {
    const raw  = await AsyncStorage.getItem(LOGINS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(login);
    await AsyncStorage.setItem(LOGINS_KEY, JSON.stringify(list));
    console.log('[offlineStorage] saveLoginOffline:', login);
  } catch (err) {
    console.error('[offlineStorage] saveLoginOffline error:', err);
  }
};

export const syncOfflineLogins = async (token, apiUrl) => {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    console.log('[syncOfflineLogins] No connection, aborting');
    return { synced: 0, failed: 0 };
  }

  const raw  = await AsyncStorage.getItem(LOGINS_KEY);
  const list = raw ? JSON.parse(raw) : [];
  console.log(`[syncOfflineLogins] Found ${list.length} offline login attempt(s)`);

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
      console.error('[syncOfflineLogins] Failed to sync login:', err.message);
      failed.push(login);
    }
  }

  await AsyncStorage.setItem(LOGINS_KEY, JSON.stringify(failed));
  console.log(`[syncOfflineLogins] ${successful.length} synced, ${failed.length} failed`);
  return { synced: successful.length, failed: failed.length };
};

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


export const getCachedViolations = async () => {
  try {
    const json = await AsyncStorage.getItem('violations_cache');
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.warn('[offlineStorage] Ошибка при чтении из кэша:', e);
    return [];
  }
};



export const getCachedLogins = async () => {
  const raw = await AsyncStorage.getItem(CACHED_LOGINS);
  return raw ? JSON.parse(raw) : [];
};

export const deleteOfflineViolation = async (id) => {
  try {
    const raw = await AsyncStorage.getItem('offlineViolations');
    const list = raw ? JSON.parse(raw) : [];
    const cleaned = list.filter(v => {
      const generatedId = v.id != null ? v.id : `offline-${list.indexOf(v)}`;
      return generatedId !== id;
    });

    await AsyncStorage.setItem('offlineViolations', JSON.stringify(cleaned));
    console.log(`[offline] удалил ${id}, осталось ${cleaned.length}`);
    return true;
  } catch (e) {
    console.error('[offline] deleteOfflineViolation error:', e);
    return false;
  }
};
export const saveOfflineRegistration = async (registration) => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_REGISTRATIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(registration);
    await AsyncStorage.setItem(OFFLINE_REGISTRATIONS_KEY, JSON.stringify(list));
    console.log('[offlineStorage] saveOfflineRegistration:', registration.email);
  } catch (e) {
    console.error('[offlineStorage] saveOfflineRegistration error:', e);
  }
};

export const syncOfflineRegistrations = async (apiUrl) => {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    console.log('[syncOfflineRegistrations] No connection, aborting');
    return { synced: 0, failed: 0 };
  }

  const raw = await AsyncStorage.getItem(OFFLINE_REGISTRATIONS_KEY);
  const list = raw ? JSON.parse(raw) : [];

  console.log(`[syncOfflineRegistrations] Found ${list.length} offline registration(s)`);

  const successful = [];
  const failed = [];

  for (const reg of list) {
    try {
      const res = await axios.post(`${apiUrl}/register`, reg);
      if (res.status === 200 || res.status === 201) {
        console.log('[syncOfflineRegistrations] ✔ Synced registration:', reg.email);
        successful.push(reg);
      } else {
        throw new Error(`Status ${res.status}`);
      }
    } catch (err) {
      console.error('[syncOfflineRegistrations] Failed to sync registration:', reg.email, err.message);
      failed.push(reg);
    }
  }

  await AsyncStorage.setItem(OFFLINE_REGISTRATIONS_KEY, JSON.stringify(failed));
  console.log(`[syncOfflineRegistrations] ${successful.length} synced, ${failed.length} failed`);
  return { synced: successful.length, failed: failed.length };
};
export const getCachedUserId = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    return userId || null;
  } catch (err) {
    console.error('[getCachedUserId] ❌ Ошибка чтения userId из кеша:', err);
    return null;
  }
};
export const queueDeletionForLater = async (violation) => {
  try {
    const raw = await AsyncStorage.getItem(DELETE_QUEUE_KEY);
    const current = raw ? JSON.parse(raw) : [];

    current.push({
      description: violation.description,
      date: violation.date
    });

    await AsyncStorage.setItem(DELETE_QUEUE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('[queueDeletionForLater] ❌', err);
  }
};
