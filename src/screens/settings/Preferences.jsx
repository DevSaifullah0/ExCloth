import React from 'react';

import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Ionicons from '@react-native-vector-icons/ionicons/static';


const CurrentPreference = ({
  title,
  subtitle,
  icon,
}) => (
  <View
    accessible
    accessibilityLabel={`${title}, selected`}
    className="mb-3 flex-row items-center rounded-2xl border border-black bg-black p-4"
  >
    <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
      <Ionicons
        name={icon}
        size={21}
        color="black"
      />
    </View>

    <View className="ml-4 flex-1">
      <Text className="font-extrabold text-white">
        {title}
      </Text>

      <Text className="mt-1 text-xs text-gray-300">
        {subtitle}
      </Text>
    </View>

    <Ionicons
      name="radio-button-on"
      size={22}
      color="white"
    />
  </View>
);


const Preferences = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();


  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            Math.max(
              insets.bottom,
              24,
            ) + 40,
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

          <View className="ml-4 flex-1">
            <Text className="text-2xl font-extrabold text-black">
              Preferences
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Current app settings
            </Text>
          </View>
        </View>


        <Text className="mb-3 mt-8 text-lg font-extrabold text-black">
          Appearance
        </Text>

        <CurrentPreference
          title="Light"
          subtitle="The supported app appearance"
          icon="sunny-outline"
        />


        <Text className="mb-3 mt-6 text-lg font-extrabold text-black">
          Language
        </Text>

        <CurrentPreference
          title="English"
          subtitle="The supported interface language"
          icon="language-outline"
        />


        <View className="mt-5 rounded-2xl bg-gray-100 p-4">
          <Text className="font-extrabold text-black">
            Available preferences
          </Text>

          <Text className="mt-2 text-sm leading-6 text-gray-500">
            ExCloth currently supports a light appearance and an English interface.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default Preferences;
