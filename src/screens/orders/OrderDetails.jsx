import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  supabase,
} from '../../lib/supabase';


const OrderDetails = ({
  navigation,
  route,
}) => {
  const orderId =
    route.params?.orderId;


  // ==========================================
  // ORDER DATA
  // ==========================================

  const [
    order,
    setOrder,
  ] = useState(null);

  const [
    items,
    setItems,
  ] = useState([]);

  const [
    payment,
    setPayment,
  ] = useState(null);

  const [
    returnRequest,
    setReturnRequest,
  ] = useState(null);


  // ==========================================
  // LOADING STATES
  // ==========================================

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


  // ==========================================
  // FETCH ORDER DETAILS
  // ==========================================

  const fetchOrderDetails =
    useCallback(async () => {
      try {
        setErrorMessage('');


        // =====================================
        // ORDER ID CHECK
        // =====================================

        if (!orderId) {
          throw new Error(
            'Order ID is missing.',
          );
        }


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


        // =====================================
        // ORDER
        // =====================================

        const {
          data: orderData,
          error: orderError,
        } =
          await supabase
            .from('orders')
            .select(`
              id,
              order_number,
              user_id,
              delivery_address,
              delivery_city,
              subtotal_amount,
              shipping_amount,
              discount_amount,
              total_amount,
              currency,
              status,
              payment_status,
              payment_method,
              cancel_reason,
              cancelled_at,
              delivered_at,
              created_at,
              updated_at
            `)
            .eq(
              'id',
              orderId,
            )
            .eq(
              'user_id',
              user.id,
            )
            .single();


        if (orderError) {
          throw orderError;
        }


        setOrder(
          orderData,
        );


        // =====================================
        // ORDER ITEMS
        //
        // IMPORTANT:
        // We read SAVED SNAPSHOTS here.
        //
        // We intentionally do NOT depend on
        // current product_variants data.
        // =====================================

        const {
          data: itemData,
          error: itemError,
        } =
          await supabase
            .from(
              'order_items',
            )
            .select(`
              id,
              order_id,
              product_id,
              variant_id,

              product_name,

              product_name_snapshot,
              variant_size_snapshot,
              variant_color_snapshot,
              variant_sku_snapshot,

              unit_price,
              quantity,
              subtotal,
              created_at
            `)
            .eq(
              'order_id',
              orderId,
            )
            .order(
              'created_at',
              {
                ascending:
                  true,
              },
            );


        if (itemError) {
          throw itemError;
        }


        setItems(
          itemData || [],
        );


        // =====================================
        // LATEST PAYMENT ATTEMPT
        // =====================================

        const {
          data: paymentData,
          error: paymentError,
        } =
          await supabase
            .from('payments')
            .select(`
              id,
              order_id,
              payment_method,
              amount,
              currency,
              status,
              gateway,
              gateway_transaction_id,
              gateway_reference,
              failure_reason,
              attempt_number,
              paid_at,
              created_at
            `)
            .eq(
              'order_id',
              orderId,
            )
            .order(
              'attempt_number',
              {
                ascending:
                  false,
              },
            )
            .limit(1)
            .maybeSingle();


        if (paymentError) {
          throw paymentError;
        }


        setPayment(
          paymentData,
        );

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Order Details Error:',
            error.message,
          );
        }


        setErrorMessage(
          'Unable to load order details.',
        );

      } finally {
        setLoading(false);

        setRefreshing(false);
      }
    }, [orderId]);


  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);


  // ==========================================
  // REFRESH
  // ==========================================

  const handleRefresh =
    () => {
      setRefreshing(true);

      fetchOrderDetails();
    };


  // ==========================================
  // FORMAT STATUS
  // ==========================================

  const formatStatus =
    status => {
      if (!status) {
        return '';
      }


      return status
        .replace(
          /_/g,
          ' ',
        )
        .replace(
          /\b\w/g,
          letter =>
            letter.toUpperCase(),
        );
    };


  // ==========================================
  // FORMAT PAYMENT METHOD
  // ==========================================

  const formatPaymentMethod =
    method => {
      switch (method) {
        case 'cod':
          return 'Cash on Delivery';

        case 'card':
          return 'Debit / Credit Card';

        case 'jazzcash':
          return 'JazzCash';

        case 'easypaisa':
          return 'Easypaisa';

        case 'bank_transfer':
          return 'Bank Transfer';

        default:
          return (
            method ||
            'Unknown'
          );
      }
    };


  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate =
    date => {
      if (!date) {
        return '';
      }


      return new Date(
        date,
      ).toLocaleString();
    };


  // ==========================================
  // CANCEL ELIGIBILITY
  // ==========================================

  const canCancel =
    ['pending', 'confirmed']
      .includes(
        String(
          order?.status || '',
        ).toLowerCase(),
      );


  // ==========================================
  // RETURN ELIGIBILITY
  // ==========================================

  const returnStatus =
    String(
      returnRequest?.status ||
        '',
    )
      .trim()
      .toLowerCase();


  const returnIsClosed =
    ['rejected', 'cancelled']
      .includes(
        returnStatus,
      );


  const hasActiveReturn =
    Boolean(
      returnRequest?.id,
    ) &&
    !returnIsClosed;


  const returnDeadline =
    order?.delivered_at
      ? new Date(
          new Date(
            order.delivered_at,
          ).getTime() +
            7 *
              24 *
              60 *
              60 *
              1000,
        )
      : null;


  const canRequestReturn =
    String(
      order?.status || '',
    )
      .trim()
      .toLowerCase() ===
      'delivered' &&
    returnDeadline &&
    !Number.isNaN(
      returnDeadline.getTime(),
    ) &&
    new Date() <=
      returnDeadline &&
    !hasActiveReturn;


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
          Loading order details...
        </Text>

      </SafeAreaView>
    );
  }


  const normalizedOrderStatus =
    String(
      order?.status || '',
    )
      .trim()
      .toLowerCase();

  const orderStatusIcon =
    normalizedOrderStatus ===
    'delivered'
      ? 'checkmark-circle-outline'
      : normalizedOrderStatus ===
          'shipped'
        ? 'paper-plane-outline'
        : normalizedOrderStatus ===
            'out_for_delivery'
          ? 'bicycle-outline'
          : normalizedOrderStatus ===
                'cancelled' ||
              normalizedOrderStatus ===
                'canceled'
            ? 'close-circle-outline'
            : normalizedOrderStatus ===
                  'processing' ||
                normalizedOrderStatus ===
                  'packed'
              ? 'cube-outline'
              : 'bag-check-outline';


  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-5"
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom: 44,
        }}
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
        }
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
              Order Details
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Full order, payment and delivery information.
            </Text>
          </View>
        </View>


        {/* ERROR */}
        {errorMessage ? (
          <View className="mt-12 items-center rounded-3xl bg-gray-100 p-8">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={31}
                color="black"
              />
            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              Unable to load order
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={
                fetchOrderDetails
              }
              activeOpacity={0.85}
              className="mt-6 rounded-2xl bg-black px-6 py-3"
            >
              <Text className="font-extrabold text-white">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}


        {!errorMessage &&
        order ? (
          <>
            {/* ORDER HERO */}
            <View className="mt-7 overflow-hidden rounded-3xl bg-black p-5">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Order Number
                  </Text>

                  <Text className="mt-2 text-2xl font-extrabold text-white">
                    #{order.order_number}
                  </Text>

                  <Text className="mt-2 text-sm font-semibold text-gray-400">
                    {formatDate(
                      order.created_at,
                    )}
                  </Text>
                </View>

                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
                  <Ionicons
                    name={
                      orderStatusIcon
                    }
                    size={27}
                    color="black"
                  />
                </View>
              </View>

              <View className="my-5 h-px bg-gray-700" />

              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Current Status
                  </Text>

                  <Text className="mt-1 text-lg font-extrabold text-white">
                    {formatStatus(
                      order.status,
                    )}
                  </Text>
                </View>

                <View className="rounded-full bg-white px-3 py-2">
                  <Text className="text-xs font-extrabold text-black">
                    {formatStatus(
                      order.payment_status,
                    )}
                  </Text>
                </View>
              </View>
            </View>


            {/* ORDER ACTIONS */}
            <View className="mt-5">
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'OrderTracking',
                    {
                      orderId:
                        order.id,
                    },
                  )
                }
                activeOpacity={0.85}
                className="h-14 flex-row items-center justify-center rounded-2xl bg-black"
              >
                <Ionicons
                  name="navigate-outline"
                  size={20}
                  color="white"
                />

                <Text className="ml-2 text-base font-extrabold text-white">
                  Track Order
                </Text>
              </TouchableOpacity>

              <View className="mt-3 flex-row gap-3">
                {canCancel ? (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate(
                        'CancelOrder',
                        {
                          orderId:
                            order.id,
                        },
                      )
                    }
                    activeOpacity={0.85}
                    className="h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-gray-100"
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color="black"
                    />

                    <Text className="ml-2 font-extrabold text-black">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {returnRequest?.id ? (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate(
                        'ReturnDetails',
                        {
                          returnRequestId:
                            returnRequest.id,
                        },
                      )
                    }
                    activeOpacity={0.85}
                    className="h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-gray-100"
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="black"
                    />

                    <Text className="ml-2 font-extrabold text-black">
                      Return
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {canRequestReturn ? (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      'ReturnRequest',
                      {
                        orderId:
                          order.id,
                      },
                    )
                  }
                  activeOpacity={0.85}
                  className="mt-3 h-12 flex-row items-center justify-center rounded-2xl bg-gray-100"
                >
                  <Ionicons
                    name="return-down-back-outline"
                    size={18}
                    color="black"
                  />

                  <Text className="ml-2 font-extrabold text-black">
                    {returnRequest?.id
                      ? 'Request Return Again'
                      : 'Request Return'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>


            {/* CANCELLATION */}
            {normalizedOrderStatus ===
              'cancelled' ||
            normalizedOrderStatus ===
              'canceled' ? (
              <View className="mt-6 rounded-3xl bg-gray-100 p-5">
                <View className="flex-row items-center">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
                    <Ionicons
                      name="close-circle-outline"
                      size={22}
                      color="black"
                    />
                  </View>

                  <Text className="ml-3 text-lg font-extrabold text-black">
                    Cancellation
                  </Text>
                </View>

                {order.cancel_reason ? (
                  <View className="mt-5">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Reason
                    </Text>

                    <Text className="mt-2 font-semibold leading-6 text-black">
                      {
                        order.cancel_reason
                      }
                    </Text>
                  </View>
                ) : null}

                {order.cancelled_at ? (
                  <View className="mt-4">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Cancelled At
                    </Text>

                    <Text className="mt-2 font-semibold text-black">
                      {formatDate(
                        order.cancelled_at,
                      )}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}


            {/* RETURN REQUEST */}
            {returnRequest?.id ? (
              <View className="mt-6 rounded-3xl border border-gray-200 bg-white p-5">
                <View className="flex-row items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black">
                    <Ionicons
                      name="return-down-back-outline"
                      size={23}
                      color="white"
                    />
                  </View>

                  <View className="ml-4 flex-1">
                    <Text className="text-lg font-extrabold text-black">
                      Return Request
                    </Text>

                    <Text className="mt-1 text-sm font-bold text-gray-500">
                      {formatStatus(
                        returnRequest.status,
                      )}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate(
                        'ReturnDetails',
                        {
                          returnRequestId:
                            returnRequest.id,
                        },
                      )
                    }
                    activeOpacity={0.8}
                    className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                  >
                    <Ionicons
                      name="chevron-forward-outline"
                      size={18}
                      color="black"
                    />
                  </TouchableOpacity>
                </View>

                <View className="mt-5 flex-row gap-3">
                  <View className="flex-1 rounded-2xl bg-gray-100 p-4">
                    <Text className="text-xs font-semibold text-gray-500">
                      Estimated Refund
                    </Text>

                    <Text className="mt-2 font-extrabold text-black">
                      Rs{' '}
                      {Number(
                        returnRequest
                          .estimated_refund_amount ||
                          0,
                      ).toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex-1 rounded-2xl bg-gray-100 p-4">
                    <Text className="text-xs font-semibold text-gray-500">
                      Refund Status
                    </Text>

                    <Text
                      numberOfLines={1}
                      className="mt-2 font-extrabold text-black"
                    >
                      {formatStatus(
                        returnRequest
                          .refund_status,
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}


            {/* PRODUCTS */}
            <View className="mt-6">
              <View className="mb-4 flex-row items-end justify-between">
                <View>
                  <Text className="text-xl font-extrabold text-black">
                    Products
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    Items included in this order.
                  </Text>
                </View>

                <View className="rounded-full bg-black px-3 py-2">
                  <Text className="text-xs font-extrabold text-white">
                    {items.length}{' '}
                    {items.length === 1
                      ? 'item'
                      : 'items'}
                  </Text>
                </View>
              </View>

              {items.length ===
              0 ? (
                <View className="rounded-3xl bg-gray-100 p-6">
                  <Text className="text-center text-gray-500">
                    No order items found.
                  </Text>
                </View>
              ) : (
                items.map(
                  (
                    item,
                    index,
                  ) => {
                    const productName =
                      item
                        .product_name_snapshot ||
                      item
                        .product_name ||
                      'Product';

                    const size =
                      item
                        .variant_size_snapshot;

                    const color =
                      item
                        .variant_color_snapshot;

                    const sku =
                      item
                        .variant_sku_snapshot;

                    const calculatedSubtotal =
                      Number(
                        item.unit_price ||
                          0,
                      ) *
                      Number(
                        item.quantity ||
                          0,
                      );

                    const itemSubtotal =
                      item.subtotal !==
                        null &&
                      item.subtotal !==
                        undefined
                        ? Number(
                            item.subtotal,
                          )
                        : calculatedSubtotal;

                    return (
                      <View
                        key={
                          item.id
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
                            <Text className="text-base font-extrabold text-black">
                              {productName}
                            </Text>

                            <View className="mt-3 flex-row flex-wrap">
                              {size ? (
                                <View className="mb-2 mr-2 rounded-full bg-white px-3 py-1.5">
                                  <Text className="text-xs font-bold text-gray-600">
                                    Size {size}
                                  </Text>
                                </View>
                              ) : null}

                              {color ? (
                                <View className="mb-2 mr-2 rounded-full bg-white px-3 py-1.5">
                                  <Text className="text-xs font-bold text-gray-600">
                                    {color}
                                  </Text>
                                </View>
                              ) : null}

                              <View className="mb-2 rounded-full bg-white px-3 py-1.5">
                                <Text className="text-xs font-bold text-gray-600">
                                  Qty {item.quantity}
                                </Text>
                              </View>
                            </View>

                            {sku ? (
                              <Text className="mt-1 text-xs font-semibold text-gray-400">
                                SKU {sku}
                              </Text>
                            ) : null}

                            <View className="mt-4 flex-row items-end justify-between border-t border-gray-200 pt-4">
                              <Text className="text-sm font-semibold text-gray-500">
                                Rs {item.unit_price}{' '}
                                × {item.quantity}
                              </Text>

                              <Text className="text-lg font-extrabold text-black">
                                Rs {itemSubtotal}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  },
                )
              )}
            </View>


            {/* PAYMENT */}
            <View className="mt-7 rounded-3xl bg-gray-100 p-5">
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                  <Ionicons
                    name="card-outline"
                    size={23}
                    color="black"
                  />
                </View>

                <View className="ml-4">
                  <Text className="text-lg font-extrabold text-black">
                    Payment
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    Payment method and transaction status.
                  </Text>
                </View>
              </View>

              <View className="mt-5 rounded-2xl bg-white p-4">
                <View className="flex-row justify-between">
                  <Text className="text-gray-500">
                    Method
                  </Text>

                  <Text className="ml-4 flex-1 text-right font-extrabold text-black">
                    {formatPaymentMethod(
                      order.payment_method,
                    )}
                  </Text>
                </View>

                <View className="mt-4 flex-row justify-between">
                  <Text className="text-gray-500">
                    Status
                  </Text>

                  <Text className="font-extrabold text-black">
                    {formatStatus(
                      order.payment_status,
                    )}
                  </Text>
                </View>

                {payment?.status &&
                payment.status !==
                  order.payment_status ? (
                  <View className="mt-4 flex-row justify-between">
                    <Text className="text-gray-500">
                      Payment Record
                    </Text>

                    <Text className="font-extrabold text-black">
                      {formatStatus(
                        payment.status,
                      )}
                    </Text>
                  </View>
                ) : null}

                {payment?.gateway ? (
                  <View className="mt-4 flex-row justify-between">
                    <Text className="text-gray-500">
                      Gateway
                    </Text>

                    <Text className="font-extrabold text-black">
                      {payment.gateway}
                    </Text>
                  </View>
                ) : null}
              </View>

              {payment
                ?.gateway_transaction_id ? (
                <View className="mt-3 rounded-2xl bg-white p-4">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Transaction ID
                  </Text>

                  <Text
                    selectable
                    className="mt-2 font-semibold text-black"
                  >
                    {
                      payment
                        .gateway_transaction_id
                    }
                  </Text>
                </View>
              ) : null}

              {payment
                ?.gateway_reference ? (
                <View className="mt-3 rounded-2xl bg-white p-4">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Reference
                  </Text>

                  <Text
                    selectable
                    className="mt-2 font-semibold text-black"
                  >
                    {
                      payment
                        .gateway_reference
                    }
                  </Text>
                </View>
              ) : null}

              {payment
                ?.failure_reason ? (
                <View className="mt-3 rounded-2xl bg-white p-4">
                  <View className="flex-row items-center">
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color="#DC2626"
                    />

                    <Text className="ml-2 text-xs font-extrabold uppercase tracking-wider text-red-600">
                      Payment Error
                    </Text>
                  </View>

                  <Text className="mt-2 leading-5 text-red-600">
                    {
                      payment
                        .failure_reason
                    }
                  </Text>
                </View>
              ) : null}
            </View>


            {/* DELIVERY ADDRESS */}
            <View className="mt-6 rounded-3xl border border-gray-200 bg-white p-5">
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black">
                  <Ionicons
                    name="location-outline"
                    size={23}
                    color="white"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-lg font-extrabold text-black">
                    Delivery Address
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    Delivery destination saved with the order.
                  </Text>
                </View>
              </View>

              <View className="mt-5 rounded-2xl bg-gray-100 p-4">
                <Text className="font-semibold leading-6 text-gray-700">
                  {
                    order.delivery_address
                  }
                </Text>

                {order.delivery_city ? (
                  <Text className="mt-2 font-extrabold text-black">
                    {
                      order.delivery_city
                    }
                  </Text>
                ) : null}
              </View>
            </View>


            {/* PRICE DETAILS */}
            <View className="mt-6 rounded-3xl bg-black p-5">
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
                    Price Details
                  </Text>

                  <Text className="mt-1 text-xs text-gray-400">
                    Final order amount
                  </Text>
                </View>
              </View>

              <View className="mt-5 flex-row justify-between">
                <Text className="text-gray-400">
                  Subtotal
                </Text>

                <Text className="font-bold text-white">
                  Rs{' '}
                  {
                    order
                      .subtotal_amount
                  }
                </Text>
              </View>

              <View className="mt-3 flex-row justify-between">
                <Text className="text-gray-400">
                  Shipping
                </Text>

                <Text className="font-bold text-white">
                  {Number(
                    order
                      .shipping_amount,
                  ) === 0
                    ? 'Free'
                    : `Rs ${order.shipping_amount}`}
                </Text>
              </View>

              {Number(
                order
                  .discount_amount,
              ) > 0 ? (
                <View className="mt-3 flex-row justify-between">
                  <Text className="text-gray-400">
                    Discount
                  </Text>

                  <Text className="font-bold text-white">
                    - Rs{' '}
                    {
                      order
                        .discount_amount
                    }
                  </Text>
                </View>
              ) : null}

              <View className="my-5 h-px bg-gray-700" />

              <View className="flex-row items-end justify-between">
                <Text className="text-base font-bold text-gray-300">
                  Total
                </Text>

                <Text className="text-3xl font-extrabold text-white">
                  Rs{' '}
                  {
                    order
                      .total_amount
                  }
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};


export default OrderDetails;
