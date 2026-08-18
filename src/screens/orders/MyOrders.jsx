import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import React, {
  useCallback,
  useRef,
  useState,
} from 'react';

import { useFocusEffect } from '@react-navigation/native';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';


const PAGE_SIZE = 20;

const LIST_CONTENT_STYLE = {
  flexGrow: 1,
  paddingHorizontal: 20,
  paddingBottom: 36,
};

const ORDER_FIELDS = `
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
`;

const RETURN_FIELDS = `
  id,
  order_id,
  status,
  estimated_refund_amount,
  refund_status,
  requested_at
`;


const formatStatus = status => {
  if (!status) {
    return '';
  }


  return String(status)
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      letter =>
        letter.toUpperCase(),
    );
};


const formatDate = date => {
  if (!date) {
    return '';
  }


  return new Date(
    date,
  ).toLocaleDateString();
};


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


const canCancelOrder = status =>
  [
    'pending',
    'confirmed',
  ].includes(
    String(
      status || '',
    )
      .trim()
      .toLowerCase(),
  );


const canRequestReturn = order => {
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


  if (!order?.delivered_at) {
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

  const hasExistingReturn =
    Boolean(
      order?.returnRequest?.id,
    );


  return (
    new Date() <= deadline &&
    !hasExistingReturn
  );
};


const getOrderKey = order =>
  String(order.id);


const OrderCard = React.memo(({
  order,
  onTrack,
  onViewDetails,
  onCancel,
  onViewReturn,
  onRequestReturn,
}) => {
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

  const cardReturnStatus =
    String(
      order.returnRequest
        ?.status || '',
    )
      .trim()
      .toLowerCase();

  const hasReturnRequest =
    Boolean(
      order.returnRequest?.id,
    );

  const returnedLabel =
    cardReturnStatus ===
    'rejected'
      ? 'Return Rejected'
      : cardReturnStatus ===
          'cancelled'
        ? 'Return Cancelled'
        : 'Returned Successfully';

  const orderLabel =
    order.order_number ||
    order.id;


  return (
    <View className="mb-5 overflow-hidden rounded-3xl border border-gray-200 bg-white">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`View details for order ${orderLabel}`}
        accessibilityHint="Opens the complete order information"
        onPress={() =>
          onViewDetails(
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

          {hasReturnRequest ? (
            <View className="rounded-full bg-gray-100 px-3 py-2">
              <Text className="text-xs font-bold text-gray-600">
                Return:{' '}
                {formatStatus(
                  order.returnRequest
                    .status,
                )}
              </Text>
            </View>
          ) : null}
        </View>


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


      <View className="border-t border-gray-200 bg-gray-50 p-4">
        <View className="flex-row gap-3">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Track order ${orderLabel}`}
            onPress={() =>
              onTrack(
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

          {hasReturnRequest ? (
            <View
              accessible
              accessibilityLabel={`Return status: ${returnedLabel}`}
              className="h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-gray-200 px-2"
            >
              <Ionicons
                name={
                  cardReturnStatus ===
                    'rejected' ||
                  cardReturnStatus ===
                    'cancelled'
                    ? 'close-circle-outline'
                    : 'checkmark-circle-outline'
                }
                size={18}
                color="black"
              />

              <Text
                numberOfLines={1}
                className="ml-2 text-center font-extrabold text-black"
              >
                {returnedLabel}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`View details for order ${orderLabel}`}
              onPress={() =>
                onViewDetails(
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
          )}
        </View>


        {canCancelOrder(
          order.status,
        ) ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Cancel order ${orderLabel}`}
            onPress={() =>
              onCancel(
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


        {hasReturnRequest ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`View return for order ${orderLabel}`}
            onPress={() =>
              onViewReturn(
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
            accessibilityRole="button"
            accessibilityLabel={`Request a return for order ${orderLabel}`}
            onPress={() =>
              onRequestReturn(
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
              Request Return
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});


const MyOrders = ({ navigation }) => {
  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [hasMore, setHasMore] =
    useState(false);

  const [totalCount, setTotalCount] =
    useState(null);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [refreshErrorMessage, setRefreshErrorMessage] =
    useState('');

  const [loadMoreError, setLoadMoreError] =
    useState('');

  const screenActiveRef =
    useRef(false);

  const requestIdRef =
    useRef(0);

  const resetInFlightRef =
    useRef(false);

  const realtimeResetQueuedRef =
    useRef(false);

  const loadingMoreRef =
    useRef(false);

  const hasMoreRef =
    useRef(false);

  const nextOffsetRef =
    useRef(0);

  const totalCountRef =
    useRef(null);

  const ordersRef =
    useRef([]);


  const fetchOrders = useCallback(
    async ({
      reset = true,
      reason = 'initial',
    } = {}) => {
      if (!screenActiveRef.current) {
        return;
      }


      if (reset) {
        if (resetInFlightRef.current) {
          if (reason === 'realtime') {
            realtimeResetQueuedRef.current =
              true;
          }

          return;
        }


        resetInFlightRef.current =
          true;

        loadingMoreRef.current =
          false;

        setLoadingMore(false);
        setLoadMoreError('');
        setRefreshErrorMessage('');
        setErrorMessage('');


        if (reason === 'refresh') {
          setRefreshing(true);

        } else if (
          ordersRef.current
            .length === 0
        ) {
          setLoading(true);
        }

      } else {
        if (
          resetInFlightRef.current ||
          loadingMoreRef.current ||
          !hasMoreRef.current
        ) {
          return;
        }


        loadingMoreRef.current =
          true;

        setLoadingMore(true);
        setLoadMoreError('');
      }


      const requestId =
        requestIdRef.current +
        1;

      requestIdRef.current =
        requestId;

      const offset = reset
        ? 0
        : nextOffsetRef.current;

      const isCurrentRequest =
        () =>
          screenActiveRef.current &&
          requestIdRef.current ===
            requestId;


      try {
        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth
            .getUser();


        if (!isCurrentRequest()) {
          return;
        }


        if (userError) {
          throw userError;
        }


        if (!user) {
          ordersRef.current = [];
          nextOffsetRef.current = 0;
          totalCountRef.current = 0;
          hasMoreRef.current = false;

          setOrders([]);
          setTotalCount(0);
          setHasMore(false);
          setErrorMessage('');
          setRefreshErrorMessage('');
          setLoadMoreError('');

          return;
        }


        const {
          data,
          error,
          count,
        } =
          await supabase
            .from('orders')
            .select(
              ORDER_FIELDS,
              reset
                ? {
                    count:
                      'exact',
                  }
                : {},
            )
            .eq(
              'user_id',
              user.id,
            )
            .order(
              'created_at',
              {
                ascending: false,
              },
            )
            .order(
              'id',
              {
                ascending: false,
              },
            )
            .range(
              offset,
              offset +
                PAGE_SIZE -
                1,
            );


        if (!isCurrentRequest()) {
          return;
        }


        if (error) {
          throw error;
        }


        const loadedOrders =
          data || [];

        const orderIds =
          loadedOrders
            .map(
              item => item.id,
            )
            .filter(Boolean);

        const returnMap =
          new Map();


        if (orderIds.length > 0) {
          const {
            data: returnData,
            error: returnError,
          } =
            await supabase
              .from(
                'return_requests',
              )
              .select(
                RETURN_FIELDS,
              )
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
                  ascending: false,
                },
              );


          if (!isCurrentRequest()) {
            return;
          }


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


        if (!isCurrentRequest()) {
          return;
        }


        const hydratedPage =
          loadedOrders.map(
            item => ({
              ...item,
              returnRequest:
                returnMap.get(
                  String(item.id),
                ) || null,
            }),
          );

        const nextOffset =
          offset +
          loadedOrders.length;

        let nextOrders;


        if (reset) {
          nextOrders =
            hydratedPage;

        } else {
          const existingIds =
            new Set(
              ordersRef.current
                .map(
                  item =>
                    String(item.id),
                ),
            );

          nextOrders = [
            ...ordersRef.current,
            ...hydratedPage.filter(
              item =>
                !existingIds.has(
                  String(item.id),
                ),
            ),
          ];
        }


        const exactCount =
          reset &&
          typeof count ===
            'number'
            ? count
            : totalCountRef.current;

        const canLoadMore =
          loadedOrders.length ===
            PAGE_SIZE &&
          (
            exactCount === null ||
            nextOffset <
              exactCount
          );


        ordersRef.current =
          nextOrders;

        nextOffsetRef.current =
          nextOffset;

        totalCountRef.current =
          exactCount;

        hasMoreRef.current =
          canLoadMore;

        setOrders(nextOrders);
        setTotalCount(exactCount);
        setHasMore(canLoadMore);
        setErrorMessage('');
        setRefreshErrorMessage('');
        setLoadMoreError('');

      } catch (error) {
        if (!isCurrentRequest()) {
          return;
        }


        if (__DEV__) {
          console.error(
            'My Orders Error:',
            error?.message ||
              error,
          );
        }


        if (!reset) {
          setLoadMoreError(
            'Unable to load more orders.',
          );

        } else if (
          ordersRef.current
            .length > 0
        ) {
          setRefreshErrorMessage(
            'Unable to refresh your orders. Your existing order history is still shown.',
          );

        } else {
          setErrorMessage(
            'Unable to load your orders.',
          );
        }

      } finally {
        if (!isCurrentRequest()) {
          return;
        }


        if (reset) {
          resetInFlightRef.current =
            false;

          setLoading(false);
          setRefreshing(false);


          if (
            realtimeResetQueuedRef.current
          ) {
            realtimeResetQueuedRef.current =
              false;

            fetchOrders({
              reset: true,
              reason: 'realtime',
            });
          }

        } else {
          loadingMoreRef.current =
            false;

          setLoadingMore(false);
        }
      }
    },
    [],
  );


  useFocusEffect(
    useCallback(() => {
      let active = true;
      let channel;


      screenActiveRef.current =
        true;

      fetchOrders({
        reset: true,
        reason:
          ordersRef.current
            .length > 0
            ? 'focus'
            : 'initial',
      });


      const setupRealtime =
        async () => {
          const {
            data: {
              user,
            },
            error: userError,
          } =
            await supabase.auth
              .getUser();


          if (
            userError ||
            !user ||
            !active
          ) {
            return;
          }


          channel =
            supabase
              .channel(
                `my-orders-${user.id}`,
              )
              .on(
                'postgres_changes',
                {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'orders',
                  filter:
                    `user_id=eq.${user.id}`,
                },
                () => {
                  fetchOrders({
                    reset: true,
                    reason:
                      'realtime',
                  });
                },
              )
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'orders',
                  filter:
                    `user_id=eq.${user.id}`,
                },
                () => {
                  fetchOrders({
                    reset: true,
                    reason:
                      'realtime',
                  });
                },
              )
              .subscribe();
        };


      setupRealtime();


      return () => {
        active = false;

        screenActiveRef.current =
          false;

        requestIdRef.current += 1;
        resetInFlightRef.current =
          false;
        realtimeResetQueuedRef.current =
          false;
        loadingMoreRef.current =
          false;


        if (channel) {
          supabase.removeChannel(
            channel,
          );
        }
      };
    }, [fetchOrders]),
  );


  const handleRefresh =
    useCallback(() => {
      fetchOrders({
        reset: true,
        reason: 'refresh',
      });
    }, [fetchOrders]);

  const handleRetry =
    useCallback(() => {
      fetchOrders({
        reset: true,
        reason: 'retry',
      });
    }, [fetchOrders]);

  const handleLoadMore =
    useCallback(() => {
      if (
        loading ||
        refreshing ||
        errorMessage ||
        loadMoreError ||
        ordersRef.current
          .length === 0
      ) {
        return;
      }


      fetchOrders({
        reset: false,
        reason: 'load-more',
      });
    }, [
      errorMessage,
      fetchOrders,
      loadMoreError,
      loading,
      refreshing,
    ]);

  const handleRetryLoadMore =
    useCallback(() => {
      fetchOrders({
        reset: false,
        reason:
          'load-more-retry',
      });
    }, [fetchOrders]);


  const handleTrackOrder =
    useCallback(
      order => {
        navigation.navigate(
          'OrderTracking',
          {
            orderId: order.id,
          },
        );
      },
      [navigation],
    );

  const handleViewDetails =
    useCallback(
      order => {
        navigation.navigate(
          'OrderDetails',
          {
            orderId: order.id,
          },
        );
      },
      [navigation],
    );

  const handleCancelOrder =
    useCallback(
      order => {
        navigation.navigate(
          'CancelOrder',
          {
            orderId: order.id,
          },
        );
      },
      [navigation],
    );

  const handleViewReturn =
    useCallback(
      order => {
        navigation.navigate(
          'ReturnDetails',
          {
            returnRequestId:
              order.returnRequest
                .id,
          },
        );
      },
      [navigation],
    );

  const handleRequestReturn =
    useCallback(
      order => {
        navigation.navigate(
          'ReturnRequest',
          {
            orderId: order.id,
          },
        );
      },
      [navigation],
    );

  const renderOrder =
    useCallback(
      ({ item }) => (
        <OrderCard
          order={item}
          onTrack={
            handleTrackOrder
          }
          onViewDetails={
            handleViewDetails
          }
          onCancel={
            handleCancelOrder
          }
          onViewReturn={
            handleViewReturn
          }
          onRequestReturn={
            handleRequestReturn
          }
        />
      ),
      [
        handleCancelOrder,
        handleRequestReturn,
        handleTrackOrder,
        handleViewDetails,
        handleViewReturn,
      ],
    );

  const displayedCount =
    typeof totalCount ===
      'number'
      ? totalCount
      : orders.length;

  const hasExactCount =
    typeof totalCount ===
    'number';


  const listHeader = (
    <View>
      <View className="mt-4 flex-row items-center">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
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


      {!loading &&
      orders.length > 0 ? (
        <View className="mt-7 rounded-3xl bg-black p-5">
          <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Order History
          </Text>

          <View className="mt-3 flex-row items-end justify-between">
            <View>
              <Text className="text-3xl font-extrabold text-white">
                {displayedCount}
              </Text>

              <Text className="mt-1 text-sm text-gray-300">
                {hasExactCount
                  ? displayedCount === 1
                    ? 'order placed'
                    : 'orders placed'
                  : displayedCount === 1
                    ? 'order loaded'
                    : 'orders loaded'}
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


      {refreshErrorMessage ? (
        <View
          accessibilityLiveRegion="polite"
          className="mt-5 rounded-2xl bg-gray-100 p-4"
        >
          <Text className="font-extrabold text-black">
            Orders may be out of date
          </Text>

          <Text className="mt-2 leading-6 text-gray-500">
            {refreshErrorMessage}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Retry refreshing orders"
            onPress={handleRetry}
            activeOpacity={0.85}
            className="mt-3 self-start rounded-xl bg-black px-4 py-2.5"
          >
            <Text className="font-extrabold text-white">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}


      {!loading &&
      orders.length > 0 ? (
        <View className="mb-4 mt-7 flex-row items-center justify-between">
          <Text className="text-xl font-extrabold text-black">
            Recent Orders
          </Text>

          <Text className="text-sm font-semibold text-gray-500">
            Pull to refresh
          </Text>
        </View>
      ) : null}
    </View>
  );

  const listEmpty = loading ? (
    <View
      accessibilityLiveRegion="polite"
      className="items-center py-24"
    >
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
  ) : errorMessage ? (
    <View
      accessibilityLiveRegion="polite"
      className="mt-10 items-center rounded-3xl bg-gray-100 p-8"
    >
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
        accessibilityRole="button"
        accessibilityLabel="Retry loading orders"
        onPress={handleRetry}
        activeOpacity={0.85}
        className="mt-5 rounded-2xl bg-black px-6 py-3"
      >
        <Text className="font-extrabold text-white">
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  ) : (
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
        accessibilityRole="button"
        accessibilityLabel="Start shopping"
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
  );

  const listFooter =
    orders.length === 0
      ? null
      : loadingMore
        ? (
            <View
              accessibilityLiveRegion="polite"
              className="items-center py-5"
            >
              <ActivityIndicator
                size="small"
                color="black"
              />

              <Text className="mt-2 font-semibold text-gray-500">
                Loading more orders...
              </Text>
            </View>
          )
        : loadMoreError
          ? (
              <View
                accessibilityLiveRegion="polite"
                className="mb-2 items-center rounded-2xl bg-gray-100 p-4"
              >
                <Text className="font-bold text-gray-600">
                  {loadMoreError}
                </Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading more orders"
                  onPress={
                    handleRetryLoadMore
                  }
                  activeOpacity={0.85}
                  className="mt-3 rounded-xl bg-black px-4 py-2.5"
                >
                  <Text className="font-extrabold text-white">
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            )
          : !hasMore &&
              orders.length >=
                PAGE_SIZE
            ? (
                <Text className="pb-2 text-center text-sm font-semibold text-gray-400">
                  All orders loaded
                </Text>
              )
            : null;


  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        accessibilityLabel="My orders list"
        className="flex-1"
        data={orders}
        renderItem={renderOrder}
        keyExtractor={getOrderKey}
        ListHeaderComponent={
          listHeader
        }
        ListEmptyComponent={
          listEmpty
        }
        ListFooterComponent={
          listFooter
        }
        contentContainerStyle={
          LIST_CONTENT_STYLE
        }
        showsVerticalScrollIndicator={
          false
        }
        alwaysBounceVertical
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={
          handleLoadMore
        }
        onEndReachedThreshold={0.35}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={7}
      />
    </SafeAreaView>
  );
};


export default MyOrders;
