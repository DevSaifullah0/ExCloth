import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
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

const ADMIN_TOOLS = [
  {
    title: 'Orders',
    subtitle: 'View and update orders',
    icon: 'bag-handle-outline',
    route: 'Orders',
    category: 'Orders',
    keywords: 'fulfilment delivery status',
    quick: true,
  },
  {
    title: 'Returns & refunds',
    subtitle: 'Review requests and refunds',
    icon: 'return-down-back-outline',
    route: 'Returns',
    category: 'Orders',
    keywords: 'refund return exchange',
    quick: true,
  },
  {
    title: 'Products & inventory',
    subtitle: 'Products, images and stock',
    icon: 'shirt-outline',
    route: 'Products',
    category: 'Catalog',
    keywords: 'item sku size color variant',
    quick: true,
  },
  {
    title: 'Categories',
    subtitle: 'Organize the catalog',
    icon: 'grid-outline',
    route: 'AdminCategories',
    category: 'Catalog',
    keywords: 'collection listing',
  },
  {
    title: 'Customers',
    subtitle: 'View, verify and block users',
    icon: 'people-outline',
    route: 'AdminUsers',
    category: 'Customers',
    keywords: 'user account verified banned',
    quick: true,
  },
  {
    title: 'Support inbox',
    subtitle: 'Reply to customer support tickets',
    icon: 'chatbubbles-outline',
    route: 'AdminSupportTickets',
    category: 'Customers',
    keywords: 'help ticket customer conversation reply',
    quick: true,
  },
  {
    title: 'Reviews',
    subtitle: 'Moderate product feedback',
    icon: 'star-outline',
    route: 'AdminReviews',
    category: 'Customers',
    keywords: 'ratings comments',
  },
  {
    title: 'Promotions & coupons',
    subtitle: 'Discounts, usage and expiry',
    icon: 'pricetags-outline',
    route: 'Coupons',
    category: 'Marketing',
    keywords: 'offer sale promo discount',
  },
  {
    title: 'App banners',
    subtitle: 'Publish Home screen banners',
    icon: 'images-outline',
    route: 'AdminBanners',
    category: 'Marketing',
    keywords: 'content image hero campaign',
    quick: true,
  },
  {
    title: 'Notifications',
    subtitle: 'Send customer announcements',
    icon: 'megaphone-outline',
    route: 'AdminBroadcasts',
    category: 'Marketing',
    keywords: 'broadcast message push',
  },
  {
    title: 'Business reports',
    subtitle: 'Payments, sales and refunds',
    icon: 'bar-chart-outline',
    route: 'AdminReports',
    category: 'Finance',
    keywords: 'analytics export csv transaction',
    quick: true,
  },
  {
    title: 'Admin settings',
    subtitle: 'Security and preferences',
    icon: 'settings-outline',
    route: 'AdminSettings',
    category: 'Settings',
    keywords: 'password profile legal',
  },
  {
    title: 'Roles & permissions',
    subtitle: 'Choose what each team member can access',
    icon: 'key-outline',
    route: 'AdminRolesPermissions',
    category: 'Settings',
    keywords: 'staff access role permission security team',
  },
];

const TOOL_CATEGORIES = ['All', 'Orders', 'Catalog', 'Customers', 'Marketing', 'Finance', 'Settings'];

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

  const [lowStockAlerts, setLowStockAlerts] = useState([]);

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

  const [toolSearch, setToolSearch] = useState('');
  const [toolCategory, setToolCategory] = useState('All');

  const filteredTools = useMemo(() => {
    const query = toolSearch.trim().toLowerCase();

    return ADMIN_TOOLS.filter(tool => {
      const matchesCategory = toolCategory === 'All' || tool.category === toolCategory;
      const searchable = `${tool.title} ${tool.subtitle} ${tool.category} ${tool.keywords}`.toLowerCase();
      return matchesCategory && (!query || searchable.includes(query));
    });
  }, [toolCategory, toolSearch]);

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
            lowStockResult,
          ] =
            await Promise.all([
              supabase.rpc(
                'get_admin_orders_secure',
              ),

              supabase.rpc(
                'get_admin_returns_secure',
              ),

              supabase
                .from('notifications')
                .select('id, title, message, created_at, data')
                .eq('user_id', user.id)
                .eq('type', 'low_stock')
                .order('created_at', { ascending: false })
                .limit(5),
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

          if (lowStockResult.error) {
            if (__DEV__) console.error('Low stock alerts error:', lowStockResult.error.message);
            setLowStockAlerts([]);
          } else {
            setLowStockAlerts(lowStockResult.data || []);
          }

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

          processingOrders:
            orderCount(
              'processing',
            ),

          shippedOrders:
            orderCount(
              'shipped',
            ),

          deliveredOrders:
            orderCount(
              'delivered',
            ),

          cancelledOrders:
            orderCount(
              'cancelled',
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


  const weeklyOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - 6 + index);

      const count = orders.filter(order => {
        const createdAt = new Date(order.created_at);

        return (
          !Number.isNaN(createdAt.getTime()) &&
          createdAt.getFullYear() === day.getFullYear() &&
          createdAt.getMonth() === day.getMonth() &&
          createdAt.getDate() === day.getDate()
        );
      }).length;

      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        count,
        isToday: index === 6,
      };
    });
  }, [orders]);


  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (first, second) =>
            new Date(second.created_at).getTime() -
            new Date(first.created_at).getTime(),
        )
        .slice(0, 4),
    [orders],
  );


  const orderStatusBreakdown = [
    { label: 'Pending', value: stats.pendingOrders },
    { label: 'Processing', value: stats.processingOrders },
    { label: 'Shipped', value: stats.shippedOrders },
    { label: 'Delivered', value: stats.deliveredOrders },
    { label: 'Cancelled', value: stats.cancelledOrders },
  ];

  const maxStatusCount = Math.max(
    ...orderStatusBreakdown.map(item => item.value),
    1,
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
        <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-50">
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

        {!errorMessage ? (
          <View className="mt-4">
            <View className="h-12 flex-row items-center rounded-2xl bg-gray-100 px-4">
              <Ionicons name="search-outline" size={20} color="#6B7280" />
              <TextInput
                value={toolSearch}
                onChangeText={setToolSearch}
                placeholder="Find users, orders, banners…"
                placeholderTextColor="#9CA3AF"
                returnKeyType="search"
                accessibilityLabel="Search admin tools"
                className="ml-3 flex-1 py-0 text-sm text-black"
              />
              {toolSearch ? (
                <TouchableOpacity onPress={() => setToolSearch('')} accessibilityLabel="Clear tool search">
                  <Ionicons name="close-circle" size={20} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 4 }}>
              {ADMIN_TOOLS.filter(tool => tool.quick).map(tool => (
                <TouchableOpacity
                  key={`quick-${tool.route}`}
                  onPress={() => navigation.navigate(tool.route)}
                  activeOpacity={0.85}
                  className="mr-2 flex-row items-center rounded-xl border border-gray-200 bg-white px-3 py-2.5"
                >
                  <Ionicons name={tool.icon} size={17} color="black" />
                  <Text className="ml-2 text-xs font-bold text-black">{tool.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!errorMessage ? (
          <View className="mt-5">
            <View className="mb-3 flex-row items-end justify-between">
              <View>
                <Text className="text-xl font-extrabold text-black">All admin tools</Text>
                <Text className="mt-1 text-sm text-gray-500">Choose a category or search by task.</Text>
              </View>
              <View className="rounded-full bg-gray-100 px-3 py-2">
                <Text className="text-xs font-bold text-gray-600">{filteredTools.length} shown</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
              {TOOL_CATEGORIES.map(category => {
                const selected = toolCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setToolCategory(category)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    className={`mr-2 rounded-full px-4 py-2.5 ${selected ? 'bg-black' : 'bg-gray-100'}`}
                  >
                    <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-gray-600'}`}>{category}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View className="mt-3 flex-row flex-wrap justify-between">
              {filteredTools.map(tool => (
                <TouchableOpacity
                  key={`tool-${tool.route}`}
                  onPress={() => navigation.navigate(tool.route)}
                  activeOpacity={0.85}
                  className="mb-3 min-h-32 w-[48%] rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                      <Ionicons name={tool.icon} size={21} color="black" />
                    </View>
                    <Ionicons name="arrow-forward-outline" size={17} color="#9CA3AF" />
                  </View>
                  <Text numberOfLines={2} className="mt-3 text-sm font-extrabold text-black">{tool.title}</Text>
                  <Text numberOfLines={2} className="mt-1 text-[11px] leading-4 text-gray-500">{tool.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredTools.length === 0 ? (
              <View className="items-center rounded-2xl bg-gray-50 py-7">
                <Ionicons name="search-outline" size={30} color="#9CA3AF" />
                <Text className="mt-2 font-semibold text-gray-500">No matching admin tools</Text>
                <TouchableOpacity onPress={() => { setToolSearch(''); setToolCategory('All'); }} className="mt-2">
                  <Text className="font-bold text-black">Reset search</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

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


            <View className="mb-4 mt-5">
              <Text className="text-2xl font-extrabold text-black">
                Store analytics
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Order activity and fulfilment at a glance.
              </Text>
            </View>

            <View className="rounded-3xl border border-gray-200 bg-white p-5">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-base font-extrabold text-black">
                    Orders this week
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    Daily order volume · last 7 days
                  </Text>
                </View>

                <View className="rounded-full bg-gray-100 px-3 py-2">
                  <Text className="text-xs font-extrabold text-black">
                    {weeklyOrders.reduce((total, day) => total + day.count, 0)}
                  </Text>
                </View>
              </View>

              <View className="mt-7 h-36 flex-row items-end justify-between">
                {weeklyOrders.map(day => {
                  const maxOrders = Math.max(
                    ...weeklyOrders.map(item => item.count),
                    1,
                  );
                  const barHeight = day.count
                    ? Math.max((day.count / maxOrders) * 92, 10)
                    : 4;

                  return (
                    <View
                      key={day.label}
                      className="flex-1 items-center justify-end"
                      accessibilityLabel={`${day.label}: ${day.count} orders`}
                    >
                      <Text className="mb-2 text-[10px] font-bold text-gray-500">
                        {day.count || ''}
                      </Text>

                      <View
                        className={`w-6 rounded-full ${
                          day.isToday ? 'bg-black' : 'bg-gray-300'
                        }`}
                        style={{ height: barHeight }}
                      />

                      <Text
                        className={`mt-2 text-[10px] font-bold ${
                          day.isToday ? 'text-black' : 'text-gray-400'
                        }`}
                      >
                        {day.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="mt-4 rounded-3xl border border-gray-200 bg-white p-5">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-base font-extrabold text-black">
                    Order fulfilment
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    Breakdown by current status
                  </Text>
                </View>

                <Ionicons
                  name="pie-chart-outline"
                  size={22}
                  color="black"
                />
              </View>

              <View className="mt-5">
                {orderStatusBreakdown.map(item => (
                  <View key={item.label} className="mb-4 last:mb-0">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-gray-600">
                        {item.label}
                      </Text>

                      <Text className="text-sm font-extrabold text-black">
                        {item.value}
                      </Text>
                    </View>

                    <View className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <View
                        className="h-full rounded-full bg-black"
                        style={{
                          width: `${(item.value / maxStatusCount) * 100}%`,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
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
                      'Orders',
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
                      'Returns',
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


            <View className="mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                    <Ionicons name="warning-outline" size={21} color="#B45309" />
                  </View>
                  <View className="ml-3">
                    <Text className="font-extrabold text-black">Low-stock alerts</Text>
                    <Text className="mt-1 text-xs text-gray-600">Inventory at or below 5 units</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Products')} accessibilityRole="button" className="rounded-full bg-white px-3 py-2">
                  <Text className="text-xs font-bold text-black">Inventory</Text>
                </TouchableOpacity>
              </View>
              {lowStockAlerts.length ? lowStockAlerts.map(alert => (
                <View key={alert.id} className="mt-4 border-t border-amber-200 pt-3">
                  <Text className="text-sm font-bold text-black">{alert.title}</Text>
                  <Text className="mt-1 text-sm leading-5 text-gray-700">{alert.message}</Text>
                </View>
              )) : (
                <Text className="mt-4 border-t border-amber-200 pt-3 text-sm text-gray-600">No recent low-stock alerts.</Text>
              )}
            </View>

            <View className="mb-4 mt-8 flex-row items-end justify-between">
              <View>
                <Text className="text-2xl font-extrabold text-black">
                  Recent orders
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Latest customer activity.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('Orders')}
                accessibilityRole="button"
                accessibilityLabel="View all orders"
                className="rounded-full bg-gray-100 px-4 py-2"
              >
                <Text className="text-xs font-extrabold text-black">
                  View all
                </Text>
              </TouchableOpacity>
            </View>

            <View className="overflow-hidden rounded-3xl border border-gray-200 bg-white px-4">
              {recentOrders.length ? (
                recentOrders.map((order, index) => (
                  <TouchableOpacity
                    key={order.id || order.order_number}
                    onPress={() =>
                      navigation.navigate('AdminOrderDetails', {
                        orderId: order.id,
                      })
                    }
                    activeOpacity={0.8}
                    className={`flex-row items-center py-4 ${
                      index < recentOrders.length - 1
                        ? 'border-b border-gray-100'
                        : ''
                    }`}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                      <Ionicons
                        name="bag-handle-outline"
                        size={20}
                        color="black"
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-sm font-extrabold text-black"
                      >
                        #{order.order_number || order.id}
                      </Text>

                      <Text
                        numberOfLines={1}
                        className="mt-1 text-xs text-gray-500"
                      >
                        {order.delivery_full_name || 'Customer'} · {order.status || 'New'}
                      </Text>
                    </View>

                    <Text className="ml-2 text-sm font-extrabold text-black">
                      Rs {Number(order.total_amount || 0).toFixed(0)}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View className="items-center py-8">
                  <Text className="text-sm font-semibold text-gray-500">
                    No orders to show yet.
                  </Text>
                </View>
              )}
            </View>
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
