import {
  View,
  Text,
  Image,
} from 'react-native';

import React from 'react';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

const SplashScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center bg-black">

        <Image
          source={require('../../images/Logo.png')}
          className="h-96 w-96 bottom-14"
          resizeMode="contain"
        />

      </View>
    </SafeAreaView>
  );
};

export default SplashScreen;