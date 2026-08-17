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
        if (__DEV__) {
          console.error(
            'Return Request Load Error:',
            error.message,
          );
        }


        setErrorMessage(
          'Unable to load return information.',
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
        if (__DEV__) {
          console.error(
            'Return Error Parse:',
            parseError.message,
          );
        }
      }


      return (
        error?.message ||
        'Unable to submit return request.'
      );
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
        if (__DEV__) {
          console.error(
            'Return Request Error:',
            error.message,
          );
        }


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

        <ActivityIndicator
          size="large"
          color="black"
        />


        <Text className="mt-3 text-gray-500">
          Loading return details...
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
              Return Order
            </Text>

          </View>


          <View className="mt-20 items-center">

            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#D1D5DB"
            />


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
            ) +
            30,
        }}
      >

        {/* HEADER */}

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
            Return Order
          </Text>

        </View>


        {/* ORDER */}

        <View className="mt-7 rounded-2xl bg-black p-5">

          <Text className="text-sm text-gray-400">
            Order
          </Text>


          <Text className="mt-1 text-xl font-extrabold text-white">
            #
            {
              order.order_number
            }
          </Text>


          <View className="mt-5 flex-row justify-between">

            <Text className="text-gray-400">
              Status
            </Text>


            <Text className="font-bold text-white">
              {
                formatStatus(
                  order.status,
                )
              }
            </Text>

          </View>


          <View className="mt-3 flex-row justify-between">

            <Text className="text-gray-400">
              Delivered
            </Text>


            <Text className="font-bold text-white">
              {
                formatDate(
                  order.delivered_at,
                ) ||
                'Not available'
              }
            </Text>

          </View>

        </View>


        {/* ELIGIBILITY */}

        {!canReturn ? (
          <View className="mt-5 rounded-2xl bg-gray-100 p-5">

            <View className="flex-row items-start">

              <Ionicons
                name="information-circle-outline"
                size={24}
                color="black"
              />


              <View className="ml-3 flex-1">

                <Text className="font-extrabold text-black">
                  Return Unavailable
                </Text>


                <Text className="mt-1 leading-6 text-gray-500">
                  Returns are available for delivered orders within 7 days of delivery.
                </Text>

              </View>

            </View>

          </View>
        ) : (
          <View className="mt-5 rounded-2xl bg-gray-100 p-5">

            <Text className="font-extrabold text-black">
              Return Window
            </Text>


            <Text className="mt-1 leading-6 text-gray-500">
              Eligible until{' '}
              {
                formatDate(
                  returnDeadline,
                )
              }
            </Text>

          </View>
        )}


        {/* ITEMS */}

        <Text className="mt-7 text-xl font-extrabold text-black">
          Select Items
        </Text>


        <Text className="mt-2 text-sm text-gray-500">
          Choose the items and quantities you want to return.
        </Text>


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
                  className={`mb-4 rounded-2xl border p-4 ${
                    selected
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >

                  <TouchableOpacity
                    onPress={() =>
                      toggleItem(
                        item,
                      )
                    }
                    activeOpacity={0.8}
                    className="flex-row items-start"
                  >

                    <View
                      className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border ${
                        selected
                          ? 'border-black bg-black'
                          : 'border-gray-300 bg-white'
                      }`}
                    >

                      {selected ? (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color="white"
                        />
                      ) : null}

                    </View>


                    <View className="ml-3 flex-1">

                      <Text className="font-extrabold text-black">
                        {
                          productName
                        }
                      </Text>


                      <Text className="mt-1 text-sm text-gray-500">
                        {[
                          item
                            .variant_size_snapshot
                            ? `Size: ${item.variant_size_snapshot}`
                            : null,

                          item
                            .variant_color_snapshot
                            ? `Color: ${item.variant_color_snapshot}`
                            : null,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            '  •  ',
                          )}
                      </Text>


                      <Text className="mt-2 text-sm font-semibold text-black">
                        Rs{' '}
                        {Number(
                          item.unit_price ||
                            0,
                        ).toFixed(2)}
                      </Text>

                    </View>

                  </TouchableOpacity>


                  {selected &&
                  maxQuantity > 1 ? (
                    <View className="mt-4 flex-row items-center justify-between">

                      <Text className="text-sm font-semibold text-gray-600">
                        Return Quantity
                      </Text>


                      <View className="flex-row items-center">

                        <TouchableOpacity
                          onPress={() =>
                            changeQuantity(
                              item,
                              -1,
                            )
                          }
                          className="h-9 w-9 items-center justify-center rounded-lg bg-white"
                        >
                          <Ionicons
                            name="remove-outline"
                            size={20}
                            color="black"
                          />
                        </TouchableOpacity>


                        <Text className="mx-4 font-extrabold text-black">
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
                          className="h-9 w-9 items-center justify-center rounded-lg bg-white"
                        >
                          <Ionicons
                            name="add-outline"
                            size={20}
                            color="black"
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


        {/* REASON */}

        {canReturn ? (
          <>
            <Text className="mt-4 text-xl font-extrabold text-black">
              Return Reason
            </Text>


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
                      activeOpacity={0.8}
                      className={`mb-3 flex-row items-center rounded-2xl border p-4 ${
                        selected
                          ? 'border-black bg-gray-100'
                          : 'border-gray-200 bg-white'
                      }`}
                    >

                      <View
                        className={`h-6 w-6 items-center justify-center rounded-full border ${
                          selected
                            ? 'border-black bg-black'
                            : 'border-gray-300 bg-white'
                        }`}
                      >

                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color="white"
                          />
                        ) : null}

                      </View>


                      <Text className="ml-3 flex-1 font-semibold text-black">
                        {
                          reason
                        }
                      </Text>

                    </TouchableOpacity>
                  );
                },
              )}

            </View>


            <Text className="mt-4 font-semibold text-black">
              Additional Details
            </Text>


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
              placeholder="Describe the issue with the item..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              className="mt-3 min-h-32 rounded-2xl border border-gray-300 bg-gray-50 p-4 text-black"
            />


            <Text className="mt-2 text-right text-xs text-gray-400">
              {
                details.length
              }
              /500
            </Text>


            <TouchableOpacity
              onPress={() =>
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
                      submitReturn,
                      150,
                    );
                  },
                })
              }
              disabled={
                submitting ||
                selectedCount ===
                  0 ||
                selectedReason.length <
                  3
              }
              activeOpacity={0.85}
              className={`mt-7 h-14 flex-row items-center justify-center rounded-xl ${
                submitting ||
                selectedCount ===
                  0 ||
                selectedReason.length <
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
                    name="return-down-back-outline"
                    size={21}
                    color="white"
                  />


                  <Text className="ml-2 text-base font-bold text-white">
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
