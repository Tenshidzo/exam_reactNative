
import React, {useState, useEffect} from 'react';
import { View, Button, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Calendar from '../calendar/Calendar';
import { useNavigation } from '@react-navigation/native';
import {API_URL} from '@env';

export default function PublicScreen() {
  const navigation = useNavigation();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
    useEffect(() => {
    const fetchViolations = async () => {
      try {
        const response = await fetch(`${API_URL}/violations/all`);
        const data = await response.json();
        setViolations(data);
      } catch (error) {
        console.error('Ошибка загрузки нарушений:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();
  }, []);
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
         {violations.map((violation) => (
          <Marker
            key={violation.id}
            coordinate={{
              latitude: parseFloat(violation.latitude),
              longitude: parseFloat(violation.longitude),
            }}
            title={violation.description || 'Нарушение'}
            description={new Date(violation.date).toLocaleString()}
          />
        ))}
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
