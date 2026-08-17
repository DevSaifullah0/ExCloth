import { getUserFriendlyError } from '../../utils/getUserFriendlyError';
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

const ForgotPassword = ({
  navigation,
}) => {
  const [email, setEmail] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const handleResetPassword =
    async () => {
    if (loading) {
      return;
    }

      const cleanEmail = email
        .trim()
        .toLowerCase();

      if (!cleanEmail) {
        Alert.alert(
          'Email Required',
          'Please enter your email address.',
        );

        return;
      }

      if (
        !cleanEmail.includes('@') ||
        !cleanEmail.includes('.')
      ) {
        Alert.alert(
          'Invalid Email',
          'Please enter a valid email address.',
        );

        return;
      }

      try {
        setLoading(true);

        const { error } =
          await supabase.auth
            .resetPasswordForEmail(
              cleanEmail,
            );

        if (error) {
          throw error;
        }

        Alert.alert(
          'Code Sent',
          'Check your email for the password reset verification code.',
          [
            {
              text: 'Continue',

              onPress: () =>
                navigation.navigate(
                  'OTP',
                  {
                    email:
                      cleanEmail,
                  },
                ),
            },
          ],
        );

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Forgot Password Error:',
            error.message,
          );
        }

        Alert.alert(
          'Reset Failed',
          getUserFriendlyError(error, 'Unable to send verification code.'),
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

          {/* Back */}

          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            className="mt-4 h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <Ionicons
              name="arrow-back-outline"
              size={22}
              color="black"
            />
          </TouchableOpacity>


          {/* Header */}

          <Text className="mt-10 text-3xl font-extrabold text-black">
            Forgot Password?
          </Text>

          <Text className="mt-3 leading-6 text-gray-500">
            Enter your registered email address and we will send you a verification code.
          </Text>


          {/* Email */}

          <Text className="mb-2 mt-8 font-semibold text-black">
            Email Address
          </Text>

          <View className="h-12 flex-row items-center rounded-xl border border-gray-300 bg-gray-50 px-4">

            <Ionicons
              name="mail-outline"
              size={20}
              color="#6B7280"
            />

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="ml-3 flex-1 text-black"
            />

          </View>


          {/* Send */}

          <TouchableOpacity
            onPress={
              handleResetPassword
            }
            disabled={loading}
            activeOpacity={0.8}
            className="mt-7 h-14 flex-row items-center justify-center rounded-xl bg-black"
          >

            {loading ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Text className="text-base font-bold text-white">
                  Send Verification Code
                </Text>

                <Ionicons
                  name="arrow-forward-outline"
                  size={20}
                  color="white"
                  style={{
                    marginLeft: 8,
                  }}
                />
              </>
            )}

          </TouchableOpacity>

        </View>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
};

export default ForgotPassword;