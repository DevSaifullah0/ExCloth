import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
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
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  supabase,
} from '../../lib/supabase';

import CouponSection from '../../components/checkout/CouponSection';

import AppModal from '../../components/common/AppModal';


const ADDRESS_COLUMNS = `
  id,
  user_id,
  full_name,
  phone,
  label,
  address,
  house_building,
  street_address,
  area,
  landmark,
  city,
  province,
  postal_code,
  country,
  is_default,
  created_at,
  updated_at
`;


const Checkout = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    selectedAddress,
    setSelectedAddress,
  ] = useState(null);

  const [
    cartItems,
    setCartItems,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    appliedCoupon,
    setAppliedCoupon,
  ] = useState(null);


  // ==========================================
  // MODAL
  // ==========================================

  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
  });


  const showModal = ({
    type = 'info',
    title = '',
    message = '',
    confirmText = 'OK',
  }) => {
    setModal({
      visible: true,
      type,
      title,
      message,
      confirmText,
    });
  };


  const closeModal = () => {
    setModal(prev => ({
      ...prev,
      visible: false,
    }));
  };


  // ==========================================
  // LOAD CHECKOUT
  // ==========================================

  const loadCheckout =
    useCallback(
      async () => {
        try {
          setLoading(true);

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
            showModal({
              type: 'warning',
              title: 'Login Required',
              message:
                'Your session has expired. Please login again.',
              confirmText: 'OK',
            });

            return;
          }


          // =====================================
          // SHIPPING ADDRESS
          // =====================================

          const passedAddress =
            route.params
              ?.selectedAddress;

          let addressData =
            null;


          if (
            passedAddress?.id
          ) {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  'shipping_addresses',
                )
                .select(
                  ADDRESS_COLUMNS,
                )
                .eq(
                  'id',
                  passedAddress.id,
                )
                .eq(
                  'user_id',
                  user.id,
                )
                .maybeSingle();

            if (error) {
              throw error;
            }

            addressData =
              data || null;
          }


          if (!addressData) {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  'shipping_addresses',
                )
                .select(
                  ADDRESS_COLUMNS,
                )
                .eq(
                  'user_id',
                  user.id,
                )
                .eq(
                  'is_default',
                  true,
                )
                .limit(1)
                .maybeSingle();

            if (error) {
              throw error;
            }

            addressData =
              data || null;
          }


          // If user has addresses but none is default,
          // use the most recently updated one for checkout.
          if (!addressData) {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  'shipping_addresses',
                )
                .select(
                  ADDRESS_COLUMNS,
                )
                .eq(
                  'user_id',
                  user.id,
                )
                .order(
                  'updated_at',
                  {
                    ascending:
                      false,
                  },
                )
                .limit(1)
                .maybeSingle();

            if (error) {
              throw error;
            }

            addressData =
              data || null;
          }


          setSelectedAddress(
            addressData,
          );


          // =====================================
          // LOAD CART
          // =====================================

          const {
            data: cartData,
            error: cartError,
          } =
            await supabase
              .from(
                'cart_items',
              )
              .select(`
                id,
                product_id,
                variant_id,
                quantity,

                products (
                  id,
                  name,
                  price,
                  image_url,
                  stock_quantity
                )
              `)
              .eq(
                'user_id',
                user.id,
              );


          if (cartError) {
            throw cartError;
          }


          const rawCart =
            (cartData || [])
              .filter(
                item =>
                  item.products,
              );


          // =====================================
          // GET VARIANT IDS
          // =====================================

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


          // =====================================
          // FETCH VARIANTS
          // =====================================

          let variants = [];


          if (
            variantIds.length >
            0
          ) {
            const {
              data:
                variantData,

              error:
                variantError,
            } =
              await supabase
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


          // =====================================
          // VARIANT LOOKUP
          // =====================================

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


          // =====================================
          // FORMAT CHECKOUT ITEMS
          // =====================================

          const formatted =
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


                const unavailable =
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

                  product,

                  variant,

                  quantity:
                    Number(
                      item.quantity,
                    ),

                  unitPrice,

                  availableStock,

                  unavailable,
                };
              },
            );


          setCartItems(
            formatted,
          );

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Checkout Load Error:',
              error.message,
            );
          }


          showModal({
            type: 'error',
            title: 'Checkout Error',
            message:
              error.message ||
              'Unable to load checkout information.',
            confirmText: 'Try Again',
          });

        } finally {
          setLoading(false);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        route.params
          ?.selectedAddress
          ?.id,
      ],
    );


  // ==========================================
  // REFRESH WHEN CHECKOUT OPENS
  // ==========================================

  useFocusEffect(
    useCallback(
      () => {
        loadCheckout();
      },
      [
        loadCheckout,
      ],
    ),
  );


  // ==========================================
  // CART TOTALS
  // ==========================================

  const subtotal =
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


  const discountAmount =
    Math.min(
      Number(
        appliedCoupon
          ?.discountAmount ||
          0,
      ),
      subtotal,
    );


  const totalAmount =
    Math.max(
      subtotal -
      discountAmount,
      0,
    );


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


  const hasInvalidItems =
    cartItems.some(
      item =>
        item.unavailable ||
        item.availableStock <=
          0 ||
        item.quantity >
          item.availableStock,
    );


  // ==========================================
  // ADDRESS DISPLAY
  // ==========================================

  const getAddressText =
    address => {
      if (!address) {
        return '';
      }

      const structured = [
        address.house_building,
        address.street_address,
        address.area,
      ]
        .filter(Boolean)
        .join(', ');

      return (
        structured ||
        address.address ||
        ''
      );
    };


  const getLocationText =
    address => {
      if (!address) {
        return '';
      }

      return [
        address.city,
        address.province,
        address.postal_code,
        address.country,
      ]
        .filter(Boolean)
        .join(', ');
    };


  // ==========================================
  // ADDRESS ACTION
  // ==========================================

  const handleAddressAction =
    () => {
      if (selectedAddress) {
        navigation.navigate(
          'ShippingAddresses',
          {
            selectedAddressId:
              selectedAddress.id,
          },
        );

        return;
      }


      navigation.navigate(
        'AddressForm',
        {
          returnTo:
            'Checkout',
        },
      );
    };


  // ==========================================
  // CONTINUE TO PAYMENT
  // ==========================================

  const handleContinue =
    () => {
      if (
        cartItems.length ===
        0
      ) {
        showModal({
          type: 'warning',
          title: 'Empty Cart',
          message:
            'Your cart is empty.',
          confirmText: 'OK',
        });

        return;
      }


      if (hasInvalidItems) {
        showModal({
          type: 'warning',
          title: 'Review Cart',
          message:
            'Some products are unavailable or exceed available stock. Please review your cart first.',
          confirmText: 'Review Cart',
        });

        return;
      }


      if (
        !selectedAddress?.id
      ) {
        showModal({
          type: 'warning',
          title: 'Shipping Address',
          message:
            'Please add a shipping address before continuing to payment.',
          confirmText: 'OK',
        });

        return;
      }


      navigation.navigate(
        'Payment',
        {
          shippingAddress:
            selectedAddress,

          couponCode:
            appliedCoupon?.code ||
            null,

          appliedCoupon:
            appliedCoupon || null,

          checkoutSubtotal:
            subtotal,

          checkoutDiscount:
            discountAmount,

          checkoutTotal:
            totalAmount,
        },
      );
    };


  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">

        <ActivityIndicator
          size="large"
          color="black"
        />

        <Text className="mt-3 text-gray-500">
          Loading checkout...
        </Text>

      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView
      edges={[
        'top',
        'left',
        'right',
      ]}
      className="flex-1 bg-white"
    >
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            170 +
            Math.max(
              insets.bottom,
              16,
            ),
        }}
      >
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
              Checkout
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Review everything before payment.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="bag-check-outline"
              size={22}
              color="white"
            />
          </View>
        </View>


        {/* CHECKOUT PROGRESS */}
        <View className="mt-7 rounded-3xl bg-black p-5">
          <View className="flex-row items-center justify-between">
            <View className="items-center">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                <Ionicons
                  name="checkmark"
                  size={18}
                  color="black"
                />
              </View>

              <Text className="mt-2 text-xs font-bold text-white">
                Cart
              </Text>
            </View>

            <View className="mx-2 h-px flex-1 bg-gray-600" />

            <View className="items-center">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                <Text className="font-extrabold text-black">
                  2
                </Text>
              </View>

              <Text className="mt-2 text-xs font-bold text-white">
                Address
              </Text>
            </View>

            <View className="mx-2 h-px flex-1 bg-gray-600" />

            <View className="items-center">
              <View className="h-9 w-9 items-center justify-center rounded-full border border-gray-600">
                <Text className="font-extrabold text-gray-400">
                  3
                </Text>
              </View>

              <Text className="mt-2 text-xs font-bold text-gray-400">
                Payment
              </Text>
            </View>
          </View>
        </View>


        {/* SHIPPING ADDRESS */}
        <View className="mb-3 mt-8 flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-extrabold text-black">
              Shipping Address
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Where should we deliver?
            </Text>
          </View>

          {selectedAddress ? (
            <TouchableOpacity
              onPress={
                handleAddressAction
              }
              activeOpacity={0.8}
              className="rounded-full bg-gray-100 px-4 py-2"
            >
              <Text className="text-sm font-extrabold text-black">
                Change
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {selectedAddress ? (
          <TouchableOpacity
            onPress={
              handleAddressAction
            }
            activeOpacity={0.85}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-5"
          >
            <View className="flex-row items-start">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-black">
                <Ionicons
                  name={
                    String(
                      selectedAddress.label ||
                        '',
                    ).toLowerCase() ===
                    'office'
                      ? 'business-outline'
                      : 'home-outline'
                  }
                  size={25}
                  color="white"
                />
              </View>

              <View className="ml-4 flex-1">
                <View className="flex-row flex-wrap items-center">
                  <Text className="text-lg font-extrabold text-black">
                    {selectedAddress.label ||
                      'Address'}
                  </Text>

                  {selectedAddress.is_default ? (
                    <View className="ml-2 rounded-full bg-black px-2.5 py-1">
                      <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white">
                        Default
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text className="mt-3 font-extrabold text-black">
                  {selectedAddress.full_name ||
                    'Recipient'}
                </Text>

                {selectedAddress.phone ? (
                  <View className="mt-2 flex-row items-center">
                    <Ionicons
                      name="call-outline"
                      size={15}
                      color="#6B7280"
                    />

                    <Text className="ml-2 text-sm font-semibold text-gray-500">
                      {selectedAddress.phone}
                    </Text>
                  </View>
                ) : null}

                <View className="mt-3 flex-row items-start">
                  <Ionicons
                    name="location-outline"
                    size={17}
                    color="#6B7280"
                    style={{
                      marginTop: 2,
                    }}
                  />

                  <View className="ml-2 flex-1">
                    <Text className="leading-5 text-gray-600">
                      {getAddressText(
                        selectedAddress,
                      )}
                    </Text>

                    <Text className="mt-1 leading-5 text-gray-500">
                      {getLocationText(
                        selectedAddress,
                      )}
                    </Text>
                  </View>
                </View>

                {selectedAddress.landmark ? (
                  <Text className="mt-2 text-xs font-semibold text-gray-400">
                    Landmark: {selectedAddress.landmark}
                  </Text>
                ) : null}
              </View>

              <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                <Ionicons
                  name="chevron-forward-outline"
                  size={18}
                  color="black"
                />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={
              handleAddressAction
            }
            activeOpacity={0.85}
            className="items-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-7"
          >
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="location-outline"
                size={30}
                color="black"
              />
            </View>

            <Text className="mt-4 text-lg font-extrabold text-black">
              Add Shipping Address
            </Text>

            <Text className="mt-2 text-center leading-5 text-gray-500">
              Add recipient and delivery details before continuing.
            </Text>

            <View className="mt-5 flex-row items-center rounded-2xl bg-black px-5 py-3">
              <Ionicons
                name="add-outline"
                size={19}
                color="white"
              />

              <Text className="ml-2 font-extrabold text-white">
                Add Address
              </Text>
            </View>
          </TouchableOpacity>
        )}


        {/* PROMO CODE */}
        <View className="mt-8">
          <View className="mb-3 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Ionicons
                name="pricetag-outline"
                size={20}
                color="black"
              />
            </View>

            <View className="ml-3">
              <Text className="text-xl font-extrabold text-black">
                Coupon
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Apply an eligible discount code.
              </Text>
            </View>
          </View>

          <CouponSection
            subtotal={
              subtotal
            }
            appliedCoupon={
              appliedCoupon
            }
            onCouponApplied={
              setAppliedCoupon
            }
            onCouponRemoved={() =>
              setAppliedCoupon(
                null,
              )
            }
            disabled={
              loading ||
              hasInvalidItems ||
              cartItems.length ===
                0
            }
          />
        </View>


        {/* ORDER SUMMARY */}
        <View className="mb-3 mt-8 flex-row items-end justify-between">
          <View>
            <Text className="text-xl font-extrabold text-black">
              Order Summary
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Review products and quantities.
            </Text>
          </View>

          <View className="rounded-full bg-black px-3 py-2">
            <Text className="text-xs font-extrabold text-white">
              {totalQuantity}{' '}
              {totalQuantity === 1
                ? 'item'
                : 'items'}
            </Text>
          </View>
        </View>

        {cartItems.map(
          item => {
            const product =
              item.product;

            const variant =
              item.variant;

            const itemTotal =
              item.unitPrice *
              item.quantity;

            return (
              <View
                key={
                  item.cartId
                }
                className="mb-4 overflow-hidden rounded-3xl bg-gray-100 p-4"
              >
                <View className="flex-row">
                  <View className="h-24 w-24 overflow-hidden rounded-2xl bg-white">
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
                        <Ionicons
                          name="shirt-outline"
                          size={32}
                          color="#9CA3AF"
                        />
                      </View>
                    )}
                  </View>

                  <View className="ml-4 flex-1">
                    <Text
                      numberOfLines={2}
                      className="text-base font-extrabold text-black"
                    >
                      {product.name}
                    </Text>

                    {variant ? (
                      <View className="mt-2 flex-row flex-wrap">
                        {variant.size ? (
                          <View className="mb-1 mr-2 rounded-full bg-white px-3 py-1.5">
                            <Text className="text-xs font-bold text-gray-600">
                              Size {variant.size}
                            </Text>
                          </View>
                        ) : null}

                        {variant.color ? (
                          <View className="mb-1 rounded-full bg-white px-3 py-1.5">
                            <Text className="text-xs font-bold text-gray-600">
                              {variant.color}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    <View className="mt-3 flex-row items-end justify-between">
                      <Text className="text-sm font-semibold text-gray-500">
                        Qty {item.quantity}
                      </Text>

                      <Text className="text-base font-extrabold text-black">
                        Rs {itemTotal}
                      </Text>
                    </View>
                  </View>
                </View>

                {item.unavailable ? (
                  <View className="mt-3 flex-row items-center rounded-2xl bg-white p-3">
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color="#DC2626"
                    />

                    <Text className="ml-2 flex-1 text-xs font-bold text-red-600">
                      This option is no longer available.
                    </Text>
                  </View>
                ) : null}

                {!item.unavailable &&
                item.quantity >
                  item.availableStock ? (
                  <View className="mt-3 flex-row items-center rounded-2xl bg-white p-3">
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color="#DC2626"
                    />

                    <Text className="ml-2 flex-1 text-xs font-bold text-red-600">
                      Only {item.availableStock} available.
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          },
        )}


        {/* TOTALS */}
        <View className="mt-2 rounded-3xl bg-black p-5">
          <Text className="text-lg font-extrabold text-white">
            Price Details
          </Text>

          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-gray-400">
              Subtotal
            </Text>

            <Text className="font-bold text-white">
              Rs {subtotal.toFixed(0)}
            </Text>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-gray-400">
              Shipping
            </Text>

            <Text className="font-extrabold text-white">
              Free
            </Text>
          </View>

          {appliedCoupon &&
          discountAmount > 0 ? (
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-gray-400">
                Discount ({appliedCoupon.code})
              </Text>

              <Text className="font-extrabold text-white">
                - Rs {discountAmount.toFixed(0)}
              </Text>
            </View>
          ) : null}

          <View className="my-5 h-px bg-gray-700" />

          <View className="flex-row items-end justify-between">
            <Text className="text-base font-bold text-gray-300">
              Total
            </Text>

            <Text className="text-3xl font-extrabold text-white">
              Rs {totalAmount.toFixed(0)}
            </Text>
          </View>
        </View>


        {/* INVALID CART WARNING */}
        {hasInvalidItems ? (
          <View className="mt-5 flex-row items-center rounded-2xl border border-red-100 bg-red-50 p-4">
            <Ionicons
              name="warning-outline"
              size={20}
              color="#DC2626"
            />

            <Text className="ml-3 flex-1 text-sm font-bold text-red-600">
              Some cart items need attention before checkout.
            </Text>
          </View>
        ) : null}
      </ScrollView>


      {/* FIXED CONTINUE */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-5 pt-4"
        style={{
          paddingBottom:
            Math.max(
              insets.bottom,
              16,
            ),
        }}
      >
        <View className="mb-3 flex-row items-end justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Payable Total
            </Text>

            <Text className="mt-1 text-xl font-extrabold text-black">
              Rs {totalAmount.toFixed(0)}
            </Text>
          </View>

          <Text className="text-xs font-semibold text-gray-500">
            {totalQuantity}{' '}
            {totalQuantity === 1
              ? 'item'
              : 'items'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={
            handleContinue
          }
          disabled={
            hasInvalidItems ||
            cartItems.length ===
              0 ||
            !selectedAddress?.id
          }
          activeOpacity={0.85}
          className={`h-14 flex-row items-center justify-center rounded-2xl ${
            hasInvalidItems ||
            cartItems.length ===
              0 ||
            !selectedAddress?.id
              ? 'bg-gray-400'
              : 'bg-black'
          }`}
        >
          <Text className="text-base font-extrabold text-white">
            Continue to Payment
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

      <AppModal
        visible={
          modal.visible
        }
        type={
          modal.type
        }
        title={
          modal.title
        }
        message={
          modal.message
        }
        confirmText={
          modal.confirmText
        }
        onConfirm={
          closeModal
        }
        onCancel={
          closeModal
        }
      />
    </SafeAreaView>
  );
};


export default Checkout;
