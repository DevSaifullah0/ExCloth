import './global.css';
import React from 'react';

import RootNavigator from './src/navigation/RootNavigator';

import {
  AuthProvider,
} from './src/context/AuthContext';

import usePushNotifications from './src/hooks/usePushNotifications';


const AppContent = () => {
  usePushNotifications();

  return <RootNavigator />;
};


const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};


export default App;
