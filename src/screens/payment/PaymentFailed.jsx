import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';

import React from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';


const PaymentFailed = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const {
    errorMessage =
      'Your test payment could not be completed.',
    shippingAddress,
    paymentMethodName =
      'Online Payment',
    displayAmount = 0,
  } = route.params || {};


  const formattedAmount =
    Number(
      displayAmount || 0,
    ).toFixed(0);


  const handleTryAgain = () => {
    if (
      navigation.canGoBack()
    ) {
      navigation.goBack();
      return;
    }

    navigation.popTo(
      'Payment',
      {
        shippingAddress,
      },
    );
  };


  const handleChangeMethod = () => {
    navigation.popTo(
      'Payment',
      {
        shippingAddress,
      },
      {
        merge: true,
      },
    );
  };


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
        {/* BRAND */}
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


        {/* FAILED STATE */}
        <View className="flex-1 justify-center">
          <View className="items-center">
            <View className="h-28 w-28 items-center justify-center rounded-full bg-gray-100">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-black">
                <Ionicons
                  name="close-outline"
                  size={46}
                  color="white"
                />
              </View>
            </View>

            <View className="mt-6 rounded-full bg-gray-100 px-4 py-2">
              <Text className="text-xs font-extrabold uppercase tracking-wider text-black">
                Payment Failed
              </Text>
            </View>

            <Text className="mt-5 text-center text-3xl font-extrabold text-black">
              Payment Unsuccessful
            </Text>

            <Text className="mt-3 text-center text-base leading-6 text-gray-500">
              {errorMessage}
            </Text>
          </View>


          {/* PAYMENT INFO */}
          <View className="mt-8 rounded-3xl bg-black p-5">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="wallet-outline"
                  size={23}
                  color="black"
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Payment Method
                </Text>

                <Text className="mt-1 font-extrabold text-white">
                  {paymentMethodName}
                </Text>
              </View>

              {Number(
                displayAmount || 0,
              ) > 0 ? (
                <View className="items-end">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Amount
                  </Text>

                  <Text className="mt-1 font-extrabold text-white">
                    Rs {formattedAmount}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>


          {/* INFO */}
          <View className="mt-5 flex-row items-start rounded-3xl bg-gray-100 p-5">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="black"
              />
            </View>

            <Text className="ml-3 flex-1 text-sm leading-6 text-gray-600">
              No successful payment was confirmed. Retry this payment or choose another payment method.
            </Text>
          </View>


          {/* ACTIONS */}
          <TouchableOpacity
            onPress={
              handleTryAgain
            }
            activeOpacity={0.85}
            className="mt-7 h-14 flex-row items-center justify-center rounded-2xl bg-black"
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color="white"
            />

            <Text className="ml-2 text-base font-extrabold text-white">
              Try Again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={
              handleChangeMethod
            }
            activeOpacity={0.85}
            className="mt-3 h-14 flex-row items-center justify-center rounded-2xl bg-gray-100"
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={20}
              color="black"
            />

            <Text className="ml-2 text-base font-extrabold text-black">
              Change Payment Method
            </Text>
          </TouchableOpacity>
        </View>


        {/* FOOTER */}
        <View className="flex-row items-center justify-center pb-2">
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color="#6B7280"
          />

          <Text className="ml-2 text-sm font-semibold text-gray-500">
            No confirmed charge was recorded
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};


export default PaymentFailed;
