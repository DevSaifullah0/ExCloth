import {
  View,
  Text,
  ActivityIndicator,
} from 'react-native';

import React, {
  useEffect,
  useRef,
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


const PaymentProcessing = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const {
    shippingAddress,
    paymentMethod,
    paymentMethodName = 'Online Payment',
    displayAmount = 0,
    totalQuantity = 0,
    sourceScreen,
    paymentMeta = {},
    couponCode = null,
    appliedCoupon = null,
    checkoutSubtotal = 0,
    checkoutDiscount = 0,
    checkoutTotal = 0,
  } = route.params || {};

  const startedRef =
    useRef(false);

  const [
    message,
    setMessage,
  ] = useState(
    'Preparing your test payment...',
  );


  useEffect(() => {
    if (
      startedRef.current
    ) {
      return;
    }

    startedRef.current =
      true;

    processPayment();
  }, []);


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
      } catch (
        parseError
      ) {
        console.log(
          'Payment Function Error Parse:',
          parseError.message,
        );
      }

      return (
        error?.message ||
        'Unable to process the payment.'
      );
    };


  const failPayment =
    errorMessage => {
      navigation.replace(
        'PaymentFailed',
        {
          errorMessage,
          shippingAddress,
          paymentMethod,
          paymentMethodName,
          displayAmount,
          totalQuantity,
          sourceScreen,
          paymentMeta,
          couponCode,
          appliedCoupon,
          checkoutSubtotal,
          checkoutDiscount,
          checkoutTotal,
        },
      );
    };


  const processPayment =
    async () => {
      try {
        if (
          !shippingAddress?.id
        ) {
          throw new Error(
            'Delivery address is missing.',
          );
        }

        if (
          ![
            'card',
            'easypaisa',
            'jazzcash',
            'bank_transfer',
          ].includes(
            paymentMethod,
          )
        ) {
          throw new Error(
            'Invalid online payment method.',
          );
        }

        setMessage(
          'Checking your session...',
        );

        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase.auth
            .getSession();

        if (
          sessionError
        ) {
          throw sessionError;
        }

        if (
          !session?.user
        ) {
          throw new Error(
            'Your session has expired. Please sign in again.',
          );
        }

        setMessage(
          `Processing ${paymentMethodName} test payment...`,
        );

        const {
          data,
          error,
        } =
          await supabase
            .functions
            .invoke(
              'create-order',
              {
                body: {
                  shipping_address_id:
                    shippingAddress.id,

                  payment_method:
                    paymentMethod,

                  coupon_code:
                    couponCode ||
                    null,
                },
              },
            );

        if (error) {
          const messageFromServer =
            await getFunctionErrorMessage(
              error,
            );

          throw new Error(
            messageFromServer,
          );
        }

        if (
          data?.error
        ) {
          throw new Error(
            typeof data.error ===
              'string'
              ? data.error
              : data.error
                  ?.message ||
                  'Payment could not be completed.',
          );
        }

        if (
          !data?.order_id
        ) {
          throw new Error(
            'Order was not created.',
          );
        }

        if (
          data
            ?.payment_status !==
          'paid'
        ) {
          throw new Error(
            'Test payment was not marked as paid.',
          );
        }

        setMessage(
          'Payment successful.',
        );

        navigation.replace(
          'PaymentSuccess',
          {
            orderId:
              data.order_id,

            orderNumber:
              data.order_number,

            amount:
              data.total_amount,

            paymentMethod,

            paymentMethodName,

            transactionId:
              data.gateway_transaction_id,

            gatewayReference:
              data.gateway_reference,

            paymentMode:
              data.payment_mode,

            paymentMeta,

            couponCode,

            discountAmount:
              data.discount_amount ||
              checkoutDiscount ||
              0,
          },
        );
      } catch (error) {
        console.log(
          'Payment Processing Error:',
          error.message,
        );

        failPayment(
          error.message ||
            'Unable to process the payment.',
        );
      }
    };


  const formattedAmount =
    Number(
      displayAmount || 0,
    ).toFixed(0);


  return (
    <SafeAreaView
      edges={[
        'top',
        'left',
        'right',
        'bottom',
      ]}
      className="flex-1 bg-white"
    >
      <View
        className="flex-1 px-6"
        style={{
          paddingBottom:
            Math.max(
              insets.bottom,
              20,
            ),
        }}
      >
        {/* TOP BRAND */}
        <View className="mt-4 flex-row items-center justify-center">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="bag-handle-outline"
              size={20}
              color="white"
            />
          </View>

          <Text className="ml-3 text-xl font-extrabold text-black">
            ExCloth
          </Text>
        </View>


        {/* MAIN PROCESSING */}
        <View className="flex-1 items-center justify-center">
          <View className="items-center">
            <View className="h-28 w-28 items-center justify-center rounded-full bg-gray-100">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                <ActivityIndicator
                  size="large"
                  color="black"
                />
              </View>
            </View>

            <View className="mt-6 rounded-full bg-black px-4 py-2">
              <Text className="text-xs font-extrabold uppercase tracking-wider text-white">
                Processing
              </Text>
            </View>

            <Text className="mt-5 text-center text-3xl font-extrabold text-black">
              Processing Payment
            </Text>

            <Text className="mt-3 max-w-sm text-center text-base leading-6 text-gray-500">
              {message}
            </Text>
          </View>


          {/* PAYMENT CARD */}
          <View className="mt-8 w-full rounded-3xl bg-black p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                  <Ionicons
                    name="wallet-outline"
                    size={23}
                    color="black"
                  />
                </View>

                <View className="ml-3">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Payment Method
                  </Text>

                  <Text className="mt-1 font-extrabold text-white">
                    {paymentMethodName}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Amount
                </Text>

                <Text className="mt-1 text-xl font-extrabold text-white">
                  Rs {formattedAmount}
                </Text>
              </View>
            </View>

            <View className="my-5 h-px bg-gray-700" />

            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-400">
                Items
              </Text>

              <Text className="font-extrabold text-white">
                {totalQuantity}
              </Text>
            </View>

            {couponCode ? (
              <View className="mt-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name="pricetag-outline"
                    size={15}
                    color="#D1D5DB"
                  />

                  <Text className="ml-2 text-sm text-gray-400">
                    Promo
                  </Text>
                </View>

                <Text className="font-extrabold text-white">
                  {couponCode}
                </Text>
              </View>
            ) : null}
          </View>


          {/* TEST NOTICE */}
          <View className="mt-5 w-full flex-row items-start rounded-3xl bg-gray-100 p-5">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="flask-outline"
                size={21}
                color="black"
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="font-extrabold text-black">
                Test Transaction
              </Text>

              <Text className="mt-1 text-sm leading-5 text-gray-500">
                No real money is being charged during this demo payment.
              </Text>
            </View>
          </View>
        </View>


        {/* FOOTER */}
        <View className="items-center pb-2">
          <View className="flex-row items-center">
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color="#6B7280"
            />

            <Text className="ml-2 text-center text-sm font-semibold text-gray-500">
              Secure order creation in progress
            </Text>
          </View>

          <Text className="mt-2 text-center text-xs leading-5 text-gray-400">
            Please do not close the app until this process finishes.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};


export default PaymentProcessing;
