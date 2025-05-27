import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '@env';
import {
   deleteOfflineViolation,
   getCachedUserId, 
  queueDeletionForLater
} from '../utils/offlineStorage';
import {
  getAllLocalViolations,
  getImageBase64ById,
  deleteViolationFromDB
} from '../utils/violationStorage';
import { isServerReachable, syncViolations, d } from '../utils/sync';



export default function HomeScreen({ navigation }) {
  const { signOut } = useContext(AuthContext);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const imageCache = useRef({});
  const isMounted = useRef(true);
  const [isServerOnline, setIsServerOnline] = useState(true);
const fetchMy = useCallback(async (forceLocal = false) => {
  if (!isMounted.current) return;

  setLoading(true);
  try {
    let serverItems = [];
    let serverAvailable = false;
    if (!forceLocal) {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}/violations/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        });

        if (response.ok) {
          const data = await response.json();
          serverItems = data.map(v => ({
            id: `server_${v.id}`,
            description: v.description,
            date: v.date,
            latitude: v.latitude,
            longitude: v.longitude,
            imageUri: v.image || v.imageUrl,
            isLocal: false,
          }));
          serverAvailable = true;
        }
      } catch (e) {
        console.warn('Ошибка загрузки с сервера:', e);
      }
    }
    let localItems = [];
    if (!serverAvailable) {
      const userId = await getCachedUserId();
        if (!userId) {
          console.warn('[HomeScreen] Не удалось получить userId из кеша');
          setViolations([]);
          return;
        }

  const localItemsRaw = await getAllLocalViolations(userId);
      localItems = await Promise.all(localItemsRaw.map(async v => {
        let imageUri = null;
        if (v.id) {
          const base64 = await getImageBase64ById(v.id);
          if (base64) {
            imageUri = `data:image/jpeg;base64,${base64}`;
          }
        }
        return {
          id: `local_${v.id}`,
          description: v.description,
          date: v.date,
          latitude: v.latitude,
          longitude: v.longitude,
          imageUri,
          isLocal: true,
        };
      }));
    }

    setIsServerOnline(serverAvailable);

    const allData = serverAvailable ? serverItems : localItems;

    const newImageCache = { ...imageCache.current };
    for (const item of allData.filter(i => i.isLocal)) {
      if (!newImageCache[item.id] && item.imageUri) {
        newImageCache[item.id] = item.imageUri;
      }
    }
    imageCache.current = newImageCache;

    setViolations(allData);

  } finally {
    if (isMounted.current) {
      setLoading(false);
    }
  }
}, []);



useEffect(() => {
   isMounted.current = true;

    const initialize = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const reachable = await isServerReachable(token);
        
        if (reachable) {
          await syncViolations(token);
          await fetchMy ();
        } else {
          await fetchMy(true); 
        }
      } catch (e) {
        console.warn('Ошибка инициализации:', e);
      }
    };

    initialize();

    return () => {
      isMounted.current = false;
    };
  }, [fetchMy]);



const onDelete = async (id, isLocal) => {
  try {
    const numericId = id.replace(/^(local|server)_/, '');
    const item = violations.find(v => v.id === id);

    const token = await AsyncStorage.getItem('token');
    const serverReachable = await isServerReachable(token);

    if (!isLocal && serverReachable) {
      const res = await fetch(`${API_URL}/violations/${numericId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Не удалось удалить на сервере');
    }

    if (typeof numericId === 'string' && numericId.startsWith('offline-')) {
      await deleteOfflineViolation(numericId);
    } else {
      const ok = await deleteViolationFromDB(numericId);
      if (!ok) console.warn('Запись не найдена в локальной БД');
    }

    if (isLocal && !serverReachable && item) {
      await queueDeletionForLater(item);
    }

    setViolations(prev => prev.filter(v => v.id !== id));
  } catch (e) {
    console.error('Ошибка удаления:', e);
    Alert.alert('Ошибка', e.message);
  }
};
  const renderItem = ({ item }) => {
    const dt = new Date(item.date);
    console.log(`Rendering item ${item.id}`, {
      hasImage: !!item.imageUri,
      imageUriStart: item.imageUri?.substring(0, 30)
    });
    return (
      <View style={styles.card}>
        {item.imageUri
          ? <Image source={{ uri: item.imageUri }} style={styles.image} />
          : <View style={[styles.image, styles.placeholder]} />
        }
        <View style={styles.info}>
          <Text style={styles.desc}>{item.description}</Text>
          <Text style={styles.date}>{dt.toLocaleString('uk-UA', {
            day:'numeric', month:'long', year:'numeric',
            hour:'2-digit', minute:'2-digit'
          })}</Text>
          <Text style={styles.coords}>{`Ш: ${item.latitude.toFixed(4)}, Д: ${item.longitude.toFixed(4)}`}</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(item.id, item.isLocal)} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Удалить</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои правонарушения</Text>
        <TouchableOpacity onPress={signOut}>
        </TouchableOpacity>
      </View>
      {loading && violations.length === 0
        ? <ActivityIndicator style={{flex:1}} size="large" />
        : <FlatList
            data={violations}
            keyExtractor={item => `${item.id}-${item.isLocal ? 'local' : 'server'}`}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshing={loading}
            onRefresh={fetchMy}
            ListEmptyComponent={<Text style={styles.empty}>Нет нарушений</Text>}
          />

      }
      <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddViolation')}>
        <Text style={styles.addText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
   container: { flex: 1, padding: 10, backgroundColor: '#f2f2f2' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  logoutText: { color: 'red', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: { width: 70, height: 70, borderRadius: 5, backgroundColor: '#ccc' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 10 },
  desc: { fontWeight: '600', fontSize: 16 },
  date: { fontSize: 12, color: '#555' },
  coords: { fontSize: 12, color: '#666' },
  deleteBtn: {
    backgroundColor: '#ff4444',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  deleteText: { color: '#fff', fontWeight: '700' },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    marginRight: 10,
    width: 120,
    height: 40,
    backgroundColor: '#fff',
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: '#666',
  },
  addBtn: { position:'absolute', right:20, bottom:20, backgroundColor:'#2196F3', width:60, height:60, borderRadius:30, justifyContent:'center', alignItems:'center' },
  addText: { color:'#fff', fontSize:30, lineHeight:30 }
});
