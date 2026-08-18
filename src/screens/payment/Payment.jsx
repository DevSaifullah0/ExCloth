import { getUserFriendlyError } from '../../utils/getUserFriendlyError';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import Config from 'react-native-config';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  supabase,
} from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';

import {
  ONLINE_PAYMENT_METHOD_CODES,
  PRODUCTION_PAYMENT_ADAPTER_AVAILABLE,
  buildCheckoutFingerprint,
  buildCreateOrderRequest,
  resolveOnlinePaymentAvailability,
} from '../../utils/paymentOrder';

import {
  clearOrderIntent,
  getOrCreateOrderIntent,
} from '../../utils/orderIntentStorage';


const onlinePaymentAvailability =
  resolveOnlinePaymentAvailability({
    isDev: __DEV__,
    runtimeConfig: Config,
    hasProviderAdapter:
      PRODUCTION_PAYMENT_ADAPTER_AVAILABLE,
  });


const Payment = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const shippingAddress =
    route.params?.shippingAddress;

  const couponCode =
    route.params?.couponCode ||
    null;

  const appliedCoupon =
    route.params?.appliedCoupon ||
    null;

  const checkoutSubtotal =
    Number(
      route.params?.checkoutSubtotal ||
      0,
    );

  const checkoutDiscount =
    Number(
      route.params?.checkoutDiscount ||
      0,
    );

  const checkoutTotalParam =
    route.params?.checkoutTotal;


  // ==========================================
  // PAYMENT METHODS
  // ==========================================

  const [
    methods,
    setMethods,
  ] = useState([]);

  const [
    selectedMethod,
    setSelectedMethod,
  ] = useState(null);

  const [
    onlineMethodsUnavailable,
    setOnlineMethodsUnavailable,
  ] = useState(false);


  // ==========================================
  // CART
  // ==========================================

  const [
    cartItems,
    setCartItems,
  ] = useState([]);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(null);

  const [
    orderIntent,
    setOrderIntent,
  ] = useState(null);


  // ==========================================
  // LOADING
  // ==========================================

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    placingOrder,
    setPlacingOrder,
  ] = useState(false);

  const placingOrderRef =
    useRef(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

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
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadPaymentData();
    // loadPaymentData intentionally runs once for this checkout route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ==========================================
  // LOAD PAYMENT DATA
  // ==========================================

  const loadPaymentData =
    async () => {
      try {
        setLoading(true);

        setErrorMessage('');

        setOrderIntent(null);

        setCurrentUserId(null);


        // =====================================
        // CURRENT USER
        // =====================================

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


        setCurrentUserId(
          user.id,
        );


        // =====================================
        // PAYMENT METHODS
        // =====================================

        const {
          data: methodData,
          error: methodError,
        } =
          await supabase
            .from(
              'payment_methods',
            )
            .select(`
              id,
              code,
              display_name,
              gateway,
              is_online,
              requires_gateway,
              instructions,
              sort_order
            `)
            .eq(
              'is_active',
              true,
            )
            .order(
              'sort_order',
              {
                ascending:
                  true,
              },
            );


        if (methodError) {
          throw methodError;
        }


        const allMethods =
          methodData || [];

        const isOnlineMethod =
          method =>
            Boolean(
              method.is_online,
            ) ||
            ONLINE_PAYMENT_METHOD_CODES.includes(
              method.code,
            );

        const loadedMethods =
          allMethods.filter(
            method =>
              !isOnlineMethod(
                method,
              ) ||
              onlinePaymentAvailability.allowed,
          );


        setOnlineMethodsUnavailable(
          !onlinePaymentAvailability.allowed &&
            allMethods.some(
              isOnlineMethod,
            ),
        );


        setMethods(
          loadedMethods,
        );


        // =====================================
        // DEFAULT TO COD
        //
        // Because COD is currently the
        // configured production payment method.
        // =====================================

        const codMethod =
          loadedMethods.find(
            method =>
              method.code ===
              'cod',
          );


        setSelectedMethod(
          codMethod ||
            loadedMethods[0] ||
            null,
        );


        // =====================================
        // FETCH CART
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
        // COLLECT VARIANT IDS
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
        // FORMAT CART
        // =====================================

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


              const basePrice =
                Number(
                  product.price ||
                    0,
                );


              const priceAdjustment =
                Number(
                  variant
                    ?.price_adjustment ||
                    0,
                );


              const unitPrice =
                basePrice +
                priceAdjustment;


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


              const wrongProductVariant =
                Boolean(
                  variant &&
                  String(
                    variant.product_id,
                  ) !==
                    String(
                      product.id,
                    ),
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

                unitPrice,

                availableStock,

                variantUnavailable,

                wrongProductVariant,
              };
            },
          );


        setCartItems(
          formattedCart,
        );


        const checkoutFingerprint =
          buildCheckoutFingerprint({
            userId: user.id,
            shippingAddressId:
              shippingAddress?.id,
            couponCode,
            cartItems:
              formattedCart,
          });

        const preparedOrderIntent =
          await getOrCreateOrderIntent({
            userId: user.id,
            fingerprint:
              checkoutFingerprint,
          });


        setOrderIntent(
          preparedOrderIntent,
        );

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Payment Load Error:',
            error.message,
          );
        }


        setErrorMessage(
          'Unable to load payment information.',
        );

      } finally {
        setLoading(false);
      }
    };


  // ==========================================
  // ITEM COUNT
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
  // DISPLAY CART TOTAL
  //
  // UX ONLY.
  // create-order recalculates this server-side.
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
  // COUPON DISPLAY TOTALS
  // UX ONLY — SERVER RECALCULATES EVERYTHING
  // ==========================================

  const displaySubtotal =
    checkoutSubtotal > 0
      ? checkoutSubtotal
      : cartTotal;

  const displayDiscount =
    couponCode
      ? Math.min(
          Math.max(
            checkoutDiscount ||
              Number(
                appliedCoupon
                  ?.discountAmount ||
                  0,
              ),
            0,
          ),
          displaySubtotal,
        )
      : 0;

  const calculatedDisplayTotal =
    Math.max(
      displaySubtotal -
        displayDiscount,
      0,
    );

  const displayTotal =
    checkoutTotalParam !== null &&
    checkoutTotalParam !== undefined &&
    Number.isFinite(
      Number(checkoutTotalParam),
    )
      ? Math.max(
          Number(
            checkoutTotalParam,
          ),
          0,
        )
      : calculatedDisplayTotal;


  // ==========================================
  // INVALID CART CHECK
  // ==========================================

  const hasInvalidItems =
    cartItems.some(
      item =>
        item.variantUnavailable ||
        item.wrongProductVariant ||
        item.availableStock <=
          0 ||
        item.quantity >
          item.availableStock,
    );


  // ==========================================
  // GET EDGE FUNCTION ERROR MESSAGE
  // ==========================================

  const getFunctionErrorMessage =
    async error => {
      try {
        const response =
          error?.context;


        if (
          response &&
          typeof response.json ===
            'function'
        ) {
          const body =
            await response.json();


          if (
            typeof body?.error ===
            'string'
          ) {
            return body.error;
          }


          if (
            typeof body?.message ===
            'string'
          ) {
            return body.message;
          }


          if (
            typeof body?.error
              ?.message ===
            'string'
          ) {
            return body.error
              .message;
          }
        }

      } catch (parseError) {
        if (__DEV__) {
          console.error(
            'Function Error Parse:',
            parseError.message,
          );
        }
      }


      return (
        getUserFriendlyError(error, 'Unable to place your order.')
      );
    };


  // ==========================================
  // PLACE ORDER
  // ==========================================

  const handlePlaceOrder =
    async () => {
      if (
        placingOrder ||
        placingOrderRef.current
      ) {
        return;
      }

      // ======================================
      // DELIVERY ADDRESS
      // ======================================

      if (
        !shippingAddress?.id
      ) {
        showModal({
          type: 'warning',
          title: 'Delivery Address',
          message:
            'Delivery address is missing.',
        });

        return;
      }


      // ======================================
      // PAYMENT METHOD
      // ======================================

      if (!selectedMethod) {
        showModal({
          type: 'warning',
          title: 'Payment Method',
          message:
            'Please select a payment method.',
        });

        return;
      }


      // ======================================
      // CART
      // ======================================

      if (
        cartItems.length === 0
      ) {
        showModal({
          type: 'warning',
          title: 'Empty Cart',
          message:
            'Your cart is empty.',
        });

        return;
      }


      if (
        hasInvalidItems
      ) {
        showModal({
          type: 'warning',
          title: 'Review Cart',
          message:
            'Some cart items are unavailable or exceed available stock. Please return to your cart and review them.',
        });

        return;
      }


      // ======================================
      // ORDER INTENT
      // ======================================

      if (
        !currentUserId ||
        !orderIntent
          ?.idempotencyKey
      ) {
        showModal({
          type: 'error',
          title: 'Checkout Session',
          message:
            'Your secure checkout session is not ready. Please reload and try again.',
          confirmText: 'OK',
        });

        return;
      }


      // ======================================
      // ONLINE / NON-COD PAYMENT ROUTING
      //
      // IMPORTANT:
      // Do NOT create the order here for online
      // payment methods. First navigate to the
      // payment-specific screen so the user can
      // enter the required TEST payment details.
      //
      // cartTotal is passed only for UI display.
      // The backend must calculate the real order
      // total again when the order is created.
      // ======================================

      const paymentScreenMap = {
        card:
          'CardPayment',

        easypaisa:
          'EasypaisaPayment',

        jazzcash:
          'JazzCashPayment',

        bank_transfer:
          'BankTransfer',
      };


      if (
        selectedMethod.code !==
        'cod'
      ) {
        if (
          !onlinePaymentAvailability.allowed
        ) {
          showModal({
            type: 'warning',
            title: 'Online Payment Unavailable',
            message:
              'Online payments are not available in this build. Please choose Cash on Delivery.',
          });

          return;
        }


        const paymentScreen =
          paymentScreenMap[
            selectedMethod.code
          ];


        if (!paymentScreen) {
          showModal({
            type: 'warning',
            title: 'Payment Method',
            message:
              'This payment method is not supported yet.',
          });

          return;
        }


        navigation.navigate(
          paymentScreen,
          {
            shippingAddress,

            paymentMethod:
              selectedMethod.code,

            paymentMethodName:
              selectedMethod
                .display_name,

            displayAmount:
              displayTotal,

            totalQuantity,

            couponCode,

            appliedCoupon,

            checkoutSubtotal:
              displaySubtotal,

            checkoutDiscount:
              displayDiscount,

            checkoutTotal:
              displayTotal,

            orderIdempotencyKey:
              orderIntent
                .idempotencyKey,

            paymentFlowMode:
              onlinePaymentAvailability
                .mode,
          },
        );


        return;
      }


      // ======================================
      // COD ONLY
      // ======================================

      try {
        placingOrderRef.current =
          true;

        setPlacingOrder(true);


        // =====================================
        // SECURE SERVER-SIDE ORDER CREATION
        //
        // COD is the only payment method that
        // creates the order directly from this
        // screen.
        //
        // Client does NOT send prices/totals.
        // create-order recalculates everything
        // from the database.
        // =====================================

        const createOrderRequest =
          buildCreateOrderRequest({
            idempotencyKey:
              orderIntent
                .idempotencyKey,
            body: {
              shipping_address_id:
                shippingAddress.id,

              payment_method:
                'cod',

              coupon_code:
                couponCode ||
                null,
            },
          });


        const {
          data,
          error,
        } =
          await supabase.functions
            .invoke(
              'create-order',
              createOrderRequest,
            );


        if (error) {
          const message =
            await getFunctionErrorMessage(
              error,
            );


          throw new Error(
            message,
          );
        }


        // =====================================
        // SERVER-SIDE ERROR RESPONSE
        // =====================================

        if (
          data?.error
        ) {
          throw new Error(
            typeof data.error ===
              'string'
              ? data.error
              : data.error
                  ?.message ||
                'Order could not be created.',
          );
        }


        // =====================================
        // ORDER ID REQUIRED
        // =====================================

        if (
          !data?.order_id
        ) {
          throw new Error(
            'Order could not be created.',
          );
        }


        // =====================================
        // COD SUCCESS
        // =====================================

        try {
          await clearOrderIntent({
            userId:
              currentUserId,
            idempotencyKey:
              orderIntent
                .idempotencyKey,
          });
        } catch (
          cleanupError
        ) {
          if (__DEV__) {
            console.error(
              'Order Intent Cleanup Error:',
              cleanupError.message,
            );
          }
        }

        navigation.replace(
          'OrderSuccess',
          {
            orderId:
              data.order_id,
          },
        );

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Place Order Error:',
            error.message,
          );
        }


        showModal({
          type: 'error',
          title: 'Order Failed',
          message:
            getUserFriendlyError(error, 'Unable to place your order.'),
          confirmText: 'Try Again',
        });

      } finally {
        placingOrderRef.current =
          false;

        setPlacingOrder(false);
      }
    };


  // ==========================================
  // PAYMENT METHOD ICON
  // ==========================================

  const getMethodIcon =
    code => {
      switch (code) {
        case 'cod':
          return 'cash-outline';

        case 'card':
          return 'card-outline';

        case 'jazzcash':
          return 'phone-portrait-outline';

        case 'easypaisa':
          return 'phone-portrait-outline';

        case 'bank_transfer':
          return 'business-outline';

        default:
          return 'wallet-outline';
      }
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
          Loading payment methods...
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
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            190 +
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
            disabled={
              placingOrder
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
              Payment
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Choose how you want to pay.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="wallet-outline"
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
                <Ionicons
                  name="checkmark"
                  size={18}
                  color="black"
                />
              </View>

              <Text className="mt-2 text-xs font-bold text-white">
                Address
              </Text>
            </View>

            <View className="mx-2 h-px flex-1 bg-gray-600" />

            <View className="items-center">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                <Text className="font-extrabold text-black">
                  3
                </Text>
              </View>

              <Text className="mt-2 text-xs font-bold text-white">
                Payment
              </Text>
            </View>
          </View>
        </View>


        {/* ERROR */}
        {errorMessage ? (
          <View className="mt-7 items-center rounded-3xl bg-gray-100 p-7">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={27}
                color="black"
              />
            </View>

            <Text className="mt-4 text-lg font-extrabold text-black">
              Payment information unavailable
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={
                loadPaymentData
              }
              activeOpacity={0.85}
              className="mt-5 rounded-2xl bg-black px-6 py-3"
            >
              <Text className="font-extrabold text-white">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}


        {/* PAYMENT METHODS */}
        {!errorMessage ? (
          <View className="mt-8">
            <View className="mb-4 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons
                  name="card-outline"
                  size={20}
                  color="black"
                />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-xl font-extrabold text-black">
                  Payment Method
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Select one method to continue.
                </Text>
              </View>
            </View>

            {methods.map(
              method => {
                const selected =
                  selectedMethod
                    ?.id ===
                  method.id;

                return (
                  <TouchableOpacity
                    key={
                      method.id
                    }
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected,
                    }}
                    accessibilityLabel={
                      method.display_name
                    }
                    onPress={() =>
                      setSelectedMethod(
                        method,
                      )
                    }
                    disabled={
                      placingOrder
                    }
                    activeOpacity={0.85}
                    className={`mb-4 overflow-hidden rounded-3xl border-2 ${
                      selected
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <View className="p-5">
                      <View className="flex-row items-center">
                        <View
                          className={`h-14 w-14 items-center justify-center rounded-2xl ${
                            selected
                              ? 'bg-black'
                              : 'bg-gray-100'
                          }`}
                        >
                          <Ionicons
                            name={getMethodIcon(
                              method.code,
                            )}
                            size={25}
                            color={
                              selected
                                ? 'white'
                                : 'black'
                            }
                          />
                        </View>

                        <View className="ml-4 flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-base font-extrabold text-black">
                              {
                                method.display_name
                              }
                            </Text>

                            {method.code ===
                            'cod' ? (
                              <View className="ml-2 rounded-full bg-gray-200 px-2.5 py-1">
                                <Text className="text-[10px] font-extrabold uppercase tracking-wider text-black">
                                  Recommended
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {method.instructions ? (
                            <Text className="mt-2 text-sm leading-5 text-gray-500">
                              {
                                method.instructions
                              }
                            </Text>
                          ) : null}

                          {method.is_online ? (
                            <View className="mt-2 flex-row items-center">
                              <Ionicons
                                name="shield-checkmark-outline"
                                size={14}
                                color="#6B7280"
                              />

                              <Text className="ml-1.5 text-xs font-semibold text-gray-500">
                                Online payment
                              </Text>
                            </View>
                          ) : (
                            <View className="mt-2 flex-row items-center">
                              <Ionicons
                                name="cash-outline"
                                size={14}
                                color="#6B7280"
                              />

                              <Text className="ml-1.5 text-xs font-semibold text-gray-500">
                                Pay on delivery
                              </Text>
                            </View>
                          )}
                        </View>

                        <View
                          className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
                            selected
                              ? 'border-black bg-black'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {selected ? (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="white"
                            />
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              },
            )}

            {onlineMethodsUnavailable ? (
              <View className="mb-4 flex-row items-start rounded-3xl bg-gray-100 p-5">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={21}
                    color="black"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="font-extrabold text-black">
                    Online payments unavailable
                  </Text>

                  <Text className="mt-1 text-sm leading-5 text-gray-500">
                    A verified payment provider is not enabled in this build. Cash on Delivery remains available.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}


        {/* DELIVERY ADDRESS */}
        {shippingAddress ? (
          <View className="mt-4">
            <View className="mb-3 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons
                  name="location-outline"
                  size={20}
                  color="black"
                />
              </View>

              <View className="ml-3">
                <Text className="text-xl font-extrabold text-black">
                  Delivery Address
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Order will be delivered here.
                </Text>
              </View>
            </View>

            <View className="rounded-3xl border border-gray-200 bg-white p-5">
              <View className="flex-row items-start">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black">
                  <Ionicons
                    name="home-outline"
                    size={22}
                    color="white"
                  />
                </View>

                <View className="ml-4 flex-1">
                  {shippingAddress.full_name ? (
                    <Text className="font-extrabold text-black">
                      {shippingAddress.full_name}
                    </Text>
                  ) : null}

                  <Text className="mt-2 leading-6 text-gray-600">
                    {
                      shippingAddress.address
                    }
                  </Text>

                  <Text className="mt-1 font-semibold text-gray-500">
                    {
                      shippingAddress.city
                    }
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}


        {/* ITEMS */}
        {!errorMessage &&
        cartItems.length >
          0 ? (
          <View className="mt-8">
            <View className="mb-4 flex-row items-end justify-between">
              <View>
                <Text className="text-xl font-extrabold text-black">
                  Order Items
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Final product review before payment.
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
              (
                item,
                index,
              ) => {
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
                    className={`rounded-3xl bg-gray-100 p-5 ${
                      index > 0
                        ? 'mt-3'
                        : ''
                    }`}
                  >
                    <View className="flex-row items-start">
                      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                        <Text className="font-extrabold text-black">
                          {index + 1}
                        </Text>
                      </View>

                      <View className="ml-4 flex-1">
                        <Text
                          numberOfLines={2}
                          className="text-base font-extrabold text-black"
                        >
                          {
                            product.name
                          }
                        </Text>

                        <View className="mt-3 flex-row flex-wrap">
                          {variant?.size ? (
                            <View className="mb-2 mr-2 rounded-full bg-white px-3 py-1.5">
                              <Text className="text-xs font-bold text-gray-600">
                                Size {variant.size}
                              </Text>
                            </View>
                          ) : null}

                          {variant?.color ? (
                            <View className="mb-2 mr-2 rounded-full bg-white px-3 py-1.5">
                              <Text className="text-xs font-bold text-gray-600">
                                {variant.color}
                              </Text>
                            </View>
                          ) : null}

                          <View className="mb-2 rounded-full bg-white px-3 py-1.5">
                            <Text className="text-xs font-bold text-gray-600">
                              Qty {item.quantity}
                            </Text>
                          </View>
                        </View>

                        {variant?.sku ? (
                          <Text className="mt-1 text-xs font-semibold text-gray-400">
                            SKU {variant.sku}
                          </Text>
                        ) : null}

                        <View className="mt-4 flex-row items-end justify-between border-t border-gray-200 pt-4">
                          <Text className="text-sm font-semibold text-gray-500">
                            Rs {item.unitPrice} each
                          </Text>

                          <Text className="text-lg font-extrabold text-black">
                            Rs {itemTotal}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {item.variantUnavailable ? (
                      <View className="mt-3 flex-row items-center rounded-2xl bg-white p-3">
                        <Ionicons
                          name="alert-circle-outline"
                          size={17}
                          color="#DC2626"
                        />

                        <Text className="ml-2 flex-1 text-xs font-bold text-red-600">
                          This option is no longer available.
                        </Text>
                      </View>
                    ) : null}

                    {item.wrongProductVariant ? (
                      <View className="mt-3 flex-row items-center rounded-2xl bg-white p-3">
                        <Ionicons
                          name="alert-circle-outline"
                          size={17}
                          color="#DC2626"
                        />

                        <Text className="ml-2 flex-1 text-xs font-bold text-red-600">
                          Invalid product variant.
                        </Text>
                      </View>
                    ) : null}

                    {!item.variantUnavailable &&
                    !item.wrongProductVariant &&
                    item.quantity >
                      item.availableStock ? (
                      <View className="mt-3 flex-row items-center rounded-2xl bg-white p-3">
                        <Ionicons
                          name="alert-circle-outline"
                          size={17}
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
          </View>
        ) : null}


        {/* ORDER SUMMARY */}
        {!errorMessage ? (
          <View className="mt-8 rounded-3xl bg-black p-5">
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="receipt-outline"
                  size={21}
                  color="black"
                />
              </View>

              <View className="ml-3">
                <Text className="text-lg font-extrabold text-white">
                  Order Summary
                </Text>

                <Text className="mt-1 text-xs text-gray-400">
                  Final payable amount
                </Text>
              </View>
            </View>

            <View className="mt-5 flex-row justify-between">
              <Text className="text-gray-400">
                Items
              </Text>

              <Text className="font-bold text-white">
                {
                  totalQuantity
                }
              </Text>
            </View>

            <View className="mt-3 flex-row justify-between">
              <Text className="text-gray-400">
                Subtotal
              </Text>

              <Text className="font-bold text-white">
                Rs {displaySubtotal}
              </Text>
            </View>

            <View className="mt-3 flex-row justify-between">
              <Text className="text-gray-400">
                Shipping
              </Text>

              <Text className="font-extrabold text-white">
                Free
              </Text>
            </View>

            {couponCode &&
            displayDiscount > 0 ? (
              <View className="mt-3 flex-row justify-between">
                <Text className="text-gray-400">
                  Discount ({couponCode})
                </Text>

                <Text className="font-extrabold text-white">
                  - Rs {displayDiscount}
                </Text>
              </View>
            ) : null}

            <View className="my-5 h-px bg-gray-700" />

            <View className="flex-row items-end justify-between">
              <Text className="text-base font-bold text-gray-300">
                Total
              </Text>

              <Text className="text-3xl font-extrabold text-white">
                Rs {displayTotal}
              </Text>
            </View>
          </View>
        ) : null}


        {/* INVALID CART */}
        {hasInvalidItems ? (
          <View className="mt-5 flex-row items-start rounded-2xl border border-red-100 bg-red-50 p-4">
            <Ionicons
              name="warning-outline"
              size={20}
              color="#DC2626"
            />

            <Text className="ml-3 flex-1 text-sm font-bold leading-5 text-red-600">
              Your cart contains unavailable or out-of-stock items. Return to your cart before placing the order.
            </Text>
          </View>
        ) : null}
      </ScrollView>


      {/* FIXED ACTION */}
      {!errorMessage ? (
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
                Rs {displayTotal}
              </Text>
            </View>

            <Text className="text-xs font-semibold text-gray-500">
              {selectedMethod
                ?.display_name ||
                'Select method'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={
              handlePlaceOrder
            }
            disabled={
              placingOrder ||
              !selectedMethod ||
              !currentUserId ||
              !orderIntent ||
              cartItems.length ===
                0 ||
              hasInvalidItems
            }
            activeOpacity={0.85}
            className={`h-14 flex-row items-center justify-center rounded-2xl ${
              placingOrder ||
              !selectedMethod ||
              !currentUserId ||
              !orderIntent ||
              cartItems.length ===
                0 ||
              hasInvalidItems
                ? 'bg-gray-400'
                : 'bg-black'
            }`}
          >
            {placingOrder ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Ionicons
                  name={
                    selectedMethod
                      ?.code ===
                    'cod'
                      ? 'bag-check-outline'
                      : 'arrow-forward-outline'
                  }
                  size={21}
                  color="white"
                />

                <Text className="ml-2 text-base font-extrabold text-white">
                  {selectedMethod
                    ?.code ===
                  'cod'
                    ? 'Place Order'
                    : 'Continue Payment'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}


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


export default Payment;
