import React from 'react';
import { View, StyleSheet } from 'react-native';
import Calendar from '../calendar/Calendar';

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Calendar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
});
