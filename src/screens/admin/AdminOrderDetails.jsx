import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
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
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery:
    'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const styles = StyleSheet.create({
  courierInputText: {
    color: '#000000',
  },
});


const AdminOrderDetails = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();

  const orderId =
    route.params?.orderId;

  const [details, setDetails] =
    useState(null);

  const [shipment, setShipment] = useState(null);
  const [carrierName, setCarrierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [shipmentStatus, setShipmentStatus] = useState('picked_up');
  const [shipmentDescription, setShipmentDescription] = useState('');
  const [savingShipment, setSavingShipment] = useState(false);

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


        if (!orderId) {
          throw new Error(
            'Order ID is missing.',
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
          'get_admin_order_details_secure',
          {
            p_order_id: orderId,
          },
        );


        if (error) {
          throw error;
        }


        if (!data) {
          throw new Error(
            'Order not found.',
          );
        }


        setDetails(data);

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Admin Order Details Error:',
            error.message,
          );
        }

        setErrorMessage(
          'Unable to load order details.',
        );

      } finally {
        setLoading(false);
      }
    },
    [orderId],
  );


  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    let active = true;
    supabase
      .from('order_shipments')
      .select('carrier_name, tracking_number, tracking_url, estimated_delivery_at')
      .eq('order_id', orderId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!active || !data) return;
        setShipment(data);
        setCarrierName(data.carrier_name || '');
        setTrackingNumber(data.tracking_number || '');
        setTrackingUrl(data.tracking_url || '');
        setEstimatedDelivery(data.estimated_delivery_at ? data.estimated_delivery_at.slice(0, 10) : '');
      })
      .catch(error => {
        if (__DEV__) console.error('Shipment details error:', error.message);
      });
    return () => { active = false; };
  }, [orderId]);

  const saveShipment = async () => {
    const cleanCarrier = carrierName.trim();
    const cleanTrackingNumber = trackingNumber.trim();
    const cleanDescription = shipmentDescription.trim();
    const cleanTrackingUrl = trackingUrl.trim();
    if (cleanCarrier.length < 2 || cleanTrackingNumber.length < 2 || cleanDescription.length < 2) {
      setOverlay({ visible: true, type: 'info', title: 'Details required', message: 'Enter a courier, tracking number and update description.', confirmText: 'OK', cancelText: 'Cancel', actionStatus: null });
      return;
    }
    if (cleanTrackingUrl && !/^https?:\/\/\S+$/i.test(cleanTrackingUrl)) {
      setOverlay({ visible: true, type: 'info', title: 'Invalid tracking URL', message: 'Enter a link starting with http:// or https://, or leave this optional field blank.', confirmText: 'OK', cancelText: 'Cancel', actionStatus: null });
      return;
    }
    let estimatedDeliveryAt = null;
    if (estimatedDelivery.trim()) {
      const parsedDate = new Date(estimatedDelivery.trim());
      if (Number.isNaN(parsedDate.getTime())) {
        setOverlay({ visible: true, type: 'info', title: 'Invalid date', message: 'Use YYYY-MM-DD for estimated delivery.', confirmText: 'OK', cancelText: 'Cancel', actionStatus: null });
        return;
      }
      estimatedDeliveryAt = parsedDate.toISOString();
    }
    setSavingShipment(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Admin session not found.');
      const shipmentPayload = {
        order_id: orderId,
        carrier_name: cleanCarrier,
        tracking_number: cleanTrackingNumber,
        tracking_url: cleanTrackingUrl || null,
        estimated_delivery_at: estimatedDeliveryAt,
        updated_by: authData.user.id,
      };
      const { data: savedShipment, error: shipmentError } = await supabase
        .from('order_shipments')
        .upsert(shipmentPayload, { onConflict: 'order_id' })
        .select('carrier_name, tracking_number, tracking_url, estimated_delivery_at')
        .single();
      if (shipmentError) throw shipmentError;
      const { error: eventError } = await supabase.from('order_shipment_events').insert({
        order_id: orderId,
        status: shipmentStatus,
        description: cleanDescription,
        created_by: authData.user.id,
      });
      if (eventError) throw eventError;
      setShipment(savedShipment);
      setShipmentDescription('');
      setOverlay({ visible: true, type: 'success', title: 'Tracking updated', message: 'Courier tracking details and customer update were saved.', confirmText: 'Done', cancelText: 'Cancel', actionStatus: null });
    } catch (error) {
      const message = String(error?.message || '');
      const isInvalidTrackingUrl = message.includes('order_shipments_tracking_url_ck');
      setOverlay({ visible: true, type: 'error', title: 'Unable to save tracking', message: isInvalidTrackingUrl ? 'Enter a tracking link starting with http:// or https://, or leave the optional field blank.' : message || 'Please try again.', confirmText: 'OK', cancelText: 'Cancel', actionStatus: null });
    } finally {
      setSavingShipment(false);
    }
  };


  useEffect(() => {
    if (!orderId) {
      return undefined;
    }

    const channel =
      supabase
        .channel(
          `admin-order-${orderId}`,
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter:
              `id=eq.${orderId}`,
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
    orderId,
    fetchDetails,
  ]);


  const order =
    details?.order || null;

  const items =
    Array.isArray(details?.items)
      ? details.items
      : [];


  const status =
    String(
      order?.status || '',
    ).toLowerCase();


  const nextAction =
    useMemo(() => {
      switch (status) {
        case 'pending':
          return {
            status: 'confirmed',
            label: 'Confirm Order',
            title: 'Confirm Order?',
            message:
              'This order will move to Confirmed.',
          };

        case 'confirmed':
          return {
            status: 'processing',
            label: 'Start Processing',
            title: 'Start Processing?',
            message:
              'This order will move to Processing.',
          };

        case 'processing':
          return {
            status: 'shipped',
            label: 'Mark Shipped',
            title: 'Mark Order Shipped?',
            message:
              'This order will move to Shipped.',
          };

        case 'shipped':
          return {
            status:
              'out_for_delivery',
            label:
              'Out for Delivery',
            title:
              'Send Out for Delivery?',
            message:
              'This order will move to Out for Delivery.',
          };

        case 'out_for_delivery':
          return {
            status: 'delivered',
            label:
              'Mark Delivered',
            title:
              'Mark Order Delivered?',
            message:
              'Confirm that the customer has received this order.',
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
          'update_order_status_secure',
          {
            p_order_id: orderId,
            p_new_status:
              newStatus,
          },
        );


        if (error) {
          throw error;
        }


        const finalStatus =
          String(
            data?.status ||
            newStatus,
          )
            .trim()
            .toLowerCase();


        let notificationDelivered =
          true;


        try {
          const {
            data:
              notificationData,
            error:
              notificationError,
          } =
            await supabase
              .functions
              .invoke(
                'create-order',
                {
                  body: {
                    action:
                      'notify_order_status',

                    order_id:
                      orderId,

                    status:
                      finalStatus,
                  },
                },
              );


          if (
            notificationError ||
            !notificationData
              ?.success
          ) {
            notificationDelivered =
              false;

            if (__DEV__) {
              console.error(
                'Order status notification error:',
                notificationError
                  ?.message ||
                  notificationData
                    ?.error ||
                  'Notification delivery failed.',
              );
            }
          }

        } catch (
          notificationError
        ) {
          notificationDelivered =
            false;

          if (__DEV__) {
            console.error(
              'Order status notification error:',
              notificationError
                ?.message ||
                notificationError,
            );
          }
        }


        setOverlay({
          visible: true,
          type: 'success',
          title: 'Status Updated',
          message:
            notificationDelivered
              ? `Order status changed to ${
                  STATUS_LABELS[
                    finalStatus
                  ] ||
                  finalStatus
                }. Customer email and push notification have been queued.`
              : `Order status changed to ${
                  STATUS_LABELS[
                    finalStatus
                  ] ||
                  finalStatus
                }. The order was updated, but customer notification delivery could not be confirmed.`,
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
            'Admin Order Status Error:',
            error.message,
          );
        }

        setOverlay({
          visible: true,
          type: 'error',
          title: 'Update Failed',
          message:
            'Unable to update order status.',
          confirmText: 'OK',
          cancelText: 'Cancel',
          actionStatus: null,
        });

      } finally {
        setProcessing(false);
      }
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


  const addressParts = [
    order?.delivery_address,
    order?.delivery_area,
    order?.delivery_landmark,
    order?.delivery_city,
    order?.delivery_province,
    order?.delivery_postal_code,
    order?.delivery_country,
  ].filter(Boolean);


  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">

        <ActivityIndicator
          size="large"
          color="black"
        />

        <Text className="mt-3 text-gray-500">
          Loading order details...
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
              Admin Order
            </Text>

          </View>


          <View className="mt-20 items-center">

            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#D1D5DB"
            />

            <Text className="mt-5 text-xl font-extrabold text-black">
              Unable to load order
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
              Admin Order
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              #{order.order_number}
            </Text>

          </View>

        </View>


        <View className="mt-7 rounded-3xl bg-black p-6">

          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">

            <Ionicons
              name={
                status === 'delivered'
                  ? 'checkmark-circle-outline'
                  : status === 'cancelled'
                  ? 'close-circle-outline'
                  : 'cube-outline'
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
            Manage this customer order securely.
          </Text>

        </View>


        <View className="mt-6 rounded-2xl bg-gray-100 p-5">

          <Text className="text-lg font-extrabold text-black">
            Customer
          </Text>


          <View className="mt-5 flex-row justify-between">

            <Text className="text-gray-500">
              Name
            </Text>

            <Text className="ml-5 flex-1 text-right font-bold text-black">
              {order.delivery_full_name ||
                '—'}
            </Text>

          </View>


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Phone
            </Text>

            <Text className="ml-5 flex-1 text-right font-semibold text-black">
              {order.delivery_phone ||
                '—'}
            </Text>

          </View>


          <View className="mt-4">

            <Text className="text-gray-500">
              Shipping Address
            </Text>

            <Text className="mt-2 leading-6 font-semibold text-black">
              {addressParts.length
                ? addressParts.join(', ')
                : '—'}
            </Text>

          </View>

        </View>


        <Text className="mt-7 text-xl font-extrabold text-black">
          Order Items
        </Text>

        <View className="mt-7 rounded-3xl border border-gray-200 bg-white p-5">
          <Text className="text-lg font-extrabold text-black">Courier tracking</Text>
          <Text className="mt-1 text-sm text-gray-500">Add the courier and a customer-visible tracking update.</Text>
          <TextInput value={carrierName} onChangeText={setCarrierName} maxLength={80} placeholder="Courier name" placeholderTextColor="#6B7280" selectionColor="#000000" style={styles.courierInputText} className="mt-4 rounded-xl bg-gray-100 px-4 py-3 text-black" />
          <TextInput value={trackingNumber} onChangeText={setTrackingNumber} maxLength={120} placeholder="Tracking number" placeholderTextColor="#6B7280" selectionColor="#000000" style={styles.courierInputText} className="mt-3 rounded-xl bg-gray-100 px-4 py-3 text-black" />
          <TextInput value={trackingUrl} onChangeText={setTrackingUrl} maxLength={1000} autoCapitalize="none" keyboardType="url" placeholder="https://tracking-link (optional)" placeholderTextColor="#6B7280" selectionColor="#000000" style={styles.courierInputText} className="mt-3 rounded-xl bg-gray-100 px-4 py-3 text-black" />
          <TextInput value={estimatedDelivery} onChangeText={setEstimatedDelivery} maxLength={10} placeholder="Estimated delivery (YYYY-MM-DD)" placeholderTextColor="#6B7280" selectionColor="#000000" style={styles.courierInputText} className="mt-3 rounded-xl bg-gray-100 px-4 py-3 text-black" />
          <Text className="mb-2 mt-4 text-sm font-bold text-black">Courier status</Text>
          <View className="flex-row flex-wrap gap-2">
            {['label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception'].map(value => (
              <TouchableOpacity key={value} onPress={() => setShipmentStatus(value)} className={`rounded-full px-3 py-2 ${shipmentStatus === value ? 'bg-black' : 'bg-gray-100'}`}>
                <Text className={`text-xs font-bold capitalize ${shipmentStatus === value ? 'text-white' : 'text-gray-700'}`}>{value.replaceAll('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput value={shipmentDescription} onChangeText={setShipmentDescription} maxLength={500} multiline placeholder="Update message for the customer" placeholderTextColor="#6B7280" selectionColor="#000000" style={styles.courierInputText} className="mt-3 min-h-20 rounded-xl bg-gray-100 px-4 py-3 text-black" />
          <TouchableOpacity onPress={saveShipment} disabled={savingShipment} className="mt-4 h-12 flex-row items-center justify-center rounded-2xl bg-black">
            {savingShipment ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">{shipment ? 'Save tracking update' : 'Add tracking'}</Text>}
          </TouchableOpacity>
        </View>


        <View className="mt-4">

          {items.map(item => (
            <View
              key={item.id}
              className="mb-4 rounded-2xl border border-gray-200 bg-white p-5"
            >

              <View className="flex-row justify-between">

                <View className="mr-4 flex-1">

                  <Text className="text-base font-extrabold text-black">
                    {item.product_name_snapshot ||
                      item.product_name ||
                      'Product'}
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    {[
                      item.variant_size_snapshot
                        ? `Size: ${item.variant_size_snapshot}`
                        : null,
                      item.variant_color_snapshot
                        ? `Color: ${item.variant_color_snapshot}`
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
                    item.subtotal ||
                      0,
                  ).toFixed(2)}
                </Text>

              </View>

            </View>
          ))}

        </View>


        <View className="mt-3 rounded-2xl border border-gray-200 bg-white p-5">

          <Text className="text-lg font-extrabold text-black">
            Payment & Total
          </Text>


          <View className="mt-5 flex-row justify-between">

            <Text className="text-gray-500">
              Subtotal
            </Text>

            <Text className="font-bold text-black">
              Rs{' '}
              {Number(
                order.subtotal_amount || 0,
              ).toFixed(2)}
            </Text>

          </View>


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Shipping
            </Text>

            <Text className="font-bold text-black">
              Rs{' '}
              {Number(
                order.shipping_amount || 0,
              ).toFixed(2)}
            </Text>

          </View>


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Discount
            </Text>

            <Text className="font-bold text-black">
              Rs{' '}
              {Number(
                order.discount_amount || 0,
              ).toFixed(2)}
            </Text>

          </View>


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row justify-between">

            <Text className="font-extrabold text-black">
              Total
            </Text>

            <Text className="text-lg font-extrabold text-black">
              Rs{' '}
              {Number(
                order.total_amount || 0,
              ).toFixed(2)}
            </Text>

          </View>


          <View className="mt-5 flex-row justify-between">

            <Text className="text-gray-500">
              Payment Method
            </Text>

            <Text className="font-bold text-black">
              {formatValue(
                order.payment_method,
              )}
            </Text>

          </View>


          <View className="mt-4 flex-row justify-between">

            <Text className="text-gray-500">
              Payment Status
            </Text>

            <Text className="font-bold text-black">
              {formatValue(
                order.payment_status,
              )}
            </Text>

          </View>

        </View>


        <View className="mt-6 rounded-2xl bg-gray-100 p-5">

          <Text className="text-lg font-extrabold text-black">
            Order Information
          </Text>


          <View className="mt-5 flex-row justify-between">

            <Text className="text-gray-500">
              Created
            </Text>

            <Text className="ml-5 flex-1 text-right font-semibold text-black">
              {formatDate(
                order.created_at,
              )}
            </Text>

          </View>


          {order.delivered_at ? (
            <View className="mt-4 flex-row justify-between">

              <Text className="text-gray-500">
                Delivered
              </Text>

              <Text className="ml-5 flex-1 text-right font-semibold text-black">
                {formatDate(
                  order.delivered_at,
                )}
              </Text>

            </View>
          ) : null}


          {order.cancel_reason ? (
            <>
              <View className="mt-4">

                <Text className="text-gray-500">
                  Cancellation Reason
                </Text>

                <Text className="mt-2 font-semibold text-black">
                  {order.cancel_reason}
                </Text>

              </View>

              <View className="mt-4 flex-row justify-between">

                <Text className="text-gray-500">
                  Cancelled At
                </Text>

                <Text className="ml-5 flex-1 text-right font-semibold text-black">
                  {formatDate(
                    order.cancelled_at,
                  )}
                </Text>

              </View>
            </>
          ) : null}

        </View>


        {nextAction ? (
          <TouchableOpacity
            onPress={() =>
              openAction(nextAction)
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
                  {nextAction.label}
                </Text>
              </>
            )}

          </TouchableOpacity>
        ) : (
          <View className="mt-7 rounded-2xl bg-gray-100 p-5">

            <Text className="text-center font-extrabold text-black">
              {status === 'delivered'
                ? 'Order workflow completed.'
                : status === 'cancelled'
                ? 'This order was cancelled.'
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




export default AdminOrderDetails;
