import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const AdminUserDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const userId =
    route.params?.userId;


  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    user,
    setUser,
  ] = useState(null);

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [
    stats,
    setStats,
  ] = useState({
    order_count: 0,
    delivered_order_count: 0,
    total_spent: 0,
  });


  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
    onConfirm: null,
  });


  const closeModal =
    () => {
      if (actionLoading) {
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
      type = 'info',
      title = '',
      message = '',
      confirmText = 'OK',
      cancelText = 'Cancel',
      showCancel = false,
      onConfirm = null,
    }) => {
      setModal({
        visible: true,
        type,
        title,
        message,
        confirmText,
        cancelText,
        showCancel,
        onConfirm,
      });
    };


  const fetchDetails =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setLoading(true);
          }

          setErrorMessage('');


          if (!userId) {
            throw new Error(
              'User ID is missing.',
            );
          }


          const {
            data: {
              user:
                currentSessionUser,
            },
            error:
              sessionError,
          } =
            await supabase.auth
              .getUser();


          if (sessionError) {
            throw sessionError;
          }


          if (
            !currentSessionUser
          ) {
            throw new Error(
              'Admin session not found.',
            );
          }


          const {
            data,
            error,
          } =
            await supabase.rpc(
              'get_admin_user_details_secure',
              {
                p_user_id:
                  userId,
              },
            );


          if (error) {
            throw error;
          }


          setUser(
            data?.user ||
              null,
          );

          setOrders(
            Array.isArray(
              data?.orders,
            )
              ? data.orders
              : [],
          );

          setStats({
            order_count:
              Number(
                data?.stats
                  ?.order_count ??
                  data?.user
                    ?.order_count ??
                  0,
              ),

            delivered_order_count:
              Number(
                data?.stats
                  ?.delivered_order_count ??
                  0,
              ),

            total_spent:
              Number(
                data?.stats
                  ?.total_spent ??
                  data?.user
                    ?.total_spent ??
                  0,
              ),
          });

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Admin User Details Error:',
              error.message,
            );
          }

          setErrorMessage(
            'Unable to load user details.',
          );

        } finally {
          setLoading(false);
        }
      },
      [
        userId,
      ],
    );


  useEffect(
    () => {
      fetchDetails();
    },
    [
      fetchDetails,
    ],
  );


  const formatMoney =
    value => {
      const amount =
        Number(value || 0);

      return `Rs ${amount.toLocaleString()}`;
    };


  const formatDateTime =
    value => {
      if (!value) {
        return 'Not available';
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return 'Not available';
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


  const getDisplayName =
    () => {
      if (!user) {
        return 'Customer';
      }

      const fullName =
        `${user.first_name || ''} ${user.last_name || ''}`
          .trim();

      return (
        user.full_name ||
        fullName ||
        'ExCloth Customer'
      );
    };


  const bannedUntil =
    user?.banned_until
      ? new Date(
          user.banned_until,
        ).getTime()
      : null;

  const isBanned =
    Boolean(
      bannedUntil &&
      Number.isFinite(
        bannedUntil,
      ) &&
      bannedUntil >
        Date.now(),
    );


  const updateBanStatus =
    async shouldBan => {
      if (
        actionLoading ||
        !userId
      ) {
        return;
      }


      try {
        setActionLoading(
          true,
        );


        const {
          error,
        } =
          await supabase.rpc(
            'set_admin_user_ban_secure',
            {
              p_user_id:
                userId,
              p_banned:
                shouldBan,
            },
          );


        if (error) {
          throw error;
        }


        await fetchDetails({
          silent: true,
        });


        setModal({
          visible: true,
          type: 'success',
          title:
            shouldBan
              ? 'User Banned'
              : 'User Unbanned',
          message:
            shouldBan
              ? 'This customer can no longer sign in until the ban is removed.'
              : 'This customer can sign in again.',
          confirmText: 'OK',
          cancelText: 'Cancel',
          showCancel: false,
          onConfirm: null,
        });

      } catch (error) {
        setModal({
          visible: true,
          type: 'error',
          title:
            'Action Failed',
          message:
            'Unable to update account status.',
          confirmText: 'OK',
          cancelText: 'Cancel',
          showCancel: false,
          onConfirm: null,
        });

      } finally {
        setActionLoading(
          false,
        );
      }
    };


  const confirmBanAction =
    () => {
      const nextBannedState =
        !isBanned;


      showModal({
        type: 'confirm',
        title:
          nextBannedState
            ? 'Ban User?'
            : 'Unban User?',
        message:
          nextBannedState
            ? 'This customer will be blocked from signing in until you remove the ban.'
            : 'This customer will be allowed to sign in again.',
        confirmText:
          nextBannedState
            ? 'Ban User'
            : 'Unban User',
        cancelText:
          'Cancel',
        showCancel:
          true,
        onConfirm:
          async () => {
            setModal(
              current => ({
                ...current,
                visible: false,
              }),
            );

            await updateBanStatus(
              nextBannedState,
            );
          },
      });
    };


  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">

        <ActivityIndicator
          size="large"
          color="black"
        />

        <Text className="mt-3 text-gray-500">
          Loading user details...
        </Text>

      </SafeAreaView>
    );
  }


  if (
    errorMessage ||
    !user
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
              User Details
            </Text>

          </View>


          <View className="mt-20 items-center">

            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#D1D5DB"
            />

            <Text className="mt-5 text-xl font-extrabold text-black">
              Unable to load user
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage ||
                'User data is unavailable.'}
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
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            Math.max(
              insets.bottom,
              24,
            ) + 50,
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
              User Details
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Account and order activity
            </Text>

          </View>

        </View>


        <View className="mt-6 items-center rounded-3xl bg-black p-6">

          <View className="h-24 w-24 overflow-hidden rounded-3xl bg-white">

            {user.avatar_url ? (
              <Image
                source={{
                  uri:
                    user.avatar_url,
                }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">

                <Ionicons
                  name="person-outline"
                  size={42}
                  color="#9CA3AF"
                />

              </View>
            )}

          </View>


          <View className="mt-4 flex-row flex-wrap items-center justify-center">

            <Text className="text-center text-2xl font-extrabold text-white">
              {
                getDisplayName()
              }
            </Text>

            {user.is_admin ? (
              <View className="ml-2 rounded-full bg-black px-3 py-1">
                <Text className="text-xs font-bold text-white">
                  ADMIN
                </Text>
              </View>
            ) : null}

          </View>


          <Text className="mt-2 text-center text-gray-400">
            {user.email ||
              'No email'}
          </Text>


          <View className="mt-4 rounded-full bg-white px-4 py-2">

            <Text className="text-sm font-bold text-black">
              {isBanned
                ? 'Banned Account'
                : 'Active Account'}
            </Text>

          </View>

        </View>


        <Text className="mb-3 mt-7 text-lg font-bold text-black">
          Customer Overview
        </Text>


        <View className="flex-row">

          <View className="mr-2 flex-1 rounded-2xl bg-gray-100 p-4">

            <Text className="text-sm font-semibold text-gray-500">
              Orders
            </Text>

            <Text className="mt-2 text-2xl font-extrabold text-black">
              {
                stats.order_count
              }
            </Text>

          </View>


          <View className="mx-1 flex-1 rounded-2xl bg-gray-100 p-4">

            <Text className="text-sm font-semibold text-gray-500">
              Delivered
            </Text>

            <Text className="mt-2 text-2xl font-extrabold text-black">
              {
                stats.delivered_order_count
              }
            </Text>

          </View>


          <View className="ml-2 flex-1 rounded-2xl bg-gray-100 p-4">

            <Text className="text-sm font-semibold text-gray-500">
              Total Spent
            </Text>

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="mt-2 text-xl font-extrabold text-black"
            >
              {
                formatMoney(
                  stats.total_spent,
                )
              }
            </Text>

          </View>

        </View>


        <Text className="mb-3 mt-7 text-lg font-bold text-black">
          Account Information
        </Text>


        <View className="rounded-3xl bg-gray-100 p-5">

          <View className="flex-row items-start">

            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">

              <Ionicons
                name="mail-outline"
                size={20}
                color="black"
              />

            </View>

            <View className="ml-3 flex-1">

              <Text className="text-xs font-semibold text-gray-500">
                Email
              </Text>

              <Text className="mt-1 font-bold text-black">
                {user.email ||
                  'Not available'}
              </Text>

              <Text className="mt-1 text-xs text-gray-500">
                {user.email_confirmed_at
                  ? 'Verified'
                  : 'Not verified'}
              </Text>

            </View>

          </View>


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row items-start">

            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">

              <Ionicons
                name="call-outline"
                size={20}
                color="black"
              />

            </View>

            <View className="ml-3 flex-1">

              <Text className="text-xs font-semibold text-gray-500">
                Phone
              </Text>

              <Text className="mt-1 font-bold text-black">
                {user.profile_phone ||
                  user.phone ||
                  'Not available'}
              </Text>

            </View>

          </View>


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row items-start">

            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">

              <Ionicons
                name="calendar-outline"
                size={20}
                color="black"
              />

            </View>

            <View className="ml-3 flex-1">

              <Text className="text-xs font-semibold text-gray-500">
                Joined
              </Text>

              <Text className="mt-1 font-bold text-black">
                {
                  formatDateTime(
                    user.created_at,
                  )
                }
              </Text>

            </View>

          </View>


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row items-start">

            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">

              <Ionicons
                name="log-in-outline"
                size={20}
                color="black"
              />

            </View>

            <View className="ml-3 flex-1">

              <Text className="text-xs font-semibold text-gray-500">
                Last Sign In
              </Text>

              <Text className="mt-1 font-bold text-black">
                {
                  formatDateTime(
                    user.last_sign_in_at,
                  )
                }
              </Text>

            </View>

          </View>


          {isBanned ? (
            <>
              <View className="my-4 h-px bg-gray-200" />

              <View className="flex-row items-start">

                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">

                  <Ionicons
                    name="ban-outline"
                    size={20}
                    color="black"
                  />

                </View>

                <View className="ml-3 flex-1">

                  <Text className="text-xs font-semibold text-gray-500">
                    Banned Until
                  </Text>

                  <Text className="mt-1 font-bold text-black">
                    {
                      formatDateTime(
                        user.banned_until,
                      )
                    }
                  </Text>

                </View>

              </View>
            </>
          ) : null}

        </View>


        <Text className="mb-3 mt-7 text-lg font-bold text-black">
          Recent Orders
        </Text>


        {orders.length ? (
          orders.map(
            order => (
              <TouchableOpacity
                key={
                  String(
                    order.id,
                  )
                }
                onPress={() =>
                  navigation.navigate(
                    'AdminOrderDetails',
                    {
                      orderId:
                        order.id,
                    },
                  )
                }
                activeOpacity={0.85}
                className="mb-3 rounded-2xl bg-gray-100 p-4"
              >

                <View className="flex-row items-start justify-between">

                  <View className="mr-3 flex-1">

                    <Text className="font-extrabold text-black">
                      {order.order_number ||
                        'Order'}
                    </Text>

                    <Text className="mt-1 text-sm text-gray-500">
                      {
                        formatDateTime(
                          order.created_at,
                        )
                      }
                    </Text>

                  </View>


                  <View className="rounded-full bg-white px-3 py-1.5">

                    <Text className="text-xs font-bold text-black">
                      {String(
                        order.status ||
                          'Pending',
                      )}
                    </Text>

                  </View>

                </View>


                <View className="mt-4 flex-row items-center justify-between">

                  <Text className="text-lg font-extrabold text-black">
                    {
                      formatMoney(
                        order.total_amount,
                      )
                    }
                  </Text>

                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color="#6B7280"
                  />

                </View>

              </TouchableOpacity>
            ),
          )
        ) : (
          <View className="rounded-3xl bg-gray-100 p-5">

            <Text className="text-center font-semibold text-gray-500">
              No orders found for this customer.
            </Text>

          </View>
        )}


        {!user.is_admin ? (
          <>
            <Text className="mb-3 mt-7 text-lg font-bold text-black">
              Account Control
            </Text>


            <TouchableOpacity
              onPress={
                confirmBanAction
              }
              disabled={
                actionLoading
              }
              activeOpacity={0.85}
              className="flex-row items-center rounded-2xl bg-gray-100 p-5"
            >

              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">

                <Ionicons
                  name={
                    isBanned
                      ? 'checkmark-circle-outline'
                      : 'ban-outline'
                  }
                  size={24}
                  color="black"
                />

              </View>


              <View className="ml-4 flex-1">

                <Text className="text-lg font-extrabold text-black">
                  {isBanned
                    ? 'Unban User'
                    : 'Ban User'}
                </Text>

                <Text className="mt-1 text-sm leading-5 text-gray-500">
                  {isBanned
                    ? 'Allow this customer to sign in again.'
                    : 'Block this customer from signing in.'}
                </Text>

              </View>


              {actionLoading ? (
                <ActivityIndicator
                  color="black"
                />
              ) : (
                <Ionicons
                  name="chevron-forward-outline"
                  size={22}
                  color="#6B7280"
                />
              )}

            </TouchableOpacity>
          </>
        ) : (
          <View className="mt-7 rounded-2xl bg-gray-100 p-5">

            <View className="flex-row items-center">

              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">

                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color="black"
                />

              </View>

              <View className="ml-3 flex-1">

                <Text className="font-extrabold text-black">
                  Protected Admin Account
                </Text>

                <Text className="mt-1 text-sm leading-5 text-gray-500">
                  Admin accounts cannot be banned from this screen.
                </Text>

              </View>

            </View>

          </View>
        )}

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
        cancelText={
          modal.cancelText
        }
        showCancel={
          modal.showCancel
        }
        dismissible={
          !actionLoading
        }
        loading={
          actionLoading
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




export default AdminUserDetails;
