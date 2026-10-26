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
  StyleSheet,
  ScrollView,
} from 'react-native';

import React, {
  useState,
  useRef,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

import { useAuth } from '../../context/AuthContext';

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  form: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

const OTP = ({
  navigation,
  route,
}) => {
  const email =
    route.params?.email || '';

  const {
    startRecovery,
    finishRecovery,
  } = useAuth();

  const [otp, setOtp] =
    useState('');

  const otpInputRef = useRef(null);

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const handleVerify = async () => {
    const cleanOtp =
      otp.trim();

    if (!email) {
      Alert.alert(
        'Email Missing',
        'Please request another verification code.',
      );

      return;
    }

    if (!cleanOtp) {
      Alert.alert(
        'Code Required',
        'Please enter the verification code.',
      );

      return;
    }

    if (cleanOtp.length < 6) {
      Alert.alert(
        'Invalid Code',
        'Please enter the complete verification code.',
      );

      return;
    }

    try {
      setLoading(true);

      // Prevent RootNavigator from
      // treating recovery session
      // as a normal login.
      startRecovery();

      const {
        data,
        error,
      } = await supabase.auth.verifyOtp({
        email,
        token: cleanOtp,
        type: 'recovery',
      });

      if (error) {
        throw error;
      }

      if (!data?.session) {
        throw new Error(
          'Recovery session could not be created.',
        );
      }

      navigation.replace(
        'ResetPassword',
        {
          email,
        },
      );

    } catch (error) {
      finishRecovery();

      if (__DEV__) {
        console.error(
          'OTP Verification Error:',
          error.message,
        );
      }

      Alert.alert(
        'Invalid Code',
        getUserFriendlyError(error, 'The verification code is invalid or expired.'),
      );

    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) {
      return;
    }

    try {
      if (!email) {
        Alert.alert(
          'Email Missing',
          'Please go back and enter your email again.',
        );

        return;
      }

      setResending(true);

      const { error } =
        await supabase.auth
          .resetPasswordForEmail(
            email,
          );

      if (error) {
        throw error;
      }

      Alert.alert(
        'Code Sent',
        'A new password reset code has been sent to your email.',
      );

    } catch (error) {
      if (__DEV__) {
        console.error(
          'OTP Resend Error:',
          error.message,
        );
      }

      Alert.alert(
        'Resend Failed',
        getUserFriendlyError(error, 'Unable to resend the verification code.'),
      );

    } finally {
      setResending(false);
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

        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.form}>

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

          <Text className="mt-10 text-center text-3xl font-extrabold text-black">
            Verify Code
          </Text>

          <Text className="mt-3 text-center leading-6 text-gray-500">
            Enter the password reset verification code sent to
          </Text>

          <Text className="mt-1 text-center font-bold text-black">
            {email}
          </Text>


          {/* OTP */}

          <Text className="mb-2 mt-8 font-semibold text-black">
            Verification Code
          </Text>

          <View className="relative">
            <View className="flex-row justify-between">
              {Array.from({ length: 6 }, (_, index) => {
                const digit = otp[index] || '';
                const isCurrent = index === Math.min(otp.length, 5);

                return (
                  <TouchableOpacity
                    key={`otp-digit-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Verification digit ${index + 1}${digit ? `, ${digit}` : ', empty'}`}
                    accessibilityHint="Opens the numeric keyboard to enter your verification code"
                    onPress={() => otpInputRef.current?.focus()}
                    activeOpacity={0.75}
                    className={`h-12 w-12 items-center justify-center rounded-full border-2 ${digit ? 'border-black bg-gray-100' : isCurrent ? 'border-black bg-white' : 'border-gray-300 bg-white'}`}
                  >
                    <Text className={`text-lg font-bold ${digit ? 'text-black' : 'text-transparent'}`}>
                      {digit || '0'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              ref={otpInputRef}
              value={otp}
              onChangeText={text => setOtp(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              accessibilityLabel="Enter six-digit verification code"
              maxLength={6}
              style={styles.hiddenInput}
            />
          </View>

          <Text className="mt-3 text-xs leading-5 text-gray-500">
            Tap any circle to enter your 6-digit code.
          </Text>


          {/* Verify */}

          <TouchableOpacity
            onPress={handleVerify}
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
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color="white"
                />

                <Text className="ml-2 text-sm font-bold tracking-wide text-white">
                  Verify Code
                </Text>
              </>
            )}

          </TouchableOpacity>


          {/* Resend */}

          <View className="mt-6 flex-row items-center justify-center">

            <Text className="text-sm text-gray-500">
              Didn't receive the code?
            </Text>

            <TouchableOpacity
              onPress={handleResend}
              disabled={resending}
            >

              {resending ? (
                <ActivityIndicator
                  size="small"
                  color="black"
                  style={{
                    marginLeft: 8,
                  }}
                />
              ) : (
                <Text className="ml-2 text-sm font-bold text-black">
                  Resend
                </Text>
              )}

            </TouchableOpacity>

          </View>

        </View>
        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
};

export default OTP;
