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

const CategoryProducts = ({
  navigation,
  route,
}) => {
  const passedCategory =
    route.params?.category;

  const categoryId =
    passedCategory?.id ||
    route.params?.categoryId;

  const categoryName =
    passedCategory?.name ||
    route.params?.categoryName ||
    'Products';

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [imageErrors, setImageErrors] =
    useState({});

  const fetchCategoryProducts =
    useCallback(async () => {
      try {
        setErrorMessage('');

        if (!categoryId) {
          setProducts([]);
          setErrorMessage(
            'Category information is missing.',
          );

          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            description,
            price,
            old_price,
            image_url,
            stock_quantity,
            is_popular,
            is_new,
            is_featured,

            product_categories!inner (
              category_id
            )
          `)
          .eq('is_active', true)
          .eq(
            'product_categories.category_id',
            categoryId,
          )
          .order('created_at', {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        setProducts(data || []);
      } catch (error) {
        console.log(
          'Category Products Error:',
          error,
        );

        setProducts([]);

        setErrorMessage(
          'Unable to load category products.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [categoryId]);

  useEffect(() => {
    fetchCategoryProducts();
  }, [fetchCategoryProducts]);

  const handleRefresh = () => {
    setRefreshing(true);
    setImageErrors({});
    fetchCategoryProducts();
  };

  const handleProductPress =
    product => {
      navigation.navigate(
        'ProductDetails',
        {
          product,
        },
      );
    };

  const getSalePercentage =
    product => {
      const oldPrice =
        Number(
          product.old_price || 0,
        );

      const currentPrice =
        Number(
          product.price || 0,
        );

      if (
        oldPrice <= 0 ||
        currentPrice <= 0 ||
        oldPrice <= currentPrice
      ) {
        return 0;
      }

      return Math.round(
        ((oldPrice - currentPrice) /
          oldPrice) *
          100,
      );
    };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-5"
        showsVerticalScrollIndicator={
          false
        }
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
        <View className="mt-4 flex-row items-center">
          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.75}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
          >
            <Ionicons
              name="arrow-back-outline"
              size={22}
              color="black"
            />
          </TouchableOpacity>

          <View className="ml-4 flex-1">
            <Text
              numberOfLines={1}
              className="text-3xl font-extrabold text-black"
            >
              {categoryName}
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Explore products in this collection.
            </Text>
          </View>
        </View>

        {/* CATEGORY SUMMARY */}
        {!loading &&
        !errorMessage &&
        products.length > 0 ? (
          <View className="mt-6 flex-row items-center justify-between rounded-3xl bg-black px-5 py-5">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-semibold uppercase tracking-widest text-gray-300">
                {categoryName}
              </Text>

              <Text className="mt-1 text-xl font-extrabold text-white">
                Find Your Next Style
              </Text>

              <Text className="mt-1 text-sm text-gray-300">
                {products.length}{' '}
                {products.length === 1
                  ? 'product'
                  : 'products'}{' '}
                available
              </Text>
            </View>

            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
              <Ionicons
                name="shirt-outline"
                size={27}
                color="black"
              />
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
              Loading products...
            </Text>
          </View>
        ) : null}

        {/* ERROR */}
        {!loading &&
        errorMessage ? (
          <View className="mt-8 items-center rounded-3xl border border-gray-200 bg-gray-50 p-7">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color="black"
              />
            </View>

            <Text className="mt-4 text-lg font-extrabold text-black">
              Couldn&apos;t load products
            </Text>

            <Text className="mt-2 text-center leading-5 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={
                fetchCategoryProducts
              }
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
        products.length === 0 ? (
          <View className="mt-10 items-center rounded-3xl bg-gray-100 p-10">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="shirt-outline"
                size={30}
                color="#9CA3AF"
              />
            </View>

            <Text className="mt-4 text-lg font-extrabold text-black">
              No products found
            </Text>

            <Text className="mt-2 text-center text-gray-500">
              No products are currently available in{' '}
              {categoryName}.
            </Text>
          </View>
        ) : null}

        {/* PRODUCT GRID */}
        {!loading &&
        !errorMessage &&
        products.length > 0 ? (
          <View className="mt-5 flex-row flex-wrap justify-between">
            {products.map(
              product => {
                const salePercentage =
                  getSalePercentage(
                    product,
                  );

                const hasImage =
                  Boolean(
                    product.image_url,
                  ) &&
                  !imageErrors[
                    product.id
                  ];

                return (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() =>
                      handleProductPress(
                        product,
                      )
                    }
                    activeOpacity={0.88}
                    className="mb-5 w-[48%] overflow-hidden rounded-3xl border border-gray-200 bg-white"
                  >
                    {/* IMAGE */}
                    <View className="relative h-52 w-full overflow-hidden bg-gray-100">
                      {hasImage ? (
                        <Image
                          source={{
                            uri:
                              product.image_url,
                          }}
                          className="h-full w-full"
                          resizeMode="contain"
                          onError={() =>
                            setImageErrors(
                              current => ({
                                ...current,
                                [product.id]:
                                  true,
                              }),
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

                      {/* SALE BADGE */}
                      {salePercentage >
                      0 ? (
                        <View className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5">
                          <Text className="text-xs font-extrabold text-white">
                            {salePercentage}% OFF
                          </Text>
                        </View>
                      ) : product.is_new ? (
                        <View className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5">
                          <Text className="text-xs font-extrabold text-white">
                            NEW
                          </Text>
                        </View>
                      ) : product.is_featured ? (
                        <View className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5">
                          <Text className="text-xs font-extrabold text-white">
                            FEATURED
                          </Text>
                        </View>
                      ) : null}

                      {/* VIEW BUTTON */}
                      <View className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-white">
                        <Ionicons
                          name="arrow-forward-outline"
                          size={20}
                          color="black"
                        />
                      </View>
                    </View>

                    {/* PRODUCT INFO */}
                    <View className="p-4">
                      <Text
                        numberOfLines={2}
                        className="min-h-10 text-base font-extrabold text-black"
                      >
                        {product.name}
                      </Text>

                      <View className="mt-3 flex-row flex-wrap items-center">
                        <Text className="text-base font-extrabold text-black">
                          Rs {product.price}
                        </Text>

                        {product.old_price &&
                        Number(
                          product.old_price,
                        ) >
                          Number(
                            product.price,
                          ) ? (
                          <Text className="ml-2 text-xs font-semibold text-gray-400 line-through">
                            Rs{' '}
                            {
                              product.old_price
                            }
                          </Text>
                        ) : null}
                      </View>

                      <View className="mt-3 flex-row items-center justify-between">
                        <View
                          className={`rounded-full px-3 py-1.5 ${
                            product.stock_quantity >
                            0
                              ? 'bg-gray-100'
                              : 'bg-black'
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-bold ${
                              product.stock_quantity >
                              0
                                ? 'text-gray-600'
                                : 'text-white'
                            }`}
                          >
                            {product.stock_quantity >
                            0
                              ? 'In Stock'
                              : 'Out of Stock'}
                          </Text>
                        </View>

                        <Ionicons
                          name="bag-handle-outline"
                          size={18}
                          color="#6B7280"
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

export default CategoryProducts;
