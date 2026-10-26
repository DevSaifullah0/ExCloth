import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import useNotifications from '../../hooks/useNotifications';

const CARD_GAP = 12;

const FILTERS = [
  {
    key: 'all',
    label: 'All',
  },
  {
    key: 'featured',
    label: 'Featured Items',
  },
  {
    key: 'new',
    label: 'New Arrival',
  },
  {
    key: 'sale',
    label: 'Sale',
  },
];

const PRODUCT_FIELDS = `
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
`;

const BLACK_COLOR_NAMES = new Set([
  'black',
  'jet black',
  'matte black',
  'midnight black',
]);

const withCatalogImage = (product, imagesByProduct) => {
  const productImages = imagesByProduct.get(product.id) || [];
  const nonBlackImages = productImages.filter(image => {
    const color = String(image.color || '').trim().toLowerCase();

    return color && !BLACK_COLOR_NAMES.has(color);
  });
  const selectedImage =
    nonBlackImages.find(image => image.is_primary) ||
    nonBlackImages[0] ||
    productImages.find(image => image.is_primary) ||
    productImages[0];

  return {
    ...product,
    image_url: selectedImage?.image_url || product.image_url,
  };
};

const getSalePercentage = product => {
  const currentPrice = Number(product?.price || 0);
  const oldPrice = Number(product?.old_price || 0);

  if (
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(oldPrice) ||
    oldPrice <= 0 ||
    oldPrice <= currentPrice
  ) {
    return 0;
  }

  return Math.round(
    ((oldPrice - currentPrice) / oldPrice) * 100,
  );
};

const Home = ({ navigation }) => {
  const { width: windowWidth } =
    useWindowDimensions();
  const cardWidth = Math.max(
    windowWidth - 40,
    0,
  );

  const [carouselProducts, setCarouselProducts] =
    useState([]);

  const [popularProducts, setPopularProducts] =
    useState([]);

  const [homeBanners, setHomeBanners] = useState([]);

  const [selectedFilter, setSelectedFilter] =
    useState('all');

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [carouselIndex, setCarouselIndex] =
    useState(0);

  const {
    unreadCount,
    refresh: refreshNotifications,
  } = useNotifications();

  // =====================================
  // CAROUSEL REF
  // =====================================

  const bannerScrollRef = useRef(null);

  const homeRequestIdRef = useRef(0);

  // =====================================
  // FILTERED CAROUSEL PRODUCTS
  // =====================================

  const filteredProducts = useMemo(() => {
    if (selectedFilter === 'featured') {
      return carouselProducts.filter(
        product => product.is_featured === true,
      );
    }

    if (selectedFilter === 'new') {
      return carouselProducts.filter(
        product => product.is_new === true,
      );
    }

    if (selectedFilter === 'sale') {
      return carouselProducts.filter(
        product =>
          Number(product.old_price || 0) >
          Number(product.price || 0),
      );
    }

    return carouselProducts;
  }, [carouselProducts, selectedFilter]);

  const selectedFilterLabel = useMemo(
    () =>
      FILTERS.find(
        item => item.key === selectedFilter,
      )?.label || 'All',
    [selectedFilter],
  );

  // =====================================
  // FETCH PRODUCTS
  // =====================================

  const fetchHomeData = useCallback(async () => {
    const requestId = homeRequestIdRef.current + 1;
    homeRequestIdRef.current = requestId;

    try {
      setErrorMessage('');

      const [
        latestResult,
        featuredResult,
        newResult,
        saleResult,
        popularResult,
        bannerResult,
      ] =
        await Promise.all([
          supabase
            .from('products')
            .select(PRODUCT_FIELDS)
            .eq('is_active', true)
            .order('created_at', {
              ascending: false,
            })
            .limit(12),

          supabase
            .from('products')
            .select(PRODUCT_FIELDS)
            .eq('is_active', true)
            .eq('is_featured', true)
            .order('created_at', {
              ascending: false,
            })
            .limit(12),

          supabase
            .from('products')
            .select(PRODUCT_FIELDS)
            .eq('is_active', true)
            .eq('is_new', true)
            .order('created_at', {
              ascending: false,
            })
            .limit(12),

          supabase
            .from('products')
            .select(PRODUCT_FIELDS)
            .eq('is_active', true)
            .gt('old_price', 0)
            .order('created_at', {
              ascending: false,
            })
            .limit(30),

          supabase
            .from('products')
            .select(PRODUCT_FIELDS)
            .eq('is_active', true)
            .eq('is_popular', true)
            .order('created_at', {
              ascending: false,
            })
            .limit(8),

          supabase
            .from('app_banners')
            .select('id, title, subtitle, image_url, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .limit(8),
        ]);

      const firstError = [
        latestResult,
        featuredResult,
        newResult,
        saleResult,
        popularResult,
      ].find(result => result.error)
        ?.error;

      if (firstError) {
        throw firstError;
      }

      if (requestId !== homeRequestIdRef.current) {
        return;
      }

      const carouselMap = new Map();

      [
        ...(latestResult.data || []),
        ...(featuredResult.data || []),
        ...(newResult.data || []),
        ...(saleResult.data || []),
      ].forEach(product => {
        if (product?.id) {
          carouselMap.set(
            product.id,
            product,
          );
        }
      });

      const carouselItems = Array.from(carouselMap.values());
      const popularItems = popularResult.data || [];

      setHomeBanners(
        bannerResult.error ? [] : bannerResult.data || [],
      );

      setCarouselProducts(carouselItems);
      setPopularProducts(popularItems);
      setLoading(false);
      setRefreshing(false);

      const productIds = [
        ...new Set(
          [...carouselItems, ...popularItems]
            .map(product => product.id)
            .filter(Boolean),
        ),
      ];
      let imagesByProduct = new Map();

      if (productIds.length > 0) {
        const { data: productImages, error: productImagesError } =
          await supabase
            .from('product_images')
            .select('product_id, image_url, color, is_primary, sort_order')
            .in('product_id', productIds)
            .order('sort_order', { ascending: true });

        if (productImagesError) {
          if (__DEV__) {
            console.warn(
              'Home product images unavailable:',
              productImagesError.message,
            );
          }
        } else {
          imagesByProduct = (productImages || []).reduce((imageMap, image) => {
            const currentImages = imageMap.get(image.product_id) || [];

            currentImages.push(image);
            imageMap.set(image.product_id, currentImages);

            return imageMap;
          }, new Map());
        }
      }

      if (requestId === homeRequestIdRef.current) {
        setCarouselProducts(
          carouselItems.map(product =>
            withCatalogImage(product, imagesByProduct),
          ),
        );

        setPopularProducts(
          popularItems.map(product =>
            withCatalogImage(product, imagesByProduct),
          ),
        );
      }
    } catch (error) {
      if (requestId !== homeRequestIdRef.current) {
        return;
      }

      if (__DEV__) {
        console.error(
          'Home Data Error:',
          error.message,
        );
      }

      setErrorMessage(
        'Unable to load home data.',
      );
    } finally {
      if (requestId === homeRequestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // =====================================
  // INITIAL DATA
  // =====================================

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // =====================================
  // REFRESH NOTIFICATIONS WHEN HOME OPENS
  // =====================================

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'focus',
      () => {
        refreshNotifications({
          silent: true,
        });
      },
    );

    return unsubscribe;
  }, [
    navigation,
    refreshNotifications,
  ]);

  // =====================================
  // RESET CAROUSEL ON FILTER CHANGE
  // =====================================

  useEffect(() => {
    setCarouselIndex(0);
    bannerScrollRef.current?.scrollToOffset({
      offset: 0,
      animated: false,
    });
  }, [cardWidth, selectedFilter]);

  // =====================================
  // MANUAL CAROUSEL SCROLL
  // =====================================

  const handleBannerScrollEnd = event => {
    const offsetX =
      event.nativeEvent.contentOffset.x;

    const index = Math.round(
      offsetX /
        (cardWidth + CARD_GAP),
    );

    setCarouselIndex(index);
  };

  // =====================================
  // FILTER CHANGE
  // =====================================

  const handleFilterChange = filterKey => {
    if (selectedFilter === filterKey) {
      return;
    }

    setCarouselIndex(0);
    setSelectedFilter(filterKey);
  };

  // =====================================
  // REFRESH
  // =====================================

  const handleRefresh = () => {
    setRefreshing(true);

    setCarouselIndex(0);

    fetchHomeData();

    refreshNotifications({
      silent: true,
    });
  };

  return (
    <SafeAreaView
      edges={Platform.OS === 'android' ? ['top', 'left', 'right'] : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView
        className="px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'android' ? 0 : 30,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* =================================
            HEADER
        ================================= */}

        <View className="mt-4 flex-row items-center justify-between">
          <View className='flex-row items-center gap-2'>
            {/* <Text className="text-gray-500">
              Welcome to
            </Text> */}
            <Image 
            source={require('../../images/AppIcon.png')}
            className='h-10 w-10 rounded-full'
            />
            <Text className="text-3xl font-extrabold text-black">
              ExCloth
            </Text>
            
          </View>

          {/* NOTIFICATION */}

          <View className="relative">
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  'Notifications',
                )
              }
              accessibilityRole="button"
              accessibilityLabel={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : 'Notifications'
              }
              activeOpacity={0.7}
              className="h-12 w-12 items-center justify-center rounded-full bg-gray-100"
            >
              <Ionicons
                name="notifications-outline"
                size={26}
                color="black"
              />
            </TouchableOpacity>

            {/* UNREAD COUNT */}

            {unreadCount > 0 ? (
              <View
                className="absolute z-10 min-h-5 min-w-5 items-center justify-center rounded-full bg-black px-1"
                style={{
                  top: -6,
                  right: 1,
                }}
              >
                <Text className="text-[10px] font-bold text-white">
                  {unreadCount > 99
                    ? '99+'
                    : unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* =================================
            SEARCH
        ================================= */}

        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Search')
          }
          accessibilityRole="button"
          accessibilityLabel="Search products"
          activeOpacity={0.8}
          className="mt-6 h-12 flex-row items-center rounded-xl bg-gray-100 px-4"
        >
          <Ionicons
            name="search-outline"
            size={20}
            color="#6B7280"
          />

          <Text className="ml-2 text-gray-500">
            Search products...
          </Text>
        </TouchableOpacity>

        {homeBanners.length > 0 ? (
          <FlatList
            horizontal
            data={homeBanners}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={{ paddingTop: 18 }}
            ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
            renderItem={({ item }) => (
              <View
                className="h-44 overflow-hidden rounded-3xl bg-gray-100"
                style={{ width: cardWidth }}
                accessibilityLabel={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
              >
                <Image
                  source={{ uri: item.image_url }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                <View className="absolute inset-0 justify-end bg-black/30 p-5">
                  <Text numberOfLines={1} className="text-2xl font-extrabold text-white">
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text numberOfLines={2} className="mt-1 text-sm font-medium text-white">
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
          />
        ) : null}

        {/* =================================
            PRODUCT FILTERS
        ================================= */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{
            paddingRight: 4,
          }}
        >
          {FILTERS.map((item, index) => {
            const selected =
              selectedFilter === item.key;

            return (
              <TouchableOpacity
                key={item.key}
                onPress={() =>
                  handleFilterChange(item.key)
                }
                accessibilityRole="tab"
                accessibilityLabel={
                  item.label
                }
                accessibilityState={{
                  selected,
                }}
                activeOpacity={0.8}
                className={`rounded-full px-5 py-3 ${
                  selected
                    ? 'bg-black'
                    : 'bg-gray-100'
                } ${
                  index < FILTERS.length - 1
                    ? 'mr-2'
                    : ''
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    selected
                      ? 'text-white'
                      : 'text-black'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* =================================
            LOADING
        ================================= */}

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator
              size="large"
              color="black"
            />

            <Text className="mt-3 text-gray-500">
              Loading products...
            </Text>
          </View>
        ) : null}

        {/* =================================
            ERROR
        ================================= */}

        {!loading && errorMessage ? (
          <View className="mt-6 rounded-2xl bg-gray-100 p-5">
            <Text className="text-center text-gray-600">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={fetchHomeData}
              accessibilityRole="button"
              accessibilityLabel="Try loading products again"
              className="mt-3 items-center"
            >
              <Text className="font-bold text-black">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* =================================
            FEATURED PRODUCT CAROUSEL
        ================================= */}

        {!loading &&
        !errorMessage &&
        filteredProducts.length > 0 ? (
          <View className="mt-6">
            <FlatList
              ref={bannerScrollRef}
              data={filteredProducts}
              keyExtractor={product => String(product.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={
                cardWidth + CARD_GAP
              }
              snapToAlignment="start"
              onMomentumScrollEnd={
                handleBannerScrollEnd
              }
              initialNumToRender={2}
              maxToRenderPerBatch={3}
              windowSize={3}
              getItemLayout={(_, index) => ({
                length: cardWidth + CARD_GAP,
                offset: (cardWidth + CARD_GAP) * index,
                index,
              })}
              renderItem={({ item: product, index }) => {
                  const salePercentage =
                    getSalePercentage(product);

                  return (
                    <TouchableOpacity
                      key={product.id}
                      activeOpacity={0.9}
                      onPress={() =>
                        navigation.navigate(
                          'ProductDetails',
                          {
                            product,
                          },
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${product.name}, Rs ${product.price}, ${
                        product.stock_quantity >
                        0
                          ? 'in stock'
                          : 'out of stock'
                      }`}
                      style={{
                        width: cardWidth,
                        marginRight:
                          index ===
                          filteredProducts.length -
                            1
                            ? 0
                            : CARD_GAP,
                      }}
                      className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-100"
                    >
                      {/* IMAGE AREA */}

                      <View className="relative bg-gray-100 px-4 pt-4">
                        <View className="absolute left-4 top-4 z-10 flex-row flex-wrap">
                          {salePercentage > 0 ? (
                            <View className="mr-2 rounded-full bg-black px-3 py-2">
                              <Text className="text-xs font-extrabold text-white">
                                {salePercentage}% OFF
                              </Text>
                            </View>
                          ) : null}

                          {product.is_featured ? (
                            <View className="mr-2 rounded-full border border-black bg-white px-3 py-2">
                              <Text className="text-xs font-extrabold text-black">
                                FEATURED
                              </Text>
                            </View>
                          ) : null}

                          {product.is_new ? (
                            <View className="rounded-full border border-gray-300 bg-white px-3 py-2">
                              <Text className="text-xs font-extrabold text-black">
                                NEW
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {product.image_url ? (
                          <Image
                            source={{
                              uri: product.image_url,
                            }}
                            className="h-60 w-full"
                            resizeMode="contain"
                          />
                        ) : (
                          <View className="h-60 items-center justify-center">
                            <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                              <Ionicons
                                name="shirt-outline"
                                size={45}
                                color="#9CA3AF"
                              />
                            </View>
                          </View>
                        )}
                      </View>

                      {/* DETAILS */}

                      <View className="bg-black p-5">
                        <View className="flex-row items-start justify-between">
                          <View className="mr-3 flex-1">
                            <Text
                              numberOfLines={1}
                              className="text-xl font-extrabold text-white"
                            >
                              {product.name}
                            </Text>

                            <View className="mt-2 flex-row flex-wrap items-center">
                              <Text className="text-lg font-extrabold text-white">
                                Rs {product.price}
                              </Text>

                              {salePercentage > 0 ? (
                                <Text className="ml-3 text-sm font-semibold text-gray-400 line-through">
                                  Rs {product.old_price}
                                </Text>
                              ) : null}
                            </View>
                          </View>

                          <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
                            <Ionicons
                              name="arrow-forward-outline"
                              size={21}
                              color="black"
                            />
                          </View>
                        </View>

                        <View className="mt-4 flex-row items-center justify-between">
                          <Text className="text-sm font-semibold text-gray-300">
                            View Product
                          </Text>

                          {product.stock_quantity <= 0 ? (
                            <View className="rounded-full bg-white px-3 py-1.5">
                              <Text className="text-xs font-extrabold text-black">
                                OUT OF STOCK
                              </Text>
                            </View>
                          ) : (
                            <Text className="text-xs font-semibold text-gray-400">
                              In Stock
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
            />
            <Text
              accessibilityLiveRegion="polite"
              className="mt-3 text-center text-xs font-semibold text-gray-500"
            >
              Product {carouselIndex + 1} of {filteredProducts.length}
            </Text>
          </View>
        ) : null}

        {/* =================================
            EMPTY FILTER RESULT
        ================================= */}

        {!loading &&
        !errorMessage &&
        carouselProducts.length > 0 &&
        filteredProducts.length === 0 ? (
          <View className="mt-6 items-center rounded-3xl bg-gray-100 px-6 py-10">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="shirt-outline"
                size={28}
                color="#9CA3AF"
              />
            </View>

            <Text className="mt-4 text-base font-bold text-black">
              No {selectedFilterLabel} products
            </Text>

            <Text className="mt-1 text-center text-sm text-gray-500">
              Products added to this section will
              appear here automatically.
            </Text>
          </View>
        ) : null}

        {/* =================================
            EMPTY ALL PRODUCTS
        ================================= */}

        {!loading &&
        !errorMessage &&
        carouselProducts.length === 0 ? (
          <View className="mt-6 items-center rounded-3xl bg-gray-100 p-8">
            <Ionicons
              name="shirt-outline"
              size={40}
              color="#9CA3AF"
            />

            <Text className="mt-3 text-gray-500">
              No products found.
            </Text>
          </View>
        ) : null}

        {/* =================================
            POPULAR PRODUCTS
        ================================= */}

        {!loading && !errorMessage ? (
          <View className="mt-8 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-extrabold text-black">
                Popular Products
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Most loved items right now
              </Text>
            </View>

            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Ionicons
                name="flame-outline"
                size={20}
                color="black"
              />
            </View>
          </View>
        ) : null}

        {/* =================================
            EMPTY POPULAR PRODUCTS
        ================================= */}

        {!loading &&
        !errorMessage &&
        popularProducts.length === 0 ? (
          <View className="mt-4 items-center rounded-2xl bg-gray-100 p-8">
            <Ionicons
              name="shirt-outline"
              size={40}
              color="#9CA3AF"
            />

            <Text className="mt-3 text-gray-500">
              No popular products found.
            </Text>
          </View>
        ) : null}

        {/* =================================
            PRODUCT GRID
        ================================= */}

        {!loading &&
        !errorMessage &&
        popularProducts.length > 0 ? (
          <View className="mt-4 flex-row flex-wrap justify-between">
            {popularProducts.map(product => {
              const salePercentage =
                getSalePercentage(product);

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
                  accessibilityRole="button"
                  accessibilityLabel={`${product.name}, Rs ${product.price}, ${
                    product.stock_quantity > 0
                      ? 'in stock'
                      : 'out of stock'
                  }`}
                  activeOpacity={0.85}
                  className="mb-4 w-[48%] overflow-hidden rounded-3xl border border-gray-200 bg-white"
                >
                  <View className="relative bg-gray-100">
                    {salePercentage > 0 ? (
                      <View className="absolute left-3 top-3 z-10 rounded-full bg-black px-2.5 py-1.5">
                        <Text className="text-[10px] font-extrabold text-white">
                          {salePercentage}% OFF
                        </Text>
                      </View>
                    ) : product.is_new ? (
                      <View className="absolute left-3 top-3 z-10 rounded-full bg-black px-2.5 py-1.5">
                        <Text className="text-[10px] font-extrabold text-white">
                          NEW
                        </Text>
                      </View>
                    ) : null}

                    {product.image_url ? (
                      <Image
                        source={{
                          uri: product.image_url,
                        }}
                        className="h-44 w-full"
                        resizeMode="contain"
                      />
                    ) : (
                      <View className="h-44 items-center justify-center">
                        <Ionicons
                          name="shirt-outline"
                          size={42}
                          color="#9CA3AF"
                        />
                      </View>
                    )}
                  </View>

                  <View className="p-4">
                    <Text
                      numberOfLines={2}
                      className="min-h-10 font-extrabold text-black"
                    >
                      {product.name}
                    </Text>

                    <View className="mt-2 flex-row flex-wrap items-center">
                      <Text className="font-extrabold text-black">
                        Rs {product.price}
                      </Text>

                      {salePercentage > 0 ? (
                        <Text className="ml-2 text-xs text-gray-400 line-through">
                          Rs {product.old_price}
                        </Text>
                      ) : null}
                    </View>

                    <View className="mt-4 flex-row items-center justify-between">
                      {product.stock_quantity <= 0 ? (
                        <Text className="text-xs font-bold text-gray-500">
                          Out of Stock
                        </Text>
                      ) : (
                        <Text className="text-xs font-semibold text-gray-500">
                          View Product
                        </Text>
                      )}

                      <View className="h-8 w-8 items-center justify-center rounded-full bg-black">
                        <Ionicons
                          name="arrow-forward-outline"
                          size={16}
                          color="white"
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;
