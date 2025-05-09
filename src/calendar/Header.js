import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const months = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const Header = ({ currentDate, onPrev, onNext }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onPrev}>
      <Text style={styles.arrow}>←</Text>
    </TouchableOpacity>
    
    <Text style={styles.title}>
      {months[currentDate.getMonth()]} {currentDate.getFullYear()}
    </Text>
    
    <TouchableOpacity onPress={onNext}>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  arrow: {
    fontSize: 24,
    paddingHorizontal: 15
  }
});

export default Header;