import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';

import React, {
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

import { useAuth } from '../../context/AuthContext';

const ResetPassword = ({
  navigation,
}) => {
  const {
    finishRecovery,
  } = useAuth();

  const [password, setPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleResetPassword =
    async () => {
      if (!password) {
        Alert.alert(
          'Password Required',
          'Please enter your new password.',
        );

        return;
      }

      if (password.length < 8) {
        Alert.alert(
          'Weak Password',
          'Password must contain at least 8 characters.',
        );

        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        Alert.alert(
          'Passwords Do Not Match',
          'New password and confirm password must match.',
        );

        return;
      }

      try {
        setLoading(true);

        // =====================================
        // CHECK RECOVERY SESSION
        // =====================================

        const {
          data: { session },
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error(
            'Your password recovery session has expired. Please request a new verification code.',
          );
        }


        // =====================================
        // UPDATE PASSWORD
        // =====================================

        const {
          error: updateError,
        } =
          await supabase.auth.updateUser({
            password,
          });

        if (updateError) {
          throw updateError;
        }


        // =====================================
        // REMOVE RECOVERY SESSION
        // =====================================

        const {
          error: logoutError,
        } =
          await supabase.auth.signOut({
            scope: 'local',
          });

        if (logoutError) {
          throw logoutError;
        }


        // =====================================
        // END RECOVERY MODE
        // =====================================

        finishRecovery();


        // =====================================
        // SUCCESS
        // =====================================

        Alert.alert(
          'Password Updated',
          'Your password has been changed successfully. You can now login with your new password.',
          [
            {
              text: 'Login',

              onPress: () => {
                navigation.reset({
                  index: 0,

                  routes: [
                    {
                      name: 'Login',
                    },
                  ],
                });
              },
            },
          ],
        );

      } catch (error) {
        console.log(
          'Reset Password Error:',
          error.message,
        );

        Alert.alert(
          'Password Reset Failed',
          error.message ||
            'Unable to update your password.',
        );

      } finally {
        setLoading(false);
      }
    };

  return (
    <SafeAreaView className="flex-1 bg-white">

      <KeyboardAvoidingView
        className="flex-1"
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <View className="flex-1 px-5">

          {/* Header */}

          <View className="mt-12 items-center">

            <View className="h-20 w-20 items-center justify-center rounded-full bg-black">

              <Ionicons
                name="lock-closed-outline"
                size={36}
                color="white"
              />

            </View>

            <Text className="mt-6 text-3xl font-extrabold text-black">
              New Password
            </Text>

            <Text className="mt-3 text-center leading-6 text-gray-500">
              Create a new password for your ExCloth account.
            </Text>

          </View>


          {/* New Password */}

          <Text className="mb-2 mt-9 font-semibold text-black">
            New Password
          </Text>

          <View className="h-12 flex-row items-center rounded-xl border border-gray-300 bg-gray-50 px-4">

            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#6B7280"
            />

            <TextInput
              value={password}
              onChangeText={
                setPassword
              }
              placeholder="Enter new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={
                !showPassword
              }
              autoCapitalize="none"
              autoCorrect={false}
              className="ml-3 flex-1 text-black"
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword(
                  current =>
                    !current,
                )
              }
            >

              <Ionicons
                name={
                  showPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={21}
                color="#6B7280"
              />

            </TouchableOpacity>

          </View>


          {/* Confirm Password */}

          <Text className="mb-2 mt-5 font-semibold text-black">
            Confirm Password
          </Text>

          <View className="h-12 flex-row items-center rounded-xl border border-gray-300 bg-gray-50 px-4">

            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#6B7280"
            />

            <TextInput
              value={
                confirmPassword
              }
              onChangeText={
                setConfirmPassword
              }
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={
                !showConfirmPassword
              }
              autoCapitalize="none"
              autoCorrect={false}
              className="ml-3 flex-1 text-black"
            />

            <TouchableOpacity
              onPress={() =>
                setShowConfirmPassword(
                  current =>
                    !current,
                )
              }
            >

              <Ionicons
                name={
                  showConfirmPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={21}
                color="#6B7280"
              />

            </TouchableOpacity>

          </View>


          {/* Reset */}

          <TouchableOpacity
            onPress={
              handleResetPassword
            }
            disabled={loading}
            activeOpacity={0.8}
            className="mt-8 h-14 flex-row items-center justify-center rounded-xl bg-black"
          >

            {loading ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color="white"
                />

                <Text className="ml-2 text-base font-bold text-white">
                  Update Password
                </Text>
              </>
            )}

          </TouchableOpacity>

        </View>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
};

export default ResetPassword;