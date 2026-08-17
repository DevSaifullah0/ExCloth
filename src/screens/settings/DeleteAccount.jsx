import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
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


const DeleteAccount = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    confirmation,
    setConfirmation,
  ] = useState('');

  const [
    loading,
    setLoading,
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
    if (loading) {
      return;
    }

    setModal(current => ({
      ...current,
      visible: false,
    }));
  };


  const removeLocalPushToken =
    async () => {
      if (
        Platform.OS !==
        'android'
      ) {
        return;
      }

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
        }

        try {
          await deleteToken(
            messaging,
          );
        } catch (
          tokenError
        ) {
          if (__DEV__) {
            console.error(
              'Delete account FCM token error:',
              tokenError?.message ||
                tokenError,
            );
          }
        }

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Delete account push cleanup error:',
            error?.message ||
              error,
          );
        }
      }
    };


  const performDelete =
    async () => {
    if (loading) {
      return;
    }

      try {
        setLoading(true);

        setModal(current => ({
          ...current,
          visible: false,
        }));


        await removeLocalPushToken();


        const {
          data,
          error,
        } =
          await supabase.functions
            .invoke(
              'delete-account',
              {
                body: {
                  confirmation:
                    'DELETE',
                },
              },
            );


        if (error) {
          throw error;
        }


        if (
          data?.error
        ) {
          throw new Error(
            data.error,
          );
        }


        await supabase.auth.signOut({
          scope: 'local',
        });

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Delete Account Error:',
            error?.message ||
              error,
          );
        }

        setModal({
          visible: true,
          type: 'error',
          title:
            'Account Deletion Failed',
          message:
            error?.message ||
            'Unable to delete your account.',
          confirmText: 'OK',
          cancelText: 'Cancel',
          showCancel: false,
          onConfirm: null,
        });

      } finally {
        setLoading(false);
      }
    };


  const handleDelete =
    () => {
      if (
        confirmation.trim() !==
        'DELETE'
      ) {
        setModal({
          visible: true,
          type: 'warning',
          title:
            'Confirmation Required',
          message:
            'Type DELETE exactly before continuing.',
          confirmText: 'OK',
          cancelText: 'Cancel',
          showCancel: false,
          onConfirm: null,
        });

        return;
      }


      setModal({
        visible: true,
        type: 'confirm',
        title:
          'Delete Account?',
        message:
          'This action disables your ExCloth authentication account and signs you out. You will not be able to use this account again.',
        confirmText:
          'Delete Account',
        cancelText:
          'Keep Account',
        showCancel: true,
        onConfirm:
          performDelete,
      });
    };


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
        keyboardShouldPersistTaps="handled"
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
            disabled={
              loading
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
              Delete Account
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Permanent account action
            </Text>
          </View>
        </View>


        <View className="mt-7 rounded-3xl bg-red-50 p-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <Ionicons
              name="warning-outline"
              size={28}
              color="#DC2626"
            />
          </View>

          <Text className="mt-5 text-2xl font-extrabold text-red-600">
            This cannot be undone
          </Text>

          <Text className="mt-2 leading-6 text-gray-600">
            Your authentication account will be disabled and you will be signed out. Administrative accounts are protected from this customer deletion flow.
          </Text>
        </View>


        <View className="mt-6 rounded-3xl bg-gray-100 p-5">
          <Text className="text-lg font-extrabold text-black">
            Before you continue
          </Text>

          {
            [
              'You will lose access to this account.',
              'Your saved push token and notification preferences will be removed.',
              'Order records may remain where they are required for store records and transaction history.',
            ].map(
              item => (
                <View
                  key={item}
                  className="mt-4 flex-row items-start"
                >
                  <View className="mt-1 h-5 w-5 items-center justify-center rounded-full bg-white">
                    <Ionicons
                      name="checkmark-outline"
                      size={14}
                      color="black"
                    />
                  </View>

                  <Text className="ml-3 flex-1 leading-6 text-gray-600">
                    {item}
                  </Text>
                </View>
              ),
            )
          }
        </View>


        <Text className="mb-2 mt-7 font-extrabold text-black">
          Type DELETE to confirm
        </Text>

        <TextInput
          placeholder="DELETE"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
          autoCorrect={false}
          value={
            confirmation
          }
          onChangeText={
            setConfirmation
          }
          editable={
            !loading
          }
          className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 font-bold text-black"
        />


        <TouchableOpacity
          onPress={
            handleDelete
          }
          disabled={
            loading
          }
          activeOpacity={0.85}
          className="mt-6 h-14 flex-row items-center justify-center rounded-2xl bg-red-600"
        >
          {
            loading ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Ionicons
                  name="trash-outline"
                  size={21}
                  color="white"
                />

                <Text className="ml-2 text-base font-extrabold text-white">
                  Delete My Account
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
          loading
        }
        dismissible={
          !loading
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


export default DeleteAccount;
