import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import React, {
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


const OrderSuccess = ({
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
    items,
    setItems,
  ] = useState([]);

  const [
    payment,
    setPayment,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


  useEffect(() => {
    fetchOrderDetails();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orderId,
  ]);


  const fetchOrderDetails =
    async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        if (!orderId) {
          throw new Error(
            'Order information is missing.',
          );
        }

        const {
          data:
            orderData,
          error:
            orderError,
        } =
          await supabase
            .from('orders')
            .select(`
              id,
              order_number,
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
              created_at
            `)
            .eq(
              'id',
              orderId,
            )
            .single();

        if (orderError) {
          throw orderError;
        }

        setOrder(
          orderData,
        );

        const {
          data:
            itemData,
          error:
            itemError,
        } =
          await supabase
            .from(
              'order_items',
            )
            .select(`
              id,
              product_id,
              product_name,
              unit_price,
              quantity,
              subtotal
            `)
            .eq(
              'order_id',
              orderId,
            );

        if (itemError) {
          throw itemError;
        }

        setItems(
          itemData || [],
        );

        const {
          data:
            paymentData,
          error:
            paymentError,
        } =
          await supabase
            .from('payments')
            .select(`
              id,
              payment_method,
              amount,
              currency,
              status,
              gateway,
              gateway_transaction_id,
              gateway_reference,
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

        if (
          paymentError
        ) {
          throw paymentError;
        }

        setPayment(
          paymentData,
        );
      } catch (error) {
        if (__DEV__) {
          console.error(
            'Order Success Error:',
            error.message,
          );
        }

        setErrorMessage(
          'Unable to load order.',
        );
      } finally {
        setLoading(false);
      }
    };


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


  const formatStatus =
    value => {
      if (!value) {
        return '—';
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


  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <ActivityIndicator
            size="large"
            color="black"
          />
        </View>

        <Text className="mt-4 font-semibold text-gray-500">
          Loading order...
        </Text>
      </SafeAreaView>
    );
  }


  if (
    errorMessage ||
    !order
  ) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <Ionicons
              name="alert-circle-outline"
              size={38}
              color="black"
            />
          </View>

          <Text className="mt-5 text-xl font-extrabold text-black">
            Order unavailable
          </Text>

          <Text className="mt-2 text-center leading-6 text-gray-500">
            {errorMessage}
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                'MainTabs',
              )
            }
            activeOpacity={0.85}
            className="mt-7 rounded-2xl bg-black px-6 py-3.5"
          >
            <Text className="font-extrabold text-white">
              Continue Shopping
            </Text>
          </TouchableOpacity>
        </View>
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
        className="px-5"
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
      >
        {/* SUCCESS HERO */}
        <View className="mt-8 items-center rounded-3xl bg-black px-6 py-8">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-white">
            <Ionicons
              name="checkmark-outline"
              size={50}
              color="black"
            />
          </View>

          <View className="mt-5 rounded-full bg-white px-4 py-2">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-black">
              Success
            </Text>
          </View>

          <Text className="mt-5 text-center text-3xl font-extrabold text-white">
            Order Placed
          </Text>

          <Text className="mt-2 text-center leading-6 text-gray-300">
            Your order has been placed successfully.
          </Text>

          <Text className="mt-4 text-lg font-extrabold text-white">
            #{order.order_number}
          </Text>
        </View>


        {/* QUICK STATUS */}
        <View className="mt-6 flex-row gap-3">
          <View className="flex-1 rounded-3xl bg-gray-100 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="bag-check-outline"
                size={20}
                color="black"
              />
            </View>

            <Text className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Order Status
            </Text>

            <Text className="mt-1 font-extrabold text-black">
              {
                formatStatus(
                  order.status,
                )
              }
            </Text>
          </View>

          <View className="flex-1 rounded-3xl bg-gray-100 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="card-outline"
                size={20}
                color="black"
              />
            </View>

            <Text className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Payment
            </Text>

            <Text className="mt-1 font-extrabold text-black">
              {
                formatStatus(
                  order.payment_status,
                )
              }
            </Text>
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
                Payment and order totals.
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-2xl bg-white p-4">
            <View className="flex-row justify-between">
              <Text className="text-gray-500">
                Payment Method
              </Text>

              <Text className="ml-4 flex-1 text-right font-extrabold text-black">
                {
                  formatPaymentMethod(
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

            <View className="mt-4 flex-row justify-between">
              <Text className="text-gray-500">
                Subtotal
              </Text>

              <Text className="font-bold text-black">
                Rs {order.subtotal_amount}
              </Text>
            </View>

            <View className="mt-4 flex-row justify-between">
              <Text className="text-gray-500">
                Shipping
              </Text>

              <Text className="font-bold text-black">
                {Number(
                  order.shipping_amount ||
                    0,
                ) === 0
                  ? 'Free'
                  : `Rs ${order.shipping_amount}`}
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
                  - Rs {order.discount_amount}
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
                Rs {order.total_amount}
              </Text>
            </View>
          </View>
        </View>


        {/* PRODUCTS */}
        {items.length >
        0 ? (
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
                  {items.length}
                </Text>
              </View>
            </View>

            {items.map(
              (
                item,
                index,
              ) => (
                <View
                  key={item.id}
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
                      <Text className="font-extrabold text-black">
                        {item.product_name}
                      </Text>

                      <View className="mt-3 flex-row items-end justify-between">
                        <Text className="text-sm font-semibold text-gray-500">
                          Qty {item.quantity}
                        </Text>

                        <Text className="text-lg font-extrabold text-black">
                          Rs {item.subtotal}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ),
            )}
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

            <View className="ml-4">
              <Text className="text-lg font-extrabold text-black">
                Delivery
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Shipping destination
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-2xl bg-gray-100 p-4">
            <Text className="leading-6 text-gray-700">
              {
                order.delivery_address
              }
            </Text>

            <Text className="mt-2 font-extrabold text-black">
              {
                order.delivery_city
              }
            </Text>
          </View>
        </View>


        {/* TRANSACTION */}
        {payment
          ?.gateway_transaction_id ? (
          <View className="mt-6 rounded-3xl bg-gray-100 p-5">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={23}
                  color="black"
                />
              </View>

              <View className="ml-4">
                <Text className="text-lg font-extrabold text-black">
                  Transaction
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Payment transaction details.
                </Text>
              </View>
            </View>

            <View className="mt-5 rounded-2xl bg-white p-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Transaction ID
              </Text>

              <Text
                selectable
                className="mt-2 font-extrabold text-black"
              >
                {
                  payment
                    .gateway_transaction_id
                }
              </Text>

              {payment
                ?.gateway_reference ? (
                <>
                  <View className="my-4 h-px bg-gray-200" />

                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Reference
                  </Text>

                  <Text
                    selectable
                    className="mt-2 font-extrabold text-black"
                  >
                    {
                      payment
                        .gateway_reference
                    }
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        ) : null}


        {/* ACTIONS */}
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
          className="mt-7 h-14 flex-row items-center justify-center rounded-2xl bg-gray-100"
        >
          <Ionicons
            name="receipt-outline"
            size={20}
            color="black"
          />

          <Text className="ml-2 text-base font-extrabold text-black">
            View Order Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [
                {
                  name:
                    'MainTabs',
                },
              ],
            })
          }
          activeOpacity={0.85}
          className="mt-3 h-14 flex-row items-center justify-center rounded-2xl bg-black"
        >
          <Ionicons
            name="bag-handle-outline"
            size={20}
            color="white"
          />

          <Text className="ml-2 text-base font-extrabold text-white">
            Continue Shopping
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};


export default OrderSuccess;
