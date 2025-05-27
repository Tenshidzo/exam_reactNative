  import React, { useEffect, useState } from 'react';
  import { View, Text, TextInput, Button, Image, Alert, ActivityIndicator } from 'react-native';
  import * as Location from 'expo-location';
  import * as ImagePicker from 'expo-image-picker';
  import * as FileSystem from 'expo-file-system';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { API_URL } from '@env';
  import { getCachedUserId } from '../utils/offlineStorage';
  import { saveViolationToDB } from '../utils/violationStorage';
  import { Buffer } from 'buffer';
  import pako from 'pako';
  import * as ImageManipulator from 'expo-image-manipulator';

  export default function AddViolationScreen() {
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState(null);
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const compressAndEncodeImage = async (uri) => {
  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return manipulatedImage.base64;
  } catch (e) {
    console.error('Ошибка сжатия изображения:', e);
    return null;
  }
};
    useEffect(() => {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Помилка', 'Доступ до геолокації відхилено');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        console.log('[Location] Координати:', loc.coords);
        setLocation(loc.coords);
      })();
    }, []);
  ;

    const pickImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled) {
        console.log('[ImagePicker] Вибрано зображення:', result.assets[0].uri);
        setImage(result.assets[0].uri);
      }
    };
const takePhoto = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== 'granted') {
    Alert.alert('Помилка', 'Доступ до камери заборонено');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (!result.canceled) {
    console.log('[Camera] Фото зроблено:', result.assets[0].uri);
    setImage(result.assets[0].uri);
  }
};
 const handleSubmit = async () => {
    console.log('[handleSubmit] Старт'); 
    if (!description.trim()) {
      Alert.alert('Помилка', 'Опис не може бути порожнім');
      return;
    }

    if (!location) {
      Alert.alert('Помилка', 'Не вдалося отримати геолокацію');
      return;
    }

    const userId = await getCachedUserId();
    console.log('[handleSubmit] userId:', userId);
    if (!userId) return Alert.alert('Помилка', 'Не знайдено ID користувача в кеші');

    const formData = new FormData();
    formData.append('description', description);
    formData.append('latitude', location.latitude.toString());
    formData.append('longitude', location.longitude.toString());
    formData.append('userId', userId);

    if (image) {
      console.log('[handleSubmit] Обрабатываем изображение'); 
      const compressedBase64 = await compressAndEncodeImage(image);
      if (!compressedBase64) {
        console.log('[handleSubmit] Ошибка сжатия'); 
        throw new Error('Не удалось сжать изображение');
      }
      const fileUri = FileSystem.cacheDirectory + 'compressed.jpg';
      await FileSystem.writeAsStringAsync(fileUri, compressedBase64, { encoding: FileSystem.EncodingType.Base64 });

      formData.append('image', {
        uri: image,
        type: 'image/jpeg',
        name: 'violation_image.jpg',
      });
    }

    setLoading(true);
    console.log('[handleSubmit] Отправка на сервер...');

    try {
      const response = await fetch(`${API_URL}/violations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`,
        },
        body: formData,
      });

      console.log('[handleSubmit] Ответ сервера:', response.status); 

      if (response.ok) {
        await saveViolationLocally(description, location, image, userId, true);
        Alert.alert('Успіх', 'Правопорушення успішно додано!');
        setDescription('');
        setImage(null);
      } else if (response.status >= 500) {
        await saveViolationLocally(description, location, image, userId, 0);
        Alert.alert('Збережено локально', `Сервер недоступний (${response.status})`);
      } else {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Сервер повернув ${response.status}`);
      }
    } catch (err) {
      console.error('[handleSubmit] Ошибка:', err); 
      await saveViolationLocally(description, location, image, userId, false);
      Alert.alert('Збережено локально', err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveViolationLocally = async (description, location, imageUri, userId, isSynced) => {
    try {
      console.log('[saveViolationLocally] Старт', { description, location, userId, isSynced });  

      let compressedImageBase64 = null;
      if (imageUri && typeof imageUri === 'string') {
        const base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const byteArray = new Uint8Array(Buffer.from(base64Image, 'base64'));
        const compressed = pako.deflate(byteArray, { level: 9 });
        compressedImageBase64 = Buffer.from(compressed).toString('base64');
        console.log('[saveViolationLocally] Сжатое изображение готово');
      }

      const violation = {
        description,
        date: new Date().toISOString(),
        userId,
        latitude: location.latitude,
        longitude: location.longitude,
        imageUri: compressedImageBase64,
        isSynced
      };

      await saveViolationToDB(violation);
      console.log('[saveViolationLocally] Сохранено в SQLite'); 
      setDescription('');
      setImage(null);
    } catch (err) {
      console.error('[saveViolationLocally] Ошибка:', err); 
      Alert.alert('Помилка збереження', err.message);
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
        <Button title="Зробити фото" onPress={takePhoto} />
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
