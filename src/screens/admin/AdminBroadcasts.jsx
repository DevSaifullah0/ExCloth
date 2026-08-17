import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
  StyleSheet,
  RefreshControl,
  Keyboard,
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
  useFocusEffect,
} from '@react-navigation/native';

import { supabase } from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const TYPES = [
  {
    key: 'announcement',
    label: 'Announcement',
    icon: 'megaphone-outline',
  },
  {
    key: 'promo',
    label: 'Promotion',
    icon: 'flash-outline',
  },
  {
    key: 'coupon',
    label: 'Coupon',
    icon: 'pricetag-outline',
  },
];


const AdminBroadcasts = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    broadcasts,
    setBroadcasts,
  ] = useState([]);

  const [
    coupons,
    setCoupons,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    title,
    setTitle,
  ] = useState('');

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    type,
    setType,
  ] = useState('announcement');

  const [
    selectedCoupon,
    setSelectedCoupon,
  ] = useState(null);

  const [
    couponPickerVisible,
    setCouponPickerVisible,
  ] = useState(false);

  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
  });


  const closeModal =
    () => {
      if (sending) {
        return;
      }

      setModal(
        current => ({
          ...current,
          visible: false,
        }),
      );
    };


  const showModal =
    ({
      type: modalType = 'info',
      title: modalTitle = '',
      message: modalMessage = '',
      confirmText = 'OK',
    }) => {
      setModal({
        visible: true,
        type: modalType,
        title: modalTitle,
        message: modalMessage,
        confirmText,
      });
    };


  const fetchData =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setLoading(true);
          }

          setErrorMessage('');


          const [
            broadcastResult,
            couponResult,
          ] = await Promise.all([
            supabase.rpc(
              'get_admin_broadcasts_secure',
            ),
            supabase.rpc(
              'get_admin_coupons_secure',
            ),
          ]);


          if (
            broadcastResult.error
          ) {
            throw broadcastResult.error;
          }


          if (
            couponResult.error
          ) {
            throw couponResult.error;
          }


          const broadcastList =
            Array.isArray(
              broadcastResult.data,
            )
              ? broadcastResult.data
              : Array.isArray(
                  broadcastResult
                    .data?.broadcasts,
                )
              ? broadcastResult
                  .data.broadcasts
              : [];


          const couponList =
            Array.isArray(
              couponResult.data,
            )
              ? couponResult.data
              : Array.isArray(
                  couponResult
                    .data?.coupons,
                )
              ? couponResult
                  .data.coupons
              : [];


          setBroadcasts(
            broadcastList,
          );


          setCoupons(
            couponList.filter(
              coupon =>
                coupon.is_active !==
                false,
            ),
          );

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Admin Broadcasts Load Error:',
              error.message,
            );
          }

          setErrorMessage(
            'Unable to load broadcast notifications.',
          );

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );


  useFocusEffect(
    useCallback(
      () => {
        fetchData();
      },
      [fetchData],
    ),
  );


  useEffect(
    () => {
      if (
        type !== 'coupon'
      ) {
        setSelectedCoupon(
          null,
        );
      }
    },
    [
      type,
    ],
  );


  const activeType =
    useMemo(
      () =>
        TYPES.find(
          item =>
            item.key === type,
        ) ||
        TYPES[0],
      [
        type,
      ],
    );


  const canSend =
    title.trim().length >= 3 &&
    message.trim().length >= 3 &&
    (
      type !== 'coupon' ||
      Boolean(
        selectedCoupon?.id,
      )
    ) &&
    !sending;


  const handleSend =
    async () => {
      if (sending) {
        return;
      }


      if (
        title.trim().length < 3
      ) {
        showModal({
          type: 'warning',
          title: 'Title Required',
          message:
            'Enter a notification title with at least 3 characters.',
        });

        return;
      }


      if (
        message.trim().length < 3
      ) {
        showModal({
          type: 'warning',
          title: 'Message Required',
          message:
            'Enter a notification message with at least 3 characters.',
        });

        return;
      }


      if (
        type === 'coupon' &&
        !selectedCoupon?.id
      ) {
        showModal({
          type: 'warning',
          title: 'Select Coupon',
          message:
            'Choose a coupon before sending a coupon notification.',
        });

        return;
      }


      try {
        Keyboard.dismiss();

        setSending(true);


        const {
          data,
          error,
        } =
          await supabase.rpc(
            'send_admin_broadcast_notification_secure',
            {
              p_title:
                title.trim(),
              p_message:
                message.trim(),
              p_type:
                type,
              p_coupon_id:
                type === 'coupon'
                  ? selectedCoupon.id
                  : null,
            },
          );


        if (error) {
          throw error;
        }


        setTitle('');
        setMessage('');
        setType(
          'announcement',
        );
        setSelectedCoupon(
          null,
        );


        await fetchData({
          silent: true,
        });


        showModal({
          type: 'success',
          title: 'Broadcast Sent',
          message:
            `Notification sent to ${Number(
              data?.audience_count ||
                0,
            )} user(s).`,
        });

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Send Broadcast Error:',
            error.message,
          );
        }

        showModal({
          type: 'error',
          title: 'Send Failed',
          message:
            'Unable to send broadcast notification.',
        });

      } finally {
        setSending(false);
      }
    };


  const formatDate =
    value => {
      if (!value) {
        return '—';
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return '—';
      }

      return date.toLocaleString(
        'en-GB',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      );
    };


  const renderBroadcast =
    ({
      item,
    }) => {
      const config =
        TYPES.find(
          entry =>
            entry.key ===
            item.type,
        ) || TYPES[0];


      return (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate(
              'AdminBroadcastDetails',
              {
                broadcast:
                  item,
              },
            )
          }
          activeOpacity={0.85}
          className="mb-4 rounded-2xl bg-gray-100 p-5"
        >

          <View className="flex-row items-start">

            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">

              <Ionicons
                name={config.icon}
                size={24}
                color="black"
              />

            </View>


            <View className="ml-4 flex-1">

              <View className="flex-row items-start justify-between">

                <View className="mr-3 flex-1">

                  <Text
                    numberOfLines={1}
                    className="text-base font-extrabold text-black"
                  >
                    {item.title}
                  </Text>

                  <Text className="mt-1 text-xs font-semibold uppercase text-gray-400">
                    {config.label}
                  </Text>

                </View>


                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#6B7280"
                />

              </View>


              <Text
                numberOfLines={2}
                className="mt-3 leading-6 text-gray-500"
              >
                {item.message}
              </Text>


              {item.coupon_code ? (
                <View className="mt-3 self-start rounded-full bg-white px-3 py-1.5">

                  <Text className="text-xs font-bold text-black">
                    {item.coupon_code}
                  </Text>

                </View>
              ) : null}


              <View className="mt-4 flex-row items-center justify-between">

                <Text className="text-xs text-gray-400">
                  {
                    formatDate(
                      item.created_at,
                    )
                  }
                </Text>

                <Text className="text-xs font-bold text-black">
                  {Number(
                    item.audience_count ||
                      0,
                  )}{' '}
                  recipients
                </Text>

              </View>

            </View>

          </View>

        </TouchableOpacity>
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
          Loading broadcasts...
        </Text>

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

      <FlatList
        data={broadcasts}
        keyExtractor={
          item =>
            String(item.id)
        }
        renderItem={
          renderBroadcast
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              setRefreshing(
                true,
              );

              fetchData({
                silent: true,
              });
            }}
            tintColor="black"
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom:
            Math.max(
              insets.bottom,
              24,
            ) + 30,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <>

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
                  Broadcast Notifications
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Send announcements and offers to users
                </Text>

              </View>

            </View>


            {errorMessage ? (
              <View className="mt-6 rounded-2xl bg-gray-100 p-5">

                <Text className="font-extrabold text-black">
                  Unable to load data
                </Text>

                <Text className="mt-2 leading-6 text-gray-500">
                  {errorMessage}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    fetchData()
                  }
                  className="mt-4 h-12 items-center justify-center rounded-2xl bg-black"
                >
                  <Text className="font-bold text-white">
                    Try Again
                  </Text>
                </TouchableOpacity>

              </View>
            ) : null}


            <View className="mt-7 rounded-3xl bg-gray-100 p-5">

              <Text className="text-xl font-extrabold text-black">
                New Broadcast
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                All eligible users will receive this notification.
              </Text>


              <Text className="mb-2 mt-6 font-bold text-black">
                Type
              </Text>


              <View className="flex-row flex-wrap">

                {TYPES.map(
                  item => {
                    const selected =
                      type === item.key;

                    return (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() =>
                          setType(
                            item.key,
                          )
                        }
                        activeOpacity={0.85}
                        className={`mb-2 mr-2 flex-row items-center rounded-full px-4 py-2.5 ${
                          selected
                            ? 'bg-black'
                            : 'bg-white'
                        }`}
                      >

                        <Ionicons
                          name={item.icon}
                          size={17}
                          color={
                            selected
                              ? 'white'
                              : 'black'
                          }
                        />

                        <Text
                          className={`ml-2 text-sm font-bold ${
                            selected
                              ? 'text-white'
                              : 'text-black'
                          }`}
                        >
                          {item.label}
                        </Text>

                      </TouchableOpacity>
                    );
                  },
                )}

              </View>


              {type === 'coupon' ? (
                <>

                  <Text className="mb-2 mt-4 font-bold text-black">
                    Coupon
                  </Text>


                  <TouchableOpacity
                    onPress={() =>
                      setCouponPickerVisible(
                        true,
                      )
                    }
                    activeOpacity={0.85}
                    className="h-14 flex-row items-center rounded-2xl bg-white px-4"
                  >

                    <Ionicons
                      name="pricetag-outline"
                      size={21}
                      color="black"
                    />


                    <Text
                      className={`ml-3 flex-1 ${
                        selectedCoupon
                          ? 'font-bold text-black'
                          : 'text-gray-400'
                      }`}
                    >
                      {selectedCoupon
                        ? selectedCoupon.code
                        : 'Select coupon'}
                    </Text>


                    <Ionicons
                      name="chevron-down-outline"
                      size={20}
                      color="#6B7280"
                    />

                  </TouchableOpacity>

                </>
              ) : null}


              <Text className="mb-2 mt-5 font-bold text-black">
                Title
              </Text>


              <TextInput
                value={title}
                onChangeText={
                  value =>
                    setTitle(
                      value.slice(
                        0,
                        100,
                      ),
                    )
                }
                placeholder="Example: Weekend Sale"
                placeholderTextColor="#9CA3AF"
                className="h-14 rounded-2xl bg-white px-4 text-black"
              />


              <Text className="mt-2 text-right text-xs text-gray-400">
                {title.length}/100
              </Text>


              <Text className="mb-2 mt-4 font-bold text-black">
                Message
              </Text>


              <TextInput
                value={message}
                onChangeText={
                  value =>
                    setMessage(
                      value.slice(
                        0,
                        500,
                      ),
                    )
                }
                placeholder="Write your broadcast message..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                className="min-h-32 rounded-2xl bg-white p-4 text-black"
              />


              <Text className="mt-2 text-right text-xs text-gray-400">
                {message.length}/500
              </Text>


              <TouchableOpacity
                onPress={
                  handleSend
                }
                disabled={
                  !canSend
                }
                activeOpacity={0.85}
                className={`mt-6 h-14 flex-row items-center justify-center rounded-xl ${
                  canSend
                    ? 'bg-black'
                    : 'bg-gray-300'
                }`}
              >

                {sending ? (
                  <ActivityIndicator
                    color="white"
                  />
                ) : (
                  <>

                    <Ionicons
                      name="send-outline"
                      size={20}
                      color="white"
                    />

                    <Text className="ml-2 text-base font-bold text-white">
                      Send Broadcast
                    </Text>

                  </>
                )}

              </TouchableOpacity>

            </View>


            <View className="mb-4 mt-8 flex-row items-center justify-between">

              <Text className="text-xl font-extrabold text-black">
                Broadcast History
              </Text>

              <Text className="text-sm font-semibold text-gray-400">
                {broadcasts.length}
              </Text>

            </View>

          </>
        }
        ListEmptyComponent={
          <View className="items-center py-16">

            <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100">

              <Ionicons
                name="megaphone-outline"
                size={38}
                color="#9CA3AF"
              />

            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              No Broadcasts Yet
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              Sent broadcasts will appear here.
            </Text>

          </View>
        }
      />


      <Modal
        visible={
          couponPickerVisible
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setCouponPickerVisible(
            false,
          )
        }
      >

        <View style={styles.modalBackdrop}>

          <View style={styles.pickerCard}>

            <View className="flex-row items-center justify-between">

              <Text className="text-xl font-extrabold text-black">
                Select Coupon
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setCouponPickerVisible(
                    false,
                  )
                }
                className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
              >
                <Ionicons
                  name="close-outline"
                  size={23}
                  color="black"
                />
              </TouchableOpacity>

            </View>


            <FlatList
              data={coupons}
              keyExtractor={
                item =>
                  String(item.id)
              }
              className="mt-5"
              style={{
                maxHeight: 360,
              }}
              showsVerticalScrollIndicator={
                false
              }
              renderItem={({
                item,
              }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCoupon(
                      item,
                    );

                    setCouponPickerVisible(
                      false,
                    );
                  }}
                  activeOpacity={0.85}
                  className="mb-3 rounded-2xl bg-gray-100 p-4"
                >

                  <View className="flex-row items-center">

                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">

                      <Ionicons
                        name="pricetag-outline"
                        size={21}
                        color="black"
                      />

                    </View>


                    <View className="ml-3 flex-1">

                      <Text className="font-extrabold text-black">
                        {item.code}
                      </Text>

                      <Text className="mt-1 text-xs text-gray-500">
                        {item.discount_type ===
                        'percentage'
                          ? `${Number(
                              item.discount_value ||
                                0,
                            )}% off`
                          : `Rs ${Number(
                              item.discount_value ||
                                0,
                            )} off`}
                      </Text>

                    </View>


                    {selectedCoupon?.id ===
                    item.id ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="black"
                      />
                    ) : null}

                  </View>

                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="items-center py-12">

                  <Text className="font-bold text-black">
                    No active coupons
                  </Text>

                  <Text className="mt-2 text-center text-sm text-gray-500">
                    Create or activate a coupon first.
                  </Text>

                </View>
              }
            />

          </View>

        </View>

      </Modal>



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
        dismissible={
          !sending
        }
        loading={
          sending
        }
        onCancel={
          closeModal
        }
        onConfirm={
          closeModal
        }
      />

    </SafeAreaView>
  );
};


const styles =
  StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.60)',
      justifyContent:
        'center',
      alignItems:
        'center',
      paddingHorizontal:
        20,
    },

    pickerCard: {
      width:
        '100%',
      maxWidth:
        420,
      backgroundColor:
        '#FFFFFF',
      borderRadius:
        24,
      padding:
        20,
    },
  });


export default AdminBroadcasts;
