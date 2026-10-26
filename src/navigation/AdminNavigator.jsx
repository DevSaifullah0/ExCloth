import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminTabNavigator from './AdminTabNavigator';

const Stack = createNativeStackNavigator();

const AdminNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      presentation: 'card',
      contentStyle: { backgroundColor: '#FFFFFF' },
    }}
  >
    <Stack.Screen
      name="AdminDashboard"
      component={AdminTabNavigator}
      options={{
        gestureEnabled: false,
        animation: 'fade',
      }}
    />
  </Stack.Navigator>
);

export default AdminNavigator;
