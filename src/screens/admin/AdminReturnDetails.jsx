import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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

import AppModal from '../../components/common/AppModal';


const STATUS_LABELS = {
  requested: 'Return Requested',
  approved: 'Return Approved',
  rejected: 'Return Rejected',
  pickup_scheduled: 'Pickup Scheduled',
  picked_up: 'Item Picked Up',
  received: 'Return Received',
  refund_pending: 'Refund Processing',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};


const AdminReturnDetails = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();

  const returnRequestId =
    route.params?.returnRequestId;

  const [details, setDetails] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [overlay, setOverlay] =
    useState({
      visible: false,
      type: 'info',
      title: '',
      message: '',
      confirmText: 'OK',
      cancelText: 'Cancel',
      actionStatus: null,
    });


  const closeOverlay = () => {
    if (processing) {
      return;
    }

    setOverlay(current => ({
      ...current,
      visible: false,
      actionStatus: null,
    }));
  };


  const fetchDetails = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setErrorMessage('');


        if (!returnRequestId) {
          throw new Error(
            'Return request ID is missing.',
          );
        }


        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();


        if (userError) {
          throw userError;
        }


        if (!user) {
          throw new Error(
            'Admin session not found.',
          );
        }


        const {
          data,
          error,
        } = await supabase.rpc(
          'get_admin_return_details_secure',
          {
            p_return_request_id:
              returnRequestId,
          },
        );


        if (error) {
          throw error;
        }


        if (!data) {
          throw new Error(
            'Return request not found.',
          );
        }


        setDetails(data);

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Admin Return Details Error:',
            error.message,
          );
        }

        setErrorMessage(
          'Unable to load return details.',
        );

      } finally {
        setLoading(false);
      }
    },
    [returnRequestId],
  );


  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);


  useEffect(() => {
    if (!returnRequestId) {
      return undefined;
    }

    const channel =
      supabase
        .channel(
          `admin-return-${returnRequestId}`,
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'return_requests',
            filter:
              `id=eq.${returnRequestId}`,
          },
          () => {
            fetchDetails({
              silent: true,
            });
          },
        )
        .subscribe();


    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    returnRequestId,
    fetchDetails,
  ]);


  const request =
    details?.return_request || null;

  const items =
    Array.isArray(details?.items)
      ? details.items
      : [];


  const status =
    String(
      request?.status || '',
    ).toLowerCase();


  const nextPrimaryAction =
    useMemo(() => {
      switch (status) {
        case 'approved':
          return {
            status: 'pickup_scheduled',
            label: 'Schedule Pickup',
            title: 'Schedule Pickup?',
            message:
              'This return will move to pickup scheduled.',
          };

        case 'pickup_scheduled':
          return {
            status: 'picked_up',
            label: 'Mark Picked Up',
            title:
              'Mark Item Picked Up?',
            message:
              'Confirm that the returned item has been collected from the customer.',
          };

        case 'picked_up':
          return {
            status: 'received',
            label:
              'Mark Return Received',
            title:
              'Confirm Return Received?',
            message:
              'This will restore the returned item quantity back into stock.',
          };

        case 'received':
          return {
            status: 'refund_pending',
            label: 'Process Refund',
            title:
              'Start Refund Processing?',
            message:
              'The return will move to refund processing.',
          };

        case 'refund_pending':
          return {
            status: 'refunded',
            label: 'Mark Refunded',
            title: 'Complete Refund?',
            message:
              'Confirm that the refund has been completed.',
          };

        default:
          return null;
      }
    }, [status]);


  const openAction = action => {
    if (!action) return;

    setOverlay({
      visible: true,
      type: 'confirm',
      title: action.title,
      message: action.message,
      confirmText: action.label,
      cancelText: 'Not Now',
      actionStatus: action.status,
    });
  };


  const updateStatus =
    async newStatus => {
      if (
        processing ||
        !newStatus
      ) {
        return;
      }

      try {
        setProcessing(true);

        const {
          data,
          error,
        } = await supabase.rpc(
          'update_return_status_secure',
          {
            p_return_request_id:
              returnRequestId,
            p_new_status:
              newStatus,
          },
        );


        if (error) {
          throw error;
        }


        setOverlay({
          visible: true,
          type: 'success',
          title: 'Status Updated',
          message:
            `Return status changed to ${
              STATUS_LABELS[
                data?.status || newStatus
              ] || newStatus
            }.`,
          confirmText: 'OK',
          cancelText: 'Cancel',
          actionStatus: null,
        });


        await fetchDetails({
          silent: true,
        });

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Admin Return Status Error:',
            error.message,
          );
        }

        setOverlay({
          visible: true,
          type: 'error',
          title: 'Update Failed',
          message:
            'Unable to update return status.',
          confirmText: 'OK',
          cancelText: 'Cancel',
          actionStatus: null,
        });

      } finally {
        setProcessing(false);
      }
    };


  const formatDate = value => {
    if (!value) return '—';

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return '—';
    }

    return date.toLocaleString();
  };


  const formatValue = value => {
    if (!value) return '—';

    return String(value)
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        letter => letter.toUpperCase(),
      );
  };


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


  if (
    errorMessage ||
    !request
  ) {
    return (
      <SafeAreaView className="flex-1 bg-white">

        <View className="px-5">

          <View className="mt-4 flex-row items-center">

            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
            >
              <Ionicons
                name="arrow-back-outline"
                size={22}
                color="black"
              />
            </TouchableOpacity>

            <Text className="ml-4 text-2xl font-extrabold text-black">
              Admin Return
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
              onPress={() =>
                fetchDetails()
              }
              activeOpacity={0.85}
              className="mt-6 rounded-2xl bg-black px-7 py-4"
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            Math.max(
              insets.bottom,
              24,
            ) + 130,
        }}
      >

        <View className="mt-4 flex-row items-center">

          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
          >
            <Ionicons
              name="arrow-back-outline"
              size={22}
              color="black"
            />
          </TouchableOpacity>


          <View className="ml-4 flex-1">

            <Text className="text-2xl font-extrabold text-black">
              Admin Return
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              #{request.order_number || 'Unknown'}
            </Text>

          </View>

        </View>


        <View className="mt-7 rounded-3xl bg-black p-6">

          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">

            <Ionicons
              name={
                status === 'refunded'
                  ? 'cash-outline'
                  : status === 'rejected'
                  ? 'close-outline'
                  : 'return-down-back-outline'
              }
              size={32}
              color="black"
            />

          </View>


          <Text className="mt-6 text-2xl font-extrabold text-white">
            {STATUS_LABELS[status] ||
              formatValue(status)}
          </Text>

          <Text className="mt-2 leading-6 text-gray-300">
            Manage this customer return securely.
          </Text>

        </View>


        <View className="mt-6 rounded-3xl bg-gray-100 p-5">

          <Text className="text-lg font-extrabold text-black">
            Return Information
          </Text>


          <View className="mt-5 flex-row justify-between">

            <Text className="text-gray-500">
              Reason
            </Text>

            <Text className="ml-5 flex-1 text-right font-bold text-black">
              {request.reason || '—'}
            </Text>

          </View>


          {request.details ? (
            <View className="mt-4">

              <Text className="text-gray-500">
                Customer Details
              </Text>

              <Text className="mt-2 leading-6 text-black">
                {request.details}
              </Text>

            </View>
          ) : null}


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Requested At
            </Text>

            <Text className="ml-5 flex-1 text-right font-semibold text-black">
              {formatDate(
                request.requested_at,
              )}
            </Text>

          </View>


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Customer ID
            </Text>

            <Text
              numberOfLines={1}
              className="ml-5 flex-1 text-right text-xs font-semibold text-black"
            >
              {request.user_id || '—'}
            </Text>

          </View>

        </View>


        <Text className="mt-7 text-xl font-extrabold text-black">
          Return Items
        </Text>


        <View className="mt-4">

          {items.map(item => (
            <View
              key={
                item.id ||
                item.order_item_id
              }
              className="mb-4 rounded-2xl border border-gray-200 bg-white p-5"
            >

              <View className="flex-row justify-between">

                <View className="mr-4 flex-1">

                  <Text className="text-base font-extrabold text-black">
                    {item.product_name ||
                      'Product'}
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
                      .filter(Boolean)
                      .join('  •  ')}
                  </Text>

                  <Text className="mt-2 text-sm text-gray-500">
                    Qty:{' '}
                    {Number(
                      item.quantity || 1,
                    )}
                  </Text>

                </View>


                <Text className="font-extrabold text-black">
                  Rs{' '}
                  {Number(
                    item.estimated_refund_amount ||
                      item.unit_price ||
                      0,
                  ).toFixed(2)}
                </Text>

              </View>

            </View>
          ))}

        </View>


        <View className="mt-3 rounded-2xl border border-gray-200 bg-white p-5">

          <Text className="text-lg font-extrabold text-black">
            Refund
          </Text>


          <View className="mt-5 flex-row justify-between">

            <Text className="text-gray-500">
              Estimated Refund
            </Text>

            <Text className="font-extrabold text-black">
              Rs{' '}
              {Number(
                request.estimated_refund_amount || 0,
              ).toFixed(2)}
            </Text>

          </View>


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Final Refund
            </Text>

            <Text className="font-extrabold text-black">
              {request.refund_amount != null
                ? `Rs ${Number(
                    request.refund_amount,
                  ).toFixed(2)}`
                : '—'}
            </Text>

          </View>


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Refund Status
            </Text>

            <Text className="font-bold text-black">
              {formatValue(
                request.refund_status,
              )}
            </Text>

          </View>


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Refund Method
            </Text>

            <Text className="font-bold text-black">
              {formatValue(
                request.refund_method,
              )}
            </Text>

          </View>


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Original Payment
            </Text>

            <Text className="font-bold text-black">
              {formatValue(
                request.payment_method,
              )}
            </Text>

          </View>

        </View>


        {status === 'requested' ? (
          <View className="mt-7 flex-row gap-3">

            <TouchableOpacity
              onPress={() =>
                openAction({
                  status: 'rejected',
                  label: 'Reject Return',
                  title: 'Reject Return?',
                  message:
                    'This return request will be rejected.',
                })
              }
              disabled={processing}
              activeOpacity={0.85}
              className="h-14 flex-1 items-center justify-center rounded-xl border border-black bg-white"
            >
              <Text className="font-bold text-black">
                Reject
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              onPress={() =>
                openAction({
                  status: 'approved',
                  label: 'Approve Return',
                  title: 'Approve Return?',
                  message:
                    'This return request will be approved.',
                })
              }
              disabled={processing}
              activeOpacity={0.85}
              className="h-14 flex-1 items-center justify-center rounded-2xl bg-black"
            >
              <Text className="font-bold text-white">
                Approve
              </Text>
            </TouchableOpacity>

          </View>
        ) : nextPrimaryAction ? (
          <TouchableOpacity
            onPress={() =>
              openAction(
                nextPrimaryAction,
              )
            }
            disabled={processing}
            activeOpacity={0.85}
            className="mt-7 h-14 flex-row items-center justify-center rounded-2xl bg-black"
          >

            {processing ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color="white"
                />

                <Text className="ml-2 text-base font-bold text-white">
                  {nextPrimaryAction.label}
                </Text>
              </>
            )}

          </TouchableOpacity>
        ) : (
          <View className="mt-7 rounded-2xl bg-gray-100 p-5">

            <Text className="text-center font-extrabold text-black">
              {status === 'refunded'
                ? 'Return workflow completed.'
                : status === 'rejected'
                ? 'This return request was rejected.'
                : 'No further admin action is available.'}
            </Text>

          </View>
        )}

      </ScrollView>



      <AppModal
        visible={
          overlay.visible
        }
        type={
          overlay.type
        }
        title={
          overlay.title
        }
        message={
          overlay.message
        }
        confirmText={
          overlay.confirmText
        }
        cancelText={
          overlay.cancelText
        }
        showCancel={
          overlay.type ===
          'confirm'
        }
        dismissible={
          !processing
        }
        loading={
          processing
        }
        onCancel={
          closeOverlay
        }
        onConfirm={() => {
          if (
            overlay.type ===
            'confirm'
          ) {
            updateStatus(
              overlay.actionStatus,
            );
            return;
          }

          closeOverlay();
        }}
      />

    </SafeAreaView>
  );
};




export default AdminReturnDetails;
