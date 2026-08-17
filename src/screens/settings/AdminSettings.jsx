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


const AdminSettings = ({
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


  const performLogout =
    async () => {
      try {
        setLoggingOut(true);

        setModal(current => ({
          ...current,
          visible: false,
        }));


        if (
          Platform.OS ===
          'android'
        ) {
          try {
            const messaging =
              getMessaging();

            const token =
              await getToken(
                messaging,
              );

            if (token) {
              await supabase.rpc(
                'unregister_push_token_secure',
                {
                  p_token:
                    token,
                },
              );

              try {
                await deleteToken(
                  messaging,
                );
              } catch (
                tokenError
              ) {
                if (__DEV__) {
                  console.error(
                    'Admin settings token delete error:',
                    tokenError?.message ||
                      tokenError,
                  );
                }
              }
            }
          } catch (
            pushError
          ) {
            if (__DEV__) {
              console.error(
                'Admin settings push cleanup error:',
                pushError?.message ||
                  pushError,
              );
            }
          }
        }


        const {
          error,
        } =
          await supabase.auth
            .signOut({
              scope: 'local',
            });


        if (error) {
          throw error;
        }

      } catch (error) {
        setModal({
          visible: true,
          type: 'error',
          title:
            'Logout Failed',
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


  const rows = [
    {
      title:
        'Change Password',
      subtitle:
        'Update administrator password',
      icon:
        'lock-closed-outline',
      route:
        'ChangePassword',
    },
    {
      title:
        'Policies & Terms',
      subtitle:
        'Review ExCloth policies',
      icon:
        'document-text-outline',
      route:
        'Legal',
    },
    {
      title:
        'About ExCloth',
      subtitle:
        'Application information and version',
      icon:
        'information-circle-outline',
      route:
        'About',
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
              Admin Settings
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Administrator account options
            </Text>
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
            Administrator
          </Text>

          <Text className="mt-2 leading-6 text-gray-300">
            Security and application information for the ExCloth management account.
          </Text>
        </View>


        <View className="mt-7 overflow-hidden rounded-3xl bg-gray-100 px-4">
          {
            rows.map(
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

                      <Text className="mt-1 text-xs text-gray-500">
                        {
                          item.subtitle
                        }
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward-outline"
                      size={19}
                      color="#6B7280"
                    />
                  </TouchableOpacity>

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


        <TouchableOpacity
          onPress={() =>
            setModal({
              visible: true,
              type: 'confirm',
              title:
                'Logout Admin',
              message:
                'Are you sure you want to logout from the administrator account?',
              confirmText:
                'Logout',
              cancelText:
                'Cancel',
              showCancel: true,
              onConfirm:
                performLogout,
            })
          }
          disabled={
            loggingOut
          }
          activeOpacity={0.85}
          className="mt-6 h-14 flex-row items-center justify-center rounded-2xl bg-black"
        >
          {
            loggingOut ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Ionicons
                  name="log-out-outline"
                  size={21}
                  color="white"
                />

                <Text className="ml-2 text-base font-extrabold text-white">
                  Logout Admin
                </Text>
              </>
            )
          }
        </TouchableOpacity>
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


export default AdminSettings;
