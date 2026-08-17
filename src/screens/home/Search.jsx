import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';

import React, {
  useEffect,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

const Search = ({ navigation }) => {
  const [search, setSearch] = useState('');

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts();
    }, 400);

    return () => {
      clearTimeout(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const searchProducts = async () => {
    try {
      const searchText = search.trim();

      setErrorMessage('');

      if (!searchText) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const {
        data: nameResults,
        error: nameError,
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
          is_featured
        `)
        .eq('is_active', true)
        .ilike(
          'name',
          `%${searchText}%`,
        )
        .limit(20);

      if (nameError) {
        throw nameError;
      }

      const {
        data: descriptionResults,
        error: descriptionError,
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
          is_featured
        `)
        .eq('is_active', true)
        .ilike(
          'description',
          `%${searchText}%`,
        )
        .limit(20);

      if (descriptionError) {
        throw descriptionError;
      }

      const combinedProducts = [
        ...(nameResults || []),
        ...(descriptionResults || []),
      ];

      const uniqueProducts = Array.from(
        new Map(
          combinedProducts.map(product => [
            product.id,
            product,
          ]),
        ).values(),
      );

      setProducts(uniqueProducts);
    } catch (error) {
      if (__DEV__) {
        console.error(
          'Search Error:',
          error.message,
        );
      }

      setErrorMessage(
        'Unable to search products.',
      );
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearch('');
    setProducts([]);
    setErrorMessage('');
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
      <View className="flex-1 px-5">

        {/* HEADER */}
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
              Search
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Find your next ExCloth style.
            </Text>
          </View>
        </View>


        {/* SEARCH BOX */}
        <View className="mt-6 flex-row items-center rounded-2xl bg-gray-100 px-4 py-2">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
            <Ionicons
              name="search-outline"
              size={20}
              color="black"
            />
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className="ml-3 h-12 flex-1 text-base font-semibold text-black"
          />

          {search.length > 0 ? (
            <TouchableOpacity
              onPress={clearSearch}
              activeOpacity={0.8}
              className="h-9 w-9 items-center justify-center rounded-full bg-white"
            >
              <Ionicons
                name="close-outline"
                size={20}
                color="black"
              />
            </TouchableOpacity>
          ) : null}
        </View>


        {/* INITIAL STATE */}
        {!search.trim() ? (
          <View className="mt-16 items-center rounded-3xl bg-gray-100 px-6 py-10">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="search-outline"
                size={36}
                color="black"
              />
            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              Search ExCloth
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              Search by product name or description to quickly find what you need.
            </Text>
          </View>
        ) : null}


        {/* LOADING */}
        {loading ? (
          <View className="mt-16 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <ActivityIndicator
                size="large"
                color="black"
              />
            </View>

            <Text className="mt-4 font-semibold text-gray-500">
              Searching products...
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
              Search failed
            </Text>

            <Text className="mt-2 text-center text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={searchProducts}
              activeOpacity={0.85}
              className="mt-5 rounded-xl bg-black px-6 py-3"
            >
              <Text className="font-bold text-white">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}


        {/* NO RESULTS */}
        {!loading &&
        !errorMessage &&
        search.trim() &&
        products.length === 0 ? (
          <View className="mt-16 items-center rounded-3xl bg-gray-100 px-6 py-10">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="shirt-outline"
                size={36}
                color="#9CA3AF"
              />
            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              No products found
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              We couldn&apos;t find anything matching “{search.trim()}”.
            </Text>
          </View>
        ) : null}


        {/* RESULTS */}
        {!loading &&
        !errorMessage &&
        products.length > 0 ? (
          <ScrollView
            className="mt-6"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: 32,
            }}
          >
            <View className="mb-4 flex-row items-end justify-between">
              <View>
                <Text className="text-xl font-extrabold text-black">
                  Search Results
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  {products.length}{' '}
                  {products.length === 1
                    ? 'product'
                    : 'products'}{' '}
                  found
                </Text>
              </View>

              <View className="rounded-full bg-black px-3 py-2">
                <Text className="text-xs font-extrabold text-white">
                  {products.length}
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {products.map(
                product => {
                  const salePercentage =
                    getSalePercentage(
                      product,
                    );

                  return (
                    <TouchableOpacity
                      key={product.id}
                      onPress={() =>
                        navigation.navigate(
                          'ProductDetails',
                          {
                            product,
                          },
                        )
                      }
                      activeOpacity={0.88}
                      className="mb-5 w-[48%] overflow-hidden rounded-3xl border border-gray-200 bg-white"
                    >
                      <View className="relative h-52 w-full overflow-hidden bg-gray-100">
                        {product.image_url ? (
                          <Image
                            source={{
                              uri:
                                product.image_url,
                            }}
                            className="h-full w-full"
                            resizeMode="contain"
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

                        {salePercentage >
                        0 ? (
                          <View className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5">
                            <Text className="text-[11px] font-extrabold text-white">
                              {salePercentage}% OFF
                            </Text>
                          </View>
                        ) : product.is_new ? (
                          <View className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5">
                            <Text className="text-[11px] font-extrabold text-white">
                              NEW
                            </Text>
                          </View>
                        ) : product.is_featured ? (
                          <View className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5">
                            <Text className="text-[11px] font-extrabold text-white">
                              FEATURED
                            </Text>
                          </View>
                        ) : null}

                        <View className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-white">
                          <Ionicons
                            name="arrow-forward-outline"
                            size={19}
                            color="black"
                          />
                        </View>
                      </View>

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
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default Search;
