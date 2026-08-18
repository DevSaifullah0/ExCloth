import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import React from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';


const OnlineMethodUnavailable = ({
  navigation,
  paymentMethodName =
    'Online payment',
}) => {
  const insets =
    useSafeAreaInsets();


  return (
    <SafeAreaView
      edges={[
        'top',
        'left',
        'right',
        'bottom',
      ]}
      className="flex-1 bg-white"
    >
      <View
        className="flex-1 px-6"
        style={{
          paddingBottom:
            Math.max(
              insets.bottom,
              20,
            ),
        }}
      >
        <View className="mt-4 flex-row items-center">
          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.8}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
          >
            <Ionicons
              name="arrow-back-outline"
              size={22}
              color="black"
            />
          </TouchableOpacity>

          <Text className="ml-4 flex-1 text-2xl font-extrabold text-black">
            {paymentMethodName}
          </Text>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="wallet-outline"
              size={22}
              color="white"
            />
          </View>
        </View>


        <View className="flex-1 items-center justify-center">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-black">
              <Ionicons
                name="shield-checkmark-outline"
                size={32}
                color="white"
              />
            </View>
          </View>

          <Text className="mt-7 text-center text-3xl font-extrabold text-black">
            Payment method unavailable
          </Text>

          <Text className="mt-3 max-w-sm text-center text-base leading-6 text-gray-500">
            A verified payment provider is required before this method can be enabled. No account or transaction details are collected in this build.
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            accessibilityRole="button"
            activeOpacity={0.85}
            className="mt-8 h-14 w-full items-center justify-center rounded-2xl bg-black"
          >
            <Text className="text-base font-extrabold text-white">
              Choose Another Method
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};


export default OnlineMethodUnavailable;
