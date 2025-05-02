import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import AddViolationScreen from '../screens/AddViolationScreen';
import ViolationsScreen from '../screens/ViolationsScreen'; 
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AddViolation" component={AddViolationScreen} options={{ title: 'Нове правопорушення' }} />
      <Stack.Screen name="Violations" component={ViolationsScreen} options={{ title: 'Правопорушення' }} /> 
    </Stack.Navigator>
  );
}
