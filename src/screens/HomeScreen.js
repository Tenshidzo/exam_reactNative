import React, { useContext, useEffect, useState } from 'react';
import {
View,
Text,
FlatList,
TouchableOpacity,
Image,
StyleSheet,
Alert,
ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../api/config';
import { getCachedViolations, getOfflineViolations } from '../utils/offlineStorage';

export default function HomeScreen({ navigation }) {
const { signOut } = useContext(AuthContext);
const [myViolations, setMyViolations] = useState([]);
const [loading, setLoading] = useState(false);

const fetchMy = async () => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(`${API_URL}/violations/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 500 || !res.ok) throw new Error('Server error');

    const data = await res.json();
    await AsyncStorage.setItem('violations_cache', JSON.stringify(data));
    setMyViolations(data);
  } catch (err) {
    console.warn('[HomeScreen] ⚠️ Ошибка запроса, пробуем из кэша:', err.message);
    const cached = await getCachedViolations();
    const offline = await getOfflineViolations();
    setMyViolations([...offline, ...cached]); 
  } finally {
    setLoading(false);
  }
};

const onDelete = async (id) => {
try {
const token = await AsyncStorage.getItem('token');
const res = await fetch(`${API_URL}/violations/${id}`, {
method: 'DELETE',
headers: { Authorization: `Bearer ${token}` }
});
if (!res.ok) throw new Error('Не удалось удалить нарушение');
setMyViolations(v => v.filter(vio => vio.id !== id));
} catch (err) {
Alert.alert('Ошибка', err.message);
}
};

useEffect(() => {
fetchMy();
}, []);

const renderItem = ({ item }) => {
  const parsedDate = new Date(item.date.replace(' ', 'T') + 'Z');
  return (
    <View style={styles.card}>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      )}
      <View style={styles.info}>
        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.date}>
          {parsedDate.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        <Text style={styles.coords}>
          {`Широта: ${item.latitude.toFixed(4)}, Долгота: ${item.longitude.toFixed(4)}`}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>Удалить</Text>
      </TouchableOpacity>
    </View>
  );
};


return ( <View style={styles.container}> <View style={styles.header}> <Text style={styles.title}>Мои правонарушения</Text> <TouchableOpacity onPress={signOut} style={styles.logoutBtn}> <Text style={styles.logoutText}>Выйти</Text> </TouchableOpacity> </View>
{loading ? (
<ActivityIndicator style={{ marginTop: 20 }} size="large" />
) : (
<FlatList
data={myViolations}
keyExtractor={item => item.id.toString()}
renderItem={renderItem}
contentContainerStyle={styles.list}
ListEmptyComponent={<Text style={styles.empty}>Нет нарушений</Text>}
refreshing={loading}
onRefresh={fetchMy}
/>
)}
<TouchableOpacity
style={styles.addBtn}
onPress={() => navigation.navigate('AddViolation')}> 
<Text style={styles.addText}>+</Text> 
</TouchableOpacity> 
</View>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#f9f9f9' },
header: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
padding: 15,
backgroundColor: '#fff',
elevation: 2
},
title: { fontSize: 20, fontWeight: 'bold' },
logoutBtn: {},
logoutText: { color: 'red' },
list: { padding: 10 },
card: {
backgroundColor: '#fff',
marginBottom: 10,
borderRadius: 8,
overflow: 'hidden',
elevation: 1
},
image: { width: '100%', height: 150 },
info: { padding: 10 },
desc: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
date: { fontSize: 12, color: '#666', marginBottom: 5 },
coords: { fontSize: 12, color: '#666' },
deleteBtn: {
backgroundColor: '#ff4444',
padding: 10,
alignItems: 'center'
},
deleteText: { color: '#fff', fontWeight: 'bold' },
empty: { textAlign: 'center', marginTop: 20, color: '#666' },
addBtn: {
position: 'absolute',
right: 20,
bottom: 20,
backgroundColor: '#2196F3',
width: 60,
height: 60,
borderRadius: 30,
justifyContent: 'center',
alignItems: 'center'
},
addText: { color: '#fff', fontSize: 30, lineHeight: 30 }
});
