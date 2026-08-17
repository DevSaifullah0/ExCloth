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

import {
  useFocusEffect,
} from '@react-navigation/native';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  supabase,
} from '../../lib/supabase';


const normalizeColor = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');


const Cart = ({ navigation }) => {
  const [
    cartItems,
    setCartItems,
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
    updatingId,
    setUpdatingId,
  ] = useState(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    modal,
    setModal,
  ] = useState({
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
  // FETCH CART
  // ==========================================

  const fetchCart =
    useCallback(async () => {
      try {
        setErrorMessage('');


        // ======================================
        // CURRENT USER
        // ======================================

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
          setCartItems([]);

          return;
        }


        // ======================================
        // FETCH CART + PRODUCTS
        // ======================================

        const {
          data,
          error,
        } = await supabase
          .from('cart_items')
          .select(`
            id,
            product_id,
            variant_id,
            quantity,
            created_at,

            products (
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
            )
          `)
          .eq(
            'user_id',
            user.id,
          )
          .order(
            'created_at',
            {
              ascending:
                false,
            },
          );


        if (error) {
          throw error;
        }


        const rawCart =
          (data || [])
            .filter(
              item =>
                item.products,
            );


        // ======================================
        // COLLECT VARIANT IDS
        // ======================================

        const variantIds = [
          ...new Set(
            rawCart
              .map(
                item =>
                  item.variant_id,
              )
              .filter(
                id =>
                  id !== null &&
                  id !== undefined,
              ),
          ),
        ];


        // ======================================
        // FETCH VARIANTS
        // ======================================

        let variants = [];


        if (
          variantIds.length > 0
        ) {
          const {
            data:
              variantData,

            error:
              variantError,
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
              variantIds,
            );


          if (variantError) {
            throw variantError;
          }


          variants =
            variantData || [];
        }


        // ======================================
        // VARIANT LOOKUP
        // ======================================

        const variantMap =
          new Map();


        variants.forEach(
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
        // COLLECT PRODUCT IDS
        // ======================================

        const productIds = [
          ...new Set(
            rawCart
              .map(
                item =>
                  item.product_id,
              )
              .filter(
                id =>
                  id !== null &&
                  id !== undefined,
              ),
          ),
        ];


        // ======================================
        // FETCH COLOR-WISE PRODUCT IMAGES
        //
        // Cart image must follow the selected
        // variant color instead of always using
        // products.image_url (default image).
        // ======================================

        let productImages = [];


        if (
          productIds.length > 0
        ) {
          const {
            data:
              imageData,

            error:
              imageError,
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
                ascending:
                  true,
              },
            );


          if (imageError) {
            throw imageError;
          }


          productImages =
            imageData || [];
        }


        // ======================================
        // COLOR IMAGE LOOKUP
        //
        // key example:
        // "2::olive"
        //
        // If multiple images exist for one color,
        // prefer is_primary=true, then lower
        // sort_order.
        // ======================================

        const imageMap =
          new Map();


        productImages.forEach(
          image => {
            const key =
              `${String(
                image.product_id,
              )}::${normalizeColor(
                image.color,
              )}`;


            const currentImage =
              imageMap.get(
                key,
              );


            const imageSort =
              Number(
                image.sort_order ??
                  0,
              );


            const currentSort =
              Number(
                currentImage
                  ?.sort_order ??
                  0,
              );


            const shouldReplace =
              !currentImage ||
              (
                Boolean(
                  image.is_primary,
                ) &&
                !Boolean(
                  currentImage
                    .is_primary,
                )
              ) ||
              (
                Boolean(
                  image.is_primary,
                ) ===
                  Boolean(
                    currentImage
                      .is_primary,
                  ) &&
                imageSort <
                  currentSort
              );


            if (
              shouldReplace
            ) {
              imageMap.set(
                key,
                image,
              );
            }
          },
        );


        // ======================================
        // FORMAT CART
        // ======================================

        const formattedCart =
          rawCart.map(
            item => {
              const product =
                item.products;

              const variant =
                item.variant_id
                  ? variantMap.get(
                      String(
                        item.variant_id,
                      ),
                    ) || null
                  : null;


              // ==================================
              // EXACT SELECTED-COLOR IMAGE
              // ==================================

              const variantImageKey =
                variant?.color
                  ? `${String(
                      product.id,
                    )}::${normalizeColor(
                      variant.color,
                    )}`
                  : null;


              const variantImage =
                variantImageKey
                  ? imageMap.get(
                      variantImageKey,
                    ) || null
                  : null;


              const imageUrl =
                variantImage
                  ?.image_url ||
                product.image_url ||
                null;


              const basePrice =
                Number(
                  product.price ||
                    0,
                );


              const adjustment =
                Number(
                  variant
                    ?.price_adjustment ||
                    0,
                );


              const unitPrice =
                basePrice +
                adjustment;


              const availableStock =
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


              const variantUnavailable =
                Boolean(
                  item.variant_id,
                ) &&
                (
                  !variant ||
                  !variant.is_active
                );


              return {
                cartId:
                  item.id,

                productId:
                  item.product_id,

                variantId:
                  item.variant_id,

                quantity:
                  Number(
                    item.quantity,
                  ),

                product,

                variant,

                imageUrl,

                unitPrice,

                availableStock,

                variantUnavailable,
              };
            },
          );


        setCartItems(
          formattedCart,
        );

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Cart Fetch Error:',
            error.message,
          );
        }


        setErrorMessage(
          'Unable to load your cart.',
        );

      } finally {
        setLoading(false);

        setRefreshing(false);
      }
    }, []);


  // ==========================================
  // REFRESH WHEN SCREEN FOCUSED
  // ==========================================

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart]),
  );


  // ==========================================
  // PULL TO REFRESH
  // ==========================================

  const handleRefresh = () => {
    setRefreshing(true);

    fetchCart();
  };


  // ==========================================
  // UPDATE QUANTITY
  // ==========================================

  const updateQuantity =
    async (
      item,
      newQuantity,
    ) => {
      try {
        if (
          newQuantity < 1
        ) {
          return;
        }


        // ======================================
        // VARIANT NO LONGER AVAILABLE
        // ======================================

        if (
          item.variantUnavailable
        ) {
          showModal(
            'Unavailable',
            'This product option is no longer available.',
          );

          return;
        }


        // ======================================
        // STOCK LIMIT
        // ======================================

        if (
          newQuantity >
          item.availableStock
        ) {
          showModal(
            'Stock Limit',
            `Only ${item.availableStock} item(s) available for this selection.`,
          );

          return;
        }


        setUpdatingId(
          item.cartId,
        );


        // ======================================
        // UPDATE DATABASE
        // ======================================

        const {
          error,
        } = await supabase
          .from('cart_items')
          .update({
            quantity:
              newQuantity,
          })
          .eq(
            'id',
            item.cartId,
          );


        if (error) {
          throw error;
        }


        // ======================================
        // UPDATE LOCAL UI
        // ======================================

        setCartItems(
          current =>
            current.map(
              cartItem =>
                cartItem.cartId ===
                item.cartId
                  ? {
                      ...cartItem,

                      quantity:
                        newQuantity,
                    }
                  : cartItem,
            ),
        );

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Quantity Update Error:',
            error.message,
          );
        }


        showModal(
          'Unable to Update',
          'Unable to update quantity.',
        );

      } finally {
        setUpdatingId(null);
      }
    };


  // ==========================================
  // REMOVE CART ITEM
  // ==========================================

  const removeCartItem =
    async cartId => {
      try {
        setUpdatingId(
          cartId,
        );


        const {
          error,
        } = await supabase
          .from('cart_items')
          .delete()
          .eq(
            'id',
            cartId,
          );


        if (error) {
          throw error;
        }


        setCartItems(
          current =>
            current.filter(
              item =>
                item.cartId !==
                cartId,
            ),
        );

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Remove Cart Error:',
            error.message,
          );
        }


        showModal(
          'Remove Failed',
          'Unable to remove product.',
        );

      } finally {
        setUpdatingId(null);
      }
    };


  // ==========================================
  // CART TOTAL
  //
  // BASE PRICE
  // +
  // VARIANT PRICE ADJUSTMENT
  // ==========================================

  const cartTotal =
    cartItems.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.unitPrice *
          item.quantity,

      0,
    );


  // ==========================================
  // TOTAL ITEM QUANTITY
  // ==========================================

  const totalQuantity =
    cartItems.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantity,

      0,
    );


  // ==========================================
  // CHECK INVALID CART ITEMS
  // ==========================================

  const hasUnavailableItems =
    cartItems.some(
      item =>
        item.variantUnavailable ||
        item.availableStock <= 0 ||
        item.quantity >
          item.availableStock,
    );


  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 210,
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
              My Cart
            </Text>

            <Text className="mt-2 text-gray-500">
              Review your items before checkout.
            </Text>
          </View>

          {!loading && cartItems.length > 0 ? (
            <View className="min-h-12 min-w-12 items-center justify-center rounded-2xl bg-black px-3">
              <Text className="text-base font-extrabold text-white">
                {totalQuantity}
              </Text>
            </View>
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Ionicons
                name="bag-handle-outline"
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
              Loading your cart...
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
              Cart unavailable
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={fetchCart}
              activeOpacity={0.85}
              className="mt-5 rounded-xl bg-black px-6 py-3"
            >
              <Text className="font-bold text-white">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* EMPTY CART */}
        {!loading &&
        !errorMessage &&
        cartItems.length === 0 ? (
          <View className="mt-16 items-center rounded-3xl bg-gray-100 px-6 py-12">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="bag-handle-outline"
                size={36}
                color="black"
              />
            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              Your cart is empty
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              Add something you like and it will appear here.
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Home')
              }
              activeOpacity={0.85}
              className="mt-6 flex-row items-center rounded-xl bg-black px-6 py-4"
            >
              <Text className="font-bold text-white">
                Continue Shopping
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

        {/* CART ITEMS */}
        {!loading &&
        !errorMessage &&
        cartItems.map(item => {
          const product = item.product;
          const variant = item.variant;

          const itemTotal =
            item.unitPrice *
            item.quantity;

          const outOfStock =
            item.availableStock <= 0;

          const quantityAtLimit =
            item.quantity >=
            item.availableStock;

          const variantAdjustment =
            Number(
              variant?.price_adjustment ||
              0,
            );

          const regularUnitPrice =
            product.old_price &&
            Number(product.old_price) >
              Number(product.price)
              ? Number(
                  product.old_price,
                ) +
                variantAdjustment
              : null;

          const salePercentage =
            regularUnitPrice &&
            regularUnitPrice >
              item.unitPrice
              ? Math.round(
                  ((regularUnitPrice -
                    item.unitPrice) /
                    regularUnitPrice) *
                    100,
                )
              : 0;

          return (
            <View
              key={item.cartId}
              className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white"
            >
              <View className="flex-row p-3">
                {/* IMAGE */}
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      'ProductDetails',
                      {
                        product,
                      },
                    )
                  }
                  activeOpacity={0.9}
                  className="relative h-32 w-32 overflow-hidden rounded-2xl bg-gray-100"
                >
                  {item.imageUrl ? (
                    <Image
                      source={{
                        uri:
                          item.imageUrl,
                      }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Ionicons
                        name="shirt-outline"
                        size={40}
                        color="#9CA3AF"
                      />
                    </View>
                  )}

                  {salePercentage > 0 ? (
                    <View className="absolute left-2 top-2 rounded-full bg-black px-2.5 py-1.5">
                      <Text className="text-[10px] font-extrabold text-white">
                        {salePercentage}% OFF
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                {/* INFO */}
                <View className="ml-4 flex-1">
                  <View className="flex-row items-start">
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate(
                          'ProductDetails',
                          {
                            product,
                          },
                        )
                      }
                      activeOpacity={0.8}
                      className="flex-1 pr-2"
                    >
                      <Text
                        numberOfLines={2}
                        className="text-base font-extrabold leading-5 text-black"
                      >
                        {product.name}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        removeCartItem(
                          item.cartId,
                        )
                      }
                      disabled={
                        updatingId ===
                        item.cartId
                      }
                      activeOpacity={0.8}
                      className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                    >
                      {updatingId ===
                      item.cartId ? (
                        <ActivityIndicator
                          size="small"
                          color="black"
                        />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color="#4B5563"
                        />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* VARIANT PILLS */}
                  {variant?.size ||
                  variant?.color ? (
                    <View className="mt-2 flex-row flex-wrap">
                      {variant?.size ? (
                        <View className="mb-1 mr-2 rounded-full bg-gray-100 px-2.5 py-1.5">
                          <Text className="text-[11px] font-semibold text-gray-600">
                            Size {variant.size}
                          </Text>
                        </View>
                      ) : null}

                      {variant?.color ? (
                        <View className="mb-1 rounded-full bg-gray-100 px-2.5 py-1.5">
                          <Text className="text-[11px] font-semibold text-gray-600">
                            {variant.color}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* PRICE */}
                  <View className="mt-2 flex-row flex-wrap items-center">
                    <Text className="text-base font-extrabold text-black">
                      Rs {item.unitPrice}
                    </Text>

                    {regularUnitPrice ? (
                      <Text className="ml-2 text-xs text-gray-400 line-through">
                        Rs {regularUnitPrice}
                      </Text>
                    ) : null}
                  </View>

                  {/* STOCK */}
                  {item.variantUnavailable ? (
                    <Text className="mt-2 text-xs font-bold text-red-500">
                      Option unavailable
                    </Text>
                  ) : (
                    <Text
                      className={`mt-2 text-xs font-semibold ${
                        outOfStock
                          ? 'text-red-500'
                          : 'text-gray-500'
                      }`}
                    >
                      {outOfStock
                        ? 'Out of stock'
                        : `${item.availableStock} in stock`}
                    </Text>
                  )}
                </View>
              </View>

              {/* CARD FOOTER */}
              <View className="mx-3 border-t border-gray-200 py-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center rounded-xl bg-gray-100 p-1">
                    <TouchableOpacity
                      onPress={() =>
                        updateQuantity(
                          item,
                          item.quantity -
                            1,
                        )
                      }
                      disabled={
                        item.quantity <=
                          1 ||
                        updatingId ===
                          item.cartId
                      }
                      className="h-9 w-9 items-center justify-center rounded-lg bg-white"
                    >
                      <Ionicons
                        name="remove-outline"
                        size={19}
                        color={
                          item.quantity <=
                          1
                            ? '#D1D5DB'
                            : 'black'
                        }
                      />
                    </TouchableOpacity>

                    <View className="min-w-12 items-center">
                      {updatingId ===
                      item.cartId ? (
                        <ActivityIndicator
                          size="small"
                          color="black"
                        />
                      ) : (
                        <Text className="font-extrabold text-black">
                          {item.quantity}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        updateQuantity(
                          item,
                          item.quantity +
                            1,
                        )
                      }
                      disabled={
                        updatingId ===
                          item.cartId ||
                        item.variantUnavailable ||
                        outOfStock ||
                        quantityAtLimit
                      }
                      className="h-9 w-9 items-center justify-center rounded-lg bg-black"
                    >
                      <Ionicons
                        name="add-outline"
                        size={19}
                        color={
                          item.variantUnavailable ||
                          outOfStock ||
                          quantityAtLimit
                            ? '#9CA3AF'
                            : 'white'
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  <View className="items-end">
                    <Text className="text-xs text-gray-500">
                      Item total
                    </Text>

                    <Text className="mt-0.5 text-base font-extrabold text-black">
                      Rs {itemTotal}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* BOTTOM CHECKOUT */}
      {!loading &&
      !errorMessage &&
      cartItems.length > 0 ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-5 pb-5 pt-4">
          {hasUnavailableItems ? (
            <View className="mb-3 flex-row items-center rounded-xl bg-gray-100 px-3 py-2.5">
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#4B5563"
              />

              <Text className="ml-2 flex-1 text-xs font-semibold text-gray-600">
                Review unavailable or out-of-stock items before checkout.
              </Text>
            </View>
          ) : null}

          <View className="mb-3 flex-row items-end justify-between">
            <View>
              <Text className="text-xs font-semibold text-gray-500">
                Total • {totalQuantity}{' '}
                {totalQuantity === 1
                  ? 'item'
                  : 'items'}
              </Text>

              <Text className="mt-1 text-2xl font-extrabold text-black">
                Rs {cartTotal}
              </Text>
            </View>

            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Ionicons
                name="bag-check-outline"
                size={20}
                color="black"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (
                hasUnavailableItems
              ) {
                showModal(
                  'Review Cart',
                  'Please remove or adjust unavailable items before checkout.',
                );

                return;
              }

              navigation.navigate(
                'Checkout',
              );
            }}
            activeOpacity={0.88}
            className={`h-14 flex-row items-center justify-center rounded-2xl ${
              hasUnavailableItems
                ? 'bg-gray-400'
                : 'bg-black'
            }`}
          >
            <Text className="text-base font-extrabold text-white">
              Proceed to Checkout
            </Text>

            <Ionicons
              name="arrow-forward-outline"
              size={20}
              color="white"
              style={{
                marginLeft: 8,
              }}
            />
          </TouchableOpacity>
        </View>
      ) : null}

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


export default Cart;
