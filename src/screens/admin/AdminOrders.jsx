import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
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

import { supabase } from '../../lib/supabase';


const FILTERS = [
  'all',
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
];


const AdminOrders = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] =
    useState('all');
  const [errorMessage, setErrorMessage] =
    useState('');


  const formatStatus = value => {
    if (!value) return '';

    return String(value)
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        letter => letter.toUpperCase(),
      );
  };


  const formatDate = value => {
    if (!value) return '';

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return '';
    }

    return date.toLocaleString();
  };


  const fetchOrders = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setErrorMessage('');


        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();


        if (userError) {
          throw userError;
        }


        if (!user) {
          throw new Error(
            'Admin session not found.',
          );
        }


        const {
          data,
          error,
        } = await supabase.rpc(
          'get_admin_orders_secure',
        );


        if (error) {
          throw error;
        }


        const list =
          Array.isArray(data)
            ? data
            : Array.isArray(data?.orders)
            ? data.orders
            : [];


        setOrders(list);

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Admin Orders Load Error:',
            error.message,
          );
        }

        setErrorMessage(
          'Unable to load orders.',
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );


  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );


  const filteredOrders = useMemo(
    () => {
      const query =
        search.trim().toLowerCase();


      return orders.filter(order => {
        const status =
          String(
            order.status || '',
          ).toLowerCase();


        const matchesFilter =
          selectedFilter === 'all' ||
          status === selectedFilter;


        if (!matchesFilter) {
          return false;
        }


        if (!query) {
          return true;
        }


        const haystack = [
          order.order_number,
          order.delivery_full_name,
          order.delivery_phone,
          order.delivery_city,
          order.payment_method,
          order.payment_status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();


        return haystack.includes(query);
      });
    },
    [
      orders,
      search,
      selectedFilter,
    ],
  );


  const renderOrder = ({
    item,
  }) => {
    const status =
      String(
        item.status || '',
      ).toLowerCase();

    const terminal =
      status === 'delivered' ||
      status === 'cancelled';

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate(
            'AdminOrderDetails',
            {
              orderId:
                item.id,
            },
          )
        }
        activeOpacity={0.85}
        className="mb-4 overflow-hidden rounded-3xl border border-gray-200 bg-white"
      >
        <View className="p-5">
          <View className="flex-row items-start justify-between">
            <View className="mr-4 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Order
              </Text>

              <Text className="mt-1 text-xl font-extrabold text-black">
                #{item.order_number}
              </Text>
            </View>

            <View
              className={`rounded-full px-3 py-2 ${
                terminal
                  ? 'bg-gray-100'
                  : 'bg-black'
              }`}
            >
              <Text
                className={`text-xs font-extrabold ${
                  terminal
                    ? 'text-black'
                    : 'text-white'
                }`}
              >
                {
                  formatStatus(
                    item.status,
                  )
                }
              </Text>
            </View>
          </View>


          <View className="mt-5 flex-row items-center rounded-2xl bg-gray-100 p-4">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="person-outline"
                size={20}
                color="black"
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="font-extrabold text-black">
                {item.delivery_full_name ||
                  'Customer'}
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                {item.delivery_phone ||
                  'No phone'}
              </Text>

              {item.delivery_city ? (
                <Text className="mt-1 text-xs font-semibold text-gray-400">
                  {
                    item.delivery_city
                  }
                </Text>
              ) : null}
            </View>
          </View>


          <View className="mt-5 flex-row">
            <View className="mr-3 flex-1 rounded-2xl bg-gray-100 p-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Total
              </Text>

              <Text className="mt-2 text-lg font-extrabold text-black">
                Rs{' '}
                {Number(
                  item.total_amount ||
                    0,
                ).toFixed(2)}
              </Text>
            </View>

            <View className="flex-1 rounded-2xl bg-gray-100 p-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Payment
              </Text>

              <Text className="mt-2 font-extrabold text-black">
                {
                  formatStatus(
                    item.payment_status,
                  )
                }
              </Text>
            </View>
          </View>


          <View className="mt-5 flex-row items-center justify-between border-t border-gray-200 pt-4">
            <View className="flex-row items-center">
              <Ionicons
                name="time-outline"
                size={16}
                color="#6B7280"
              />

              <Text className="ml-2 text-xs font-semibold text-gray-500">
                {
                  formatDate(
                    item.created_at,
                  )
                }
              </Text>
            </View>

            <View className="flex-row items-center rounded-xl bg-gray-100 px-3 py-2">
              <Text className="mr-2 text-sm font-extrabold text-black">
                Manage
              </Text>

              <Ionicons
                name="chevron-forward-outline"
                size={18}
                color="black"
              />
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
          Loading orders...
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
      {/* HEADER AREA */}
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
              Orders
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Manage orders and delivery statuses.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="bag-handle-outline"
              size={22}
              color="white"
            />
          </View>
        </View>


        {/* SUMMARY */}
        <View className="mt-6 flex-row">
          <View className="mr-3 flex-1 rounded-3xl bg-black p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Orders
            </Text>

            <Text className="mt-2 text-3xl font-extrabold text-white">
              {orders.length}
            </Text>
          </View>

          <View className="flex-1 rounded-3xl bg-gray-100 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Showing
            </Text>

            <Text className="mt-2 text-3xl font-extrabold text-black">
              {
                filteredOrders.length
              }
            </Text>
          </View>
        </View>


        {/* SEARCH */}
        <View className="mt-5 h-14 flex-row items-center rounded-2xl bg-gray-100 px-4">
          <Ionicons
            name="search-outline"
            size={20}
            color="#6B7280"
          />

          <TextInput
            value={
              search
            }
            onChangeText={
              setSearch
            }
            placeholder="Search order, customer or city..."
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            className="ml-3 flex-1 text-black"
          />

          {search ? (
            <TouchableOpacity
              onPress={() =>
                setSearch('')
              }
              activeOpacity={0.8}
              className="h-9 w-9 items-center justify-center rounded-xl bg-white"
            >
              <Ionicons
                name="close-outline"
                size={19}
                color="black"
              />
            </TouchableOpacity>
          ) : null}
        </View>


        {/* FILTERS */}
        <FlatList
          horizontal
          data={
            FILTERS
          }
          keyExtractor={
            item => item
          }
          showsHorizontalScrollIndicator={
            false
          }
          className="mt-4"
          contentContainerStyle={{
            paddingRight: 20,
          }}
          renderItem={({
            item,
          }) => {
            const active =
              selectedFilter ===
              item;

            return (
              <TouchableOpacity
                onPress={() =>
                  setSelectedFilter(
                    item,
                  )
                }
                activeOpacity={0.85}
                className={`mr-2 rounded-full px-4 py-2.5 ${
                  active
                    ? 'bg-black'
                    : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-sm font-extrabold ${
                    active
                      ? 'text-white'
                      : 'text-black'
                  }`}
                >
                  {
                    formatStatus(
                      item,
                    )
                  }
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>


      {errorMessage ? (
        <View className="mx-5 mt-6 items-center rounded-3xl bg-gray-100 p-7">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
            <Ionicons
              name="alert-circle-outline"
              size={30}
              color="black"
            />
          </View>

          <Text className="mt-4 text-xl font-extrabold text-black">
            Unable to load orders
          </Text>

          <Text className="mt-2 text-center leading-6 text-gray-500">
            {errorMessage}
          </Text>

          <TouchableOpacity
            onPress={() =>
              fetchOrders()
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
        <FlatList
          data={
            filteredOrders
          }
          keyExtractor={
            item =>
              String(
                item.id,
              )
          }
          renderItem={
            renderOrder
          }
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

                fetchOrders({
                  silent: true,
                });
              }}
              tintColor="black"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom:
              Math.max(
                insets.bottom,
                24,
              ) + 30,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <Ionicons
                  name="bag-handle-outline"
                  size={36}
                  color="black"
                />
              </View>

              <Text className="mt-5 text-xl font-extrabold text-black">
                No orders found
              </Text>

              <Text className="mt-2 text-center leading-6 text-gray-500">
                No orders match your current search or filter.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};


export default AdminOrders;
