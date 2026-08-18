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

import OnlineMethodUnavailable from './OnlineMethodUnavailable';

import useNavigationSubmissionGuard from '../../hooks/useNavigationSubmissionGuard';


const BankTransfer = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const {
    shippingAddress,

    paymentMethod =
      'bank_transfer',

    paymentMethodName =
      'Bank Transfer',

    displayAmount = 0,

    totalQuantity = 0,

    couponCode = null,

    appliedCoupon = null,

    checkoutSubtotal = 0,

    checkoutDiscount = 0,

    checkoutTotal = 0,

    orderIdempotencyKey = null,

    paymentFlowMode = null,
  } = route.params || {};


  const [
    accountHolder,
    setAccountHolder,
  ] = useState('');


  const [
    reference,
    setReference,
  ] = useState('');


  const {
    submitting,
    beginSubmission,
  } =
    useNavigationSubmissionGuard(
      navigation,
    );


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
  // CONTINUE
  // ==========================================

  const handleContinue =
    () => {
      if (submitting) {
        return;
      }


      if (!__DEV__) {
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
        accountHolder
          .trim()
          .length < 2
      ) {
        showModal({
          type: 'warning',

          title:
            'Account Holder',

          message:
            'Please enter the TEST sender account holder name.',

          confirmText:
            'Try Again',
        });

        return;
      }


      if (
        reference
          .trim()
          .length < 4
      ) {
        showModal({
          type: 'warning',

          title:
            'Reference',

          message:
            'Please enter a TEST transaction/reference ID.',

          confirmText:
            'Try Again',
        });

        return;
      }


      if (!beginSubmission()) {
        return;
      }


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
            'BankTransfer',

          paymentMeta: {
            accountHolder:
              accountHolder.trim(),

            transferReference:
              reference.trim(),
          },

          orderIdempotencyKey,

          paymentFlowMode,
        },
      );


    };


  if (!__DEV__) {
    return (
      <OnlineMethodUnavailable
        navigation={
          navigation
        }
        paymentMethodName={
          paymentMethodName
        }
      />
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
                Bank Transfer
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Confirm a TEST bank-transfer payment.
              </Text>
            </View>

            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
              <Ionicons
                name="business-outline"
                size={22}
                color="white"
              />
            </View>
          </View>


          {/* TEST NOTICE */}
          <View className="mt-7 flex-row items-start rounded-3xl bg-gray-100 p-5">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="flask-outline"
                size={21}
                color="black"
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="font-extrabold text-black">
                Test Bank Details Only
              </Text>

              <Text className="mt-1 text-sm leading-5 text-gray-500">
                Do not transfer real money. These details only demonstrate the ExCloth bank-transfer flow.
              </Text>
            </View>
          </View>


          {/* BANK CARD */}
          <View className="mt-6 overflow-hidden rounded-3xl bg-black p-6">
            <View className="flex-row items-start justify-between">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="business-outline"
                  size={26}
                  color="black"
                />
              </View>

              <View className="rounded-full bg-white px-3 py-2">
                <Text className="text-[11px] font-extrabold uppercase tracking-wider text-black">
                  TEST ACCOUNT
                </Text>
              </View>
            </View>

            <Text className="mt-6 text-2xl font-extrabold text-white">
              ExCloth Demo Bank
            </Text>

            <Text className="mt-2 text-sm text-gray-400">
              ExCloth Test Merchant
            </Text>

            <View className="my-5 h-px bg-gray-700" />

            <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Account Number
            </Text>

            <Text className="mt-2 text-xl font-extrabold tracking-wider text-white">
              0000 0000 0000 0000
            </Text>

            <View className="mt-6 flex-row items-end justify-between">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Amount
                </Text>

                <Text className="mt-1 text-2xl font-extrabold text-white">
                  Rs {formattedAmount}
                </Text>
              </View>

              {couponCode ? (
                <View className="rounded-full bg-white px-3 py-2">
                  <Text className="text-xs font-extrabold text-black">
                    {couponCode}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>


          {/* TRANSFER DETAILS */}
          <View className="mt-8">
            <View className="mb-4 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="black"
                />
              </View>

              <View className="ml-3">
                <Text className="text-xl font-extrabold text-black">
                  Transfer Details
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Enter TEST sender information.
                </Text>
              </View>
            </View>

            <View className="rounded-3xl bg-gray-100 p-4">
              <Text className="mb-2 text-sm font-bold text-black">
                Sender Account Holder Name
              </Text>

              <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
                <Ionicons
                  name="person-outline"
                  size={19}
                  color="#6B7280"
                />

                <TextInput
                  value={
                    accountHolder
                  }
                  onChangeText={
                    setAccountHolder
                  }
                  editable={
                    !submitting
                  }
                  placeholder="e.g. Test User"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  className="ml-3 flex-1 text-black"
                />
              </View>

              <Text className="mb-2 mt-4 text-sm font-bold text-black">
                TEST Transaction / Reference ID
              </Text>

              <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
                <Ionicons
                  name="receipt-outline"
                  size={19}
                  color="#6B7280"
                />

                <TextInput
                  value={
                    reference
                  }
                  onChangeText={
                    value =>
                      setReference(
                        value.slice(
                          0,
                          40,
                        ),
                      )
                  }
                  editable={
                    !submitting
                  }
                  placeholder="e.g. TEST-BANK-12345"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  className="ml-3 flex-1 text-black"
                />
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
                Total
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
              name="checkmark-circle-outline"
              size={20}
              color="white"
            />

            <Text className="ml-2 text-base font-extrabold text-white">
              Confirm Test Transfer
            </Text>

            <View className="ml-2">
              <Ionicons
                name="arrow-forward-outline"
                size={19}
                color="white"
              />
            </View>
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


export default BankTransfer;
