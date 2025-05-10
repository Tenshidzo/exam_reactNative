import React, { createContext, useState, useEffect } from 'react';
import { api } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false); 

  const initAuth = async () => {
    setLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUserId = await AsyncStorage.getItem('userId');
      console.log('Stored token:', storedToken);
      console.log('Stored userId:', storedUserId);  
      if (storedToken && storedUserId) {
        setToken(storedToken);
        setUserId(storedUserId);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const signIn = async ({ email, password }) => {
    try {
      const { token: tk, userId: uid } = await api.login({ email, password });
      await AsyncStorage.setItem('token', tk); 
      await AsyncStorage.setItem('userId', uid.toString());
      setToken(tk);
      setUserId(uid);
    } catch (error) {
      console.error('[AuthContext] signIn error:', error);
      throw error;
    }
  };

  const signUp = async ({ firstName, lastName, email, password }) => {
    try {
      const { userId: uid } = await api.register({ firstName, lastName, email, password });
      const { token: tk } = await api.login({ email, password });
      await AsyncStorage.setItem('token', tk);
      await AsyncStorage.setItem('userId', uid.toString());
      setToken(tk);
      setUserId(uid);
    } catch (error) {
      console.error('[AuthContext] signUp error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userId');
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