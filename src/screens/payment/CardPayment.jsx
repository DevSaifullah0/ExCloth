import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import React, { useMemo, useState } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppModal from '../../components/common/AppModal';
import useNavigationSubmissionGuard from '../../hooks/useNavigationSubmissionGuard';

const CardPayment = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  const {
    shippingAddress,
    paymentMethod = 'card',
    paymentMethodName = 'Debit / Credit Card',
    displayAmount = 0,
    totalQuantity = 0,
    couponCode = null,
    appliedCoupon = null,
    checkoutSubtotal = 0,
    checkoutDiscount = 0,
    checkoutTotal = 0,
    orderIdempotencyKey = null,
  } = route.params || {};

  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const {
    submitting,
    beginSubmission,
  } =
    useNavigationSubmissionGuard(
      navigation,
    );

  const [modal, setModal] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
  });

  const formattedAmount = useMemo(
    () => Number(displayAmount || 0).toFixed(0),
    [displayAmount],
  );

  const formattedDiscount = useMemo(
    () => Number(checkoutDiscount || 0).toFixed(0),
    [checkoutDiscount],
  );

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

  const formatCardNumber = value => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = value => {
    const digits = value.replace(/\D/g, '').slice(0, 4);

    if (digits.length <= 2) {
      return digits;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const isExpiryValid = value => {
    const match = value.match(/^(\d{2})\/(\d{2})$/);

    if (!match) {
      return false;
    }

    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);

    if (month < 1 || month > 12) {
      return false;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return (
      year > currentYear ||
      (year === currentYear && month >= currentMonth)
    );
  };

  const handleContinue = () => {
    if (submitting) {
      return;
    }

    if (!__DEV__) {
      showModal({
        type: 'warning',
        title: 'Card Payment Unavailable',
        message:
          'A verified payment provider is required before card payments can be accepted.',
      });
      return;
    }

    if (!shippingAddress?.id) {
      showModal({
        type: 'warning',
        title: 'Delivery Address',
        message:
          'Delivery address is missing. Please go back and select an address.',
        confirmText: 'OK',
      });
      return;
    }

    if (cardHolder.trim().length < 2) {
      showModal({
        type: 'warning',
        title: 'Card Holder Name',
        message: 'Please enter the card holder name.',
        confirmText: 'OK',
      });
      return;
    }

    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length !== 16) {
      showModal({
        type: 'warning',
        title: 'Card Number',
        message: 'Please enter a 16-digit TEST card number.',
        confirmText: 'OK',
      });
      return;
    }

    if (!isExpiryValid(expiry)) {
      showModal({
        type: 'warning',
        title: 'Expiry Date',
        message:
          'Please enter a valid expiry date in MM/YY format.',
        confirmText: 'OK',
      });
      return;
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      showModal({
        type: 'warning',
        title: 'CVV',
        message: 'Please enter a valid 3 or 4 digit TEST CVV.',
        confirmText: 'OK',
      });
      return;
    }

    if (!beginSubmission()) {
      return;
    }

    navigation.navigate('PaymentProcessing', {
      shippingAddress,
      paymentMethod,
      paymentMethodName,
      displayAmount,
      totalQuantity,
      sourceScreen: 'CardPayment',
      paymentMeta: {
        cardHolder: cardHolder.trim(),
        cardLast4: digits.slice(-4),
        maskedCard: `**** **** **** ${digits.slice(-4)}`,
      },
      couponCode,
      appliedCoupon,
      checkoutSubtotal,
      checkoutDiscount,
      checkoutTotal,
      orderIdempotencyKey,
      paymentFlowMode: 'demo',
    });

  };

  if (!__DEV__) {
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
          <View className="mt-4 flex-row items-center">
            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              accessibilityRole="button"
              accessibilityLabel="Go back"
              activeOpacity={0.8}
              className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
            >
              <Ionicons
                name="arrow-back-outline"
                size={22}
                color="black"
              />
            </TouchableOpacity>

            <Text className="ml-4 text-2xl font-extrabold text-black">
              Card Payment
            </Text>
          </View>

          <View className="flex-1 items-center justify-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-black">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={32}
                  color="white"
                />
              </View>
            </View>

            <Text className="mt-7 text-center text-3xl font-extrabold text-black">
              Card payments unavailable
            </Text>

            <Text className="mt-3 max-w-sm text-center text-base leading-6 text-gray-500">
              A verified payment provider checkout is required before card payments can be enabled. No card details are collected in this build.
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              accessibilityRole="button"
              activeOpacity={0.85}
              className="mt-8 h-14 w-full items-center justify-center rounded-2xl bg-black"
            >
              <Text className="text-base font-extrabold text-white">
                Choose Another Method
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
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
          showsVerticalScrollIndicator={false}
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
              disabled={submitting}
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
                Card Payment
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Enter TEST card details to continue.
              </Text>
            </View>

            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
              <Ionicons
                name="card-outline"
                size={22}
                color="white"
              />
            </View>
          </View>


          {/* TEST MODE */}
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
                Test Payment Mode
              </Text>

              <Text className="mt-1 text-sm leading-5 text-gray-500">
                Do not enter a real card number, CVV, PIN or OTP. These fields are only for the ExCloth demo flow.
              </Text>
            </View>
          </View>


          {/* CARD PREVIEW */}
          <View className="mt-6 overflow-hidden rounded-3xl bg-black p-6">
            <View className="flex-row items-center justify-between">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="card-outline"
                  size={24}
                  color="black"
                />
              </View>

              <Text className="text-xs font-extrabold uppercase tracking-widest text-gray-400">
                TEST CARD
              </Text>
            </View>

            <Text className="mt-8 text-xl font-extrabold tracking-widest text-white">
              {cardNumber || '**** **** **** 4242'}
            </Text>

            <View className="mt-7 flex-row justify-between">
              <View className="mr-4 flex-1">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Card Holder
                </Text>

                <Text
                  numberOfLines={1}
                  className="mt-1 font-extrabold text-white"
                >
                  {cardHolder.trim() ||
                    'YOUR NAME'}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Amount
                </Text>

                <Text className="mt-1 font-extrabold text-white">
                  Rs {formattedAmount}
                </Text>
              </View>
            </View>
          </View>


          {/* CARD DETAILS */}
          <View className="mt-8">
            <View className="mb-4 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color="black"
                />
              </View>

              <View className="ml-3">
                <Text className="text-xl font-extrabold text-black">
                  Card Details
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Use test information only.
                </Text>
              </View>
            </View>

            <View className="rounded-3xl bg-gray-100 p-4">
              <Text className="mb-2 text-sm font-bold text-black">
                Card Holder Name
              </Text>

              <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
                <Ionicons
                  name="person-outline"
                  size={19}
                  color="#6B7280"
                />

                <TextInput
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  editable={!submitting}
                  placeholder="e.g. Test User"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  className="ml-3 flex-1 text-black"
                />
              </View>

              <Text className="mb-2 mt-4 text-sm font-bold text-black">
                Card Number
              </Text>

              <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
                <Ionicons
                  name="card-outline"
                  size={19}
                  color="#6B7280"
                />

                <TextInput
                  value={cardNumber}
                  onChangeText={value =>
                    setCardNumber(
                      formatCardNumber(
                        value,
                      ),
                    )
                  }
                  editable={!submitting}
                  placeholder="4242 4242 4242 4242"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={19}
                  className="ml-3 flex-1 text-black"
                />
              </View>

              <View className="mt-4 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-bold text-black">
                    Expiry
                  </Text>

                  <TextInput
                    value={expiry}
                    onChangeText={value =>
                      setExpiry(
                        formatExpiry(
                          value,
                        ),
                      )
                    }
                    editable={!submitting}
                    placeholder="12/30"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={5}
                    className="h-14 rounded-2xl bg-white px-4 text-black"
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 text-sm font-bold text-black">
                    CVV
                  </Text>

                  <TextInput
                    value={cvv}
                    onChangeText={value =>
                      setCvv(
                        value
                          .replace(/\D/g, '')
                          .slice(0, 4),
                      )
                    }
                    editable={!submitting}
                    placeholder="123"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    className="h-14 rounded-2xl bg-white px-4 text-black"
                  />
                </View>
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

            {couponCode ? (
              <View className="mt-3 flex-row justify-between">
                <Text className="text-gray-400">
                  Promo ({couponCode})
                </Text>

                <Text className="font-extrabold text-white">
                  - Rs {formattedDiscount}
                </Text>
              </View>
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


        {/* FIXED PAY BUTTON */}
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
            onPress={handleContinue}
            disabled={submitting}
            activeOpacity={0.85}
            className={`h-14 flex-row items-center justify-center rounded-2xl ${
              submitting
                ? 'bg-gray-400'
                : 'bg-black'
            }`}
          >
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color="white"
            />

            <Text className="ml-2 text-base font-extrabold text-white">
              Pay Rs {formattedAmount}
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
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        onConfirm={closeModal}
        onCancel={closeModal}
      />
    </SafeAreaView>
  );
};


export default CardPayment;
