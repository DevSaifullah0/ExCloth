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


const NotificationDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const notification =
    route.params?.notification ||
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


  const getConfig =
    type => {
      switch (
        String(
          type || '',
        ).toLowerCase()
      ) {
        case 'announcement':
          return {
            icon:
              'megaphone-outline',
            label:
              'Announcement',
          };

        case 'promo':
          return {
            icon:
              'flash-outline',
            label:
              'Promotion',
          };

        case 'coupon':
          return {
            icon:
              'pricetag-outline',
            label:
              'Coupon',
          };

        case 'order':
          return {
            icon:
              'bag-handle-outline',
            label:
              'Order',
          };

        case 'return':
          return {
            icon:
              'return-down-back-outline',
            label:
              'Return',
          };

        default:
          return {
            icon:
              'notifications-outline',
            label:
              'Notification',
          };
      }
    };


  if (!notification) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5">
          <View className="mt-4 flex-row items-center">
            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
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
              <Text className="text-3xl font-extrabold text-black">
                Notification
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                ExCloth update details.
              </Text>
            </View>
          </View>


          <View className="mt-16 items-center rounded-3xl bg-gray-100 px-6 py-12">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={38}
                color="black"
              />
            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              Notification unavailable
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              This notification could not be opened.
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              activeOpacity={0.85}
              className="mt-6 rounded-2xl bg-black px-6 py-3.5"
            >
              <Text className="font-extrabold text-white">
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }


  const config =
    getConfig(
      notification.type,
    );

  const couponCode =
    notification?.data
      ?.coupon_code ||
    notification?.coupon_code ||
    null;

  const normalizedType =
    String(
      notification.type ||
        '',
    ).toLowerCase();


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
        {/* HEADER */}
        <View className="mt-4 flex-row items-center">
          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
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
            <Text className="text-3xl font-extrabold text-black">
              Notification
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              ExCloth update details.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name={config.icon}
              size={22}
              color="white"
            />
          </View>
        </View>


        {/* HERO */}
        <View className="mt-7 overflow-hidden rounded-3xl bg-black p-6">
          <View className="flex-row items-start justify-between">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white">
              <Ionicons
                name={config.icon}
                size={30}
                color="black"
              />
            </View>

            <View className="rounded-full bg-white px-3 py-2">
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-black">
                {config.label}
              </Text>
            </View>
          </View>

          <Text className="mt-6 text-2xl font-extrabold leading-8 text-white">
            {notification.title}
          </Text>

          <View className="mt-5 flex-row items-center">
            <Ionicons
              name="time-outline"
              size={15}
              color="#D1D5DB"
            />

            <Text className="ml-2 text-sm font-semibold text-gray-300">
              {
                formatDate(
                  notification.created_at,
                )
              }
            </Text>
          </View>
        </View>


        {/* MESSAGE */}
        <View className="mt-7">
          <View className="mb-3 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Ionicons
                name="chatbox-ellipses-outline"
                size={20}
                color="black"
              />
            </View>

            <View className="ml-3">
              <Text className="text-xl font-extrabold text-black">
                Message
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Details of this update.
              </Text>
            </View>
          </View>

          <View className="rounded-3xl bg-gray-100 p-5">
            <Text className="text-base leading-7 text-gray-700">
              {notification.message}
            </Text>
          </View>
        </View>


        {/* COUPON */}
        {couponCode ? (
          <View className="mt-7">
            <View className="mb-3 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color="black"
                />
              </View>

              <View className="ml-3">
                <Text className="text-xl font-extrabold text-black">
                  Coupon Code
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Apply this code during checkout.
                </Text>
              </View>
            </View>

            <View className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
              <View className="p-5">
                <View className="flex-row items-center">
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-black">
                    <Ionicons
                      name="ticket-outline"
                      size={26}
                      color="white"
                    />
                  </View>

                  <View className="ml-4 flex-1">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Use at checkout
                    </Text>

                    <Text className="mt-1 text-2xl font-extrabold tracking-wider text-black">
                      {couponCode}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="border-t border-dashed border-gray-300 bg-gray-50 px-5 py-3">
                <Text className="text-center text-xs font-semibold text-gray-500">
                  Enter this code in the coupon section before payment.
                </Text>
              </View>
            </View>
          </View>
        ) : null}


        {/* INFORMATION */}
        <View className="mt-7">
          <View className="mb-3 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Ionicons
                name="information-circle-outline"
                size={21}
                color="black"
              />
            </View>

            <View className="ml-3">
              <Text className="text-xl font-extrabold text-black">
                Information
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Notification metadata.
              </Text>
            </View>
          </View>

          <View className="rounded-3xl bg-gray-100 p-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center">
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="#6B7280"
                />

                <Text className="ml-2 text-sm font-semibold text-gray-500">
                  Received
                </Text>
              </View>

              <Text className="ml-5 flex-1 text-right font-extrabold text-black">
                {
                  formatDate(
                    notification.created_at,
                  )
                }
              </Text>
            </View>

            <View className="my-4 h-px bg-gray-200" />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons
                  name={config.icon}
                  size={18}
                  color="#6B7280"
                />

                <Text className="ml-2 text-sm font-semibold text-gray-500">
                  Type
                </Text>
              </View>

              <View className="rounded-full bg-white px-3 py-2">
                <Text className="text-xs font-extrabold text-black">
                  {config.label}
                </Text>
              </View>
            </View>
          </View>
        </View>


        {/* PROMO ACTION */}
        {normalizedType ===
        'promo' ? (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                'MainTabs',
              )
            }
            activeOpacity={0.85}
            className="mt-7 h-14 flex-row items-center justify-center rounded-2xl bg-black"
          >
            <Ionicons
              name="bag-handle-outline"
              size={20}
              color="white"
            />

            <Text className="ml-2 text-base font-extrabold text-white">
              Shop Now
            </Text>

            <Ionicons
              name="arrow-forward-outline"
              size={19}
              color="white"
              style={{
                marginLeft: 8,
              }}
            />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};


export default NotificationDetails;
