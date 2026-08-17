import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';

import React, {
  useEffect,
  useMemo,
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

import AppModal from '../../components/common/AppModal';

const CANCEL_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Found a better option',
  'Delivery is taking too long',
  'Wrong size / color selected',
  'Other',
];

const ALLOWED_STATUSES = [
  'pending',
  'confirmed',
];

const CancelOrder = ({
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
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    selectedReason,
    setSelectedReason,
  ] = useState('');

  const [
    otherReason,
    setOtherReason,
  ] = useState('');

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
    onConfirm: null,
  });

  const showModal = ({
    type = 'info',
    title = '',
    message = '',
    confirmText = 'OK',
    onConfirm = null,
  }) => {
    setModal({
      visible: true,
      type,
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const closeModal = () => {
    setModal(current => ({
      ...current,
      visible: false,
    }));
  };

  const fetchOrder =
    async () => {
      try {
        setLoading(true);
        setErrorMessage('');

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
            .from('orders')
            .select(`
              id,
              order_number,
              user_id,
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
        if (__DEV__) {
          console.error(
            'Cancel Order Load Error:',
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

  useEffect(() => {
    fetchOrder();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orderId,
  ]);

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

  const formatPaymentMethod =
    method => {
      switch (
        String(
          method || '',
        ).toLowerCase()
      ) {
        case 'cod':
          return 'Cash on Delivery';

        case 'card':
          return 'Debit / Credit Card';

        case 'easypaisa':
          return 'Easypaisa';

        case 'jazzcash':
          return 'JazzCash';

        case 'bank_transfer':
          return 'Bank Transfer';

        default:
          return formatStatus(
            method,
          );
      }
    };

  const canCancel =
    useMemo(
      () =>
        ALLOWED_STATUSES.includes(
          String(
            order?.status || '',
          ).toLowerCase(),
        ),
      [
        order?.status,
      ],
    );

  const isPaid =
    String(
      order?.payment_status || '',
    ).toLowerCase() ===
    'paid';

  const finalReason =
    useMemo(
      () => {
        if (
          selectedReason ===
          'Other'
        ) {
          return otherReason.trim();
        }

        return selectedReason.trim();
      },
      [
        selectedReason,
        otherReason,
      ],
    );

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
        }

      } catch (parseError) {
        if (__DEV__) {
          console.error(
            'Cancel Order Error Parse:',
            parseError.message,
          );
        }
      }

      return (
        error?.message ||
        'Unable to cancel order.'
      );
    };

  const handleCancelOrder =
    async () => {
      if (submitting) {
        return;
      }

      if (!order?.id) {
        showModal({
          type: 'error',
          title: 'Order',
          message:
            'Order information is missing.',
        });

        return;
      }

      if (!canCancel) {
        showModal({
          type: 'warning',
          title:
            'Cancellation Unavailable',
          message:
            'This order can no longer be cancelled because processing or delivery has already started.',
        });

        return;
      }

      if (
        finalReason.length <
        3
      ) {
        showModal({
          type: 'warning',
          title:
            'Cancellation Reason',
          message:
            'Please select or enter a cancellation reason.',
        });

        return;
      }

      if (
        finalReason.length >
        300
      ) {
        showModal({
          type: 'warning',
          title:
            'Cancellation Reason',
          message:
            'Cancellation reason cannot exceed 300 characters.',
        });

        return;
      }

      try {
        setSubmitting(
          true,
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

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          throw new Error(
            'Your session has expired. Please login again.',
          );
        }

        const {
          data,
          error,
        } =
          await supabase.functions
            .invoke(
              'cancel-order',
              {
                body: {
                  order_id:
                    order.id,
                  reason:
                    finalReason,
                },
              },
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

        if (
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              'Unable to cancel order.',
          );
        }

        const refundMessage =
          data?.refund_required
            ? '\n\nThis order was already paid. Its payment remains recorded and will need to be refunded separately.'
            : '';

        showModal({
          type: 'success',
          title:
            'Order Cancelled',
          message:
            `Your order #${order.order_number} has been cancelled successfully.${refundMessage}`,
          confirmText:
            'View My Orders',
          onConfirm: () => {
            closeModal();

            navigation.navigate(
              'MyOrders',
            );
          },
        });

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Cancel Order Error:',
            error.message,
          );
        }

        showModal({
          type: 'error',
          title:
            'Cancellation Failed',
          message:
            error.message ||
            'Unable to cancel order.',
        });

      } finally {
        setSubmitting(
          false,
        );
      }
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
        <View className="flex-1 px-5">
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

            <View className="ml-4">
              <Text className="text-3xl font-extrabold text-black">
                Cancel Order
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Manage your cancellation request.
              </Text>
            </View>
          </View>

          <View className="flex-1 items-center justify-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Ionicons
                name="alert-circle-outline"
                size={38}
                color="black"
              />
            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              Unable to load order
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage ||
                'Order information is unavailable.'}
            </Text>

            <TouchableOpacity
              onPress={
                fetchOrder
              }
              activeOpacity={0.85}
              className="mt-6 rounded-2xl bg-black px-7 py-4"
            >
              <Text className="font-extrabold text-white">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }


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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            Math.max(
              insets.bottom,
              24,
            ) + 36,
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
              Cancel Order
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Review the order before cancelling.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="close-circle-outline"
              size={22}
              color="white"
            />
          </View>
        </View>


        {/* ORDER HERO */}
        <View className="mt-7 overflow-hidden rounded-3xl bg-black p-6">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Order
              </Text>

              <Text className="mt-2 text-2xl font-extrabold text-white">
                #{order.order_number}
              </Text>
            </View>

            <View className="rounded-full bg-white px-3 py-2">
              <Text className="text-xs font-extrabold text-black">
                {
                  formatStatus(
                    order.status,
                  )
                }
              </Text>
            </View>
          </View>

          <View className="my-5 h-px bg-gray-700" />

          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Order Total
              </Text>

              <Text className="mt-1 text-3xl font-extrabold text-white">
                Rs{' '}
                {Number(
                  order.total_amount ||
                    0,
                ).toFixed(2)}
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Payment
              </Text>

              <Text className="mt-1 font-extrabold text-white">
                {
                  formatPaymentMethod(
                    order.payment_method,
                  )
                }
              </Text>
            </View>
          </View>
        </View>


        {/* CANCELLATION AVAILABILITY */}
        {!canCancel ? (
          <View className="mt-5 flex-row items-start rounded-3xl bg-gray-100 p-5">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="black"
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="font-extrabold text-black">
                Cancellation Unavailable
              </Text>

              <Text className="mt-1 text-sm leading-6 text-gray-500">
                Orders can only be cancelled while they are Pending or Confirmed.
              </Text>
            </View>
          </View>
        ) : null}


        {/* PAYMENT INFO */}
        <View className="mt-5 rounded-3xl border border-gray-200 bg-white p-5">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Ionicons
                name="wallet-outline"
                size={22}
                color="black"
              />
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-lg font-extrabold text-black">
                Payment Information
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Current payment status
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-2xl bg-gray-100 p-4">
            <View className="flex-row justify-between">
              <Text className="text-gray-500">
                Method
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
                Status
              </Text>

              <Text className="font-extrabold text-black">
                {
                  formatStatus(
                    order.payment_status,
                  )
                }
              </Text>
            </View>
          </View>

          {isPaid ? (
            <View className="mt-4 flex-row items-start rounded-2xl bg-gray-100 p-4">
              <Ionicons
                name="information-circle-outline"
                size={19}
                color="#6B7280"
              />

              <Text className="ml-3 flex-1 text-sm leading-6 text-gray-600">
                This order is already paid. Cancelling it will not remove the payment record. Refund handling will be processed separately.
              </Text>
            </View>
          ) : null}
        </View>


        {/* REASONS */}
        {canCancel ? (
          <>
            <View className="mt-8">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <Ionicons
                    name="help-circle-outline"
                    size={21}
                    color="black"
                  />
                </View>

                <View className="ml-3">
                  <Text className="text-xl font-extrabold text-black">
                    Why are you cancelling?
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    Select the closest reason.
                  </Text>
                </View>
              </View>

              <View className="mt-5">
                {CANCEL_REASONS.map(
                  reason => {
                    const selected =
                      selectedReason ===
                      reason;

                    return (
                      <TouchableOpacity
                        key={
                          reason
                        }
                        onPress={() => {
                          setSelectedReason(
                            reason,
                          );

                          if (
                            reason !==
                            'Other'
                          ) {
                            setOtherReason(
                              '',
                            );
                          }
                        }}
                        disabled={
                          submitting
                        }
                        activeOpacity={0.85}
                        className={`mb-3 flex-row items-center rounded-3xl border-2 p-4 ${
                          selected
                            ? 'border-black bg-gray-100'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <View
                          className={`h-11 w-11 items-center justify-center rounded-2xl ${
                            selected
                              ? 'bg-black'
                              : 'bg-gray-100'
                          }`}
                        >
                          <Ionicons
                            name={
                              selected
                                ? 'checkmark'
                                : 'ellipse-outline'
                            }
                            size={20}
                            color={
                              selected
                                ? 'white'
                                : 'black'
                            }
                          />
                        </View>

                        <Text className="ml-4 flex-1 font-extrabold text-black">
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            </View>


            {selectedReason ===
            'Other' ? (
              <View className="mt-2 rounded-3xl bg-gray-100 p-4">
                <Text className="mb-2 text-sm font-bold text-black">
                  Cancellation Reason
                </Text>

                <TextInput
                  value={
                    otherReason
                  }
                  onChangeText={
                    value =>
                      setOtherReason(
                        value.slice(
                          0,
                          300,
                        ),
                      )
                  }
                  editable={
                    !submitting
                  }
                  placeholder="Tell us why you want to cancel this order..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                  className="min-h-32 rounded-2xl bg-white p-4 text-black"
                />

                <Text className="mt-2 text-right text-xs font-semibold text-gray-400">
                  {otherReason.length}/300
                </Text>
              </View>
            ) : null}


            {/* WARNING */}
            <View className="mt-6 flex-row items-start rounded-3xl bg-gray-100 p-5">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
                <Ionicons
                  name="warning-outline"
                  size={21}
                  color="black"
                />
              </View>

              <View className="ml-3 flex-1">
                <Text className="font-extrabold text-black">
                  Before You Cancel
                </Text>

                <Text className="mt-1 text-sm leading-6 text-gray-500">
                  Cancelling an order cannot be undone. You will need to place a new order if you change your mind.
                </Text>
              </View>
            </View>


            {/* CANCEL BUTTON */}
            <TouchableOpacity
              onPress={() =>
                showModal({
                  type: 'confirm',
                  title:
                    'Cancel Order?',
                  message:
                    'Are you sure you want to cancel this order? This action cannot be undone.',
                  confirmText:
                    'Yes, Cancel Order',
                  onConfirm: () => {
                    closeModal();

                    setTimeout(
                      handleCancelOrder,
                      150,
                    );
                  },
                })
              }
              disabled={
                submitting ||
                finalReason.length <
                  3
              }
              activeOpacity={0.85}
              className={`mt-7 h-14 flex-row items-center justify-center rounded-2xl ${
                submitting ||
                finalReason.length <
                  3
                  ? 'bg-gray-300'
                  : 'bg-black'
              }`}
            >
              {submitting ? (
                <ActivityIndicator
                  color="white"
                />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={21}
                    color="white"
                  />

                  <Text className="ml-2 text-base font-extrabold text-white">
                    Cancel Order
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>


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
        showCancel={
          modal.type ===
          'confirm'
        }
        cancelText="Keep Order"
        dismissible={
          !submitting
        }
        loading={
          submitting
        }
        onCancel={
          closeModal
        }
        onConfirm={() => {
          if (
            typeof modal.onConfirm ===
            'function'
          ) {
            modal.onConfirm();
            return;
          }

          closeModal();
        }}
      />
    </SafeAreaView>
  );
};


export default CancelOrder;
