import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import React from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';


const TYPE_CONFIG = {
  announcement: {
    label:
      'Announcement',
    icon:
      'megaphone-outline',
  },

  promo: {
    label:
      'Promotion',
    icon:
      'flash-outline',
  },

  coupon: {
    label:
      'Coupon',
    icon:
      'pricetag-outline',
  },
};


const AdminBroadcastDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const broadcast =
    route.params?.broadcast ||
    null;


  const formatDate =
    value => {
      if (!value) {
        return '—';
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return '—';
      }

      return date.toLocaleString(
        'en-GB',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      );
    };


  if (!broadcast) {
    return (
      <SafeAreaView className="flex-1 bg-white">

        <View className="px-5">

          <View className="mt-4 flex-row items-center">

            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
            >
              <Ionicons
                name="arrow-back-outline"
                size={22}
                color="black"
              />
            </TouchableOpacity>

            <Text className="ml-4 text-2xl font-extrabold text-black">
              Broadcast Details
            </Text>

          </View>


          <View className="mt-24 items-center">

            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#D1D5DB"
            />

            <Text className="mt-5 text-xl font-extrabold text-black">
              Broadcast unavailable
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              This broadcast information is not available.
            </Text>

          </View>

        </View>

      </SafeAreaView>
    );
  }


  const config =
    TYPE_CONFIG[
      broadcast.type
    ] ||
    TYPE_CONFIG.announcement;


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
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <Ionicons
              name="arrow-back-outline"
              size={22}
              color="black"
            />
          </TouchableOpacity>


          <View className="ml-4 flex-1">

            <Text className="text-2xl font-extrabold text-black">
              Broadcast Details
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Sent notification information
            </Text>

          </View>

        </View>


        <View className="mt-7 rounded-3xl bg-black p-6">

          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">

            <Ionicons
              name={config.icon}
              size={30}
              color="black"
            />

          </View>


          <Text className="mt-6 text-2xl font-extrabold text-white">
            {broadcast.title}
          </Text>


          <View className="mt-4 self-start rounded-full bg-white/10 px-4 py-2">

            <Text className="text-sm font-bold text-white">
              {config.label}
            </Text>

          </View>

        </View>


        <Text className="mb-3 mt-7 text-lg font-bold text-black">
          Message
        </Text>


        <View className="rounded-2xl bg-gray-100 p-5">

          <Text className="text-base leading-7 text-gray-600">
            {broadcast.message}
          </Text>

        </View>


        <Text className="mb-3 mt-7 text-lg font-bold text-black">
          Broadcast Information
        </Text>


        <View className="rounded-2xl bg-gray-100 p-5">

          <View className="flex-row items-center justify-between">

            <Text className="text-sm font-semibold text-gray-500">
              Audience
            </Text>

            <Text className="font-extrabold text-black">
              {Number(
                broadcast.audience_count ||
                  0,
              )}{' '}
              users
            </Text>

          </View>


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row items-start justify-between">

            <Text className="text-sm font-semibold text-gray-500">
              Sent At
            </Text>

            <Text className="ml-5 flex-1 text-right font-bold text-black">
              {
                formatDate(
                  broadcast.created_at,
                )
              }
            </Text>

          </View>


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row items-center justify-between">

            <Text className="text-sm font-semibold text-gray-500">
              Type
            </Text>

            <Text className="font-extrabold text-black">
              {config.label}
            </Text>

          </View>


          {broadcast.coupon_code ? (
            <>
              <View className="my-4 h-px bg-gray-200" />

              <View className="flex-row items-center justify-between">

                <Text className="text-sm font-semibold text-gray-500">
                  Coupon
                </Text>

                <View className="rounded-full bg-white px-3 py-1.5">

                  <Text className="font-extrabold text-black">
                    {broadcast.coupon_code}
                  </Text>

                </View>

              </View>
            </>
          ) : null}


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row items-start justify-between">

            <Text className="text-sm font-semibold text-gray-500">
              Broadcast ID
            </Text>

            <Text
              numberOfLines={1}
              className="ml-5 flex-1 text-right text-xs font-bold text-black"
            >
              {broadcast.id}
            </Text>

          </View>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
};


export default AdminBroadcastDetails;
