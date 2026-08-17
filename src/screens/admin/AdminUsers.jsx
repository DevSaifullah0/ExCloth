import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  RefreshControl,
  Image,
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
  'banned',
  'verified',
];


const AdminUsers = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    users,
    setUsers,
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


  const fetchUsers =
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
              'get_admin_users_secure',
            );


          if (error) {
            throw error;
          }


          const list =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data?.users,
                )
              ? data.users
              : [];


          setUsers(list);

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Admin Users Load Error:',
              error.message,
            );
          }

          setErrorMessage(
            'Unable to load users.',
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
        fetchUsers();
      },
      [fetchUsers],
    ),
  );


  const filteredUsers =
    useMemo(
      () => {
        const query =
          search.trim()
            .toLowerCase();

        const now =
          Date.now();


        return users.filter(
          user => {
            const bannedUntil =
              user.banned_until
                ? new Date(
                    user.banned_until,
                  ).getTime()
                : null;

            const banned =
              Boolean(
                bannedUntil &&
                Number.isFinite(
                  bannedUntil,
                ) &&
                bannedUntil > now,
              );

            const verified =
              Boolean(
                user.email_confirmed_at,
              );


            if (
              selectedFilter ===
                'active' &&
              banned
            ) {
              return false;
            }


            if (
              selectedFilter ===
                'banned' &&
              !banned
            ) {
              return false;
            }


            if (
              selectedFilter ===
                'verified' &&
              !verified
            ) {
              return false;
            }


            if (!query) {
              return true;
            }


            const haystack = [
              user.first_name,
              user.last_name,
              user.full_name,
              user.email,
              user.phone,
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
        users,
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


  const getDisplayName =
    user => {
      const firstName =
        String(
          user.first_name ||
            '',
        ).trim();

      const lastName =
        String(
          user.last_name ||
            '',
        ).trim();

      const fullName =
        `${firstName} ${lastName}`
          .trim();

      return (
        user.full_name ||
        fullName ||
        'ExCloth Customer'
      );
    };


  const renderUser = ({
    item,
  }) => {
    const bannedUntil =
      item.banned_until
        ? new Date(
            item.banned_until,
          ).getTime()
        : null;

    const banned =
      Boolean(
        bannedUntil &&
        Number.isFinite(
          bannedUntil,
        ) &&
        bannedUntil >
          Date.now(),
      );

    const verified =
      Boolean(
        item.email_confirmed_at,
      );

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate(
            'AdminUserDetails',
            {
              userId:
                item.id,
            },
          )
        }
        activeOpacity={0.85}
        className="mb-4 rounded-3xl bg-gray-100 p-4"
      >
        <View className="flex-row items-center">
          <View className="h-20 w-20 overflow-hidden rounded-2xl bg-white">
            {item.avatar_url ? (
              <Image
                source={{
                  uri:
                    item.avatar_url,
                }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons
                  name="person-outline"
                  size={29}
                  color="#9CA3AF"
                />
              </View>
            )}
          </View>

          <View className="ml-4 flex-1">
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <View className="flex-row flex-wrap items-center">
                  <Text
                    numberOfLines={1}
                    className="mr-2 flex-shrink text-lg font-extrabold text-black"
                  >
                    {getDisplayName(
                      item,
                    )}
                  </Text>

                  {item.is_admin ? (
                    <View className="rounded-full bg-black px-2.5 py-1">
                      <Text className="text-[10px] font-extrabold text-white">
                        ADMIN
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  numberOfLines={1}
                  className="mt-1 text-sm text-gray-500"
                >
                  {item.email ||
                    'No email'}
                </Text>
              </View>

              <View
                className={`rounded-full px-3 py-1.5 ${
                  banned
                    ? 'bg-white'
                    : 'bg-black'
                }`}
              >
                <Text
                  className={`text-xs font-extrabold ${
                    banned
                      ? 'text-black'
                      : 'text-white'
                  }`}
                >
                  {banned
                    ? 'Banned'
                    : 'Active'}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap">
              <View className="mr-2 rounded-full bg-white px-3 py-1.5">
                <Text className="text-xs font-bold text-gray-600">
                  {verified
                    ? 'Verified'
                    : 'Unverified'}
                </Text>
              </View>

              {item.phone ? (
                <View className="rounded-full bg-white px-3 py-1.5">
                  <Text className="text-xs font-bold text-gray-600">
                    {item.phone}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View className="mt-4 flex-row">
          <View className="mr-3 flex-1 rounded-2xl bg-white p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Orders
            </Text>

            <Text className="mt-2 text-lg font-extrabold text-black">
              {Number(
                item.order_count ||
                  item.total_orders ||
                  0,
              )}
            </Text>
          </View>

          <View className="flex-1 rounded-2xl bg-white p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Spent
            </Text>

            <Text className="mt-2 font-extrabold text-black">
              {formatMoney(
                item.total_spent ||
                  0,
              )}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between border-t border-gray-200 pt-4">
          <Text className="text-sm font-semibold text-gray-500">
            Customer account
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
          Loading users...
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
              Users
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Manage customers and account status.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="people-outline"
              size={22}
              color="white"
            />
          </View>
        </View>

        <View className="mt-6 flex-row">
          <View className="mr-3 flex-1 rounded-3xl bg-black p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Users
            </Text>

            <Text className="mt-2 text-3xl font-extrabold text-white">
              {users.length}
            </Text>
          </View>

          <View className="flex-1 rounded-3xl bg-gray-100 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Showing
            </Text>

            <Text className="mt-2 text-3xl font-extrabold text-black">
              {filteredUsers.length}
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
            placeholder="Search name, email or phone..."
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
            Unable to load users
          </Text>

          <Text className="mt-2 text-center leading-6 text-gray-500">
            {errorMessage}
          </Text>

          <TouchableOpacity
            onPress={() =>
              fetchUsers()
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
          data={filteredUsers}
          keyExtractor={
            item =>
              String(item.id)
          }
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);

                fetchUsers({
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
                  name="people-outline"
                  size={36}
                  color="black"
                />
              </View>

              <Text className="mt-5 text-xl font-extrabold text-black">
                No users found
              </Text>

              <Text className="mt-2 text-center leading-6 text-gray-500">
                No users match your current search or filter.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};


export default AdminUsers;
