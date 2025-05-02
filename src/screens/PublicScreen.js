// PublicScreen.js
import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';

export default function PublicScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 50.4501,
          longitude: 30.5234,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* Пример маркера */}
        <Marker
          coordinate={{ latitude: 50.4501, longitude: 30.5234 }}
          title="Порушення"
          description="Опис порушення"
        />
      </MapView>

      <Calendar style={styles.calendar} />

      <View style={styles.buttonContainer}>
        <Button title="ВХІД" onPress={() => navigation.navigate('Login')} />
        <Button title="РЕЄСТРАЦІЯ" onPress={() => navigation.navigate('Register')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  calendar: {
    margin: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
});
