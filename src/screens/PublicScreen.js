import React from 'react';
import { View, Button, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PublicDrawerNavigator from '../navigation/PublicDrawerNavigator';

export default function PublicScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1 }}>
      <PublicDrawerNavigator />

      <SafeAreaView style={styles.buttonContainer}>
        <Button title="ВХІД" onPress={() => navigation.navigate('Login')} />
        <Button title="РЕЄСТРАЦІЯ" onPress={() => navigation.navigate('Register')} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'android' ? 20 : 0,
    backgroundColor: '#fff',
  },
});
