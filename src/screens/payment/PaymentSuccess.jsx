import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import React, {
  useMemo,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';


const PaymentSuccess = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const {
    orderId,
    orderNumber,
    amount = 0,
    paymentMethodName =
      'Online Payment',
    transactionId,
    gatewayReference,
    paymentMode = 'test',
    paymentMeta = {},
  } = route.params || {};


  const formattedAmount =
    useMemo(
      () =>
        Number(
          amount || 0,
        ).toFixed(0),
      [
        amount,
      ],
    );


  const handleViewOrder = () => {
    if (!orderId) {
      navigation.popToTop();
      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name:
            'OrderSuccess',
          params: {
            orderId,
          },
        },
      ],
    });
  };


  const handleContinueShopping =
    () => {
      navigation.popToTop();
    };


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
          flexGrow: 1,
          justifyContent:
            'center',
          paddingTop: 30,
          paddingBottom:
            Math.max(
              insets.bottom,
              24,
            ) + 30,
        }}
      >
        {/* SUCCESS HERO */}
        <View className="items-center rounded-3xl bg-black px-6 py-8">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-green-600">
            <Ionicons
              name="checkmark-outline"
              size={50}
              color="white"
            />
          </View>

          <View className="mt-5 rounded-full bg-white px-4 py-2">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-black">
              Payment Successful
            </Text>
          </View>

          <Text className="mt-5 text-center text-3xl font-extrabold text-white">
            Payment Complete
          </Text>

          <Text className="mt-3 text-center text-base leading-6 text-gray-300">
            Your test payment has been completed and your ExCloth order has been created.
          </Text>

          <Text className="mt-6 text-4xl font-extrabold text-white">
            Rs {formattedAmount}
          </Text>

          <Text className="mt-2 text-sm font-semibold text-gray-400">
            {paymentMethodName}
          </Text>
        </View>


        {/* ORDER INFO */}
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
                Payment Details
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Transaction summary
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-2xl bg-white p-4">
            <View className="flex-row justify-between">
              <Text className="text-gray-500">
                Order
              </Text>

              <Text className="ml-5 flex-1 text-right font-extrabold text-black">
                {orderNumber ||
                  orderId ||
                  'Created'}
              </Text>
            </View>

            <View className="mt-4 flex-row justify-between">
              <Text className="text-gray-500">
                Method
              </Text>

              <Text className="ml-5 flex-1 text-right font-extrabold text-black">
                {paymentMethodName}
              </Text>
            </View>

            <View className="mt-4 flex-row justify-between">
              <Text className="text-gray-500">
                Amount
              </Text>

              <Text className="font-extrabold text-black">
                Rs {formattedAmount}
              </Text>
            </View>
          </View>
        </View>


        {/* TRANSACTION */}
        {transactionId ||
        gatewayReference ? (
          <View className="mt-5 rounded-3xl border border-gray-200 bg-white p-5">
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-black">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color="white"
                />
              </View>

              <View className="ml-3">
                <Text className="font-extrabold text-black">
                  Transaction
                </Text>

                <Text className="mt-1 text-xs text-gray-500">
                  Payment reference details
                </Text>
              </View>
            </View>

            {transactionId ? (
              <View className="mt-5">
                <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Transaction ID
                </Text>

                <Text
                  selectable
                  className="mt-2 font-extrabold text-black"
                >
                  {transactionId}
                </Text>
              </View>
            ) : null}

            {gatewayReference ? (
              <>
                {transactionId ? (
                  <View className="my-4 h-px bg-gray-200" />
                ) : null}

                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Gateway Reference
                  </Text>

                  <Text
                    selectable
                    className="mt-2 font-extrabold text-black"
                  >
                    {gatewayReference}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        ) : null}


        {/* PAYMENT META */}
        {paymentMeta?.maskedCard ||
        paymentMeta?.maskedMobile ? (
          <View className="mt-5 rounded-3xl bg-gray-100 p-5">
            <Text className="text-lg font-extrabold text-black">
              Payment Account
            </Text>

            {paymentMeta
              ?.maskedCard ? (
              <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-white p-4">
                <View className="flex-row items-center">
                  <Ionicons
                    name="card-outline"
                    size={20}
                    color="black"
                  />

                  <Text className="ml-3 text-gray-500">
                    Test Card
                  </Text>
                </View>

                <Text className="font-extrabold text-black">
                  {
                    paymentMeta
                      .maskedCard
                  }
                </Text>
              </View>
            ) : null}

            {paymentMeta
              ?.maskedMobile ? (
              <View className={`${paymentMeta?.maskedCard ? 'mt-3' : 'mt-4'} flex-row items-center justify-between rounded-2xl bg-white p-4`}>
                <View className="flex-row items-center">
                  <Ionicons
                    name="phone-portrait-outline"
                    size={20}
                    color="black"
                  />

                  <Text className="ml-3 text-gray-500">
                    Mobile
                  </Text>
                </View>

                <Text className="font-extrabold text-black">
                  {
                    paymentMeta
                      .maskedMobile
                  }
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}


        {/* TEST MODE */}
        {paymentMode ===
        'test' ? (
          <View className="mt-5 flex-row items-start rounded-3xl bg-gray-100 p-5">
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
                No real money was transferred during this payment.
              </Text>
            </View>
          </View>
        ) : null}


        {/* ACTIONS */}
        <TouchableOpacity
          onPress={
            handleViewOrder
          }
          activeOpacity={0.85}
          className="mt-7 h-14 flex-row items-center justify-center rounded-2xl bg-black"
        >
          <Ionicons
            name="receipt-outline"
            size={20}
            color="white"
          />

          <Text className="ml-2 text-base font-extrabold text-white">
            View Order
          </Text>

          <Ionicons
            name="arrow-forward-outline"
            size={19}
            color="white"
            style={{
              marginLeft: 8,
            }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            handleContinueShopping
          }
          activeOpacity={0.85}
          className="mt-3 h-14 flex-row items-center justify-center rounded-2xl bg-gray-100"
        >
          <Ionicons
            name="bag-handle-outline"
            size={20}
            color="black"
          />

          <Text className="ml-2 text-base font-extrabold text-black">
            Continue Shopping
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};


export default PaymentSuccess;
