import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MapScreen from '../screens/MapScreen';
import CalendarScreen from '../screens/CalendarScreen';

const Drawer = createDrawerNavigator();

export default function PublicDrawerNavigator() {
  return (
    <Drawer.Navigator initialRouteName="Карта">
      <Drawer.Screen name="Карта" component={MapScreen} />
      <Drawer.Screen name="Календар" component={CalendarScreen} />
    </Drawer.Navigator>
  );
}
