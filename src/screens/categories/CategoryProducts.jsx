import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';


const PAGE_SIZE = 20;

const styles = StyleSheet.create({
  columnWrapper: {
    justifyContent: 'space-between',
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});


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
  const [loadingMore, setLoadingMore] =
    useState(false);
  const [hasMore, setHasMore] =
    useState(true);
  const [totalCount, setTotalCount] =
    useState(null);
  const [errorMessage, setErrorMessage] =
    useState('');
  const [loadMoreError, setLoadMoreError] =
    useState('');
  const [imageErrors, setImageErrors] =
    useState({});

  const requestIdRef = useRef(0);


  const fetchCategoryProducts =
    useCallback(
      async ({
        offset = 0,
        mode = 'initial',
      } = {}) => {
        const requestId =
          requestIdRef.current + 1;
        requestIdRef.current =
          requestId;

        if (mode === 'initial') {
          setLoading(true);
        } else if (mode === 'refresh') {
          setRefreshing(true);
        } else {
          setLoadingMore(true);
        }

        if (mode !== 'more') {
          setErrorMessage('');
        }
        setLoadMoreError('');

        try {
          if (!categoryId) {
            throw new Error(
              'Category information is missing.',
            );
          }

          const {
            data,
            error,
            count,
          } = await supabase
            .from('products')
            .select(
              `
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
              `,
              {
                count: 'exact',
              },
            )
            .eq('is_active', true)
            .eq(
              'product_categories.category_id',
              categoryId,
            )
            .order('created_at', {
              ascending: false,
            })
            .order('id', {
              ascending: false,
            })
            .range(
              offset,
              offset + PAGE_SIZE - 1,
            );

          if (error) {
            throw error;
          }

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          const nextProducts =
            Array.isArray(data)
              ? data
              : [];

          if (mode === 'more') {
            setProducts(current => {
              const seen = new Set(
                current.map(
                  product => product.id,
                ),
              );

              return [
                ...current,
                ...nextProducts.filter(
                  product =>
                    !seen.has(product.id),
                ),
              ];
            });
          } else {
            setProducts(nextProducts);
          }

          setTotalCount(
            Number.isFinite(count)
              ? count
              : null,
          );
          setHasMore(
            nextProducts.length ===
              PAGE_SIZE &&
              (!Number.isFinite(count) ||
                offset +
                  nextProducts.length <
                  count),
          );

        } catch (error) {
          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          if (__DEV__) {
            console.error(
              'Category Products Error:',
              error,
            );
          }

          if (mode === 'more') {
            setLoadMoreError(
              'Unable to load more products.',
            );
          } else {
            setProducts([]);
            setHasMore(false);
            setTotalCount(null);
            setErrorMessage(
              error?.message ===
                'Category information is missing.'
                ? error.message
                : 'Unable to load category products.',
            );
          }

        } finally {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
          }
        }
      },
      [categoryId],
    );


  useEffect(() => {
    setProducts([]);
    setImageErrors({});
    setHasMore(true);
    fetchCategoryProducts();

    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchCategoryProducts]);


  const handleRefresh =
    useCallback(() => {
      setImageErrors({});
      fetchCategoryProducts({
        offset: 0,
        mode: 'refresh',
      });
    }, [fetchCategoryProducts]);


  const handleLoadMore =
    useCallback(() => {
      if (
        loading ||
        refreshing ||
        loadingMore ||
        !hasMore ||
        errorMessage
      ) {
        return;
      }

      fetchCategoryProducts({
        offset: products.length,
        mode: 'more',
      });
    }, [
      errorMessage,
      fetchCategoryProducts,
      hasMore,
      loading,
      loadingMore,
      products.length,
      refreshing,
    ]);


  const handleProductPress =
    useCallback(
      product => {
        navigation.navigate(
          'ProductDetails',
          {
            product,
          },
        );
      },
      [navigation],
    );


  const getSalePercentage = product => {
    const oldPrice = Number(
      product.old_price || 0,
    );
    const currentPrice = Number(
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


  const renderProduct = ({ item }) => {
    const salePercentage =
      getSalePercentage(item);
    const hasImage =
      Boolean(item.image_url) &&
      !imageErrors[item.id];

    return (
      <TouchableOpacity
        onPress={() =>
          handleProductPress(item)
        }
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, Rs ${item.price}, ${
          item.stock_quantity > 0
            ? 'in stock'
            : 'out of stock'
        }`}
        activeOpacity={0.88}
        className="mb-5 w-[48%] overflow-hidden rounded-3xl border border-gray-200 bg-white"
      >
        <View className="relative h-52 w-full overflow-hidden bg-gray-100">
          {hasImage ? (
            <Image
              source={{
                uri: item.image_url,
              }}
              accessible={false}
              className="h-full w-full"
              resizeMode="contain"
              onError={() =>
                setImageErrors(
                  current => ({
                    ...current,
                    [item.id]: true,
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
                  color="#6B7280"
                />
              </View>
            </View>
          )}

          {salePercentage > 0 ? (
            <View className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5">
              <Text className="text-xs font-extrabold text-white">
                {salePercentage}% OFF
              </Text>
            </View>
          ) : item.is_new ? (
            <View className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5">
              <Text className="text-xs font-extrabold text-white">
                NEW
              </Text>
            </View>
          ) : item.is_featured ? (
            <View className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5">
              <Text className="text-xs font-extrabold text-white">
                FEATURED
              </Text>
            </View>
          ) : null}

          <View className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-white">
            <Ionicons
              name="arrow-forward-outline"
              size={20}
              color="black"
            />
          </View>
        </View>

        <View className="p-4">
          <Text
            numberOfLines={2}
            className="min-h-10 text-base font-extrabold text-black"
          >
            {item.name}
          </Text>

          <View className="mt-3 flex-row flex-wrap items-center">
            <Text className="text-base font-extrabold text-black">
              Rs {item.price}
            </Text>

            {item.old_price &&
            Number(item.old_price) >
              Number(item.price) ? (
              <Text className="ml-2 text-xs font-semibold text-gray-600 line-through">
                Rs {item.old_price}
              </Text>
            ) : null}
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <View
              className={`rounded-full px-3 py-1.5 ${
                item.stock_quantity > 0
                  ? 'bg-gray-100'
                  : 'bg-black'
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  item.stock_quantity > 0
                    ? 'text-gray-600'
                    : 'text-white'
                }`}
              >
                {item.stock_quantity > 0
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
  };


  const listHeader = (
    <View>
      <View className="mt-4 flex-row items-center">
        <TouchableOpacity
          onPress={() =>
            navigation.goBack()
          }
          accessibilityRole="button"
          accessibilityLabel="Go back"
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

      {!loading &&
      !errorMessage &&
      products.length > 0 ? (
        <View className="mb-5 mt-6 flex-row items-center justify-between rounded-3xl bg-black px-5 py-5">
          <View className="flex-1 pr-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-gray-300">
              {categoryName}
            </Text>

            <Text className="mt-1 text-xl font-extrabold text-white">
              Find Your Next Style
            </Text>

            <Text className="mt-1 text-sm text-gray-300">
              {totalCount ?? products.length}{' '}
              {(totalCount ??
                products.length) === 1
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
    </View>
  );


  const listEmpty = loading ? (
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
  ) : errorMessage ? (
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
        onPress={() =>
          fetchCategoryProducts()
        }
        accessibilityRole="button"
        accessibilityLabel="Try loading products again"
        activeOpacity={0.85}
        className="mt-5 rounded-xl bg-black px-6 py-3"
      >
        <Text className="font-bold text-white">
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View className="mt-10 items-center rounded-3xl bg-gray-100 p-10">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
        <Ionicons
          name="shirt-outline"
          size={30}
          color="#6B7280"
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
  );


  const listFooter = loadingMore ? (
    <ActivityIndicator
      className="my-5"
      color="black"
    />
  ) : loadMoreError ? (
    <TouchableOpacity
      onPress={handleLoadMore}
      accessibilityRole="button"
      accessibilityLabel="Try loading more products again"
      className="mb-5 items-center rounded-2xl bg-gray-100 p-4"
    >
      <Text className="font-bold text-black">
        {loadMoreError} Try Again
      </Text>
    </TouchableOpacity>
  ) : null;


  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={
          loading || errorMessage
            ? []
            : products
        }
        keyExtractor={item =>
          String(item.id)
        }
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={
          styles.columnWrapper
        }
        contentContainerStyle={
          styles.contentContainer
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};


export default CategoryProducts;
