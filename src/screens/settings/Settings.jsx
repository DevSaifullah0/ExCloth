import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  deleteToken,
  getMessaging,
  getToken,
} from '@react-native-firebase/messaging';

import { supabase } from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const Settings = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    loggingOut,
    setLoggingOut,
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
    cancelText: 'Cancel',
    showCancel: false,
    onConfirm: null,
  });


  const closeModal = () => {
    if (loggingOut) {
      return;
    }

    setModal(current => ({
      ...current,
      visible: false,
    }));
  };


  const performLogout = async () => {
    try {
      setLoggingOut(true);

      setModal(current => ({
        ...current,
        visible: false,
      }));


      if (
        Platform.OS === 'android'
      ) {
        try {
          const messaging =
            getMessaging();

          const token =
            await getToken(
              messaging,
            );

          if (token) {
            const {
              error:
                unregisterError,
            } =
              await supabase.rpc(
                'unregister_push_token_secure',
                {
                  p_token: token,
                },
              );

            if (
              unregisterError
            ) {
              console.log(
                'Push token unregister error:',
                unregisterError.message,
              );
            }

            try {
              await deleteToken(
                messaging,
              );
            } catch (
              tokenDeleteError
            ) {
              console.log(
                'FCM token delete error:',
                tokenDeleteError?.message ||
                  tokenDeleteError,
              );
            }
          }
        } catch (
          pushError
        ) {
          console.log(
            'Logout push cleanup error:',
            pushError?.message ||
              pushError,
          );
        }
      }


      const {
        error,
      } =
        await supabase.auth.signOut({
          scope: 'local',
        });


      if (error) {
        throw error;
      }

    } catch (error) {
      console.log(
        'Settings Logout Error:',
        error?.message ||
          error,
      );

      setModal({
        visible: true,
        type: 'error',
        title: 'Logout Failed',
        message:
          error?.message ||
          'Unable to logout.',
        confirmText: 'OK',
        cancelText: 'Cancel',
        showCancel: false,
        onConfirm: null,
      });

    } finally {
      setLoggingOut(false);
    }
  };


  const handleLogout = () => {
    setModal({
      visible: true,
      type: 'confirm',
      title: 'Logout',
      message:
        'Are you sure you want to logout from ExCloth?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm:
        performLogout,
    });
  };


  const sections = [
    {
      title: 'Account',
      items: [
        {
          title:
            'Edit Profile',
          subtitle:
            'Name, phone and profile photo',
          icon:
            'person-outline',
          route:
            'EditProfile',
        },
        {
          title:
            'Change Password',
          subtitle:
            'Update your account password',
          icon:
            'lock-closed-outline',
          route:
            'ChangePassword',
        },
        {
          title:
            'Shipping Addresses',
          subtitle:
            'Manage saved delivery addresses',
          icon:
            'location-outline',
          route:
            'ShippingAddresses',
        },
      ],
    },
    {
      title:
        'Notifications',
      items: [
        {
          title:
            'Notification Settings',
          subtitle:
            'Push permission and notification preferences',
          icon:
            'notifications-outline',
          route:
            'NotificationSettings',
        },
      ],
    },
    {
      title:
        'Preferences',
      items: [
        {
          title:
            'Appearance & Language',
          subtitle:
            'Theme and language preferences',
          icon:
            'options-outline',
          route:
            'Preferences',
        },
      ],
    },
    {
      title:
        'Support',
      items: [
        {
          title:
            'Help & Support',
          subtitle:
            'FAQs and contact support',
          icon:
            'help-circle-outline',
          route:
            'HelpSupport',
        },
      ],
    },
    {
      title:
        'Legal',
      items: [
        {
          title:
            'Policies & Terms',
          subtitle:
            'Privacy, terms, shipping and returns',
          icon:
            'document-text-outline',
          route:
            'Legal',
        },
      ],
    },
    {
      title:
        'About',
      items: [
        {
          title:
            'About ExCloth',
          subtitle:
            'App information and version',
          icon:
            'information-circle-outline',
          route:
            'About',
        },
      ],
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
            <Text className="text-3xl font-extrabold text-black">
              Settings
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Manage your ExCloth experience
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="settings-outline"
              size={22}
              color="white"
            />
          </View>
        </View>


        <View className="mt-7 rounded-3xl bg-black p-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <Ionicons
              name="shield-checkmark-outline"
              size={27}
              color="black"
            />
          </View>

          <Text className="mt-5 text-2xl font-extrabold text-white">
            Your account, your control
          </Text>

          <Text className="mt-2 leading-6 text-gray-300">
            Update account security, notifications, preferences and policies from one place.
          </Text>
        </View>


        {sections.map(
          section => (
            <View
              key={
                section.title
              }
              className="mt-8"
            >
              <Text className="mb-3 text-lg font-extrabold text-black">
                {
                  section.title
                }
              </Text>

              <View className="overflow-hidden rounded-3xl bg-gray-100 px-4">
                {
                  section.items.map(
                    (
                      item,
                      index,
                    ) => (
                      <React.Fragment
                        key={
                          item.title
                        }
                      >
                        <TouchableOpacity
                          onPress={() =>
                            navigation.navigate(
                              item.route,
                            )
                          }
                          activeOpacity={0.8}
                          className="flex-row items-center py-4"
                        >
                          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                            <Ionicons
                              name={
                                item.icon
                              }
                              size={22}
                              color="black"
                            />
                          </View>

                          <View className="ml-4 flex-1">
                            <Text className="font-extrabold text-black">
                              {
                                item.title
                              }
                            </Text>

                            <Text className="mt-1 text-xs leading-5 text-gray-500">
                              {
                                item.subtitle
                              }
                            </Text>
                          </View>

                          <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                            <Ionicons
                              name="chevron-forward-outline"
                              size={18}
                              color="black"
                            />
                          </View>
                        </TouchableOpacity>

                        {
                          index <
                          section.items
                            .length -
                            1 ? (
                            <View className="ml-16 h-px bg-gray-200" />
                          ) : null
                        }
                      </React.Fragment>
                    ),
                  )
                }
              </View>
            </View>
          ),
        )}


        <Text className="mb-3 mt-8 text-lg font-extrabold text-black">
          Account Actions
        </Text>

        <View className="overflow-hidden rounded-3xl border border-gray-200 bg-white px-4">
          <TouchableOpacity
            onPress={
              handleLogout
            }
            disabled={
              loggingOut
            }
            activeOpacity={0.8}
            className="flex-row items-center py-4"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              {
                loggingOut ? (
                  <ActivityIndicator
                    size="small"
                    color="black"
                  />
                ) : (
                  <Ionicons
                    name="log-out-outline"
                    size={22}
                    color="black"
                  />
                )
              }
            </View>

            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-black">
                Logout
              </Text>

              <Text className="mt-1 text-xs text-gray-500">
                Sign out from this device
              </Text>
            </View>
          </TouchableOpacity>

          <View className="ml-16 h-px bg-gray-200" />

          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                'DeleteAccount',
              )
            }
            activeOpacity={0.8}
            className="flex-row items-center py-4"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <Ionicons
                name="trash-outline"
                size={22}
                color="#DC2626"
              />
            </View>

            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-red-600">
                Delete Account
              </Text>

              <Text className="mt-1 text-xs text-gray-500">
                Permanently disable your ExCloth account
              </Text>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={19}
              color="#DC2626"
            />
          </TouchableOpacity>
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
        confirmText={
          modal.confirmText
        }
        cancelText={
          modal.cancelText
        }
        showCancel={
          modal.showCancel
        }
        loading={
          loggingOut
        }
        dismissible={
          !loggingOut
        }
        onCancel={
          closeModal
        }
        onConfirm={() => {
          if (
            modal.onConfirm
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


export default Settings;
