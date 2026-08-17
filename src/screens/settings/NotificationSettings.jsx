import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { supabase } from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const DEFAULT_PREFERENCES = {
  order_updates: true,
  return_updates: true,
  promotions: true,
  coupons: true,
  account_updates: true,
};


const NotificationSettings = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    preferences,
    setPreferences,
  ] =
    useState(
      DEFAULT_PREFERENCES,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    savingKey,
    setSavingKey,
  ] = useState(null);

  const [
    permissionStatus,
    setPermissionStatus,
  ] = useState(
    'unknown',
  );

  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });


  const showModal = (
    type,
    title,
    message,
  ) => {
    setModal({
      visible: true,
      type,
      title,
      message,
    });
  };


  const closeModal = () => {
    setModal(current => ({
      ...current,
      visible: false,
    }));
  };


  const checkPermission =
    useCallback(
      async () => {
        try {
          if (
            Platform.OS !==
            'android'
          ) {
            setPermissionStatus(
              'managed',
            );

            return;
          }


          if (
            Platform.Version <
            33
          ) {
            setPermissionStatus(
              'granted',
            );

            return;
          }


          const granted =
            await PermissionsAndroid
              .check(
                PermissionsAndroid
                  .PERMISSIONS
                  .POST_NOTIFICATIONS,
              );


          setPermissionStatus(
            granted
              ? 'granted'
              : 'denied',
          );

        } catch (error) {
          console.log(
            'Notification permission check error:',
            error?.message ||
              error,
          );

          setPermissionStatus(
            'unknown',
          );
        }
      },
      [],
    );


  const loadPreferences =
    useCallback(
      async () => {
        try {
          setLoading(true);


          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth
              .getUser();


          if (
            userError
          ) {
            throw userError;
          }


          if (!user) {
            throw new Error(
              'User session not found.',
            );
          }


          const {
            data,
            error,
          } =
            await supabase
              .from(
                'user_notification_preferences',
              )
              .select(`
                order_updates,
                return_updates,
                promotions,
                coupons,
                account_updates
              `)
              .eq(
                'user_id',
                user.id,
              )
              .maybeSingle();


          if (error) {
            throw error;
          }


          if (data) {
            setPreferences({
              order_updates:
                data.order_updates !==
                false,

              return_updates:
                data.return_updates !==
                false,

              promotions:
                data.promotions !==
                false,

              coupons:
                data.coupons !==
                false,

              account_updates:
                data.account_updates !==
                false,
            });

          } else {
            const {
              error:
                insertError,
            } =
              await supabase
                .from(
                  'user_notification_preferences',
                )
                .insert({
                  user_id:
                    user.id,

                  ...DEFAULT_PREFERENCES,
                });


            if (
              insertError
            ) {
              throw insertError;
            }
          }

        } catch (error) {
          console.log(
            'Notification Preferences Error:',
            error?.message ||
              error,
          );

          showModal(
            'error',
            'Unable to Load',
            error?.message ||
              'Unable to load notification preferences.',
          );

        } finally {
          setLoading(false);
        }
      },
      [],
    );


  useEffect(() => {
    checkPermission();
    loadPreferences();
  }, [
    checkPermission,
    loadPreferences,
  ]);


  const updatePreference =
    async (
      key,
      value,
    ) => {
      if (savingKey) {
        return;
      }


      const previousValue =
        preferences[key];


      setPreferences(
        current => ({
          ...current,
          [key]: value,
        }),
      );


      try {
        setSavingKey(key);


        const {
          data: {
            user,
          },
          error:
            userError,
        } =
          await supabase.auth
            .getUser();


        if (
          userError
        ) {
          throw userError;
        }


        if (!user) {
          throw new Error(
            'User session not found.',
          );
        }


        const {
          error,
        } =
          await supabase
            .from(
              'user_notification_preferences',
            )
            .upsert(
              {
                user_id:
                  user.id,

                [key]:
                  value,
              },
              {
                onConflict:
                  'user_id',
              },
            );


        if (error) {
          throw error;
        }

      } catch (error) {
        setPreferences(
          current => ({
            ...current,
            [key]:
              previousValue,
          }),
        );


        showModal(
          'error',
          'Update Failed',
          error?.message ||
            'Unable to update notification preference.',
        );

      } finally {
        setSavingKey(null);
      }
    };


  const openDeviceSettings =
    async () => {
      try {
        await Linking.openSettings();

      } catch (error) {
        showModal(
          'error',
          'Unable to Open Settings',
          'Open your device Settings and manage ExCloth notifications manually.',
        );
      }
    };


  const rows = [
    {
      key:
        'order_updates',
      title:
        'Order Updates',
      subtitle:
        'Confirmation, processing, shipping and delivery',
      icon:
        'bag-handle-outline',
    },
    {
      key:
        'return_updates',
      title:
        'Return Updates',
      subtitle:
        'Return, pickup and refund status',
      icon:
        'return-down-back-outline',
    },
    {
      key:
        'account_updates',
      title:
        'Account Updates',
      subtitle:
        'Important account and security information',
      icon:
        'shield-checkmark-outline',
    },
    {
      key:
        'promotions',
      title:
        'Promotions & Offers',
      subtitle:
        'Sales, campaigns and promotional announcements',
      icon:
        'megaphone-outline',
    },
    {
      key:
        'coupons',
      title:
        'Coupons',
      subtitle:
        'Coupon and discount notifications',
      icon:
        'pricetags-outline',
    },
  ];


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
            ) + 40,
        }}
      >
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
            <Text className="text-2xl font-extrabold text-black">
              Notifications
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Choose what you want to receive
            </Text>
          </View>
        </View>


        <View className="mt-7 rounded-3xl bg-black p-6">
          <View className="flex-row items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
              <Ionicons
                name="notifications-outline"
                size={27}
                color="black"
              />
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-xl font-extrabold text-white">
                Device Notifications
              </Text>

              <Text className="mt-1 text-sm text-gray-300">
                {
                  permissionStatus ===
                  'granted'
                    ? 'Permission is enabled'
                    : permissionStatus ===
                      'denied'
                    ? 'Permission is disabled'
                    : Platform.OS ===
                      'ios'
                    ? 'Managed by iOS Settings'
                    : 'Check device settings'
                }
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={
              openDeviceSettings
            }
            activeOpacity={0.85}
            className="mt-5 h-12 items-center justify-center rounded-2xl bg-white"
          >
            <Text className="font-extrabold text-black">
              Open Device Settings
            </Text>
          </TouchableOpacity>
        </View>


        <View className="mb-3 mt-8 flex-row items-center justify-between">
          <Text className="text-lg font-extrabold text-black">
            Notification Types
          </Text>

          {
            savingKey ? (
              <ActivityIndicator
                size="small"
                color="black"
              />
            ) : null
          }
        </View>


        {
          loading ? (
            <View className="items-center rounded-3xl bg-gray-100 p-8">
              <ActivityIndicator
                size="large"
                color="black"
              />

              <Text className="mt-3 text-sm font-semibold text-gray-500">
                Loading preferences...
              </Text>
            </View>
          ) : (
            <View className="overflow-hidden rounded-3xl bg-gray-100 px-4">
              {
                rows.map(
                  (
                    row,
                    index,
                  ) => (
                    <React.Fragment
                      key={
                        row.key
                      }
                    >
                      <View className="flex-row items-center py-4">
                        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                          <Ionicons
                            name={
                              row.icon
                            }
                            size={22}
                            color="black"
                          />
                        </View>

                        <View className="ml-4 flex-1">
                          <Text className="font-extrabold text-black">
                            {
                              row.title
                            }
                          </Text>

                          <Text className="mt-1 pr-2 text-xs leading-5 text-gray-500">
                            {
                              row.subtitle
                            }
                          </Text>
                        </View>

                        <Switch
                          value={
                            Boolean(
                              preferences[
                                row.key
                              ],
                            )
                          }
                          disabled={
                            Boolean(
                              savingKey,
                            )
                          }
                          onValueChange={
                            value =>
                              updatePreference(
                                row.key,
                                value,
                              )
                          }
                          trackColor={{
                            false:
                              '#D1D5DB',
                            true:
                              '#111827',
                          }}
                          thumbColor="#FFFFFF"
                        />
                      </View>

                      {
                        index <
                        rows.length -
                          1 ? (
                          <View className="ml-16 h-px bg-gray-200" />
                        ) : null
                      }
                    </React.Fragment>
                  ),
                )
              }
            </View>
          )
        }


        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#6B7280"
            />

            <Text className="ml-3 flex-1 text-sm leading-6 text-gray-500">
              Device permission controls whether Android or iOS can show push notifications. The switches above store your ExCloth category preferences.
            </Text>
          </View>
        </View>
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
        confirmText="OK"
        showCancel={false}
        onConfirm={
          closeModal
        }
        onCancel={
          closeModal
        }
      />
    </SafeAreaView>
  );
};


export default NotificationSettings;
