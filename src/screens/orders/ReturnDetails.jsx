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

import {
  supabase,
} from '../../lib/supabase';


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
          if (__DEV__) {
            console.error(
              'Return Details Error:',
              error.message,
            );
          }


          setErrorMessage(
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


    // Use a unique channel name per mounted screen instance.
    // Supabase reuses channels with the same topic, and adding
    // postgres_changes handlers to an already subscribed channel
    // throws: "cannot add postgres_changes callbacks after subscribe()".
    const channelName =
      `return-request-${returnRequestId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;


    const channel =
      supabase
        .channel(
          channelName,
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
    !returnRequest
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
              Return Details
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
              {
                errorMessage
              }
            </Text>


            <TouchableOpacity
              onPress={() =>
                fetchReturnDetails(
                  true,
                )
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


          <View className="ml-4 flex-1">

            <Text className="text-2xl font-extrabold text-black">
              Return Details
            </Text>


            {order
              ?.order_number ? (
              <Text className="mt-1 text-sm text-gray-500">
                #
                {
                  order
                    .order_number
                }
              </Text>
            ) : null}

          </View>

        </View>


        {/* CURRENT STATUS */}

        <View className="mt-7 rounded-3xl bg-black p-6">

          <View className="h-14 w-14 items-center justify-center rounded-full bg-white">

            <Ionicons
              name={
                statusCopy.icon
              }
              size={27}
              color="black"
            />

          </View>


          <Text className="mt-5 text-2xl font-extrabold text-white">
            {
              statusCopy.title
            }
          </Text>


          <Text className="mt-2 leading-6 text-gray-300">
            {
              statusCopy.message
            }
          </Text>


          <View className="mt-5 self-start rounded-full bg-white/10 px-4 py-2">

            <Text className="text-sm font-bold text-white">
              {
                formatStatus(
                  returnRequest
                    .status,
                )
              }
            </Text>

          </View>

        </View>


        {/* TERMINAL STATUS */}

        {isRejected ||
        isCancelled ? (
          <View className="mt-6 rounded-2xl bg-gray-100 p-5">

            <Text className="text-lg font-extrabold text-black">
              {
                isRejected
                  ? 'Request Rejected'
                  : 'Request Cancelled'
              }
            </Text>


            <Text className="mt-2 leading-6 text-gray-500">
              {
                isRejected
                  ? 'This return request is closed and no refund will be processed from this request.'
                  : 'This return request has been cancelled.'
              }
            </Text>

          </View>
        ) : (
          <View className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">

            <Text className="text-lg font-extrabold text-black">
              Return Timeline
            </Text>


            <View className="mt-5">

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
                          className={`h-11 w-11 items-center justify-center rounded-full ${
                            active
                              ? 'bg-black'
                              : 'border border-gray-300 bg-white'
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
                            <View className="rounded-full bg-gray-100 px-3 py-1">

                              <Text className="text-xs font-bold text-black">
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

        <View className="mt-6 rounded-2xl bg-gray-100 p-5">

          <Text className="text-lg font-extrabold text-black">
            Return Reason
          </Text>


          <Text className="mt-4 font-semibold text-black">
            {
              returnRequest.reason
            }
          </Text>


          {returnRequest.details ? (
            <Text className="mt-2 leading-6 text-gray-500">
              {
                returnRequest
                  .details
              }
            </Text>
          ) : null}


          <Text className="mt-4 text-sm text-gray-400">
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

        <View className="mt-6 rounded-2xl bg-gray-100 p-5">

          <Text className="text-lg font-extrabold text-black">
            Return Items
          </Text>


          {returnItems.map(
            (
              item,
              index,
            ) => (
              <View
                key={
                  item.id
                }
                className={`py-4 ${
                  index !==
                  returnItems.length -
                    1
                    ? 'border-b border-gray-200'
                    : ''
                }`}
              >

                <View className="flex-row justify-between">

                  <View className="flex-1 pr-4">

                    <Text className="font-extrabold text-black">
                      {
                        item.product_name
                      }
                    </Text>


                    <Text className="mt-1 text-sm text-gray-500">
                      {[
                        item.size
                          ? `Size: ${item.size}`
                          : null,

                        item.color
                          ? `Color: ${item.color}`
                          : null,
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          '  •  ',
                        )}
                    </Text>


                    <Text className="mt-2 text-sm text-gray-500">
                      Qty:{' '}
                      {
                        item.quantity
                      }
                    </Text>

                  </View>


                  <Text className="font-extrabold text-black">
                    Rs{' '}
                    {Number(
                      item
                        .estimated_refund_amount ||
                        0,
                    ).toFixed(2)}
                  </Text>

                </View>

              </View>
            ),
          )}

        </View>


        {/* REFUND */}

        <View className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">

          <Text className="text-lg font-extrabold text-black">
            Refund
          </Text>


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Estimated Refund
            </Text>


            <Text className="font-bold text-black">
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

              <Text className="text-gray-500">
                Final Refund
              </Text>


              <Text className="font-bold text-black">
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

            <Text className="text-gray-500">
              Refund Status
            </Text>


            <Text className="font-bold text-black">
              {
                formatStatus(
                  returnRequest
                    .refund_status,
                )
              }
            </Text>

          </View>


          <View className="mt-3 flex-row justify-between">

            <Text className="text-gray-500">
              Refund Method
            </Text>


            <Text className="font-bold text-black">
              {returnRequest
                .refund_method ===
              'original_payment'
                ? 'Original Payment'
                : formatStatus(
                    returnRequest
                      .refund_method,
                  )}
            </Text>

          </View>


          {order ? (
            <View className="mt-3 flex-row justify-between">

              <Text className="text-gray-500">
                Original Payment
              </Text>


              <Text className="font-bold text-black">
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
            <Text className="mt-4 text-sm text-gray-400">
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


        {/* RETURN SUCCESS */}

        {!isRejected &&
        !isCancelled ? (
          <View className="mt-6 h-14 flex-row items-center justify-center rounded-xl bg-black">
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="white"
            />

            <Text className="ml-2 text-base font-bold text-white">
              Returned Successfully
            </Text>
          </View>
        ) : null}

      </ScrollView>

    </SafeAreaView>
  );
};


export default ReturnDetails;
