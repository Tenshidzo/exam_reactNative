import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { API_URL } from '@env';

export default function MapScreen() {
  const [violations, setViolations] = useState([]);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const response = await fetch(`${API_URL}/violations/all`);
        const data = await response.json();
        setViolations(data);
      } catch (error) {
        console.error('Ошибка загрузки нарушений:', error);
      }
    };

    fetchViolations();
  }, []);

  return (
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
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
