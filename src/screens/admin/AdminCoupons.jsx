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
  'active',
  'inactive',
  'expired',
];


const AdminCoupons = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    coupons,
    setCoupons,
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
    search,
    setSearch,
  ] = useState('');

  const [
    selectedFilter,
    setSelectedFilter,
  ] = useState('all');

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


  const fetchCoupons =
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


          const {
            data,
            error,
          } =
            await supabase.rpc(
              'get_admin_coupons_secure',
            );


          if (error) {
            throw error;
          }


          const list =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data?.coupons,
                )
              ? data.coupons
              : [];


          setCoupons(list);

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Admin Coupons Load Error:',
              error.message,
            );
          }

          setErrorMessage(
            'Unable to load coupons.',
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
        fetchCoupons();
      },
      [fetchCoupons],
    ),
  );


  const filteredCoupons =
    useMemo(
      () => {
        const query =
          search.trim()
            .toLowerCase();

        const now =
          Date.now();


        return coupons.filter(
          coupon => {
            const active =
              coupon.is_active !==
              false;

            const expiresAt =
              coupon.expires_at
                ? new Date(
                    coupon.expires_at,
                  ).getTime()
                : null;

            const expired =
              Boolean(
                expiresAt &&
                Number.isFinite(
                  expiresAt,
                ) &&
                now >= expiresAt,
              );


            if (
              selectedFilter ===
                'active' &&
              (!active ||
                expired)
            ) {
              return false;
            }


            if (
              selectedFilter ===
                'inactive' &&
              active
            ) {
              return false;
            }


            if (
              selectedFilter ===
                'expired' &&
              !expired
            ) {
              return false;
            }


            if (!query) {
              return true;
            }


            const haystack = [
              coupon.code,
              coupon.discount_type,
              coupon.discount_value,
            ]
              .filter(
                value =>
                  value !==
                    null &&
                  value !==
                    undefined,
              )
              .join(' ')
              .toLowerCase();


            return haystack.includes(
              query,
            );
          },
        );
      },
      [
        coupons,
        search,
        selectedFilter,
      ],
    );


  const formatFilter =
    value =>
      String(value)
        .replace(/_/g, ' ')
        .replace(
          /\b\w/g,
          letter =>
            letter.toUpperCase(),
        );


  const formatMoney =
    value => {
      const amount =
        Number(value || 0);

      return `Rs ${amount.toLocaleString()}`;
    };


  const formatDate =
    value => {
      if (!value) {
        return 'No expiry';
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return 'No expiry';
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


  const getDiscountLabel =
    coupon => {
      const type =
        String(
          coupon.discount_type ||
            '',
        ).toLowerCase();

      const value =
        Number(
          coupon.discount_value ||
            0,
        );


      if (
        type ===
          'percentage' ||
        type ===
          'percent'
      ) {
        return `${value}% OFF`;
      }

      return `${formatMoney(
        value,
      )} OFF`;
    };


  const renderCoupon = ({
    item,
  }) => {
    const active =
      item.is_active !==
      false;

    const expiresAt =
      item.expires_at
        ? new Date(
            item.expires_at,
          ).getTime()
        : null;

    const expired =
      Boolean(
        expiresAt &&
        Number.isFinite(
          expiresAt,
        ) &&
        Date.now() >=
          expiresAt,
      );

    const usageCount =
      Number(
        item.usage_count ??
          item.redemption_count ??
          0,
      );

    const usageLimit =
      item.usage_limit ===
        null ||
      item.usage_limit ===
        undefined
        ? null
        : Number(
            item.usage_limit,
          );

    const statusLabel =
      expired
        ? 'Expired'
        : active
        ? 'Active'
        : 'Inactive';

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate(
            'AdminCouponDetails',
            {
              couponId:
                item.id,
            },
          )
        }
        activeOpacity={0.85}
        className="mb-4 overflow-hidden rounded-3xl bg-gray-100 p-5"
      >
        <View className="flex-row items-start">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
            <Ionicons
              name="pricetag-outline"
              size={23}
              color="black"
            />
          </View>

          <View className="ml-4 flex-1">
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-xl font-extrabold text-black"
                >
                  {item.code ||
                    'Coupon'}
                </Text>

                <Text className="mt-1 font-extrabold text-black">
                  {getDiscountLabel(
                    item,
                  )}
                </Text>
              </View>

              <View
                className={`rounded-full px-3 py-1.5 ${
                  statusLabel ===
                  'Active'
                    ? 'bg-black'
                    : 'bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-extrabold ${
                    statusLabel ===
                    'Active'
                      ? 'text-white'
                      : 'text-black'
                  }`}
                >
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-5 flex-row">
          <View className="mr-3 flex-1 rounded-2xl bg-white p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Uses
            </Text>

            <Text className="mt-2 text-lg font-extrabold text-black">
              {usageCount}
              {usageLimit !==
              null
                ? ` / ${usageLimit}`
                : ''}
            </Text>
          </View>

          <View className="flex-1 rounded-2xl bg-white p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Expires
            </Text>

            <Text className="mt-2 text-sm font-extrabold text-black">
              {formatDate(
                item.expires_at,
              )}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between border-t border-gray-200 pt-4">
          <Text className="text-sm font-semibold text-gray-500">
            Discount management
          </Text>

          <View className="flex-row items-center rounded-xl bg-white px-3 py-2">
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
          Loading coupons...
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
              Coupons
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Manage discounts, limits and expiry.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="pricetags-outline"
              size={21}
              color="white"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate(
              'AdminCouponDetails',
            )
          }
          activeOpacity={0.85}
          className="mt-6 flex-row items-center rounded-3xl bg-gray-100 p-5"
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
            <Ionicons
              name="add-outline"
              size={25}
              color="black"
            />
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-lg font-extrabold text-black">
              Add Coupon
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Create a new discount code.
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

        <View className="mt-5 flex-row">
          <View className="mr-3 flex-1 rounded-3xl bg-black p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Coupons
            </Text>

            <Text className="mt-2 text-3xl font-extrabold text-white">
              {coupons.length}
            </Text>
          </View>

          <View className="flex-1 rounded-3xl bg-gray-100 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Showing
            </Text>

            <Text className="mt-2 text-3xl font-extrabold text-black">
              {filteredCoupons.length}
            </Text>
          </View>
        </View>

        <View className="mt-5 h-14 flex-row items-center rounded-2xl bg-gray-100 px-4">
          <Ionicons
            name="search-outline"
            size={20}
            color="#6B7280"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search code or discount..."
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
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

        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{
            paddingRight: 20,
          }}
          renderItem={({ item }) => {
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
                  {formatFilter(
                    item,
                  )}
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
            Unable to load coupons
          </Text>

          <Text className="mt-2 text-center leading-6 text-gray-500">
            {errorMessage}
          </Text>

          <TouchableOpacity
            onPress={() =>
              fetchCoupons()
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
          data={filteredCoupons}
          keyExtractor={
            item =>
              String(item.id)
          }
          renderItem={renderCoupon}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);

                fetchCoupons({
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
                  name="pricetags-outline"
                  size={36}
                  color="black"
                />
              </View>

              <Text className="mt-5 text-xl font-extrabold text-black">
                No coupons found
              </Text>

              <Text className="mt-2 text-center leading-6 text-gray-500">
                No coupons match your current search or filter.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};


export default AdminCoupons;
