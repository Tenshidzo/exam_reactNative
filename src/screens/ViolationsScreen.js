import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { getViolations } from '../api/violations';
export default function ViolationsScreen() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        setLoading(true);
        const response = await getViolations(); 
        setViolations(response);
      } catch (error) {
        Alert.alert('Помилка', 'Не вдалося завантажити правопорушення');
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();
  }, []);

  const renderMarker = (violation) => (
    <Marker
      key={violation.id}
      coordinate={{
        latitude: violation.latitude,
        longitude: violation.longitude,
      }}
      title={violation.description}
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }}>
        {violations.map(renderMarker)}
      </MapView>

      <FlatList
        data={violations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View>
            <Text>{item.description}</Text>
          </View>
        )}
      />
    </View>
  );
}
