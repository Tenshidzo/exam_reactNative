import React, { createContext, useState, useEffect } from 'react';
import { api } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { saveLoginOffline, syncOfflineLogins } from '../utils/offlineStorage';
import { API_URL } from '../api/config';

export const AuthContext = createContext();

const TOKEN_KEY       = 'token';
const USERID_KEY      = 'userId';
const OFFLINE_USERS   = 'offlineUsers';

export const AuthProvider = ({ children }) => {
  const [token, setToken]   = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Инициализация: загружаем сохранённый токен и userId
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

    console.log('[AuthContext] 🔄 Syncing offline data…');
    await syncOfflineViolations(token, API_URL);
    await syncOfflineLogins(token, API_URL);

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      console.log('[AuthContext] 🚫 No network — will use cached data only');
      return;
    }

    console.log('[AuthContext] 🌐 Server reachable — fetching latest violations & logins');
    const violations = await fetchAndCacheViolations(token, API_URL);
    const logins     = await fetchAndCacheLogins(token, API_URL);

    console.log(
      `[AuthContext] ✔ Cached ${violations?.length ?? 0} violations, ` +
      `${logins?.length ?? 0} logins`
    );
  };

  bootstrap();
}, [token]);


  // Кешируем профиль + хеш пароля для оффлайн‑логина
  const cacheUserOffline = async ({ userId, firstName, lastName, email, password }) => {
    const raw   = await AsyncStorage.getItem(OFFLINE_USERS);
    const users = raw ? JSON.parse(raw) : {};
    const hash  = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    users[email] = { userId, firstName, lastName, passwordHash: hash };
    await AsyncStorage.setItem(OFFLINE_USERS, JSON.stringify(users));
    console.log('[AuthContext] ✔ cacheUserOffline for', email);
  };

  // Универсальная функция входа
  const signIn = async ({ email, password }) => {
    try {
      // 1) Онлайн‑запрос
      console.log('[AuthContext] ▶️ Attempting online login');
      const { token: tk, userId: uid, firstName, lastName } = await api.login({ email, password });

      // Сохраняем токен и userId
      await AsyncStorage.setItem(TOKEN_KEY, tk);
      await AsyncStorage.setItem(USERID_KEY, uid.toString());
      setToken(tk);
      setUserId(uid.toString());

      // Кешируем для оффлайн‑входа
      await cacheUserOffline({ userId: uid, firstName, lastName, email, password });

      return { token: tk, userId: uid };
    } catch (err) {
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
        console.warn('[AuthContext] Online login failed (4xx):', err.response.status);
        throw err;
      }
      console.warn('[AuthContext] Server unavailable, falling back to offline login');

      const raw   = await AsyncStorage.getItem(OFFLINE_USERS);
      const users = raw ? JSON.parse(raw) : {};
      const user  = users[email];
      if (!user) {
        throw new Error('Offline login failed: no local profile');
      }

      // Считаем SHA-256 хеш введённого пароля
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );
      if (hash !== user.passwordHash) {
        throw new Error('Offline login failed: wrong password');
      }

      // Успешный оффлайн
      const offlineToken = 'offline-token';
      await AsyncStorage.setItem(TOKEN_KEY, offlineToken);
      await AsyncStorage.setItem(USERID_KEY, user.userId.toString());
      setToken(offlineToken);
      setUserId(user.userId.toString());

      // Логируем оффлайн‑попытку для последующей синхронизации
      await saveLoginOffline({
        localId:  Date.now(),
        timestamp: new Date().toISOString(),
        success:  true,
        userId:   user.userId
      });

      return { token: offlineToken, userId: user.userId };
    }
  };

  // Регистрация всегда онлайн
  const signUp = async ({ firstName, lastName, email, password }) => {
    console.log('[AuthContext] ▶️ signUp online');
    const { userId: uid } = await api.register({ firstName, lastName, email, password });
    const { token: tk }   = await api.login({ email, password });

    await AsyncStorage.setItem(TOKEN_KEY, tk);
    await AsyncStorage.setItem(USERID_KEY, uid.toString());
    setToken(tk);
    setUserId(uid.toString());

    // Кешируем для оффлайн
    await cacheUserOffline({ userId: uid, firstName, lastName, email, password });
  };

  // Выход
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
