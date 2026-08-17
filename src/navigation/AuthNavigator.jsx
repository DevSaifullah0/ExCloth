import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from '../screens/auth/Login';
import Signup from '../screens/auth/Signup';
import ForgotPassword from '../screens/auth/ForgotPassword';
import OTP from '../screens/auth/OTP';
import ResetPassword from '../screens/auth/ResetPassword';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Login"
        component={Login}
      />

      <Stack.Screen
        name="Signup"
        component={Signup}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPassword}
      />

      <Stack.Screen
        name="OTP"
        component={OTP}
      />

      <Stack.Screen
        name="ResetPassword"
        component={ResetPassword}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;