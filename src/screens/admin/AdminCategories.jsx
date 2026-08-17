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
  'inactive',
];


const AdminCategories = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    categories,
    setCategories,
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


  const fetchCategories =
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
              'get_admin_categories_secure',
            );


          if (error) {
            throw error;
          }


          const list =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data?.categories,
                )
              ? data.categories
              : [];


          setCategories(list);

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Admin Categories Load Error:',
              error.message,
            );
          }

          setErrorMessage(
            'Unable to load categories.',
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
        fetchCategories();
      },
      [fetchCategories],
    ),
  );


  const filteredCategories =
    useMemo(
      () => {
        const query =
          search.trim()
            .toLowerCase();


        return categories.filter(
          category => {
            const active =
              category.is_active !==
                false;


            if (
              selectedFilter ===
                'active' &&
              !active
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


            if (!query) {
              return true;
            }


            const haystack = [
              category.name,
              category.slug,
              category.sort_order,
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
        categories,
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


  const renderCategory = ({
    item,
  }) => {
    const active =
      item.is_active !==
      false;

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate(
            'AdminCategoryDetails',
            {
              categoryId:
                item.id,
            },
          )
        }
        activeOpacity={0.85}
        className="mb-4 overflow-hidden rounded-3xl bg-gray-100 p-4"
      >
        <View className="flex-row items-center">
          <View className="h-24 w-24 overflow-hidden rounded-2xl bg-white">
            {item.image_url ? (
              <Image
                source={{
                  uri:
                    item.image_url,
                }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons
                  name="image-outline"
                  size={29}
                  color="#9CA3AF"
                />
              </View>
            )}
          </View>

          <View className="ml-4 flex-1">
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text
                  numberOfLines={2}
                  className="text-lg font-extrabold text-black"
                >
                  {item.name ||
                    'Category'}
                </Text>

                <Text
                  numberOfLines={1}
                  className="mt-1 text-sm text-gray-500"
                >
                  {item.slug ||
                    'No slug'}
                </Text>
              </View>

              <View
                className={`rounded-full px-3 py-1.5 ${
                  active
                    ? 'bg-black'
                    : 'bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-extrabold ${
                    active
                      ? 'text-white'
                      : 'text-black'
                  }`}
                >
                  {active
                    ? 'Active'
                    : 'Inactive'}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <View className="rounded-xl bg-white px-3 py-2">
                <Text className="text-xs font-semibold text-gray-500">
                  Sort Order
                </Text>

                <Text className="mt-1 font-extrabold text-black">
                  {Number(
                    item.sort_order ||
                      0,
                  )}
                </Text>
              </View>

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
          Loading categories...
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
              Categories
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Manage collections and visibility.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="grid-outline"
              size={21}
              color="white"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate(
              'AdminCategoryDetails',
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
              Add Category
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Create a new category and upload its image.
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
              Total Categories
            </Text>

            <Text className="mt-2 text-3xl font-extrabold text-white">
              {categories.length}
            </Text>
          </View>

          <View className="flex-1 rounded-3xl bg-gray-100 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Showing
            </Text>

            <Text className="mt-2 text-3xl font-extrabold text-black">
              {filteredCategories.length}
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
            placeholder="Search category or slug..."
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
            Unable to load categories
          </Text>

          <Text className="mt-2 text-center leading-6 text-gray-500">
            {errorMessage}
          </Text>

          <TouchableOpacity
            onPress={() =>
              fetchCategories()
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
          data={filteredCategories}
          keyExtractor={
            item =>
              String(item.id)
          }
          renderItem={renderCategory}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);

                fetchCategories({
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
                  name="grid-outline"
                  size={36}
                  color="black"
                />
              </View>

              <Text className="mt-5 text-xl font-extrabold text-black">
                No categories found
              </Text>

              <Text className="mt-2 text-center leading-6 text-gray-500">
                No categories match your current search or filter.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};


export default AdminCategories;
