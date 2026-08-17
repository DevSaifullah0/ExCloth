import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

const Categories = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState('');
  const [imageErrors, setImageErrors] =
    useState({});

  const fetchCategories =
    useCallback(async () => {
      try {
        setErrorMessage('');

        const { data, error } =
          await supabase
            .from('categories')
            .select(`
              id,
              name,
              slug,
              image_url,
              is_active,
              sort_order
            `)
            .eq('is_active', true)
            .order('sort_order', {
              ascending: true,
            });

        if (error) {
          throw error;
        }

        setCategories(data || []);
      } catch (error) {
        if (__DEV__) {
          console.error(
            'Categories Error:',
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
    }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleRefresh = () => {
    setRefreshing(true);
    setImageErrors({});
    fetchCategories();
  };

  const handleImageError = category => {
    setImageErrors(prev => ({
      ...prev,
      [category.id]: true,
    }));
  };

  const handleCategoryPress = category => {
    navigation.navigate(
      'CategoryProducts',
      {
        category,
        categoryId: category.id,
        categoryName: category.name,
        categorySlug: category.slug,
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 32,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* HEADER */}
        <View className="mt-5 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-3xl font-extrabold text-black">
              Categories
            </Text>

            <Text className="mt-2 text-gray-500">
              Find your style by collection.
            </Text>
          </View>

          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
            <Ionicons
              name="grid-outline"
              size={23}
              color="black"
            />
          </View>
        </View>

        {/* SMALL INFO STRIP */}
        {!loading &&
        !errorMessage &&
        categories.length > 0 ? (
          <View className="mt-6 flex-row items-center justify-between rounded-2xl bg-black px-5 py-4">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-widest text-gray-300">
                Shop by category
              </Text>

              <Text className="mt-1 text-lg font-extrabold text-white">
                Explore Collections
              </Text>
            </View>

            <View className="h-10 min-w-10 items-center justify-center rounded-full bg-white px-3">
              <Text className="font-extrabold text-black">
                {categories.length}
              </Text>
            </View>
          </View>
        ) : null}

        {/* LOADING */}
        {loading ? (
          <View className="items-center py-24">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <ActivityIndicator
                size="large"
                color="black"
              />
            </View>

            <Text className="mt-4 font-semibold text-gray-500">
              Loading categories...
            </Text>
          </View>
        ) : null}

        {/* ERROR */}
        {!loading && errorMessage ? (
          <View className="mt-8 items-center rounded-3xl border border-gray-200 bg-gray-50 p-7">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color="black"
              />
            </View>

            <Text className="mt-4 text-lg font-extrabold text-black">
              Couldn&apos;t load categories
            </Text>

            <Text className="mt-2 text-center leading-5 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={fetchCategories}
              activeOpacity={0.85}
              className="mt-5 rounded-xl bg-black px-6 py-3"
            >
              <Text className="font-bold text-white">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* EMPTY */}
        {!loading &&
        !errorMessage &&
        categories.length === 0 ? (
          <View className="mt-10 items-center rounded-3xl bg-gray-100 p-10">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="grid-outline"
                size={30}
                color="#9CA3AF"
              />
            </View>

            <Text className="mt-4 text-lg font-extrabold text-black">
              No categories yet
            </Text>

            <Text className="mt-2 text-center text-gray-500">
              Categories will appear here when available.
            </Text>
          </View>
        ) : null}

        {/* CATEGORY GRID */}
        {!loading &&
        !errorMessage &&
        categories.length > 0 ? (
          <View className="mt-5 flex-row flex-wrap justify-between">
            {categories.map(
              (category, index) => {
                const hasImage =
                  category.image_url &&
                  !imageErrors[
                    category.id
                  ];

                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() =>
                      handleCategoryPress(
                        category,
                      )
                    }
                    activeOpacity={0.88}
                    className="mb-5 w-[48%] overflow-hidden rounded-3xl border border-gray-200 bg-white"
                  >
                    {/* IMAGE */}
                    <View className="relative h-44 w-full overflow-hidden bg-gray-100">
                      {hasImage ? (
                        <Image
                          source={{
                            uri:
                              category.image_url,
                          }}
                          className="h-full w-full"
                          resizeMode="cover"
                          onError={() =>
                            handleImageError(
                              category,
                            )
                          }
                        />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
                            <Ionicons
                              name="shirt-outline"
                              size={32}
                              color="#9CA3AF"
                            />
                          </View>
                        </View>
                      )}

                      {/* NUMBER BADGE */}
                      <View className="absolute left-3 top-3 min-w-9 items-center justify-center rounded-full bg-black px-2 py-1.5">
                        <Text className="text-xs font-extrabold text-white">
                          {String(
                            index + 1,
                          ).padStart(
                            2,
                            '0',
                          )}
                        </Text>
                      </View>

                      {/* ARROW */}
                      <View className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-white">
                        <Ionicons
                          name="arrow-forward-outline"
                          size={20}
                          color="black"
                        />
                      </View>
                    </View>

                    {/* DETAILS */}
                    <View className="p-4">
                      <Text
                        numberOfLines={1}
                        className="text-base font-extrabold text-black"
                      >
                        {category.name}
                      </Text>

                      <View className="mt-2 flex-row items-center">
                        <Text className="text-xs font-semibold text-gray-500">
                          Explore products
                        </Text>

                        <Ionicons
                          name="chevron-forward-outline"
                          size={14}
                          color="#6B7280"
                          style={{
                            marginLeft: 3,
                          }}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              },
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Categories;
