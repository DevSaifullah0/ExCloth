import { getUserFriendlyError } from '../../utils/getUserFriendlyError';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';

import React, {
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import AppModal from '../../components/common/AppModal';

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
  forwardIcon: {
    marginLeft: 8,
  },
});

const ForgotPassword = ({
  navigation,
}) => {
  const [email, setEmail] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [modal, setModal] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    onConfirm: null,
  });

  const closeModal = () => {
    setModal(current => ({
      ...current,
      visible: false,
      onConfirm: null,
    }));
  };

  const showModal = ({
    type = 'info',
    title = '',
    message = '',
    confirmText = 'OK',
    onConfirm = null,
  }) => {
    setModal({
      visible: true,
      type,
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const handleResetPassword =
    async () => {
    if (loading) {
      return;
    }

      const cleanEmail = email
        .trim()
        .toLowerCase();

      if (!cleanEmail) {
        showModal({
          type: 'warning',
          title: 'Email Required',
          message: 'Please enter your email address.',
        });

        return;
      }

      if (
        !cleanEmail.includes('@') ||
        !cleanEmail.includes('.')
      ) {
        showModal({
          type: 'warning',
          title: 'Invalid Email',
          message: 'Please enter a valid email address.',
        });

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

        showModal({
          type: 'success',
          title: 'Verification code sent',
          message: 'Check your email for the password reset code.',
          confirmText: 'Continue',
          onConfirm: () => {
            closeModal();
            navigation.navigate('OTP', { email: cleanEmail });
          },
        });

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Forgot Password Error:',
            error.message,
          );
        }

        showModal({
          type: 'error',
          title: 'Unable to send code',
          message: getUserFriendlyError(error, 'Unable to send verification code.'),
          confirmText: 'Try Again',
        });

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

        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.form}>

          {/* Header */}

          <Text className="mt-10 text-center text-3xl font-extrabold text-black">
            Forgot Password?
          </Text>

          <Text className="mt-3 text-center leading-6 text-gray-500">
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
                <Text className="text-sm font-bold tracking-wide text-white">
                  Send Verification Code
                </Text>

                <Ionicons
                  name="arrow-forward-outline"
                  size={20}
                  color="white"
                  style={styles.forwardIcon}
                />
              </>
            )}

          </TouchableOpacity>

          <View className="mt-5 flex-row items-center justify-center">
            <Text className="text-base text-gray-500">
              Know your password?{' '}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Return to login"
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text className="text-base font-bold text-black">Login</Text>
            </TouchableOpacity>
          </View>

        </View>
        </ScrollView>

      </KeyboardAvoidingView>

      <AppModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        onCancel={closeModal}
        onConfirm={() => {
          if (typeof modal.onConfirm === 'function') {
            modal.onConfirm();
            return;
          }

          closeModal();
        }}
      />

    </SafeAreaView>
  );
};

export default ForgotPassword;
