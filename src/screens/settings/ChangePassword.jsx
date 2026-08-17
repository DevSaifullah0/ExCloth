import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

import { supabase } from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const ChangePassword = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('');

  const [
    newPassword,
    setNewPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    showCurrent,
    setShowCurrent,
  ] = useState(false);

  const [
    showNew,
    setShowNew,
  ] = useState(false);

  const [
    showConfirm,
    setShowConfirm,
  ] = useState(false);

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
    showCancel: false,
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
      confirmText: 'OK',
      showCancel: false,
    });
  };


  const closeModal = () => {
    setModal(current => ({
      ...current,
      visible: false,
    }));
  };


  const updatePassword =
    async () => {
    if (loading) {
      return;
    }

      if (
        !currentPassword
      ) {
        showModal(
          'warning',
          'Current Password Required',
          'Enter your current password.',
        );

        return;
      }


      if (!newPassword) {
        showModal(
          'warning',
          'New Password Required',
          'Enter your new password.',
        );

        return;
      }


      if (
        newPassword.length <
        6
      ) {
        showModal(
          'warning',
          'Weak Password',
          'New password must be at least 6 characters.',
        );

        return;
      }


      if (
        newPassword !==
        confirmPassword
      ) {
        showModal(
          'warning',
          'Password Mismatch',
          'New password and confirmation do not match.',
        );

        return;
      }


      if (
        currentPassword ===
        newPassword
      ) {
        showModal(
          'warning',
          'Choose a New Password',
          'Your new password must be different from the current password.',
        );

        return;
      }


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


        if (userError) {
          throw userError;
        }


        if (
          !user?.email
        ) {
          throw new Error(
            'Unable to verify the current account.',
          );
        }


        const {
          error:
            verifyError,
        } =
          await supabase.auth
            .signInWithPassword({
              email:
                user.email,
              password:
                currentPassword,
            });


        if (
          verifyError
        ) {
          showModal(
            'error',
            'Incorrect Password',
            'The current password you entered is incorrect.',
          );

          return;
        }


        const {
          error:
            updateError,
        } =
          await supabase.auth
            .updateUser({
              password:
                newPassword,
            });


        if (
          updateError
        ) {
          throw updateError;
        }


        setCurrentPassword(
          '',
        );

        setNewPassword('');
        setConfirmPassword(
          '',
        );


        showModal(
          'success',
          'Password Updated',
          'Your password has been changed successfully.',
        );

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Change Password Error:',
            error?.message ||
              error,
          );
        }

        showModal(
          'error',
          'Update Failed',
          error?.message ||
            'Unable to change your password.',
        );

      } finally {
        setLoading(false);
      }
    };


  const PasswordField = ({
    label,
    value,
    onChangeText,
    visible,
    onToggle,
    placeholder,
  }) => (
    <View className="mt-4">
      <Text className="mb-1.5 font-semibold text-black">
        {label}
      </Text>

      <View className="relative">
        <TextInput
          placeholder={
            placeholder
          }
          placeholderTextColor="#9CA3AF"
          secureTextEntry={
            !visible
          }
          value={value}
          onChangeText={
            onChangeText
          }
          autoCapitalize="none"
          autoCorrect={false}
          className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 pr-12 text-black"
        />

        <TouchableOpacity
          onPress={
            onToggle
          }
          activeOpacity={0.7}
          className="absolute right-4 top-0 h-12 items-center justify-center"
        >
          <Ionicons
            name={
              visible
                ? 'eye-off-outline'
                : 'eye-outline'
            }
            size={21}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
    </View>
  );


  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
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
                Change Password
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Keep your account secure
              </Text>
            </View>
          </View>


          <View className="mt-7 rounded-3xl bg-black p-6">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
              <Ionicons
                name="lock-closed-outline"
                size={27}
                color="black"
              />
            </View>

            <Text className="mt-5 text-2xl font-extrabold text-white">
              Secure your account
            </Text>

            <Text className="mt-2 leading-6 text-gray-300">
              Verify your current password before creating a new one.
            </Text>
          </View>


          <View className="mt-7 rounded-3xl bg-gray-100 p-5">
            <PasswordField
              label="Current Password"
              value={
                currentPassword
              }
              onChangeText={
                setCurrentPassword
              }
              visible={
                showCurrent
              }
              onToggle={() =>
                setShowCurrent(
                  current =>
                    !current,
                )
              }
              placeholder="Enter current password"
            />

            <PasswordField
              label="New Password"
              value={
                newPassword
              }
              onChangeText={
                setNewPassword
              }
              visible={
                showNew
              }
              onToggle={() =>
                setShowNew(
                  current =>
                    !current,
                )
              }
              placeholder="Enter new password"
            />

            <PasswordField
              label="Confirm New Password"
              value={
                confirmPassword
              }
              onChangeText={
                setConfirmPassword
              }
              visible={
                showConfirm
              }
              onToggle={() =>
                setShowConfirm(
                  current =>
                    !current,
                )
              }
              placeholder="Confirm new password"
            />

            <View className="mt-5 rounded-2xl bg-white p-4">
              <Text className="text-sm font-bold text-black">
                Password requirements
              </Text>

              <Text className="mt-2 text-sm leading-6 text-gray-500">
                Use at least 6 characters. A longer password with letters, numbers and symbols is recommended.
              </Text>
            </View>
          </View>


          <TouchableOpacity
            onPress={
              updatePassword
            }
            disabled={
              loading
            }
            activeOpacity={0.85}
            className="mt-6 h-14 flex-row items-center justify-center rounded-2xl bg-black"
          >
            {
              loading ? (
                <ActivityIndicator
                  color="white"
                />
              ) : (
                <>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={21}
                    color="white"
                  />

                  <Text className="ml-2 text-base font-extrabold text-white">
                    Update Password
                  </Text>
                </>
              )
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>


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
        showCancel={
          modal.showCancel
        }
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


export default ChangePassword;
