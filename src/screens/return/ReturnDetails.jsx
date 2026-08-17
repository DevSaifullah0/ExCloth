import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import React, {
  useCallback,
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


const FLOW = [
  {
    key: 'requested',
    title: 'Return Requested',
    icon: 'document-text-outline',
  },
  {
    key: 'approved',
    title: 'Return Approved',
    icon: 'checkmark-circle-outline',
  },
  {
    key: 'pickup_scheduled',
    title: 'Pickup Scheduled',
    icon: 'calendar-outline',
  },
  {
    key: 'picked_up',
    title: 'Item Picked Up',
    icon: 'car-outline',
  },
  {
    key: 'received',
    title: 'Return Received',
    icon: 'cube-outline',
  },
  {
    key: 'refund_pending',
    title: 'Refund Processing',
    icon: 'wallet-outline',
  },
  {
    key: 'refunded',
    title: 'Refunded',
    icon: 'cash-outline',
  },
];


const STATUS_INDEX = {
  requested: 0,
  approved: 1,
  pickup_scheduled: 2,
  picked_up: 3,
  received: 4,
  refund_pending: 5,
  refunded: 6,
};


const ReturnDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();


  const returnRequestId =
    route.params?.returnRequestId;


  const [
    returnRequest,
    setReturnRequest,
  ] = useState(null);


  const [
    returnItems,
    setReturnItems,
  ] = useState([]);


  const [
    order,
    setOrder,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


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


  const formatPaymentMethod =
    value => {
      switch (
        String(
          value || '',
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
            value,
          );
      }
    };


  // ==========================================
  // FETCH RETURN
  // ==========================================

  const fetchReturnDetails =
    useCallback(
      async (
        showLoader = false,
      ) => {
        try {
          if (
            showLoader
          ) {
            setLoading(
              true,
            );
          }


          setErrorMessage(
            '',
          );


          if (
            !returnRequestId
          ) {
            throw new Error(
              'Return request ID is missing.',
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
              requestData,
            error:
              requestError,
          } =
            await supabase
              .from(
                'return_requests',
              )
              .select(`
                id,
                order_id,
                user_id,
                reason,
                details,
                status,
                estimated_refund_amount,
                refund_amount,
                refund_method,
                refund_status,
                requested_at,
                approved_at,
                rejected_at,
                pickup_at,
                received_at,
                refunded_at,
                created_at,
                updated_at
              `)
              .eq(
                'id',
                returnRequestId,
              )
              .eq(
                'user_id',
                user.id,
              )
              .single();


          if (requestError) {
            throw requestError;
          }


          const {
            data:
              itemsData,
            error:
              itemsError,
          } =
            await supabase
              .from(
                'return_request_items',
              )
              .select(`
                id,
                return_request_id,
                order_item_id,
                product_id,
                variant_id,
                product_name,
                size,
                color,
                sku,
                unit_price,
                quantity,
                estimated_refund_amount,
                created_at
              `)
              .eq(
                'return_request_id',
                returnRequestId,
              )
              .order(
                'created_at',
                {
                  ascending:
                    true,
                },
              );


          if (itemsError) {
            throw itemsError;
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
                status,
                payment_status,
                payment_method,
                total_amount,
                currency
              `)
              .eq(
                'id',
                requestData.order_id,
              )
              .eq(
                'user_id',
                user.id,
              )
              .single();


          if (orderError) {
            throw orderError;
          }


          setReturnRequest(
            requestData,
          );


          setReturnItems(
            itemsData || [],
          );


          setOrder(
            orderData,
          );

        } catch (error) {
          console.log(
            'Return Details Error:',
            error.message,
          );


          setErrorMessage(
            error.message ||
              'Unable to load return details.',
          );

        } finally {
          setLoading(false);
          setRefreshing(
            false,
          );
        }
      },
      [
        returnRequestId,
      ],
    );


  useEffect(() => {
    fetchReturnDetails(
      true,
    );
  }, [
    fetchReturnDetails,
  ]);


  // ==========================================
  // REALTIME RETURN STATUS
  // ==========================================

  useEffect(() => {
    if (
      !returnRequestId
    ) {
      return undefined;
    }


    const channel =
      supabase
        .channel(
          `return-request-${returnRequestId}`,
        )
        .on(
          'postgres_changes',
          {
            event:
              'UPDATE',
            schema:
              'public',
            table:
              'return_requests',
            filter:
              `id=eq.${returnRequestId}`,
          },
          payload => {
            if (
              !payload?.new
            ) {
              return;
            }


            setReturnRequest(
              current => ({
                ...(current ||
                  {}),
                ...payload.new,
              }),
            );
          },
        )
        .subscribe();


    return () => {
      supabase
        .removeChannel(
          channel,
        );
    };
  }, [
    returnRequestId,
  ]);


  // ==========================================
  // REFRESH
  // ==========================================

  const handleRefresh =
    () => {
      setRefreshing(
        true,
      );


      fetchReturnDetails(
        false,
      );
    };


  // ==========================================
  // STATUS
  // ==========================================

  const normalizedStatus =
    String(
      returnRequest?.status ||
        '',
    )
      .trim()
      .toLowerCase();


  const isRejected =
    normalizedStatus ===
    'rejected';


  const isCancelled =
    normalizedStatus ===
    'cancelled';


  const currentIndex =
    useMemo(
      () =>
        STATUS_INDEX[
          normalizedStatus
        ] ?? 0,
      [
        normalizedStatus,
      ],
    );


  const statusCopy =
    useMemo(
      () => {
        switch (
          normalizedStatus
        ) {
          case 'requested':
            return {
              icon:
                'document-text-outline',
              title:
                'Return Requested',
              message:
                'Your return request has been submitted and is waiting for review.',
            };

          case 'approved':
            return {
              icon:
                'checkmark-circle-outline',
              title:
                'Return Approved',
              message:
                'Your return request has been approved.',
            };

          case 'pickup_scheduled':
            return {
              icon:
                'calendar-outline',
              title:
                'Pickup Scheduled',
              message:
                'Pickup has been scheduled for your return.',
            };

          case 'picked_up':
            return {
              icon:
                'car-outline',
              title:
                'Item Picked Up',
              message:
                'Your return package has been collected.',
            };

          case 'received':
            return {
              icon:
                'cube-outline',
              title:
                'Return Received',
              message:
                'Your returned items have been received for inspection.',
            };

          case 'refund_pending':
            return {
              icon:
                'wallet-outline',
              title:
                'Refund Processing',
              message:
                'Your refund is currently being processed.',
            };

          case 'refunded':
            return {
              icon:
                'cash-outline',
              title:
                'Refund Completed',
              message:
                'Your refund has been completed successfully.',
            };

          case 'rejected':
            return {
              icon:
                'close-circle-outline',
              title:
                'Return Rejected',
              message:
                'This return request was not approved.',
            };

          case 'cancelled':
            return {
              icon:
                'close-circle-outline',
              title:
                'Return Cancelled',
              message:
                'This return request has been cancelled.',
            };

          default:
            return {
              icon:
                'return-down-back-outline',
              title:
                formatStatus(
                  returnRequest
                    ?.status,
                ) ||
                'Return Status',
              message:
                'Your return request status has been updated.',
            };
        }
      },
      [
        normalizedStatus,
        returnRequest?.status,
      ],
    );


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
    !returnRequest
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
                Return Details
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Track your return request.
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
              onPress={() =>
                fetchReturnDetails(
                  true,
                )
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
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
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
              Return Details
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              {order?.order_number
                ? `Order #${order.order_number}`
                : 'Return request status'}
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


        {/* STATUS HERO */}
        <View className="mt-7 overflow-hidden rounded-3xl bg-black p-6">
          <View className="flex-row items-start justify-between">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white">
              <Ionicons
                name={
                  statusCopy.icon
                }
                size={29}
                color="black"
              />
            </View>

            <View className="rounded-full bg-white px-3 py-2">
              <Text className="text-xs font-extrabold text-black">
                {
                  formatStatus(
                    returnRequest.status,
                  )
                }
              </Text>
            </View>
          </View>

          <Text className="mt-6 text-2xl font-extrabold text-white">
            {
              statusCopy.title
            }
          </Text>

          <Text className="mt-2 text-sm leading-6 text-gray-300">
            {
              statusCopy.message
            }
          </Text>

          <View className="mt-6 flex-row items-end justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Estimated Refund
              </Text>

              <Text className="mt-1 text-2xl font-extrabold text-white">
                Rs{' '}
                {Number(
                  returnRequest
                    .estimated_refund_amount ||
                    0,
                ).toFixed(2)}
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Items
              </Text>

              <Text className="mt-1 text-xl font-extrabold text-white">
                {returnItems.length}
              </Text>
            </View>
          </View>
        </View>


        {/* TERMINAL / TIMELINE */}
        {isRejected ||
        isCancelled ? (
          <View className="mt-6 flex-row items-start rounded-3xl bg-gray-100 p-5">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <Ionicons
                name="close-circle-outline"
                size={23}
                color="black"
              />
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-lg font-extrabold text-black">
                {isRejected
                  ? 'Request Rejected'
                  : 'Request Cancelled'}
              </Text>

              <Text className="mt-2 text-sm leading-6 text-gray-500">
                {isRejected
                  ? 'This return request is closed and no refund will be processed from this request.'
                  : 'This return request has been cancelled.'}
              </Text>
            </View>
          </View>
        ) : (
          <View className="mt-6 rounded-3xl border border-gray-200 bg-white p-5">
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons
                  name="git-branch-outline"
                  size={21}
                  color="black"
                />
              </View>

              <View className="ml-3">
                <Text className="text-lg font-extrabold text-black">
                  Return Timeline
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Follow each step of your return.
                </Text>
              </View>
            </View>

            <View className="mt-6">
              {FLOW.map(
                (
                  step,
                  index,
                ) => {
                  const completed =
                    index <
                    currentIndex;

                  const current =
                    index ===
                    currentIndex;

                  const active =
                    completed ||
                    current;

                  return (
                    <View
                      key={
                        step.key
                      }
                      className="flex-row"
                    >
                      <View className="items-center">
                        <View
                          className={`h-11 w-11 items-center justify-center rounded-2xl ${
                            active
                              ? 'bg-black'
                              : 'bg-gray-100'
                          }`}
                        >
                          <Ionicons
                            name={
                              completed
                                ? 'checkmark'
                                : step.icon
                            }
                            size={20}
                            color={
                              active
                                ? 'white'
                                : '#9CA3AF'
                            }
                          />
                        </View>

                        {index <
                        FLOW.length -
                          1 ? (
                          <View
                            className={`w-0.5 flex-1 ${
                              index <
                              currentIndex
                                ? 'bg-black'
                                : 'bg-gray-200'
                            }`}
                            style={{
                              minHeight:
                                38,
                            }}
                          />
                        ) : null}
                      </View>

                      <View
                        className={`ml-4 flex-1 ${
                          index <
                          FLOW.length -
                            1
                            ? 'pb-5'
                            : ''
                        }`}
                      >
                        <View className="flex-row items-center">
                          <Text
                            className={`flex-1 font-extrabold ${
                              active
                                ? 'text-black'
                                : 'text-gray-400'
                            }`}
                          >
                            {
                              step.title
                            }
                          </Text>

                          {current ? (
                            <View className="rounded-full bg-gray-100 px-3 py-1.5">
                              <Text className="text-xs font-extrabold text-black">
                                Current
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                },
              )}
            </View>
          </View>
        )}


        {/* RETURN REASON */}
        <View className="mt-6 rounded-3xl bg-gray-100 p-5">
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="help-circle-outline"
                size={21}
                color="black"
              />
            </View>

            <View className="ml-3">
              <Text className="text-lg font-extrabold text-black">
                Return Reason
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Reason provided with this request.
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-2xl bg-white p-4">
            <Text className="font-extrabold text-black">
              {
                returnRequest.reason
              }
            </Text>

            {returnRequest.details ? (
              <Text className="mt-2 leading-6 text-gray-600">
                {
                  returnRequest.details
                }
              </Text>
            ) : null}
          </View>

          <Text className="mt-4 text-xs font-semibold text-gray-400">
            Requested{' '}
            {
              formatDate(
                returnRequest
                  .requested_at,
              )
            }
          </Text>
        </View>


        {/* ITEMS */}
        <View className="mt-6">
          <View className="mb-4 flex-row items-end justify-between">
            <View>
              <Text className="text-xl font-extrabold text-black">
                Return Items
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Products included in this request.
              </Text>
            </View>

            <View className="rounded-full bg-black px-3 py-2">
              <Text className="text-xs font-extrabold text-white">
                {returnItems.length}
              </Text>
            </View>
          </View>

          {returnItems.map(
            (
              item,
              index,
            ) => (
              <View
                key={
                  item.id
                }
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
                      {
                        item.product_name
                      }
                    </Text>

                    <View className="mt-3 flex-row flex-wrap">
                      {item.size ? (
                        <View className="mb-2 mr-2 rounded-full bg-white px-3 py-1.5">
                          <Text className="text-xs font-bold text-gray-600">
                            Size {item.size}
                          </Text>
                        </View>
                      ) : null}

                      {item.color ? (
                        <View className="mb-2 mr-2 rounded-full bg-white px-3 py-1.5">
                          <Text className="text-xs font-bold text-gray-600">
                            {item.color}
                          </Text>
                        </View>
                      ) : null}

                      <View className="mb-2 rounded-full bg-white px-3 py-1.5">
                        <Text className="text-xs font-bold text-gray-600">
                          Qty {item.quantity}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-3 flex-row items-end justify-between border-t border-gray-200 pt-4">
                      <Text className="text-sm font-semibold text-gray-500">
                        Estimated refund
                      </Text>

                      <Text className="text-lg font-extrabold text-black">
                        Rs{' '}
                        {Number(
                          item
                            .estimated_refund_amount ||
                            0,
                        ).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ),
          )}
        </View>


        {/* REFUND */}
        <View className="mt-6 rounded-3xl bg-black p-5">
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="wallet-outline"
                size={21}
                color="black"
              />
            </View>

            <View className="ml-3">
              <Text className="text-lg font-extrabold text-white">
                Refund
              </Text>

              <Text className="mt-1 text-xs text-gray-400">
                Refund amount and payment details.
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row justify-between">
            <Text className="text-gray-400">
              Estimated Refund
            </Text>

            <Text className="font-extrabold text-white">
              Rs{' '}
              {Number(
                returnRequest
                  .estimated_refund_amount ||
                  0,
              ).toFixed(2)}
            </Text>
          </View>

          {returnRequest
            .refund_amount !==
            null &&
          returnRequest
            .refund_amount !==
            undefined ? (
            <View className="mt-3 flex-row justify-between">
              <Text className="text-gray-400">
                Refund Amount
              </Text>

              <Text className="font-extrabold text-white">
                Rs{' '}
                {Number(
                  returnRequest
                    .refund_amount ||
                    0,
                ).toFixed(2)}
              </Text>
            </View>
          ) : null}

          <View className="mt-3 flex-row justify-between">
            <Text className="text-gray-400">
              Refund Status
            </Text>

            <Text className="font-extrabold text-white">
              {
                formatStatus(
                  returnRequest
                    .refund_status,
                ) || 'Pending'
              }
            </Text>
          </View>

          <View className="mt-3 flex-row justify-between">
            <Text className="text-gray-400">
              Refund Method
            </Text>

            <Text className="ml-4 flex-1 text-right font-extrabold text-white">
              {returnRequest
                .refund_method ===
              'original_payment'
                ? 'Original Payment'
                : formatStatus(
                    returnRequest
                      .refund_method,
                  ) ||
                  'Not assigned'}
            </Text>
          </View>

          {order ? (
            <View className="mt-3 flex-row justify-between">
              <Text className="text-gray-400">
                Original Payment
              </Text>

              <Text className="ml-4 flex-1 text-right font-extrabold text-white">
                {
                  formatPaymentMethod(
                    order
                      .payment_method,
                  )
                }
              </Text>
            </View>
          ) : null}

          {returnRequest
            .refunded_at ? (
            <Text className="mt-5 text-xs font-semibold text-gray-400">
              Refunded{' '}
              {
                formatDate(
                  returnRequest
                    .refunded_at,
                )
              }
            </Text>
          ) : null}
        </View>


        {/* ORDER DETAILS */}
        {order?.id ? (
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
            className="mt-6 h-14 flex-row items-center justify-center rounded-2xl bg-gray-100"
          >
            <Ionicons
              name="receipt-outline"
              size={20}
              color="black"
            />

            <Text className="ml-2 text-base font-extrabold text-black">
              View Order Details
            </Text>

            <Ionicons
              name="arrow-forward-outline"
              size={19}
              color="black"
              style={{
                marginLeft: 8,
              }}
            />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};


export default ReturnDetails;
