import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { syncViolations, syncFromServerToLocal, isServerReachable, syncQueuedDeletions } from './src/utils/sync';
import { deleteDatabase, initDB } from './src/utils/violationStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
export default function App() {
  const initializeDatabase = async () => {
    try {
      console.log('[App] Инициализация базы данных...');
      await initDB();
      console.log('[App] База данных инициализирована');
    } catch (e) {
      console.error('[App] Ошибка инициализации БД:', e);
    }
  };
  const synchronizeData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('[App] Токен не найден, пропуск синхронизации');
        return;
      }

      const serverReachable = await isServerReachable(token);
      if (!serverReachable) {
        console.warn('[App] Сервер недоступен, синхронизация отменена');
        return;
      }

      console.log('[App] Сервер доступен, выполняем синхронизацию...');
      await syncViolations();
      await  syncQueuedDeletions(token);
      console.log('[App] Синхронизация завершена');
    } catch (err) {
      console.error('[App] Ошибка при синхронизации:', err);
    }
  };
  useEffect(() => {
    const start = async () => {
      await initializeDatabase();
      await synchronizeData();
    };

    start();
  }, []);


  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
