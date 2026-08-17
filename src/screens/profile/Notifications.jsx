import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';

import React, {
  useCallback,
  useState,
} from 'react';

import { useFocusEffect } from '@react-navigation/native';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

const Notifications = ({ navigation }) => {
  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [markingAll, setMarkingAll] =
    useState(false);

  const fetchNotifications =
    useCallback(async () => {
      try {
        setErrorMessage('');

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setNotifications([]);
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from('notifications')
          .select(`
            id,
            type,
            title,
            message,
            order_id,
            is_read,
            created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        setNotifications(data || []);

      } catch (error) {
        console.log(
          'Notifications Error:',
          error.message,
        );

        setErrorMessage(
          'Unable to load notifications.',
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      let channel;

      const setupNotifications =
        async () => {
          await fetchNotifications();

          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            return;
          }

          channel = supabase
            .channel(
              `notifications-${user.id}`,
            )
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
              },
              payload => {
                const newNotification =
                  payload.new;

                setNotifications(current => {
                  const alreadyExists =
                    current.some(
                      item =>
                        item.id ===
                        newNotification.id,
                    );

                  if (alreadyExists) {
                    return current;
                  }

                  return [
                    newNotification,
                    ...current,
                  ];
                });
              },
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
              },
              payload => {
                setNotifications(current =>
                  current.map(item =>
                    item.id ===
                    payload.new.id
                      ? payload.new
                      : item,
                  ),
                );
              },
            )
            .subscribe();
        };

      setupNotifications();

      return () => {
        if (channel) {
          supabase.removeChannel(
            channel,
          );
        }
      };
    }, [fetchNotifications]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async notification => {
    try {
      if (notification.is_read) {
        handleNotificationPress(
          notification,
        );

        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
        })
        .eq('id', notification.id);

      if (error) {
        throw error;
      }

      setNotifications(current =>
        current.map(item =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
              }
            : item,
        ),
      );

      handleNotificationPress(
        notification,
      );

    } catch (error) {
      console.log(
        'Mark Notification Error:',
        error.message,
      );

      Alert.alert(
        'Error',
        'Unable to update notification.',
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      setNotifications(current =>
        current.map(item => ({
          ...item,
          is_read: true,
        })),
      );

    } catch (error) {
      console.log(
        'Mark All Error:',
        error.message,
      );

      Alert.alert(
        'Error',
        'Unable to mark notifications as read.',
      );

    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationPress =
    notification => {
      if (notification.order_id) {
        navigation.navigate(
          'OrderDetails',
          {
            orderId:
              notification.order_id,
          },
        );
      }
    };

  const formatDate = date => {
    if (!date) {
      return '';
    }

    return new Date(
      date,
    ).toLocaleString();
  };

  const getIcon = type => {
    switch (type) {
      case 'order_update':
        return 'bag-check-outline';

      case 'payment_success':
        return 'checkmark-circle-outline';

      case 'payment_failed':
        return 'close-circle-outline';

      case 'promotion':
        return 'pricetag-outline';

      case 'new_collection':
        return 'shirt-outline';

      case 'account_update':
        return 'person-outline';

      case 'refund':
        return 'return-down-back-outline';

      default:
        return 'notifications-outline';
    }
  };

  const unreadCount =
    notifications.filter(
      item => !item.is_read,
    ).length;

  return (
    <SafeAreaView className="flex-1 bg-white">

      <ScrollView
        className="px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >

        {/* Header */}

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

            <Text className="text-3xl font-extrabold text-black">
              Notifications
            </Text>

            {unreadCount > 0 ? (
              <Text className="mt-1 text-sm text-gray-500">
                {unreadCount} unread
              </Text>
            ) : null}

          </View>

        </View>


        {/* Mark All */}

        {!loading &&
        unreadCount > 0 ? (
          <TouchableOpacity
            onPress={markAllAsRead}
            disabled={markingAll}
            className="mt-5 self-end"
          >
            {markingAll ? (
              <ActivityIndicator
                size="small"
                color="black"
              />
            ) : (
              <Text className="font-bold text-black">
                Mark all as read
              </Text>
            )}
          </TouchableOpacity>
        ) : null}


        {/* Loading */}

        {loading ? (
          <View className="items-center py-20">

            <ActivityIndicator
              size="large"
              color="black"
            />

            <Text className="mt-3 text-gray-500">
              Loading notifications...
            </Text>

          </View>
        ) : null}


        {/* Error */}

        {!loading && errorMessage ? (
          <View className="mt-8 rounded-2xl bg-gray-100 p-6">

            <Text className="text-center text-gray-600">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={fetchNotifications}
              className="mt-4 items-center"
            >
              <Text className="font-bold text-black">
                Try Again
              </Text>
            </TouchableOpacity>

          </View>
        ) : null}


        {/* Empty */}

        {!loading &&
        !errorMessage &&
        notifications.length === 0 ? (
          <View className="mt-20 items-center">

            <Ionicons
              name="notifications-outline"
              size={60}
              color="#D1D5DB"
            />

            <Text className="mt-5 text-xl font-bold text-black">
              No notifications
            </Text>

            <Text className="mt-2 text-center text-gray-500">
              Order and account updates will appear here.
            </Text>

          </View>
        ) : null}


        {/* Notifications */}

        {!loading &&
        !errorMessage &&
        notifications.length > 0 ? (
          <View className="mt-6">

            {notifications.map(
              notification => (
                <TouchableOpacity
                  key={notification.id}
                  onPress={() =>
                    markAsRead(
                      notification,
                    )
                  }
                  activeOpacity={0.8}
                  className={`mb-3 flex-row rounded-2xl border p-4 ${
                    notification.is_read
                      ? 'border-gray-200 bg-white'
                      : 'border-black bg-gray-100'
                  }`}
                >

                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-black">

                    <Ionicons
                      name={getIcon(
                        notification.type,
                      )}
                      size={23}
                      color="white"
                    />

                  </View>

                  <View className="ml-4 flex-1">

                    <View className="flex-row items-start">

                      <Text className="flex-1 font-bold text-black">
                        {
                          notification.title
                        }
                      </Text>

                      {!notification.is_read ? (
                        <View className="ml-2 mt-1 h-2.5 w-2.5 rounded-full bg-black" />
                      ) : null}

                    </View>

                    <Text className="mt-2 leading-5 text-gray-500">
                      {
                        notification.message
                      }
                    </Text>

                    <Text className="mt-3 text-xs text-gray-400">
                      {formatDate(
                        notification.created_at,
                      )}
                    </Text>

                    {notification.order_id ? (
                      <View className="mt-3 flex-row items-center">

                        <Text className="text-sm font-bold text-black">
                          View Order
                        </Text>

                        <Ionicons
                          name="chevron-forward-outline"
                          size={16}
                          color="black"
                        />

                      </View>
                    ) : null}

                  </View>

                </TouchableOpacity>
              ),
            )}

          </View>
        ) : null}

      </ScrollView>

    </SafeAreaView>
  );
};

export default Notifications;