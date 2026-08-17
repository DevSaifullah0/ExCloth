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
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  supabase,
} from '../../lib/supabase';

import OrderTimeline from '../../components/orders/OrderTimeline';


const OrderTracking = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();


  const orderId =
    route.params?.orderId;


  const [
    order,
    setOrder,
  ] = useState(null);


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
  // FETCH ORDER
  // ==========================================

  const fetchOrder =
    useCallback(
      async (
        showLoader = false,
      ) => {
        try {
          if (
            showLoader
          ) {
            setLoading(
              true,
            );
          }

          setErrorMessage(
            '',
          );


          if (!orderId) {
            throw new Error(
              'Order ID is missing.',
            );
          }


          const {
            data: {
              user,
            },

            error:
              userError,
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


          const {
            data,
            error,
          } =
            await supabase
              .from(
                'orders',
              )
              .select(`
                id,
                order_number,
                user_id,

                delivery_full_name,
                delivery_phone,
                delivery_address,
                delivery_area,
                delivery_landmark,
                delivery_city,
                delivery_province,
                delivery_postal_code,
                delivery_country,

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


          if (error) {
            throw error;
          }


          setOrder(
            data,
          );

        } catch (error) {
          console.log(
            'Order Tracking Error:',
            error.message,
          );


          setErrorMessage(
            error.message ||
              'Unable to load order tracking.',
          );

        } finally {
          setLoading(false);
          setRefreshing(
            false,
          );
        }
      },
      [
        orderId,
      ],
    );


  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchOrder(
      true,
    );
  }, [
    fetchOrder,
  ]);


  // ==========================================
  // REALTIME ORDER STATUS
  // ==========================================

  useEffect(() => {
    if (!orderId) {
      return undefined;
    }


    const channel =
      supabase
        .channel(
          `order-tracking-${orderId}`,
        )
        .on(
          'postgres_changes',
          {
            event:
              'UPDATE',

            schema:
              'public',

            table:
              'orders',

            filter:
              `id=eq.${orderId}`,
          },

          payload => {
            const updatedOrder =
              payload?.new;


            if (
              !updatedOrder
            ) {
              return;
            }


            setOrder(
              current => {
                if (
                  !current
                ) {
                  return current;
                }


                return {
                  ...current,
                  ...updatedOrder,
                };
              },
            );
          },
        )
        .subscribe();


    return () => {
      supabase
        .removeChannel(
          channel,
        );
    };
  }, [
    orderId,
  ]);


  // ==========================================
  // REFRESH
  // ==========================================

  const handleRefresh =
    () => {
      setRefreshing(
        true,
      );

      fetchOrder(
        false,
      );
    };


  // ==========================================
  // FORMAT STATUS
  // ==========================================

  const formatStatus =
    value => {
      if (!value) {
        return '';
      }


      return String(
        value,
      )
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
  // STATUS COPY
  // ==========================================

  const getStatusCopy =
    status => {
      switch (
        String(
          status || '',
        ).toLowerCase()
      ) {
        case 'pending':
          return {
            icon:
              'time-outline',

            title:
              'Order Pending',

            message:
              'Your order is waiting to be confirmed.',
          };


        case 'confirmed':
          return {
            icon:
              'checkmark-circle-outline',

            title:
              'Order Confirmed',

            message:
              'Your order has been confirmed and will be prepared soon.',
          };


        case 'processing':
        case 'packed':
          return {
            icon:
              'cube-outline',

            title:
              'Processing Order',

            message:
              'Your items are being prepared for shipment.',
          };


        case 'shipped':
          return {
            icon:
              'paper-plane-outline',

            title:
              'Order Shipped',

            message:
              'Your order has left the warehouse and is on the way.',
          };


        case 'out_for_delivery':
          return {
            icon:
              'bicycle-outline',

            title:
              'Out for Delivery',

            message:
              'Your order is on the way to your delivery address.',
          };


        case 'delivered':
          return {
            icon:
              'home-outline',

            title:
              'Delivered',

            message:
              'Your order has been delivered successfully.',
          };


        case 'cancelled':
        case 'canceled':
          return {
            icon:
              'close-circle-outline',

            title:
              'Order Cancelled',

            message:
              'This order has been cancelled.',
          };


        case 'returned':
        case 'return_completed':
          return {
            icon:
              'return-down-back-outline',

            title:
              'Order Returned',

            message:
              'This order has been returned.',
          };


        case 'refunded':
          return {
            icon:
              'cash-outline',

            title:
              'Order Refunded',

            message:
              'The refund for this order has been completed.',
          };


        default:
          return {
            icon:
              'bag-handle-outline',

            title:
              formatStatus(
                status,
              ) ||
              'Order Status',

            message:
              'Your order status has been updated.',
          };
      }
    };


  // ==========================================
  // DELIVERY ADDRESS
  // ==========================================

  const getAddressText =
    () => {
      if (!order) {
        return '';
      }


      return [
        order.delivery_address,
        order.delivery_area,
        order.delivery_city,
        order.delivery_province,
        order.delivery_postal_code,
      ]
        .filter(
          Boolean,
        )
        .join(
          ', ',
        );
    };


  // ==========================================
  // CANCEL ELIGIBILITY
  // ==========================================

  const canCancel =
    ['pending', 'confirmed']
      .includes(
        String(
          order?.status || '',
        )
          .trim()
          .toLowerCase(),
      );


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
          Loading order tracking...
        </Text>

      </SafeAreaView>
    );
  }


  // ==========================================
  // ERROR
  // ==========================================

  if (
    errorMessage ||
    !order
  ) {
    return (
      <SafeAreaView className="flex-1 bg-white">

        <View className="px-5">

          <View className="mt-4 flex-row items-center">

            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
            >

              <Ionicons
                name="arrow-back-outline"
                size={22}
                color="black"
              />

            </TouchableOpacity>


            <Text className="ml-4 text-2xl font-extrabold text-black">
              Track Order
            </Text>

          </View>


          <View className="mt-20 items-center">

            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#D1D5DB"
            />


            <Text className="mt-5 text-xl font-extrabold text-black">
              Unable to track order
            </Text>


            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage ||
                'Order information is unavailable.'}
            </Text>


            <TouchableOpacity
              onPress={() =>
                fetchOrder(
                  true,
                )
              }
              activeOpacity={0.85}
              className="mt-6 rounded-xl bg-black px-7 py-4"
            >

              <Text className="font-bold text-white">
                Try Again
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      </SafeAreaView>
    );
  }


  const statusCopy =
    getStatusCopy(
      order.status,
    );


  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            Math.max(
              insets.bottom,
              24,
            ) +
            36,
        }}
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor="black"
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
              Track Order
            </Text>

            <Text
              numberOfLines={1}
              className="mt-1 text-sm text-gray-500"
            >
              Order #{order.order_number}
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="navigate-outline"
              size={22}
              color="white"
            />
          </View>
        </View>


        {/* LIVE STATUS */}
        <View className="mt-7 overflow-hidden rounded-3xl bg-black p-6">
          <View className="flex-row items-start justify-between">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white">
              <Ionicons
                name={
                  statusCopy.icon
                }
                size={30}
                color="black"
              />
            </View>

            <View className="rounded-full bg-white px-3 py-2">
              <Text className="text-xs font-extrabold text-black">
                LIVE
              </Text>
            </View>
          </View>

          <Text className="mt-5 text-2xl font-extrabold text-white">
            {
              statusCopy.title
            }
          </Text>

          <Text className="mt-2 leading-6 text-gray-300">
            {
              statusCopy.message
            }
          </Text>

          <View className="mt-5 self-start rounded-full bg-white px-4 py-2">
            <Text className="text-sm font-extrabold text-black">
              {
                formatStatus(
                  order.status,
                )
              }
            </Text>
          </View>
        </View>


        {/* TIMELINE */}
        <View className="mt-7">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-extrabold text-black">
                Delivery Progress
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Status updates appear here automatically.
              </Text>
            </View>

            <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Ionicons
                name="time-outline"
                size={20}
                color="black"
              />
            </View>
          </View>

          <View className="rounded-3xl bg-gray-100 p-5">
            <OrderTimeline
              status={
                order.status
              }
              createdAt={
                order.created_at
              }
              updatedAt={
                order.updated_at
              }
            />
          </View>
        </View>


        {/* CANCEL ACTION */}
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
            className="mt-6 h-14 flex-row items-center justify-center rounded-2xl bg-gray-100"
          >
            <Ionicons
              name="close-circle-outline"
              size={20}
              color="black"
            />

            <Text className="ml-2 text-base font-extrabold text-black">
              Cancel Order
            </Text>
          </TouchableOpacity>
        ) : null}


        {/* CANCELLATION INFO */}
        {String(
          order.status || '',
        )
          .trim()
          .toLowerCase() ===
          'cancelled' ? (
          <View className="mt-6 rounded-3xl bg-gray-100 p-5">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black">
                <Ionicons
                  name="close-circle-outline"
                  size={23}
                  color="white"
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-lg font-extrabold text-black">
                  Cancellation Details
                </Text>

                {order.cancelled_at ? (
                  <Text className="mt-1 text-sm text-gray-500">
                    {new Date(
                      order.cancelled_at,
                    ).toLocaleString()}
                  </Text>
                ) : null}
              </View>
            </View>

            {order.cancel_reason ? (
              <View className="mt-5 rounded-2xl bg-white p-4">
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
          </View>
        ) : null}


        {/* DELIVERY */}
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

              {order
                .delivery_full_name ? (
                <Text className="mt-1 text-sm font-semibold text-gray-500">
                  {
                    order
                      .delivery_full_name
                  }
                </Text>
              ) : null}
            </View>
          </View>

          <View className="mt-5 rounded-2xl bg-gray-100 p-4">
            <Text className="leading-6 text-gray-700">
              {
                getAddressText()
              }
            </Text>

            {order.delivery_landmark ? (
              <Text className="mt-2 text-sm font-semibold text-gray-500">
                Landmark: {order.delivery_landmark}
              </Text>
            ) : null}

            {order.delivery_phone ? (
              <View className="mt-3 flex-row items-center">
                <Ionicons
                  name="call-outline"
                  size={16}
                  color="#6B7280"
                />

                <Text className="ml-2 text-sm font-semibold text-gray-500">
                  {
                    order
                      .delivery_phone
                  }
                </Text>
              </View>
            ) : null}
          </View>
        </View>


        {/* ORDER SUMMARY */}
        <View className="mt-6 rounded-3xl bg-gray-100 p-5">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <Ionicons
                name="receipt-outline"
                size={23}
                color="black"
              />
            </View>

            <View className="ml-4">
              <Text className="text-lg font-extrabold text-black">
                Order Summary
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Payment and total details.
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-2xl bg-white p-4">
            <View className="flex-row justify-between">
              <Text className="text-gray-500">
                Payment
              </Text>

              <Text className="ml-4 flex-1 text-right font-extrabold text-black">
                {
                  formatStatus(
                    order.payment_method,
                  )
                }
              </Text>
            </View>

            <View className="mt-4 flex-row justify-between">
              <Text className="text-gray-500">
                Payment Status
              </Text>

              <Text className="font-extrabold text-black">
                {
                  formatStatus(
                    order.payment_status,
                  )
                }
              </Text>
            </View>

            {Number(
              order.discount_amount ||
                0,
            ) > 0 ? (
              <View className="mt-4 flex-row justify-between">
                <Text className="text-gray-500">
                  Discount
                </Text>

                <Text className="font-extrabold text-black">
                  - Rs{' '}
                  {Number(
                    order.discount_amount ||
                      0,
                  ).toFixed(2)}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="mt-3 rounded-2xl bg-black p-4">
            <View className="flex-row items-end justify-between">
              <Text className="font-bold text-gray-300">
                Total
              </Text>

              <Text className="text-2xl font-extrabold text-white">
                Rs{' '}
                {Number(
                  order.total_amount ||
                    0,
                ).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>


        {/* ORDER DETAILS BUTTON */}
        <TouchableOpacity
          onPress={() =>
            navigation.navigate(
              'OrderDetails',
              {
                orderId:
                  order.id,
              },
            )
          }
          activeOpacity={0.85}
          className="mt-6 h-14 flex-row items-center justify-center rounded-2xl bg-black"
        >
          <Ionicons
            name="receipt-outline"
            size={20}
            color="white"
          />

          <Text className="ml-2 text-base font-extrabold text-white">
            View Order Details
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};


export default OrderTracking;
