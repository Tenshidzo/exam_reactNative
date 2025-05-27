import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AddViolationScreen from '../screens/AddViolationScreen';
import HomeDrawerNavigator from './HomeDrawerNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Drawer" component={HomeDrawerNavigator} />
      <Stack.Screen name="AddViolation" component={AddViolationScreen} options={{ title: 'Нове правопорушення' }} />
    </Stack.Navigator>
  );
}