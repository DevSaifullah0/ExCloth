import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';

import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  getMessaging,
  getToken,
  deleteToken,
} from '@react-native-firebase/messaging';

import { supabase } from '../../lib/supabase';
import AppModal from '../../components/common/AppModal';
import {
  isPushNotificationsEnabled,
} from '../../utils/pushConfig';


const AdminDashboard = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [
    returns,
    setReturns,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
    onConfirm: null,
  });


  const closeModal = () => {
    if (loggingOut) {
      return;
    }

    setModal(current => ({
      ...current,
      visible: false,
    }));
  };


  const performLogout = async () => {
    try {
      setLoggingOut(true);

      setModal(current => ({
        ...current,
        visible: false,
      }));


      try {
        if (
          isPushNotificationsEnabled()
        ) {
          const messaging =
            getMessaging();

          const currentPushToken =
            await getToken(
              messaging,
            );


          if (currentPushToken) {
            const {
              error:
                unregisterError,
            } =
              await supabase.rpc(
                'unregister_push_token_secure',
                {
                  p_token:
                    currentPushToken,
                },
              );


            if (unregisterError) {
              if (__DEV__) {
                console.error(
                  'Admin push token unregister error:',
                  unregisterError.message,
                );
              }
            }


            try {
              await deleteToken(
                messaging,
              );
            } catch (
              tokenDeleteError
            ) {
              if (__DEV__) {
                console.error(
                  'Admin FCM token delete error:',
                  tokenDeleteError?.message ||
                    tokenDeleteError,
                );
              }
            }
          }
        }

      } catch (
        tokenCleanupError
      ) {
        if (__DEV__) {
          console.error(
            'Admin push token cleanup error:',
            tokenCleanupError?.message ||
              tokenCleanupError,
          );
        }
      }


      const {
        error,
      } =
        await supabase.auth.signOut({
          scope: 'local',
        });


      if (error) {
        throw error;
      }

    } catch (error) {
      if (__DEV__) {
        console.error(
          'Admin Logout Error:',
          error?.message ||
            error,
        );
      }


      setModal({
        visible: true,
        type: 'error',
        title: 'Logout Error',
        message:
          'Unable to logout right now.',
        confirmText: 'OK',
        cancelText: 'Cancel',
        showCancel: false,
        onConfirm: null,
      });

    } finally {
      setLoggingOut(false);
    }
  };


  const handleLogout = () => {
    if (loggingOut) {
      return;
    }

    setModal({
      visible: true,
      type: 'confirm',
      title: 'Logout Admin',
      message:
        'Are you sure you want to logout from the admin panel?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: performLogout,
    });
  };


  const fetchDashboard =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setLoading(true);
          }

          setErrorMessage('');


          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth
              .getUser();


          if (userError) {
            throw userError;
          }


          if (!user) {
            throw new Error(
              'Admin session not found.',
            );
          }


          const [
            ordersResult,
            returnsResult,
          ] =
            await Promise.all([
              supabase.rpc(
                'get_admin_orders_secure',
              ),

              supabase.rpc(
                'get_admin_returns_secure',
              ),
            ]);


          if (
            ordersResult.error
          ) {
            throw ordersResult.error;
          }


          if (
            returnsResult.error
          ) {
            throw returnsResult.error;
          }


          setOrders(
            Array.isArray(
              ordersResult.data,
            )
              ? ordersResult.data
              : [],
          );


          setReturns(
            Array.isArray(
              returnsResult.data,
            )
              ? returnsResult.data
              : [],
          );

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Admin Dashboard Error:',
              error.message,
            );
          }

          setErrorMessage(
            'Unable to load admin dashboard.',
          );

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );


  useFocusEffect(
    useCallback(
      () => {
        fetchDashboard();
      },
      [fetchDashboard],
    ),
  );


  const stats =
    useMemo(
      () => {
        const normalize =
          value =>
            String(
              value || '',
            )
              .trim()
              .toLowerCase();


        const orderCount =
          status =>
            orders.filter(
              order =>
                normalize(
                  order.status,
                ) === status,
            ).length;


        const returnCount =
          status =>
            returns.filter(
              item =>
                normalize(
                  item.status,
                ) === status,
            ).length;


        return {
          totalOrders:
            orders.length,

          pendingOrders:
            orderCount(
              'pending',
            ),

          deliveredOrders:
            orderCount(
              'delivered',
            ),

          totalReturns:
            returns.length,

          pendingReturns:
            returnCount(
              'requested',
            ),

          refundedReturns:
            returnCount(
              'refunded',
            ),
        };
      },
      [
        orders,
        returns,
      ],
    );


  const cards = [
    {
      title:
        'Total Orders',
      value:
        stats.totalOrders,
      icon:
        'bag-handle-outline',
    },
    {
      title:
        'Pending Orders',
      value:
        stats.pendingOrders,
      icon:
        'time-outline',
    },
    {
      title:
        'Delivered Orders',
      value:
        stats.deliveredOrders,
      icon:
        'checkmark-circle-outline',
    },
    {
      title:
        'Total Returns',
      value:
        stats.totalReturns,
      icon:
        'return-down-back-outline',
    },
    {
      title:
        'Pending Returns',
      value:
        stats.pendingReturns,
      icon:
        'hourglass-outline',
    },
    {
      title:
        'Refunded Returns',
      value:
        stats.refundedReturns,
      icon:
        'cash-outline',
    },
  ];


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
          Loading dashboard...
        </Text>
      </SafeAreaView>
    );
  }


  const managementItems = [
    {
      title: 'Product Management',
      subtitle: 'Products, images and inventory',
      icon: 'cube-outline',
      route: 'AdminProducts',
    },
    {
      title: 'Category Management',
      subtitle: 'Categories, images and visibility',
      icon: 'grid-outline',
      route: 'AdminCategories',
    },
    {
      title: 'Coupon Management',
      subtitle: 'Discounts, limits and expiry',
      icon: 'pricetags-outline',
      route: 'AdminCoupons',
    },
    {
      title: 'User Management',
      subtitle: 'Customers and account status',
      icon: 'people-outline',
      route: 'AdminUsers',
    },
    {
      title: 'Review Management',
      subtitle: 'Moderate ratings and reviews',
      icon: 'star-outline',
      route: 'AdminReviews',
    },
    {
      title: 'Broadcast Notifications',
      subtitle: 'Announcements, promotions and coupons',
      icon: 'megaphone-outline',
      route: 'AdminBroadcasts',
    },
    {
      title: 'Order Management',
      subtitle: 'Orders and delivery statuses',
      icon: 'bag-handle-outline',
      route: 'AdminOrders',
    },
    {
      title: 'Return Management',
      subtitle: 'Returns and refunds',
      icon: 'return-down-back-outline',
      route: 'AdminReturns',
    },
  ];


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
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              setRefreshing(true);

              fetchDashboard({
                silent: true,
              });
            }}
            tintColor="black"
          />
        }
        contentContainerStyle={{
          paddingBottom:
            Math.max(
              insets.bottom,
              24,
            ) + 36,
        }}
      >
        {/* HEADER */}
        <View className="mt-4 flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="white"
            />
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-3xl font-extrabold text-black">
              Admin Dashboard
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              ExCloth management overview
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                'AdminSettings',
              )
            }
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open admin settings"
            className="mr-2 h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color="black"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={
              handleLogout
            }
            disabled={
              loggingOut
            }
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Logout admin"
            className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
          >
            {loggingOut ? (
              <ActivityIndicator
                size="small"
                color="black"
              />
            ) : (
              <Ionicons
                name="log-out-outline"
                size={22}
                color="black"
              />
            )}
          </TouchableOpacity>
        </View>


        {errorMessage ? (
          <View className="mt-7 items-center rounded-3xl bg-gray-100 p-7">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={30}
                color="black"
              />
            </View>

            <Text className="mt-4 text-xl font-extrabold text-black">
              Unable to load dashboard
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={() =>
                fetchDashboard()
              }
              activeOpacity={0.85}
              className="mt-5 h-12 items-center justify-center rounded-2xl bg-black px-7"
            >
              <Text className="font-extrabold text-white">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* HERO */}
            <View className="mt-7 overflow-hidden rounded-3xl bg-black p-6">
              <View className="flex-row items-start justify-between">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white">
                  <Ionicons
                    name="analytics-outline"
                    size={29}
                    color="black"
                  />
                </View>

                <View className="rounded-full bg-white px-3 py-2">
                  <Text className="text-xs font-extrabold uppercase tracking-wider text-black">
                    Admin
                  </Text>
                </View>
              </View>

              <Text className="mt-6 text-3xl font-extrabold text-white">
                Store Control Center
              </Text>

              <Text className="mt-2 leading-6 text-gray-300">
                Monitor orders, returns, refunds and store operations from one place.
              </Text>

              <View className="mt-6 flex-row">
                <View className="mr-3 flex-1 rounded-2xl bg-white p-4">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Orders
                  </Text>

                  <Text className="mt-2 text-2xl font-extrabold text-black">
                    {stats.totalOrders}
                  </Text>
                </View>

                <View className="flex-1 rounded-2xl bg-white p-4">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Returns
                  </Text>

                  <Text className="mt-2 text-2xl font-extrabold text-black">
                    {stats.totalReturns}
                  </Text>
                </View>
              </View>
            </View>


            {/* OVERVIEW */}
            <View className="mb-4 mt-8 flex-row items-end justify-between">
              <View>
                <Text className="text-2xl font-extrabold text-black">
                  Overview
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Live operational totals.
                </Text>
              </View>

              <View className="rounded-full bg-gray-100 px-3 py-2">
                <Text className="text-xs font-extrabold text-black">
                  6 metrics
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {cards.map(
                (
                  card,
                  index,
                ) => (
                  <View
                    key={
                      card.title
                    }
                    className={`mb-4 w-[48%] rounded-3xl p-5 ${
                      index === 0
                        ? 'bg-black'
                        : 'bg-gray-100'
                    }`}
                  >
                    <View
                      className={`h-11 w-11 items-center justify-center rounded-xl ${
                        index === 0
                          ? 'bg-white'
                          : 'bg-white'
                      }`}
                    >
                      <Ionicons
                        name={
                          card.icon
                        }
                        size={22}
                        color="black"
                      />
                    </View>

                    <Text
                      className={`mt-5 text-3xl font-extrabold ${
                        index === 0
                          ? 'text-white'
                          : 'text-black'
                      }`}
                    >
                      {
                        card.value
                      }
                    </Text>

                    <Text
                      className={`mt-1 text-sm font-semibold ${
                        index === 0
                          ? 'text-gray-300'
                          : 'text-gray-500'
                      }`}
                    >
                      {
                        card.title
                      }
                    </Text>
                  </View>
                ),
              )}
            </View>


            {/* ATTENTION */}
            <View className="mt-2 rounded-3xl border border-gray-200 bg-white p-5">
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color="black"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-lg font-extrabold text-black">
                    Needs Attention
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    Pending operational work
                  </Text>
                </View>
              </View>

              <View className="mt-5 flex-row">
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      'AdminOrders',
                    )
                  }
                  activeOpacity={0.85}
                  className="mr-3 flex-1 rounded-2xl bg-gray-100 p-4"
                >
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Pending Orders
                  </Text>

                  <Text className="mt-2 text-2xl font-extrabold text-black">
                    {stats.pendingOrders}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      'AdminReturns',
                    )
                  }
                  activeOpacity={0.85}
                  className="flex-1 rounded-2xl bg-gray-100 p-4"
                >
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Pending Returns
                  </Text>

                  <Text className="mt-2 text-2xl font-extrabold text-black">
                    {stats.pendingReturns}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>


            {/* MANAGEMENT */}
            <View className="mb-4 mt-8">
              <Text className="text-2xl font-extrabold text-black">
                Management
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Store administration tools.
              </Text>
            </View>

            {managementItems.map(
              item => (
                <TouchableOpacity
                  key={
                    item.route
                  }
                  onPress={() =>
                    navigation.navigate(
                      item.route,
                    )
                  }
                  activeOpacity={0.85}
                  className="mb-3 flex-row items-center rounded-3xl bg-gray-100 p-5"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                    <Ionicons
                      name={
                        item.icon
                      }
                      size={23}
                      color="black"
                    />
                  </View>

                  <View className="ml-4 flex-1">
                    <Text className="text-base font-extrabold text-black">
                      {
                        item.title
                      }
                    </Text>

                    <Text className="mt-1 text-sm text-gray-500">
                      {
                        item.subtitle
                      }
                    </Text>
                  </View>

                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                    <Ionicons
                      name="chevron-forward-outline"
                      size={20}
                      color="black"
                    />
                  </View>
                </TouchableOpacity>
              ),
            )}
          </>
        )}
      </ScrollView>

      <AppModal
        visible={
          modal.visible
        }
        type={
          modal.type
        }
        title={
          modal.title
        }
        message={
          modal.message
        }
        confirmText={
          modal.confirmText
        }
        cancelText={
          modal.cancelText
        }
        showCancel={
          modal.showCancel
        }
        dismissible={
          !loggingOut
        }
        loading={
          loggingOut
        }
        onCancel={
          closeModal
        }
        onConfirm={() => {
          if (
            typeof modal.onConfirm ===
            'function'
          ) {
            modal.onConfirm();
            return;
          }

          closeModal();
        }}
      />
    </SafeAreaView>
  );
};


export default AdminDashboard;
