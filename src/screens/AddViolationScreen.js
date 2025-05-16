import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Image, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { addViolation } from '../api/violations';
import { API_URL } from '../api/config';
import NetInfo from '@react-native-community/netinfo';
import { saveViolationOffline, syncOfflineViolations } from '../utils/offlineStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AddViolationScreen() {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Помилка', 'Доступ до геолокації відхилено');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
  
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  const handleSubmit = async () => {
  if (!description.trim()) {
    return Alert.alert('Помилка', 'Опис не може бути порожнім');
  }

  if (!location) {
    return Alert.alert('Помилка', 'Не вдалося отримати геолокацію');
  }

  const token = await AsyncStorage.getItem('token');
  const violationData = {
    description,
    latitude: location.latitude,
    longitude: location.longitude,
    imageUri: image,
  };

  const formData = new FormData();
  formData.append('description', description);
  formData.append('latitude', location.latitude.toString());
  formData.append('longitude', location.longitude.toString());

  if (image) {
    formData.append('image', {
      uri: image,
      type: 'image/jpeg',
      name: 'violation_image.jpg',
    });
  }

  try {
    const netInfo = await NetInfo.fetch();

    if (netInfo.isConnected) {
      setLoading(true);

      console.log('Starting request...');
      console.log('Request URL:', `${API_URL}/violations`);
      console.log('Token:', token);
      console.log('Image URI:', image);
      console.log('Location:', location);

      const response = await fetch(`${API_URL}/violations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Помилка сервера');
      }

      Alert.alert('Успіх', 'Правопорушення успішно додано!');
      setDescription('');
      setImage(null);
      await syncOfflineViolations(token, API_URL);
    } else {
      // офлайн режим
      await saveViolationOffline(violationData);
      Alert.alert('Немає інтернету', 'Збережено локально та буде відправлено пізніше.');
      setDescription('');
      setImage(null);
    }

  } catch (err) {
    await saveViolationOffline(violationData);
    Alert.alert('Помилка', 'Дані збережено локально: ' + err.message);
  } finally {
    setLoading(false);
  }
};
  return (
    <View style={{ padding: 20 }}>
      <Text>Опис правопорушення:</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Введіть опис"
        multiline
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          marginVertical: 10,
          borderRadius: 5
        }}
      />

      <Button title="Вибрати зображення" onPress={pickImage} />
      {image && (
        <Image
          source={{ uri: image }}
          style={{ width: '100%', height: 200, marginVertical: 10 }}
        />
      )}

      <Button title="Додати правопорушення" onPress={handleSubmit} />
      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
    </View>
  );
}