import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import React, {
  useMemo,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import AppModal from '../../components/common/AppModal';


const JazzCashPayment = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const {
    shippingAddress,

    paymentMethod =
      'jazzcash',

    paymentMethodName =
      'JazzCash',

    displayAmount = 0,

    totalQuantity = 0,

    couponCode = null,

    appliedCoupon = null,

    checkoutSubtotal = 0,

    checkoutDiscount = 0,

    checkoutTotal = 0,
  } = route.params || {};


  const [
    mobileNumber,
    setMobileNumber,
  ] = useState('');


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


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
  // DISPLAY AMOUNT
  // ==========================================

  const formattedAmount =
    useMemo(
      () =>
        Number(
          displayAmount || 0,
        ).toFixed(0),
      [
        displayAmount,
      ],
    );


  // ==========================================
  // MOBILE
  // ==========================================

  const handleMobileChange =
    value => {
      setMobileNumber(
        value
          .replace(/\D/g, '')
          .slice(0, 11),
      );
    };


  // ==========================================
  // CONTINUE
  // ==========================================

  const handleContinue =
    () => {
      if (submitting) {
        return;
      }


      if (
        !shippingAddress?.id
      ) {
        showModal({
          type: 'warning',

          title:
            'Delivery Address',

          message:
            'Delivery address is missing. Please go back and select an address.',

          confirmText:
            'OK',
        });

        return;
      }


      if (
        !/^03\d{9}$/.test(
          mobileNumber,
        )
      ) {
        showModal({
          type: 'warning',

          title:
            'JazzCash Number',

          message:
            'Enter a valid 11-digit Pakistani mobile number, for example 03XXXXXXXXX.',

          confirmText:
            'Try Again',
        });

        return;
      }


      setSubmitting(true);


      navigation.navigate(
        'PaymentProcessing',
        {
          shippingAddress,

          paymentMethod,

          paymentMethodName,

          displayAmount,

          totalQuantity,

          couponCode,

          appliedCoupon,

          checkoutSubtotal,

          checkoutDiscount,

          checkoutTotal,

          sourceScreen:
            'JazzCashPayment',

          paymentMeta: {
            maskedMobile:
              `${mobileNumber.slice(
                0,
                3,
              )}*****${mobileNumber.slice(
                -3,
              )}`,
          },
        },
      );


      setSubmitting(false);
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingBottom:
              120 +
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
                submitting
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
                JazzCash
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Continue with a TEST mobile number.
              </Text>
            </View>

            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
              <Ionicons
                name="phone-portrait-outline"
                size={22}
                color="white"
              />
            </View>
          </View>


          {/* HERO */}
          <View className="mt-7 overflow-hidden rounded-3xl bg-black p-6">
            <View className="flex-row items-start justify-between">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="phone-portrait-outline"
                  size={30}
                  color="black"
                />
              </View>

              <View className="rounded-full bg-white px-3 py-2">
                <Text className="text-[11px] font-extrabold uppercase tracking-wider text-black">
                  TEST MODE
                </Text>
              </View>
            </View>

            <Text className="mt-6 text-2xl font-extrabold text-white">
              Pay with JazzCash
            </Text>

            <Text className="mt-2 text-sm leading-6 text-gray-300">
              Enter a test Pakistani mobile number to continue the demo payment flow.
            </Text>

            <View className="mt-6">
              <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Payable Amount
              </Text>

              <Text className="mt-2 text-3xl font-extrabold text-white">
                Rs {formattedAmount}
              </Text>
            </View>

            {couponCode ? (
              <View className="mt-5 self-start rounded-full bg-white px-4 py-2">
                <View className="flex-row items-center">
                  <Ionicons
                    name="pricetag-outline"
                    size={15}
                    color="black"
                  />

                  <Text className="ml-2 text-xs font-extrabold text-black">
                    {couponCode} applied
                  </Text>
                </View>
              </View>
            ) : null}
          </View>


          {/* SAFETY */}
          <View className="mt-6 flex-row items-start rounded-3xl bg-gray-100 p-5">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color="black"
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="font-extrabold text-black">
                Test Payment Only
              </Text>

              <Text className="mt-1 text-sm leading-5 text-gray-500">
                Do not enter a JazzCash MPIN, PIN or OTP. A real wallet gateway would handle verification separately.
              </Text>
            </View>
          </View>


          {/* MOBILE */}
          <View className="mt-8">
            <View className="mb-4 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons
                  name="call-outline"
                  size={20}
                  color="black"
                />
              </View>

              <View className="ml-3">
                <Text className="text-xl font-extrabold text-black">
                  Mobile Number
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Use an 11-digit Pakistani number.
                </Text>
              </View>
            </View>

            <View className="rounded-3xl bg-gray-100 p-4">
              <Text className="mb-2 text-sm font-bold text-black">
                JazzCash Mobile Number
              </Text>

              <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
                <View className="mr-3 border-r border-gray-200 pr-3">
                  <Text className="font-extrabold text-black">
                    +92
                  </Text>
                </View>

                <TextInput
                  value={
                    mobileNumber
                  }
                  onChangeText={
                    handleMobileChange
                  }
                  editable={
                    !submitting
                  }
                  placeholder="03XXXXXXXXX"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={11}
                  className="flex-1 text-black"
                />
              </View>

              <View className="mt-3 flex-row items-center">
                <Ionicons
                  name="information-circle-outline"
                  size={15}
                  color="#6B7280"
                />

                <Text className="ml-2 text-xs text-gray-500">
                  Example: 03XXXXXXXXX
                </Text>
              </View>
            </View>
          </View>


          {/* SUMMARY */}
          <View className="mt-7 rounded-3xl bg-black p-5">
            <Text className="text-lg font-extrabold text-white">
              Payment Summary
            </Text>

            <View className="mt-5 flex-row justify-between">
              <Text className="text-gray-400">
                Items
              </Text>

              <Text className="font-bold text-white">
                {totalQuantity}
              </Text>
            </View>

            {couponCode &&
            Number(
              checkoutDiscount || 0,
            ) > 0 ? (
              <>
                <View className="mt-3 flex-row justify-between">
                  <Text className="text-gray-400">
                    Subtotal
                  </Text>

                  <Text className="font-bold text-white">
                    Rs{' '}
                    {Number(
                      checkoutSubtotal ||
                        0,
                    ).toFixed(0)}
                  </Text>
                </View>

                <View className="mt-3 flex-row justify-between">
                  <Text className="text-gray-400">
                    Discount ({couponCode})
                  </Text>

                  <Text className="font-extrabold text-white">
                    - Rs{' '}
                    {Number(
                      checkoutDiscount ||
                        0,
                    ).toFixed(0)}
                  </Text>
                </View>
              </>
            ) : null}

            <View className="my-5 h-px bg-gray-700" />

            <View className="flex-row items-end justify-between">
              <Text className="font-bold text-gray-300">
                Amount
              </Text>

              <Text className="text-3xl font-extrabold text-white">
                Rs {formattedAmount}
              </Text>
            </View>
          </View>
        </ScrollView>


        {/* FIXED ACTION */}
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
          <TouchableOpacity
            onPress={
              handleContinue
            }
            disabled={
              submitting
            }
            activeOpacity={0.85}
            className={`h-14 flex-row items-center justify-center rounded-2xl ${
              submitting
                ? 'bg-gray-400'
                : 'bg-black'
            }`}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="white"
            />

            <Text className="ml-2 text-base font-extrabold text-white">
              Continue Payment
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
        </View>
      </KeyboardAvoidingView>


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


export default JazzCashPayment;
