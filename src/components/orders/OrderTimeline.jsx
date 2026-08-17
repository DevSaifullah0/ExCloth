import {
  View,
  Text,
} from 'react-native';

import React, {
  useMemo,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';


const FLOW = [
  {
    key: 'confirmed',
    title: 'Order Confirmed',
    description: 'Your order has been received and confirmed.',
    icon: 'checkmark-circle-outline',
  },
  {
    key: 'processing',
    title: 'Processing',
    description: 'Your order is being prepared for shipment.',
    icon: 'cube-outline',
  },
  {
    key: 'shipped',
    title: 'Shipped',
    description: 'Your order has left the warehouse.',
    icon: 'paper-plane-outline',
  },
  {
    key: 'out_for_delivery',
    title: 'Out for Delivery',
    description: 'Your order is on the way to your delivery address.',
    icon: 'bicycle-outline',
  },
  {
    key: 'delivered',
    title: 'Delivered',
    description: 'Your order has been delivered successfully.',
    icon: 'home-outline',
  },
];


const STATUS_INDEX = {
  pending: -1,
  confirmed: 0,
  processing: 1,
  packed: 1,
  shipped: 2,
  out_for_delivery: 3,
  delivered: 4,
};


const formatDate = value => {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  return date.toLocaleString();
};


const OrderTimeline = ({
  status = 'confirmed',
  createdAt = null,
  updatedAt = null,
}) => {
  const normalizedStatus =
    String(
      status || 'confirmed',
    )
      .trim()
      .toLowerCase();


  const isCancelled =
    normalizedStatus ===
      'cancelled' ||
    normalizedStatus ===
      'canceled';


  const isReturned =
    normalizedStatus ===
      'returned' ||
    normalizedStatus ===
      'return_completed';


  const isRefunded =
    normalizedStatus ===
      'refunded';


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


  if (
    isCancelled ||
    isReturned ||
    isRefunded
  ) {
    const title =
      isCancelled
        ? 'Order Cancelled'
        : isRefunded
          ? 'Order Refunded'
          : 'Order Returned';

    const description =
      isCancelled
        ? 'This order has been cancelled.'
        : isRefunded
          ? 'The refund for this order has been completed.'
          : 'This order has been returned.';

    const icon =
      isCancelled
        ? 'close-circle-outline'
        : isRefunded
          ? 'cash-outline'
          : 'return-down-back-outline';

    return (
      <View className="rounded-2xl border border-gray-200 bg-white p-5">

        <Text className="text-lg font-extrabold text-black">
          Order Timeline
        </Text>


        <View className="mt-5 flex-row items-start">

          <View className="h-12 w-12 items-center justify-center rounded-full bg-black">

            <Ionicons
              name={icon}
              size={23}
              color="white"
            />

          </View>


          <View className="ml-4 flex-1">

            <Text className="text-base font-extrabold text-black">
              {title}
            </Text>


            <Text className="mt-1 text-sm leading-5 text-gray-500">
              {description}
            </Text>


            {updatedAt ? (
              <Text className="mt-2 text-xs font-semibold text-gray-400">
                {formatDate(
                  updatedAt,
                )}
              </Text>
            ) : null}

          </View>

        </View>

      </View>
    );
  }


  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-5">

      <Text className="text-lg font-extrabold text-black">
        Order Timeline
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

            const showCreatedAt =
              index === 0 &&
              createdAt;

            const showUpdatedAt =
              current &&
              index > 0 &&
              updatedAt;

            return (
              <View
                key={
                  step.key
                }
                className="flex-row"
              >

                {/* LEFT SIDE */}

                <View className="items-center">

                  <View
                    className={`h-12 w-12 items-center justify-center rounded-full ${
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
                      size={22}
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
                          46,
                      }}
                    />
                  ) : null}

                </View>


                {/* CONTENT */}

                <View
                  className={`ml-4 flex-1 ${
                    index <
                    FLOW.length -
                      1
                      ? 'pb-6'
                      : ''
                  }`}
                >

                  <View className="flex-row items-center">

                    <Text
                      className={`flex-1 text-base font-extrabold ${
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


                  <Text
                    className={`mt-1 text-sm leading-5 ${
                      active
                        ? 'text-gray-500'
                        : 'text-gray-400'
                    }`}
                  >
                    {
                      step.description
                    }
                  </Text>


                  {showCreatedAt ? (
                    <Text className="mt-2 text-xs font-semibold text-gray-400">
                      {formatDate(
                        createdAt,
                      )}
                    </Text>
                  ) : null}


                  {showUpdatedAt ? (
                    <Text className="mt-2 text-xs font-semibold text-gray-400">
                      Updated{' '}
                      {formatDate(
                        updatedAt,
                      )}
                    </Text>
                  ) : null}

                </View>

              </View>
            );
          },
        )}

      </View>

    </View>
  );
};


export default OrderTimeline;
