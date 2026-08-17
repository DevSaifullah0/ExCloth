import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Keyboard,
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

import { supabase } from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const RETURN_REASONS = [
  'Wrong size',
  'Wrong color',
  'Item damaged',
  'Item not as described',
  'Received wrong item',
  'Quality issue',
  'Other',
];


const ReturnRequest = ({
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
    selectedItems,
    setSelectedItems,
  ] = useState({});


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


  const [
    selectedReason,
    setSelectedReason,
  ] = useState('');


  const [
    details,
    setDetails,
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


  // ==========================================
  // MODAL
  // ==========================================

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


  // ==========================================
  // FETCH ORDER
  // ==========================================

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
              user_id,
              subtotal_amount,
              discount_amount,
              total_amount,
              status,
              payment_status,
              payment_method,
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
              order_id,
              product_id,
              variant_id,
              product_name,
              product_name_snapshot,
              variant_size_snapshot,
              variant_color_snapshot,
              variant_sku_snapshot,
              unit_price,
              quantity
            `)
            .eq(
              'order_id',
              orderId,
            )
            .order(
              'created_at',
              {
                ascending: true,
              },
            );


        if (itemError) {
          throw itemError;
        }


        setOrder(
          orderData,
        );


        setItems(
          itemData || [],
        );


        const defaults = {};


        (itemData || [])
          .forEach(
            item => {
              defaults[
                item.id
              ] = {
                selected:
                  true,

                quantity:
                  Number(
                    item.quantity ||
                      1,
                  ),
              };
            },
          );


        setSelectedItems(
          defaults,
        );

      } catch (error) {
        console.log(
          'Return Request Load Error:',
          error.message,
        );


        setErrorMessage(
          error.message ||
            'Unable to load return information.',
        );

      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
    fetchOrder();
  }, [
    orderId,
  ]);


  // ==========================================
  // ELIGIBILITY
  // ==========================================

  const isDelivered =
    String(
      order?.status || '',
    )
      .trim()
      .toLowerCase() ===
    'delivered';


  const returnDeadline =
    useMemo(
      () => {
        if (
          !order?.delivered_at
        ) {
          return null;
        }


        const delivered =
          new Date(
            order.delivered_at,
          );


        if (
          Number.isNaN(
            delivered.getTime(),
          )
        ) {
          return null;
        }


        const deadline =
          new Date(
            delivered,
          );


        deadline.setDate(
          deadline.getDate() +
            7,
        );


        return deadline;
      },
      [
        order?.delivered_at,
      ],
    );


  const withinWindow =
    returnDeadline
      ? new Date() <=
        returnDeadline
      : false;


  const canReturn =
    isDelivered &&
    withinWindow;


  // ==========================================
  // SELECTED ITEMS
  // ==========================================

  const selectedPayload =
    useMemo(
      () =>
        items
          .filter(
            item =>
              selectedItems[
                item.id
              ]?.selected,
          )
          .map(
            item => ({
              order_item_id:
                item.id,

              quantity:
                Number(
                  selectedItems[
                    item.id
                  ]?.quantity ||
                    1,
                ),
            }),
          ),
      [
        items,
        selectedItems,
      ],
    );


  const selectedCount =
    selectedPayload.length;


  const toggleItem =
    item => {
      setSelectedItems(
        current => ({
          ...current,

          [item.id]: {
            selected:
              !current[
                item.id
              ]?.selected,

            quantity:
              current[
                item.id
              ]?.quantity ||
              Number(
                item.quantity ||
                  1,
              ),
          },
        }),
      );
    };


  const changeQuantity = (
    item,
    amount,
  ) => {
    setSelectedItems(
      current => {
        const currentQuantity =
          Number(
            current[
              item.id
            ]?.quantity ||
              1,
          );


        const maxQuantity =
          Number(
            item.quantity ||
              1,
          );


        const nextQuantity =
          Math.min(
            Math.max(
              currentQuantity +
                amount,
              1,
            ),
            maxQuantity,
          );


        return {
          ...current,

          [item.id]: {
            selected:
              current[
                item.id
              ]?.selected ??
              true,

            quantity:
              nextQuantity,
          },
        };
      },
    );
  };


  // ==========================================
  // FORMAT
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


  const formatDate =
    value => {
      if (!value) {
        return '';
      }


      const date =
        new Date(
          value,
        );


      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return '';
      }


      return date.toLocaleString();
    };


  // ==========================================
  // EDGE FUNCTION ERROR
  // ==========================================

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
        }

      } catch (parseError) {
        console.log(
          'Return Error Parse:',
          parseError.message,
        );
      }


      return (
        error?.message ||
        'Unable to submit return request.'
      );
    };


  // ==========================================
  // REQUEST RETURN BUTTON
  // ==========================================

  const handleRequestReturnPress =
    () => {
      if (submitting) {
        return;
      }


      if (
        selectedPayload.length ===
        0
      ) {
        showModal({
          type: 'warning',
          title:
            'Select Items',
          message:
            'Please select at least one item to return.',
        });

        return;
      }


      if (
        selectedReason.trim()
          .length < 3
      ) {
        showModal({
          type: 'warning',
          title:
            'Return Reason',
          message:
            'Please select a return reason.',
        });

        return;
      }


      if (
        selectedReason ===
          'Other' &&
        details.trim().length <
          3
      ) {
        showModal({
          type: 'warning',
          title:
            'Return Details',
          message:
            'Please enter a short explanation for your return.',
        });

        return;
      }


      Keyboard.dismiss();


      showModal({
        type: 'confirm',
        title:
          'Submit Return?',
        message:
          `You are requesting a return for ${selectedCount} item(s). Continue?`,
        confirmText:
          'Submit Return',
        onConfirm: () => {
          closeModal();


          setTimeout(
            () => {
              submitReturn();
            },
            200,
          );
        },
      });
    };


  // ==========================================
  // SUBMIT RETURN
  // ==========================================

  const submitReturn =
    async () => {
      if (submitting) {
        return;
      }


      if (!canReturn) {
        showModal({
          type: 'warning',
          title:
            'Return Unavailable',
          message:
            'This order is not currently eligible for return.',
        });

        return;
      }


      if (
        selectedPayload.length ===
        0
      ) {
        showModal({
          type: 'warning',
          title:
            'Select Items',
          message:
            'Please select at least one item to return.',
        });

        return;
      }


      if (
        selectedReason.length <
        3
      ) {
        showModal({
          type: 'warning',
          title:
            'Return Reason',
          message:
            'Please select a return reason.',
        });

        return;
      }


      if (
        selectedReason ===
          'Other' &&
        details.trim().length <
          3
      ) {
        showModal({
          type: 'warning',
          title:
            'Return Details',
          message:
            'Please enter a short explanation for your return.',
        });

        return;
      }


      try {
        setSubmitting(
          true,
        );


        const {
          data,
          error,
        } =
          await supabase.functions
            .invoke(
              'request-return',
              {
                body: {
                  order_id:
                    order.id,

                  reason:
                    selectedReason,

                  details:
                    details.trim(),

                  items:
                    selectedPayload,
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
              'Unable to submit return request.',
          );
        }


        showModal({
          type: 'success',
          title:
            'Return Requested',
          message:
            `Your return request has been submitted successfully.\n\nEstimated refund: Rs ${Number(
              data.estimated_refund_amount ||
                0,
            ).toFixed(2)}`,
          confirmText:
            'View Return',
          onConfirm: () => {
            closeModal();


            navigation.replace(
              'ReturnDetails',
              {
                returnRequestId:
                  data.return_request_id,
              },
            );
          },
        });

      } catch (error) {
        console.log(
          'Return Request Error:',
          error.message,
        );


        showModal({
          type: 'error',
          title:
            'Return Failed',
          message:
            error.message ||
            'Unable to submit return request.',
        });

      } finally {
        setSubmitting(
          false,
        );
      }
    };


  // ==========================================
  // LOADING
  // ==========================================

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
          Loading return details...
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
                Return Order
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Create a return request.
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
              Unable to load return
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage}
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
              Return Order
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Select items and tell us what went wrong.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="return-down-back-outline"
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
            <View className="flex-1 pr-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Delivered
              </Text>

              <Text className="mt-1 font-extrabold text-white">
                {
                  formatDate(
                    order.delivered_at,
                  ) ||
                  'Not available'
                }
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Total
              </Text>

              <Text className="mt-1 text-xl font-extrabold text-white">
                Rs{' '}
                {Number(
                  order.total_amount ||
                    0,
                ).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>


        {/* ELIGIBILITY */}
        {!canReturn ? (
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
                Return Unavailable
              </Text>

              <Text className="mt-1 text-sm leading-6 text-gray-500">
                Returns are available for delivered orders within 7 days of delivery.
              </Text>
            </View>
          </View>
        ) : (
          <View className="mt-5 flex-row items-start rounded-3xl bg-gray-100 p-5">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="calendar-outline"
                size={21}
                color="black"
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="font-extrabold text-black">
                Return Window Active
              </Text>

              <Text className="mt-1 text-sm leading-6 text-gray-500">
                Eligible until{' '}
                {
                  formatDate(
                    returnDeadline,
                  )
                }
              </Text>
            </View>
          </View>
        )}


        {/* SELECT ITEMS */}
        <View className="mt-8">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-extrabold text-black">
                Select Items
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Choose products and return quantities.
              </Text>
            </View>

            <View className="rounded-full bg-black px-3 py-2">
              <Text className="text-xs font-extrabold text-white">
                {selectedCount} selected
              </Text>
            </View>
          </View>

          <View className="mt-5">
            {items.map(
              item => {
                const state =
                  selectedItems[
                    item.id
                  ] || {};

                const selected =
                  Boolean(
                    state.selected,
                  );

                const productName =
                  item
                    .product_name_snapshot ||
                  item.product_name ||
                  'Product';

                const quantity =
                  Number(
                    state.quantity ||
                      1,
                  );

                const maxQuantity =
                  Number(
                    item.quantity ||
                      1,
                  );

                return (
                  <View
                    key={
                      item.id
                    }
                    className={`mb-4 rounded-3xl border-2 p-5 ${
                      selected
                        ? 'border-black bg-gray-100'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        toggleItem(
                          item,
                        )
                      }
                      disabled={
                        submitting ||
                        !canReturn
                      }
                      activeOpacity={0.85}
                      className="flex-row items-start"
                    >
                      <View
                        className={`h-12 w-12 items-center justify-center rounded-2xl ${
                          selected
                            ? 'bg-black'
                            : 'bg-gray-100'
                        }`}
                      >
                        <Ionicons
                          name={
                            selected
                              ? 'checkmark'
                              : 'cube-outline'
                          }
                          size={21}
                          color={
                            selected
                              ? 'white'
                              : 'black'
                          }
                        />
                      </View>

                      <View className="ml-4 flex-1">
                        <Text className="font-extrabold text-black">
                          {
                            productName
                          }
                        </Text>

                        <View className="mt-3 flex-row flex-wrap">
                          {item
                            .variant_size_snapshot ? (
                            <View className="mb-2 mr-2 rounded-full bg-white px-3 py-1.5">
                              <Text className="text-xs font-bold text-gray-600">
                                Size{' '}
                                {
                                  item
                                    .variant_size_snapshot
                                }
                              </Text>
                            </View>
                          ) : null}

                          {item
                            .variant_color_snapshot ? (
                            <View className="mb-2 mr-2 rounded-full bg-white px-3 py-1.5">
                              <Text className="text-xs font-bold text-gray-600">
                                {
                                  item
                                    .variant_color_snapshot
                                }
                              </Text>
                            </View>
                          ) : null}

                          <View className="mb-2 rounded-full bg-white px-3 py-1.5">
                            <Text className="text-xs font-bold text-gray-600">
                              Ordered Qty{' '}
                              {maxQuantity}
                            </Text>
                          </View>
                        </View>

                        <Text className="mt-2 text-lg font-extrabold text-black">
                          Rs{' '}
                          {Number(
                            item.unit_price ||
                              0,
                          ).toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {selected &&
                    maxQuantity >
                      1 ? (
                      <View className="mt-4 flex-row items-center justify-between border-t border-gray-200 pt-4">
                        <Text className="text-sm font-bold text-gray-600">
                          Return Quantity
                        </Text>

                        <View className="flex-row items-center rounded-2xl bg-white p-1">
                          <TouchableOpacity
                            onPress={() =>
                              changeQuantity(
                                item,
                                -1,
                              )
                            }
                            disabled={
                              submitting
                            }
                            activeOpacity={0.8}
                            className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100"
                          >
                            <Ionicons
                              name="remove-outline"
                              size={20}
                              color="black"
                            />
                          </TouchableOpacity>

                          <Text className="mx-5 font-extrabold text-black">
                            {
                              quantity
                            }
                          </Text>

                          <TouchableOpacity
                            onPress={() =>
                              changeQuantity(
                                item,
                                1,
                              )
                            }
                            disabled={
                              submitting
                            }
                            activeOpacity={0.8}
                            className="h-10 w-10 items-center justify-center rounded-xl bg-black"
                          >
                            <Ionicons
                              name="add-outline"
                              size={20}
                              color="white"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              },
            )}
          </View>
        </View>


        {/* REASON */}
        {canReturn ? (
          <>
            <View className="mt-4">
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
                    Return Reason
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    Select the reason that best fits.
                  </Text>
                </View>
              </View>

              <View className="mt-5">
                {RETURN_REASONS.map(
                  reason => {
                    const selected =
                      selectedReason ===
                      reason;

                    return (
                      <TouchableOpacity
                        key={
                          reason
                        }
                        onPress={() =>
                          setSelectedReason(
                            reason,
                          )
                        }
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
                          {
                            reason
                          }
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            </View>


            {/* DETAILS */}
            <View className="mt-4 rounded-3xl bg-gray-100 p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-black">
                  Additional Details
                </Text>

                <Text className="text-xs font-semibold text-gray-400">
                  {selectedReason ===
                  'Other'
                    ? 'Required'
                    : 'Optional'}
                </Text>
              </View>

              <TextInput
                value={
                  details
                }
                onChangeText={
                  value =>
                    setDetails(
                      value.slice(
                        0,
                        500,
                      ),
                    )
                }
                editable={
                  !submitting
                }
                placeholder="Describe the issue with the item..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                className="mt-3 min-h-36 rounded-2xl bg-white p-4 text-black"
              />

              <View className="mt-2 flex-row justify-between">
                <Text className="text-xs font-semibold text-gray-400">
                  Help us understand the issue clearly.
                </Text>

                <Text className="text-xs font-semibold text-gray-400">
                  {details.length}/500
                </Text>
              </View>
            </View>


            {/* SUMMARY */}
            <View className="mt-6 rounded-3xl bg-black p-5">
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="return-down-back-outline"
                    size={21}
                    color="black"
                  />
                </View>

                <View className="ml-3">
                  <Text className="text-lg font-extrabold text-white">
                    Return Summary
                  </Text>

                  <Text className="mt-1 text-xs text-gray-400">
                    Review before submitting.
                  </Text>
                </View>
              </View>

              <View className="mt-5 flex-row justify-between">
                <Text className="text-gray-400">
                  Selected Items
                </Text>

                <Text className="font-extrabold text-white">
                  {selectedCount}
                </Text>
              </View>

              <View className="mt-3 flex-row justify-between">
                <Text className="text-gray-400">
                  Reason
                </Text>

                <Text className="ml-4 flex-1 text-right font-extrabold text-white">
                  {selectedReason ||
                    'Not selected'}
                </Text>
              </View>
            </View>


            {/* SUBMIT */}
            <TouchableOpacity
              onPress={
                handleRequestReturnPress
              }
              disabled={
                submitting ||
                selectedCount ===
                  0 ||
                selectedReason
                  .trim()
                  .length < 3
              }
              activeOpacity={0.85}
              className={`mt-7 h-14 flex-row items-center justify-center rounded-2xl ${
                submitting ||
                selectedCount ===
                  0 ||
                selectedReason
                  .trim()
                  .length < 3
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
                    name="return-down-back-outline"
                    size={21}
                    color="white"
                  />

                  <Text className="ml-2 text-base font-extrabold text-white">
                    Request Return
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
        cancelText="Not Now"
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
            submitting
          ) {
            return;
          }

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


export default ReturnRequest;
