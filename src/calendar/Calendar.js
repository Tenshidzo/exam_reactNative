import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import Header from './Header';
import Day from './Day';
import { API_URL } from '@env';
import { getAllLocalViolations, getImageBase64ById  } from '../utils/violationStorage';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [violationsMap, setViolationsMap] = useState({});
  const [violations, setViolations] = useState([]);
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const isMounted = useRef(true);

const loadViolations = async () => {
  try {
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const response = await fetch(`${API_URL}/violations?month=${month}&year=${year}`);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

   const data = await response.json();
    const transformed = data.map(v => ({
      ...v,
      imageUri: v.imageUri || v.image || v.imageUrl || null
    }));
    const map = {};
    transformed.forEach(v => {
      const day = new Date(v.date).getDate();
      map[day] = true;
    });
    transformed.forEach(v => console.log('imageUri:', v.imageUri));
    console.log('data:', data);
        if (isMounted.current) {
          setViolations(transformed);
          setViolationsMap(map);
          console.log('[Calendar] Данные загружены с сервера');
        }
      } catch (err) {
        console.warn('[Calendar] Сервер недоступен, загружаем локальные данные:', err.message);
        await loadLocalViolations(); 
      }
    };

const loadLocalViolations = async () => {
  try {
    const data = await getAllLocalViolations();
    const violationsWithImages = await Promise.all(
      data.map(async (v) => {
        const imageBase64 = await getImageBase64ById(v.id);
        return {
          ...v,
          imageUri: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null
        };
      })
    );
    const map = {};
    violationsWithImages.forEach(v => {
      const day = new Date(v.date).getDate();
      map[day] = true;
    });

    setViolations(violationsWithImages);
    setViolationsMap(map);
  } catch (err) {
    console.error('[Calendar] Ошибка при загрузке локальных данных:', err);
  }
};


  const handleDayPress = (day) => {
    const selected = violations.filter(v => {
      const date = new Date(v.date);
      return (
        date.getDate() === day &&
        date.getMonth() === currentDate.getMonth() &&
        date.getFullYear() === currentDate.getFullYear()
      );
    });

    setSelectedViolations(selected);
    setModalVisible(true);
  };

  const renderViolationItem = ({ item }) => {
    const parsedDate = new Date(item.date);

    return (
      <View style={styles.item}>
        <Text style={styles.itemTitle}>Нарушение #{item.id}</Text>
        <Text style={styles.itemText}>{item.description}</Text>
        <Text style={styles.itemDate}>
          {parsedDate.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
          {item.imageUri && (
         <Image
           source={{ uri: item.imageUri }}
           style={styles.image}
           resizeMode="cover"
         />
       )}
      </View>
    );
  };

  const renderDays = () => {
    const days = [];
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        <Day
          key={day}
          day={day}
          hasViolation={violationsMap[day]}
          onPress={() => handleDayPress(day)}
        />
      );
    }

    return days;
  };
  useEffect(() => {
    isMounted.current = true;
    loadViolations();

    return () => {
      isMounted.current = false;
    };
  }, [currentDate]);

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

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Нарушения за {new Date(selectedViolations[0]?.date).toLocaleDateString('uk-UA')}
            </Text>

            <FlatList
              data={selectedViolations}
              renderItem={renderViolationItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContent}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 15 },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  modalOverlay: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc'
  },
  itemTitle: {
    fontWeight: 'bold'
  },
  itemText: {
    marginVertical: 5
  },
  itemDate: {
    fontSize: 12,
    color: '#666'
  },
  image: {
    marginTop: 10,
    height: 150,
    borderRadius: 5
  },
  closeButton: {
    marginTop: 15,
    alignSelf: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  listContent: {
    paddingBottom: 10
  }
});

export default Calendar;
