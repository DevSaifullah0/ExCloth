import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';

import React, {
  useCallback,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useFocusEffect } from '@react-navigation/native';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

const Wishlist = ({ navigation }) => {
  const [wishlist, setWishlist] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [removingId, setRemovingId] =
    useState(null);

  const [modal, setModal] =
    useState({
      visible: false,
      title: '',
      message: '',
    });

  const showModal = (
    title,
    message,
  ) => {
    setModal({
      visible: true,
      title,
      message,
    });
  };

  const closeModal = () => {
    setModal(current => ({
      ...current,
      visible: false,
    }));
  };

  // ==========================================
  // NORMALIZE COLOR
  // ==========================================

  const normalizeColor =
    value =>
      String(value || '')
        .trim()
        .toLowerCase();

  // ==========================================
  // FETCH WISHLIST
  // ==========================================

  const fetchWishlist =
    useCallback(async () => {
      try {
        setErrorMessage('');

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth
            .getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setWishlist([]);
          return;
        }

        // ======================================
        // FETCH WISHLIST ROWS
        //
        // Only existing wishlist columns.
        // ======================================

        const {
          data: wishlistData,
          error: wishlistError,
        } = await supabase
          .from('wishlist')
          .select(`
            id,
            product_id,
            created_at
          `)
          .eq(
            'user_id',
            user.id,
          )
          .order(
            'created_at',
            {
              ascending: false,
            },
          );

        if (wishlistError) {
          throw wishlistError;
        }

        if (
          !wishlistData ||
          wishlistData.length === 0
        ) {
          setWishlist([]);
          return;
        }

        // ======================================
        // PRODUCT IDS
        // ======================================

        const productIds = [
          ...new Set(
            wishlistData
              .map(
                item =>
                  item.product_id,
              )
              .filter(Boolean),
          ),
        ];

        if (
          productIds.length === 0
        ) {
          setWishlist([]);
          return;
        }

        // ======================================
        // FETCH PRODUCTS
        // ======================================

        const {
          data: productsData,
          error: productsError,
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
          .in(
            'id',
            productIds,
          );

        if (productsError) {
          throw productsError;
        }

        // ======================================
        // READ LOCALLY SAVED VARIANTS
        // ======================================

        const savedVariantMap =
          new Map();

        for (
          const item
          of wishlistData
        ) {
          const storageKey =
            `wishlist_variant_${user.id}_${item.product_id}`;

          const value =
            await AsyncStorage.getItem(
              storageKey,
            );

          if (!value) {
            continue;
          }

          try {
            const parsed =
              JSON.parse(value);

            savedVariantMap.set(
              String(
                item.product_id,
              ),
              parsed,
            );

          } catch (parseError) {
            console.log(
              'Wishlist Variant Parse Error:',
              parseError,
            );
          }
        }

        // ======================================
        // FETCH CURRENT VARIANT DATA
        // ======================================

        const savedVariantIds = [
          ...new Set(
            Array.from(
              savedVariantMap.values(),
            )
              .map(
                variant =>
                  variant?.id,
              )
              .filter(Boolean),
          ),
        ];

        let variantsData = [];

        if (
          savedVariantIds.length > 0
        ) {
          const {
            data,
            error,
          } = await supabase
            .from(
              'product_variants',
            )
            .select(`
              id,
              product_id,
              size,
              color,
              sku,
              stock_quantity,
              price_adjustment,
              is_active
            `)
            .in(
              'id',
              savedVariantIds,
            );

          if (error) {
            throw error;
          }

          variantsData =
            data || [];
        }

        // ======================================
        // FETCH PRODUCT IMAGES
        // ======================================

        const {
          data: imagesData,
          error: imagesError,
        } = await supabase
          .from(
            'product_images',
          )
          .select(`
            id,
            product_id,
            image_url,
            color,
            is_primary,
            sort_order
          `)
          .in(
            'product_id',
            productIds,
          )
          .order(
            'sort_order',
            {
              ascending: true,
            },
          );

        if (imagesError) {
          throw imagesError;
        }

        // ======================================
        // PRODUCT LOOKUP
        // ======================================

        const productMap =
          new Map();

        (productsData || [])
          .forEach(
            product => {
              productMap.set(
                String(
                  product.id,
                ),
                product,
              );
            },
          );

        // ======================================
        // VARIANT LOOKUP
        // ======================================

        const variantMap =
          new Map();

        (variantsData || [])
          .forEach(
            variant => {
              variantMap.set(
                String(
                  variant.id,
                ),
                variant,
              );
            },
          );

        // ======================================
        // PRODUCT IMAGE LOOKUP
        // ======================================

        const imageMap =
          new Map();

        (imagesData || [])
          .forEach(
            image => {
              const key =
                String(
                  image.product_id,
                );

              const current =
                imageMap.get(
                  key,
                ) || [];

              current.push(
                image,
              );

              imageMap.set(
                key,
                current,
              );
            },
          );

        // ======================================
        // FORMAT WISHLIST
        // ======================================

        const formattedWishlist =
          wishlistData
            .map(item => {
              const product =
                productMap.get(
                  String(
                    item.product_id,
                  ),
                );

              if (!product) {
                return null;
              }

              const savedVariant =
                savedVariantMap.get(
                  String(
                    item.product_id,
                  ),
                ) || null;

              const variant =
                savedVariant?.id
                  ? variantMap.get(
                      String(
                        savedVariant.id,
                      ),
                    ) ||
                    savedVariant
                  : null;

              const productImages =
                imageMap.get(
                  String(
                    item.product_id,
                  ),
                ) || [];

              // ==================================
              // SELECT SAME COLOR IMAGE
              // ==================================

              const colorImages =
                variant?.color
                  ? productImages.filter(
                      image =>
                        normalizeColor(
                          image.color,
                        ) ===
                        normalizeColor(
                          variant.color,
                        ),
                    )
                  : [];

              const displayImage =
                colorImages.find(
                  image =>
                    image.is_primary,
                )?.image_url ||
                colorImages[0]
                  ?.image_url ||
                productImages.find(
                  image =>
                    image.is_primary,
                )?.image_url ||
                productImages[0]
                  ?.image_url ||
                product.image_url ||
                null;

              const currentPrice =
                Number(
                  product.price ||
                    0,
                ) +
                Number(
                  variant
                    ?.price_adjustment ||
                    0,
                );

              const currentStock =
                variant
                  ? Number(
                      variant
                        .stock_quantity ||
                        0,
                    )
                  : Number(
                      product
                        .stock_quantity ||
                        0,
                    );

              return {
                wishlistId:
                  item.id,

                product,

                variant,

                displayImage,

                currentPrice,

                currentStock,

                createdAt:
                  item.created_at,
              };
            })
            .filter(Boolean);

        setWishlist(
          formattedWishlist,
        );

      } catch (error) {
        console.log(
          'Wishlist Fetch Error:',
          error,
        );

        setErrorMessage(
          error?.message ||
            'Unable to load wishlist.',
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  // ==========================================
  // REFRESH WHEN SCREEN OPENS
  // ==========================================

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      fetchWishlist();
    }, [fetchWishlist]),
  );

  // ==========================================
  // PULL TO REFRESH
  // ==========================================

  const handleRefresh = () => {
    setRefreshing(true);

    fetchWishlist();
  };

  // ==========================================
  // REMOVE FROM WISHLIST
  // ==========================================

  const removeFromWishlist =
    async (
      wishlistId,
      productId,
    ) => {
      try {
        setRemovingId(
          wishlistId,
        );

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth
            .getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            'User session not found.',
          );
        }

        const { error } =
          await supabase
            .from('wishlist')
            .delete()
            .eq(
              'id',
              wishlistId,
            )
            .eq(
              'user_id',
              user.id,
            );

        if (error) {
          throw error;
        }

        await AsyncStorage.removeItem(
          `wishlist_variant_${user.id}_${productId}`,
        );

        setWishlist(
          current =>
            current.filter(
              item =>
                item.wishlistId !==
                wishlistId,
            ),
        );

      } catch (error) {
        console.log(
          'Remove Wishlist Error:',
          error,
        );

        showModal(
          'Remove Failed',
          error?.message ||
            'Unable to remove product from wishlist.',
        );

      } finally {
        setRemovingId(null);
      }
    };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* HEADER */}
        <View className="mt-5 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-3xl font-extrabold text-black">
              Wishlist
            </Text>

            <Text className="mt-2 text-gray-500">
              Your saved favourites in one place.
            </Text>
          </View>

          {!loading && wishlist.length > 0 ? (
            <View className="min-h-12 min-w-12 items-center justify-center rounded-2xl bg-black px-3">
              <Text className="text-base font-extrabold text-white">
                {wishlist.length}
              </Text>
            </View>
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Ionicons
                name="heart-outline"
                size={23}
                color="black"
              />
            </View>
          )}
        </View>

        {/* LOADING */}
        {loading ? (
          <View className="items-center py-24">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <ActivityIndicator
                size="small"
                color="black"
              />
            </View>

            <Text className="mt-4 font-semibold text-gray-500">
              Loading wishlist...
            </Text>
          </View>
        ) : null}

        {/* ERROR */}
        {!loading && errorMessage ? (
          <View className="mt-8 items-center rounded-3xl bg-gray-100 p-7">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color="black"
              />
            </View>

            <Text className="mt-4 text-lg font-extrabold text-black">
              Wishlist unavailable
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={() => {
                setLoading(true);
                fetchWishlist();
              }}
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
        wishlist.length === 0 ? (
          <View className="mt-16 items-center rounded-3xl bg-gray-100 px-6 py-12">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="heart-outline"
                size={36}
                color="black"
              />
            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              Nothing saved yet
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              Save products you love and find them here anytime.
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Home')
              }
              activeOpacity={0.85}
              className="mt-6 flex-row items-center rounded-xl bg-black px-6 py-4"
            >
              <Text className="font-bold text-white">
                Explore Products
              </Text>

              <Ionicons
                name="arrow-forward-outline"
                size={18}
                color="white"
                style={{
                  marginLeft: 8,
                }}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* WISHLIST GRID */}
        {!loading &&
        !errorMessage &&
        wishlist.length > 0 ? (
          <View className="mt-7 flex-row flex-wrap justify-between">
            {wishlist.map(item => {
              const product =
                item.product;

              const variant =
                item.variant;

              const variantAdjustment =
                Number(
                  variant
                    ?.price_adjustment ||
                  0,
                );

              const regularPrice =
                product.old_price &&
                Number(
                  product.old_price,
                ) >
                  Number(
                    product.price,
                  )
                  ? Number(
                      product.old_price,
                    ) +
                    variantAdjustment
                  : null;

              const salePercentage =
                regularPrice &&
                regularPrice >
                  item.currentPrice
                  ? Math.round(
                      ((regularPrice -
                        item.currentPrice) /
                        regularPrice) *
                        100,
                    )
                  : 0;

              return (
                <TouchableOpacity
                  key={item.wishlistId}
                  onPress={() =>
                    navigation.navigate(
                      'ProductDetails',
                      {
                        product,
                        wishlistVariantId:
                          variant?.id ||
                          null,
                      },
                    )
                  }
                  activeOpacity={0.88}
                  className="mb-5 w-[48%] overflow-hidden rounded-3xl border border-gray-200 bg-white"
                >
                  {/* IMAGE */}
                  <View className="relative aspect-square w-full bg-gray-100">
                    {item.displayImage ? (
                      <Image
                        source={{
                          uri:
                            item.displayImage,
                        }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Ionicons
                          name="shirt-outline"
                          size={42}
                          color="#9CA3AF"
                        />
                      </View>
                    )}

                    {salePercentage > 0 ? (
                      <View className="absolute left-2.5 top-2.5 rounded-full bg-black px-2.5 py-1.5">
                        <Text className="text-[10px] font-extrabold text-white">
                          {salePercentage}% OFF
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      onPress={event => {
                        event.stopPropagation();

                        removeFromWishlist(
                          item.wishlistId,
                          product.id,
                        );
                      }}
                      disabled={
                        removingId ===
                        item.wishlistId
                      }
                      activeOpacity={0.85}
                      className="absolute right-2.5 top-2.5 h-10 w-10 items-center justify-center rounded-full bg-white"
                    >
                      {removingId ===
                      item.wishlistId ? (
                        <ActivityIndicator
                          size="small"
                          color="black"
                        />
                      ) : (
                        <Ionicons
                          name="heart"
                          size={20}
                          color="black"
                        />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* DETAILS */}
                  <View className="p-3.5">
                    <Text
                      numberOfLines={2}
                      className="min-h-10 font-extrabold leading-5 text-black"
                    >
                      {product.name}
                    </Text>

                    {/* VARIANT */}
                    {variant?.size ||
                    variant?.color ? (
                      <View className="mt-2 flex-row flex-wrap">
                        {variant?.size ? (
                          <View className="mb-1 mr-1.5 rounded-full bg-gray-100 px-2 py-1">
                            <Text className="text-[10px] font-semibold text-gray-600">
                              {variant.size}
                            </Text>
                          </View>
                        ) : null}

                        {variant?.color ? (
                          <View className="mb-1 rounded-full bg-gray-100 px-2 py-1">
                            <Text
                              numberOfLines={1}
                              className="max-w-20 text-[10px] font-semibold text-gray-600"
                            >
                              {variant.color}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {/* PRICE */}
                    <View className="mt-2 flex-row flex-wrap items-center">
                      <Text className="font-extrabold text-black">
                        Rs {item.currentPrice}
                      </Text>

                      {regularPrice ? (
                        <Text className="ml-2 text-[10px] text-gray-400 line-through">
                          Rs {regularPrice}
                        </Text>
                      ) : null}
                    </View>

                    {/* STOCK */}
                    <View className="mt-2 flex-row items-center">
                      <View
                        className={`h-2 w-2 rounded-full ${
                          item.currentStock >
                          0
                            ? 'bg-black'
                            : 'bg-gray-300'
                        }`}
                      />

                      <Text
                        className={`ml-1.5 text-[11px] font-semibold ${
                          item.currentStock >
                          0
                            ? 'text-gray-600'
                            : 'text-red-500'
                        }`}
                      >
                        {item.currentStock >
                        0
                          ? 'In Stock'
                          : 'Out of Stock'}
                      </Text>
                    </View>

                    {/* FOOTER */}
                    <View className="mt-3 flex-row items-center justify-between border-t border-gray-100 pt-3">
                      <Text className="text-xs font-bold text-gray-600">
                        View Product
                      </Text>

                      <View className="h-8 w-8 items-center justify-center rounded-full bg-black">
                        <Ionicons
                          name="arrow-forward-outline"
                          size={15}
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

      {/* CENTERED MESSAGE MODAL */}
      <Modal
        visible={modal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full max-w-sm rounded-3xl bg-white p-6">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Ionicons
                name="information-circle-outline"
                size={25}
                color="black"
              />
            </View>

            <Text className="mt-4 text-xl font-extrabold text-black">
              {modal.title}
            </Text>

            <Text className="mt-2 leading-6 text-gray-500">
              {modal.message}
            </Text>

            <TouchableOpacity
              onPress={closeModal}
              activeOpacity={0.85}
              className="mt-6 items-center justify-center rounded-xl bg-black py-4"
            >
              <Text className="font-bold text-white">
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


export default Wishlist;
