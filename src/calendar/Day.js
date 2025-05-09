import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

const Day = ({ day, hasViolation, onPress }) => (
  <TouchableOpacity
    style={[styles.day, hasViolation && styles.markedDay]}
    onPress={onPress}>
    <Text style={styles.dayText}>{day}</Text>
    {hasViolation && <View style={styles.dot} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  day: {
    width: 40,
    height: 40,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f0f0f0'
  },
  markedDay: {
    borderWidth: 2,
    borderColor: '#ff4444'
  },
  dot: {
    position: 'absolute',
    bottom: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4444'
  },
  dayText: {
    fontSize: 16,
    color: '#333'
  }
});

export default Day;