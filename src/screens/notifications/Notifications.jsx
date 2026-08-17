import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';

import React, {
  useCallback,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useFocusEffect,
} from '@react-navigation/native';

import useNotifications from '../../hooks/useNotifications';


const Notifications = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    errorMessage,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();


  useFocusEffect(
    useCallback(
      () => {
        refresh({
          silent: true,
        });
      },
      [refresh],
    ),
  );


  const formatDate =
    value => {
      if (!value) {
        return '';
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return '';
      }


      const now =
        new Date();

      const diff =
        now.getTime() -
        date.getTime();

      const minute =
        60 * 1000;

      const hour =
        60 * minute;

      const day =
        24 * hour;


      if (
        diff >= 0 &&
        diff < minute
      ) {
        return 'Just now';
      }

      if (
        diff >= minute &&
        diff < hour
      ) {
        const minutes =
          Math.floor(
            diff / minute,
          );

        return `${minutes}m ago`;
      }

      if (
        diff >= hour &&
        diff < day
      ) {
        const hours =
          Math.floor(
            diff / hour,
          );

        return `${hours}h ago`;
      }


      return date.toLocaleDateString(
        'en-GB',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        },
      );
    };


  const getNotificationConfig =
    type => {
      switch (
        String(
          type || '',
        ).toLowerCase()
      ) {
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

        default:
          return {
            icon:
              'notifications-outline',
            label:
              'Notification',
          };
      }
    };


  const handleNotificationPress =
    async item => {
      if (!item.is_read) {
        await markAsRead(
          item.id,
        );
      }


      const type =
        String(
          item.type || '',
        ).toLowerCase();


      if (
        type === 'order' &&
        item.order_id
      ) {
        navigation.navigate(
          'OrderDetails',
          {
            orderId:
              item.order_id,
          },
        );

        return;
      }


      if (
        type === 'return' &&
        item.return_request_id
      ) {
        navigation.navigate(
          'ReturnDetails',
          {
            returnRequestId:
              item.return_request_id,
          },
        );

        return;
      }


      if (
        type === 'announcement' ||
        type === 'promo' ||
        type === 'coupon'
      ) {
        navigation.navigate(
          'NotificationDetails',
          {
            notification: item,
          },
        );

        return;
      }


      navigation.navigate(
        'NotificationDetails',
        {
          notification: item,
        },
      );
    };


  const renderNotification =
    ({
      item,
    }) => {
      const config =
        getNotificationConfig(
          item.type,
        );

      return (
        <TouchableOpacity
          onPress={() =>
            handleNotificationPress(
              item,
            )
          }
          activeOpacity={0.85}
          className={`mb-4 overflow-hidden rounded-3xl border ${
            item.is_read
              ? 'border-gray-200 bg-white'
              : 'border-black bg-gray-50'
          }`}
        >
          <View className="p-5">
            <View className="flex-row items-start">
              <View
                className={`h-14 w-14 items-center justify-center rounded-2xl ${
                  item.is_read
                    ? 'bg-gray-100'
                    : 'bg-black'
                }`}
              >
                <Ionicons
                  name={config.icon}
                  size={25}
                  color={
                    item.is_read
                      ? 'black'
                      : 'white'
                  }
                />
              </View>

              <View className="ml-4 flex-1">
                <View className="flex-row items-start justify-between">
                  <View className="mr-3 flex-1">
                    <View className="flex-row flex-wrap items-center">
                      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {config.label}
                      </Text>

                      {!item.is_read ? (
                        <View className="ml-2 rounded-full bg-black px-2 py-1">
                          <Text className="text-[9px] font-extrabold uppercase tracking-wider text-white">
                            New
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text className="mt-2 text-base font-extrabold leading-6 text-black">
                      {item.title}
                    </Text>
                  </View>

                  <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                    <Ionicons
                      name="chevron-forward-outline"
                      size={18}
                      color="black"
                    />
                  </View>
                </View>

                <Text
                  numberOfLines={3}
                  className="mt-3 leading-6 text-gray-500"
                >
                  {item.message}
                </Text>

                <View className="mt-4 flex-row items-center">
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color="#9CA3AF"
                  />

                  <Text className="ml-1.5 text-xs font-semibold text-gray-400">
                    {
                      formatDate(
                        item.created_at,
                      )
                    }
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    };


  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <ActivityIndicator
            size="large"
            color="black"
          />
        </View>

        <Text className="mt-4 font-semibold text-gray-500">
          Loading notifications...
        </Text>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      {/* HEADER */}
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
              Notifications
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              {unreadCount > 0
                ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
                : 'You are all caught up'}
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="notifications-outline"
              size={22}
              color="white"
            />

            {unreadCount > 0 ? (
              <View className="absolute -right-1 -top-1 min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5">
                <Text className="text-[10px] font-extrabold text-black">
                  {unreadCount > 99
                    ? '99+'
                    : unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>


        {/* UNREAD SUMMARY */}
        {unreadCount > 0 ? (
          <View className="mt-7 rounded-3xl bg-black p-5">
            <View className="flex-row items-center">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="mail-unread-outline"
                  size={26}
                  color="black"
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-lg font-extrabold text-white">
                  New Updates
                </Text>

                <Text className="mt-1 text-sm leading-5 text-gray-300">
                  You have {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={
                markAllAsRead
              }
              activeOpacity={0.85}
              className="mt-5 h-12 flex-row items-center justify-center rounded-2xl bg-white"
            >
              <Ionicons
                name="checkmark-done-outline"
                size={19}
                color="black"
              />

              <Text className="ml-2 font-extrabold text-black">
                Mark All as Read
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mt-7 flex-row items-center rounded-3xl bg-gray-100 p-5">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color="black"
              />
            </View>

            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-black">
                All caught up
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                No unread notifications right now.
              </Text>
            </View>
          </View>
        )}


        {!errorMessage &&
        notifications.length > 0 ? (
          <View className="mb-1 mt-7 flex-row items-end justify-between">
            <View>
              <Text className="text-xl font-extrabold text-black">
                Recent Updates
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Orders, returns and promotions.
              </Text>
            </View>

            <View className="rounded-full bg-gray-100 px-3 py-2">
              <Text className="text-xs font-extrabold text-black">
                {notifications.length}
              </Text>
            </View>
          </View>
        ) : null}
      </View>


      {errorMessage ? (
        <View className="mx-5 mt-7 items-center rounded-3xl bg-gray-100 p-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
            <Ionicons
              name="alert-circle-outline"
              size={30}
              color="black"
            />
          </View>

          <Text className="mt-5 text-xl font-extrabold text-black">
            Unable to load notifications
          </Text>

          <Text className="mt-2 text-center leading-6 text-gray-500">
            {errorMessage}
          </Text>

          <TouchableOpacity
            onPress={() =>
              refresh()
            }
            activeOpacity={0.85}
            className="mt-5 rounded-2xl bg-black px-6 py-3"
          >
            <Text className="font-extrabold text-white">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={
            item =>
              String(item.id)
          }
          renderItem={
            renderNotification
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={() =>
                refresh({
                  refreshing: true,
                })
              }
              tintColor="black"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom:
              Math.max(
                insets.bottom,
                24,
              ) + 30,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-24">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <Ionicons
                  name="notifications-off-outline"
                  size={38}
                  color="black"
                />
              </View>

              <Text className="mt-5 text-xl font-extrabold text-black">
                No Notifications
              </Text>

              <Text className="mt-2 px-8 text-center leading-6 text-gray-500">
                Order, return and offer updates will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};


export default Notifications;
