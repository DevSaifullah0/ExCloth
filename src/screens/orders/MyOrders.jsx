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
  useState,
} from 'react';

import { useFocusEffect } from '@react-navigation/native';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

const MyOrders = ({ navigation }) => {
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  // ==========================================
  // FETCH ORDERS
  // ==========================================

  const fetchOrders = useCallback(
    async () => {
      try {
        setErrorMessage('');

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setOrders([]);
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            subtotal_amount,
            shipping_amount,
            discount_amount,
            total_amount,
            currency,
            status,
            payment_status,
            payment_method,
            delivered_at,
            created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        const loadedOrders =
          data || [];


        const orderIds =
          loadedOrders
            .map(
              item =>
                item.id,
            )
            .filter(
              Boolean,
            );


        const returnMap =
          new Map();


        if (
          orderIds.length >
          0
        ) {
          const {
            data:
              returnData,
            error:
              returnError,
          } =
            await supabase
              .from(
                'return_requests',
              )
              .select(`
                id,
                order_id,
                status,
                estimated_refund_amount,
                refund_status,
                requested_at
              `)
              .eq(
                'user_id',
                user.id,
              )
              .in(
                'order_id',
                orderIds,
              )
              .order(
                'requested_at',
                {
                  ascending:
                    false,
                },
              );


          if (returnError) {
            throw returnError;
          }


          (returnData || [])
            .forEach(
              item => {
                const key =
                  String(
                    item.order_id,
                  );


                if (
                  !returnMap.has(
                    key,
                  )
                ) {
                  returnMap.set(
                    key,
                    item,
                  );
                }
              },
            );
        }


        setOrders(
          loadedOrders.map(
            item => ({
              ...item,

              returnRequest:
                returnMap.get(
                  String(
                    item.id,
                  ),
                ) ||
                null,
            }),
          ),
        );

      } catch (error) {
        if (__DEV__) {
          console.error(
            'My Orders Error:',
            error.message,
          );
        }

        setErrorMessage(
          'Unable to load your orders.',
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // ==========================================
  // REFRESH ON SCREEN FOCUS
  // ==========================================

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );

  // ==========================================
  // PULL TO REFRESH
  // ==========================================

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // ==========================================
  // FORMAT STATUS
  // ==========================================

  const formatStatus = status => {
    if (!status) {
      return '';
    }

    return String(status)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter =>
        letter.toUpperCase(),
      );
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = date => {
    if (!date) {
      return '';
    }

    return new Date(
      date,
    ).toLocaleDateString();
  };

  // ==========================================
  // STATUS ICON
  // ==========================================

  const getStatusIcon = status => {
    switch (
      String(status || '')
        .trim()
        .toLowerCase()
    ) {
      case 'delivered':
        return 'checkmark-circle-outline';

      case 'shipped':
        return 'paper-plane-outline';

      case 'out_for_delivery':
        return 'bicycle-outline';

      case 'processing':
      case 'packed':
        return 'cube-outline';

      case 'confirmed':
        return 'bag-check-outline';

      case 'cancelled':
      case 'canceled':
        return 'close-circle-outline';

      case 'returned':
      case 'return_completed':
        return 'return-down-back-outline';

      case 'refunded':
        return 'cash-outline';

      default:
        return 'time-outline';
    }
  };

  // ==========================================
  // TRACK ORDER
  // ==========================================

  const handleTrackOrder = order => {
    navigation.navigate(
      'OrderTracking',
      {
        orderId: order.id,
      },
    );
  };

  // ==========================================
  // VIEW ORDER DETAILS
  // ==========================================

  const handleViewDetails = order => {
    navigation.navigate(
      'OrderDetails',
      {
        orderId: order.id,
      },
    );
  };

  // ==========================================
  // CANCEL ORDER
  // ==========================================

  const canCancelOrder =
    status =>
      ['pending', 'confirmed']
        .includes(
          String(
            status || '',
          )
            .trim()
            .toLowerCase(),
        );

  const handleCancelOrder = order => {
    navigation.navigate(
      'CancelOrder',
      {
        orderId: order.id,
      },
    );
  };

  // ==========================================
  // RETURNS
  // ==========================================

  const canRequestReturn =
    order => {
      if (
        String(
          order?.status || '',
        )
          .trim()
          .toLowerCase() !==
        'delivered'
      ) {
        return false;
      }


      if (
        !order?.delivered_at
      ) {
        return false;
      }


      const deliveredAt =
        new Date(
          order.delivered_at,
        );


      if (
        Number.isNaN(
          deliveredAt.getTime(),
        )
      ) {
        return false;
      }


      const deadline =
        new Date(
          deliveredAt.getTime() +
            7 *
              24 *
              60 *
              60 *
              1000,
        );


      const returnStatus =
        String(
          order?.returnRequest
            ?.status ||
            '',
        )
          .trim()
          .toLowerCase();


      const hasActiveReturn =
        Boolean(
          order?.returnRequest
            ?.id,
        ) &&
        ![
          'rejected',
          'cancelled',
        ].includes(
          returnStatus,
        );


      return (
        new Date() <=
          deadline &&
        !hasActiveReturn
      );
    };


  const handleViewReturn =
    order => {
      navigation.navigate(
        'ReturnDetails',
        {
          returnRequestId:
            order
              .returnRequest
              .id,
        },
      );
    };


  const handleRequestReturn =
    order => {
      navigation.navigate(
        'ReturnRequest',
        {
          orderId:
            order.id,
        },
      );
    };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 36,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
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
              My Orders
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Track orders, returns and delivery status.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="bag-handle-outline"
              size={22}
              color="white"
            />
          </View>
        </View>


        {/* SUMMARY */}
        {!loading &&
        !errorMessage &&
        orders.length > 0 ? (
          <View className="mt-7 rounded-3xl bg-black p-5">
            <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Order History
            </Text>

            <View className="mt-3 flex-row items-end justify-between">
              <View>
                <Text className="text-3xl font-extrabold text-white">
                  {orders.length}
                </Text>

                <Text className="mt-1 text-sm text-gray-300">
                  {orders.length === 1
                    ? 'order placed'
                    : 'orders placed'}
                </Text>
              </View>

              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="receipt-outline"
                  size={27}
                  color="black"
                />
              </View>
            </View>
          </View>
        ) : null}


        {/* LOADING */}
        {loading ? (
          <View className="items-center py-24">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <ActivityIndicator
                size="large"
                color="black"
              />
            </View>

            <Text className="mt-4 font-semibold text-gray-500">
              Loading your orders...
            </Text>
          </View>
        ) : null}


        {/* ERROR */}
        {!loading && errorMessage ? (
          <View className="mt-10 items-center rounded-3xl bg-gray-100 p-8">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={30}
                color="black"
              />
            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              Unable to load orders
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={fetchOrders}
              activeOpacity={0.85}
              className="mt-5 rounded-2xl bg-black px-6 py-3"
            >
              <Text className="font-extrabold text-white">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}


        {/* EMPTY */}
        {!loading &&
        !errorMessage &&
        orders.length === 0 ? (
          <View className="mt-16 items-center rounded-3xl bg-gray-100 px-7 py-12">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="bag-handle-outline"
                size={38}
                color="black"
              />
            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              No orders yet
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              Your placed orders will appear here with live status and tracking.
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  'MainTabs',
                )
              }
              activeOpacity={0.85}
              className="mt-6 flex-row items-center rounded-2xl bg-black px-6 py-3.5"
            >
              <Ionicons
                name="bag-add-outline"
                size={19}
                color="white"
              />

              <Text className="ml-2 font-extrabold text-white">
                Start Shopping
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}


        {/* ORDERS */}
        {!loading &&
        !errorMessage &&
        orders.length > 0 ? (
          <View className="mt-7">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-extrabold text-black">
                Recent Orders
              </Text>

              <Text className="text-sm font-semibold text-gray-500">
                Pull to refresh
              </Text>
            </View>

            {orders.map(order => {
              const normalizedStatus =
                String(
                  order.status || '',
                )
                  .trim()
                  .toLowerCase();

              const isCancelled =
                normalizedStatus ===
                  'cancelled' ||
                normalizedStatus ===
                  'canceled';

              const isDelivered =
                normalizedStatus ===
                'delivered';

              return (
                <View
                  key={order.id}
                  className="mb-5 overflow-hidden rounded-3xl border border-gray-200 bg-white"
                >
                  {/* TOP CARD */}
                  <TouchableOpacity
                    onPress={() =>
                      handleViewDetails(
                        order,
                      )
                    }
                    activeOpacity={0.85}
                    className="p-5"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Order Number
                        </Text>

                        <Text className="mt-1 text-lg font-extrabold text-black">
                          #{order.order_number}
                        </Text>

                        <Text className="mt-2 text-sm font-semibold text-gray-500">
                          {formatDate(
                            order.created_at,
                          )}
                        </Text>
                      </View>

                      <View
                        className={`h-12 w-12 items-center justify-center rounded-2xl ${
                          isCancelled
                            ? 'bg-gray-200'
                            : 'bg-black'
                        }`}
                      >
                        <Ionicons
                          name={getStatusIcon(
                            order.status,
                          )}
                          size={23}
                          color={
                            isCancelled
                              ? '#6B7280'
                              : 'white'
                          }
                        />
                      </View>
                    </View>


                    {/* STATUS */}
                    <View className="mt-5 flex-row flex-wrap gap-2">
                      <View
                        className={`rounded-full px-3 py-2 ${
                          isDelivered
                            ? 'bg-black'
                            : 'bg-gray-100'
                        }`}
                      >
                        <Text
                          className={`text-xs font-extrabold ${
                            isDelivered
                              ? 'text-white'
                              : 'text-black'
                          }`}
                        >
                          {formatStatus(
                            order.status,
                          )}
                        </Text>
                      </View>

                      <View className="rounded-full bg-gray-100 px-3 py-2">
                        <Text className="text-xs font-bold text-gray-600">
                          Payment:{' '}
                          {formatStatus(
                            order.payment_status,
                          )}
                        </Text>
                      </View>

                      {order.returnRequest
                        ?.id ? (
                        <View className="rounded-full bg-gray-100 px-3 py-2">
                          <Text className="text-xs font-bold text-gray-600">
                            Return:{' '}
                            {formatStatus(
                              order
                                .returnRequest
                                .status,
                            )}
                          </Text>
                        </View>
                      ) : null}
                    </View>


                    {/* TOTAL */}
                    <View className="mt-5 flex-row items-end justify-between border-t border-gray-200 pt-4">
                      <View>
                        <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Order Total
                        </Text>

                        <Text className="mt-1 text-2xl font-extrabold text-black">
                          Rs{' '}
                          {Number(
                            order.total_amount ||
                              0,
                          ).toFixed(2)}
                        </Text>
                      </View>

                      <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <Ionicons
                          name="chevron-forward-outline"
                          size={19}
                          color="black"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>


                  {/* PRIMARY ACTIONS */}
                  <View className="border-t border-gray-200 bg-gray-50 p-4">
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() =>
                          handleTrackOrder(
                            order,
                          )
                        }
                        activeOpacity={0.85}
                        className="h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-black"
                      >
                        <Ionicons
                          name="navigate-outline"
                          size={18}
                          color="white"
                        />

                        <Text className="ml-2 font-extrabold text-white">
                          Track
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          handleViewDetails(
                            order,
                          )
                        }
                        activeOpacity={0.85}
                        className="h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-gray-200"
                      >
                        <Ionicons
                          name="receipt-outline"
                          size={18}
                          color="black"
                        />

                        <Text className="ml-2 font-extrabold text-black">
                          Details
                        </Text>
                      </TouchableOpacity>
                    </View>


                    {/* SECONDARY ACTIONS */}
                    {canCancelOrder(
                      order.status,
                    ) ? (
                      <TouchableOpacity
                        onPress={() =>
                          handleCancelOrder(
                            order,
                          )
                        }
                        activeOpacity={0.85}
                        className="mt-3 h-12 flex-row items-center justify-center rounded-2xl bg-gray-200"
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={18}
                          color="black"
                        />

                        <Text className="ml-2 font-extrabold text-black">
                          Cancel Order
                        </Text>
                      </TouchableOpacity>
                    ) : null}


                    {order.returnRequest
                      ?.id ? (
                      <TouchableOpacity
                        onPress={() =>
                          handleViewReturn(
                            order,
                          )
                        }
                        activeOpacity={0.85}
                        className="mt-3 h-12 flex-row items-center justify-center rounded-2xl bg-gray-200"
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={18}
                          color="black"
                        />

                        <Text className="ml-2 font-extrabold text-black">
                          View Return
                        </Text>
                      </TouchableOpacity>
                    ) : null}


                    {canRequestReturn(
                      order,
                    ) ? (
                      <TouchableOpacity
                        onPress={() =>
                          handleRequestReturn(
                            order,
                          )
                        }
                        activeOpacity={0.85}
                        className="mt-3 h-12 flex-row items-center justify-center rounded-2xl bg-gray-200"
                      >
                        <Ionicons
                          name="return-down-back-outline"
                          size={18}
                          color="black"
                        />

                        <Text className="ml-2 font-extrabold text-black">
                          {order.returnRequest
                            ?.id
                            ? 'Request Return Again'
                            : 'Request Return'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};


export default MyOrders;
