import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Text, FlatList, Button } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from './Header';
import Day from './Day';
import { API_URL } from '../../api/config';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [violations, setViolations] = useState({});
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Загрузка нарушений
  const loadViolations = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const response = await fetch(
        `${API_URL}/violations?month=${month}&year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = await response.json();
      const violationsMap = data.reduce((acc, v) => {
        const day = new Date(v.date).getDate();
        acc[day] = true;
        return acc;
      }, {});
      
      setViolations(violationsMap);
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  useFocusEffect(() => {
    loadViolations();
  });

  // Обработчик нажатия на день
  const handleDayPress = async (day) => {
    const token = await AsyncStorage.getItem('token');
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    ).toISOString();
    
    const response = await fetch(
      `${API_URL}/violations?date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const data = await response.json();
    setSelectedViolations(data);
    setModalVisible(true);
  };

  // Рендер дней месяца
  const renderDays = () => {
    const days = [];
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        <Day
          key={day}
          day={day}
          hasViolation={violations[day]}
          onPress={() => handleDayPress(day)}
        />
      );
    }

    return days;
  };

  return (
    <View style={styles.container}>
      <Header
        currentDate={currentDate}
        onPrev={() => {
          const newDate = new Date(currentDate);
          newDate.setMonth(newDate.getMonth() - 1);
          setCurrentDate(newDate);
        }}
        onNext={() => {
          const newDate = new Date(currentDate);
          newDate.setMonth(newDate.getMonth() + 1);
          setCurrentDate(newDate);
        }}
      />
      
      <View style={styles.daysContainer}>
        {renderDays()}
      </View>

      <Modal visible={modalVisible} transparent>
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <FlatList
              data={selectedViolations}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <Text>{new Date(item.date).toLocaleDateString()}</Text>
                  <Text>{item.description}</Text>
                </View>
              )}
            />
            <Button title="Закрыть" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 15 },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  modal: { 
    flex: 1, 
    justifyContent: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  modalContent: { 
    backgroundColor: 'white', 
    margin: 20, 
    padding: 15, 
    borderRadius: 10 
  },
  item: { padding: 10, borderBottomWidth: 1 }
});

export default Calendar;