import React, { createContext, useState, useEffect } from 'react';
import { api } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { saveLoginOffline, syncOfflineLogins, syncOfflineRegistrations, saveOfflineRegistration  } from '../utils/offlineStorage';
import { API_URL, TOKEN_KEY, USERID_KEY, OFFLINE_USERS } from '@env';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken]   = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
    const [state, setState] = useState({ token: null, userId: null, loading: true });

  const initAuth = async () => {
    setLoading(true);
    try {
      const tk  = await AsyncStorage.getItem(TOKEN_KEY);
      const uid = await AsyncStorage.getItem(USERID_KEY);
      if (tk && uid) {
        setToken(tk);
        setUserId(uid);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  initAuth();
}, []);

useEffect(() => {
  const bootstrap = async () => {
    if (!token) return;

    console.log('[AuthContext] Syncing offline data…');
    await syncOfflineViolations(token, API_URL);
    await syncOfflineLogins(token, API_URL);

    console.log('[AuthContext] Server reachable — syncing registrations');
    await syncOfflineRegistrations(API_URL); 

    console.log('[AuthContext] Fetching latest violations & logins');
    const violations = await fetchAndCacheViolations(token, API_URL);
    const logins     = await fetchAndCacheLogins(token, API_URL);

    console.log(
      `[AuthContext] ✔ Cached ${violations?.length ?? 0} violations, ` +
      `${logins?.length ?? 0} logins`
    );
  };

  bootstrap();
}, [token]);

  const cacheUserOffline = async ({ userId, firstName, lastName, email, password }) => {
    const raw   = await AsyncStorage.getItem(OFFLINE_USERS);
    const users = raw ? JSON.parse(raw) : {};
    const hash  = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    users[email] = { userId, firstName, lastName, passwordHash: hash };
    await AsyncStorage.setItem(OFFLINE_USERS, JSON.stringify(users));
    console.log('[AuthContext] CacheUserOffline for', email);
  };

  const signIn = async ({ email, password }) => {
  try {
    console.log('[AuthContext] Attempting online login');
    const { token: tk, userId: uid, firstName, lastName } = await api.login({ email, password });
    const currentToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (currentToken === 'offline-token') {
      console.log('[AuthContext] Replacing offline-token with real token');
    }

    await AsyncStorage.setItem(TOKEN_KEY, tk);
    await AsyncStorage.setItem(USERID_KEY, uid.toString());
    setToken(tk);
    setUserId(uid.toString());

    await cacheUserOffline({ userId: uid, firstName, lastName, email, password });

    return { token: tk, userId: uid };
  } catch (err) {
    if (err.response && err.response.status >= 400 && err.response.status < 500) {
      console.warn('[AuthContext] Online login failed (4xx):', err.response.status);
      throw err;
    }

    console.warn('[AuthContext] Server unavailable, falling back to offline login');

    const raw = await AsyncStorage.getItem(OFFLINE_USERS);
    const users = raw ? JSON.parse(raw) : {};
    const user = users[email];
    if (!user) {
      throw new Error('Offline login failed: no local profile');
    }

    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );

    if (hash !== user.passwordHash) {
      throw new Error('Offline login failed: wrong password');
    }

    const offlineToken = 'offline-token';
    await AsyncStorage.setItem(TOKEN_KEY, offlineToken);
    await AsyncStorage.setItem(USERID_KEY, user.userId.toString());
    setToken(offlineToken);
    setUserId(user.userId.toString());

    await saveLoginOffline({
      localId: Date.now(),
      timestamp: new Date().toISOString(),
      success: true,
      userId: user.userId
    });

    return { token: offlineToken, userId: user.userId };
  }
};

const signUp = async ({ firstName, lastName, email, password }) => {
  console.log('[AuthContext] signUp online');
  try {
    const { userId: uid } = await api.register({ firstName, lastName, email, password });
    const { token: tk } = await api.login({ email, password });

    await AsyncStorage.setItem(TOKEN_KEY, tk);
    await AsyncStorage.setItem(USERID_KEY, uid.toString());
    setToken(tk);
    setUserId(uid.toString());

    await cacheUserOffline({ userId: uid, firstName, lastName, email, password });
  } catch (error) {
     console.log('❌ Ошибка регистрации:', error);
  Alert.alert('Ошибка регистрации', error.message || 'Неизвестная ошибка');
    const isServerError = !error.response || error.response.status >= 500;
    if (isServerError) {
      await saveOfflineRegistration({ firstName, lastName, email, password, timestamp: new Date().toISOString() });
      Alert.alert(
        'Регистрация отложена',
        'Регистрация сохранена локально и будет автоматически отправлена, когда появится подключение к интернету.'
      );
      return;
    }
    const message = error.response?.data?.message || 'Не удалось зарегистрироваться';
    throw new Error(message);
  }
};
  const signOut = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USERID_KEY);
    setToken(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{
      token,
      userId,
      loading,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
