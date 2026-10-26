import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Onboarding, { ONBOARDING_KEY } from '../screens/auth/Onboarding';
import Login from '../screens/auth/Login';
import Signup from '../screens/auth/Signup';
import ForgotPassword from '../screens/auth/ForgotPassword';
import OTP from '../screens/auth/OTP';
import ResetPassword from '../screens/auth/ResetPassword';
import SplashScreen from '../screens/splash/SplashScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(value => {
        if (active) {
          setHasCompletedOnboarding(value === 'true');
        }
      })
      .catch(() => {
        if (active) {
          setHasCompletedOnboarding(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (hasCompletedOnboarding === null) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName={hasCompletedOnboarding ? 'Login' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={Onboarding}
      />

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
