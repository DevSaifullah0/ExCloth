import { getUserFriendlyError } from '../../utils/getUserFriendlyError';
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import React, {
  useState,
} from 'react';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const Signup = ({
  navigation,
}) => {
  const [
    firstName,
    setFirstName,
  ] = useState('');

  const [
    lastName,
    setLastName,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    number,
    setNumber,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
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


  const handleSignup =
    async () => {
      if (loading) {
        return;
      }


      const cleanFirstName =
        firstName.trim();

      const cleanLastName =
        lastName.trim();

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      const cleanPhone =
        number.trim();


      if (
        !cleanFirstName ||
        !cleanLastName ||
        !cleanEmail ||
        !cleanPhone ||
        !password ||
        !confirmPassword
      ) {
        showModal({
          type: 'warning',
          title:
            'Missing Information',
          message:
            'Please fill all fields.',
          confirmText:
            'OK',
        });

        return;
      }


      if (
        password !==
        confirmPassword
      ) {
        showModal({
          type: 'warning',
          title:
            'Password Error',
          message:
            'Passwords do not match.',
          confirmText:
            'Try Again',
        });

        return;
      }


      if (
        password.length < 6
      ) {
        showModal({
          type: 'warning',
          title:
            'Weak Password',
          message:
            'Password must be at least 6 characters.',
          confirmText:
            'OK',
        });

        return;
      }


      try {
        setLoading(true);


        const {
          data,
          error,
        } =
          await supabase.auth
            .signUp({
              email:
                cleanEmail,

              password,

              options: {
                data: {
                  first_name:
                    cleanFirstName,

                  last_name:
                    cleanLastName,

                  phone:
                    cleanPhone,
                },
              },
            });


        if (error) {
          throw error;
        }


        // No role is selected or accepted from the signup form.
        // Normal signup accounts remain customer accounts.
        // Admin access is granted only by the secure admin backend.


        if (data.session) {
          return;
        }


        showModal({
          type: 'success',
          title:
            'Verify Email',
          message:
            'Account created. Please verify your email before logging in.',
          confirmText:
            'Go to Login',
          onConfirm: () => {
            closeModal();

            navigation.navigate(
              'Login',
            );
          },
        });

      } catch (error) {
        showModal({
          type: 'error',
          title:
            'Signup Failed',
          message:
            getUserFriendlyError(error, 'Unable to create your account.'),
          confirmText:
            'Try Again',
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 32,
          }}
        >
          <View className="px-6">
            <View className="mt-4 items-center">
              <Image
                source={require('../../images/Logo.png')}
                className="h-44 w-44"
                resizeMode="contain"
              />
            </View>


            <View>
              <Text className="text-3xl font-extrabold text-black">
                Create Account
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Sign up to get started with your account
              </Text>
            </View>


            <View className="mt-5">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1.5 font-semibold text-black">
                    First Name
                  </Text>

                  <TextInput
                    placeholder="First name"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={
                      setFirstName
                    }
                    editable={!loading}
                    autoCapitalize="words"
                    className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 text-black"
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-1.5 font-semibold text-black">
                    Last Name
                  </Text>

                  <TextInput
                    placeholder="Last name"
                    placeholderTextColor="#9CA3AF"
                    value={lastName}
                    onChangeText={
                      setLastName
                    }
                    editable={!loading}
                    autoCapitalize="words"
                    className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 text-black"
                  />
                </View>
              </View>


              <Text className="mb-1.5 mt-3 font-semibold text-black">
                Email
              </Text>

              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={
                  setEmail
                }
                editable={!loading}
                className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 text-black"
              />


              <Text className="mb-1.5 mt-3 font-semibold text-black">
                Phone Number
              </Text>

              <TextInput
                placeholder="03XX XXXXXXX"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={number}
                onChangeText={
                  setNumber
                }
                editable={!loading}
                className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 text-black"
              />


              <Text className="mb-1.5 mt-3 font-semibold text-black">
                Password
              </Text>

              <TextInput
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={password}
                onChangeText={
                  setPassword
                }
                editable={!loading}
                className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 text-black"
              />


              <Text className="mb-1.5 mt-3 font-semibold text-black">
                Confirm Password
              </Text>

              <TextInput
                placeholder="Confirm password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={
                  confirmPassword
                }
                onChangeText={
                  setConfirmPassword
                }
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={
                  handleSignup
                }
                className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 text-black"
              />


              <TouchableOpacity
                onPress={
                  handleSignup
                }
                disabled={loading}
                activeOpacity={0.8}
                className={`mt-5 h-12 items-center justify-center rounded-xl ${
                  loading
                    ? 'bg-gray-400'
                    : 'bg-black'
                }`}
              >
                {loading ? (
                  <ActivityIndicator
                    color="white"
                  />
                ) : (
                  <Text className="text-base font-bold text-white">
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>


              <View className="mt-4 flex-row justify-center">
                <Text className="text-sm text-gray-500">
                  Already have an account?{' '}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      'Login',
                    )
                  }
                  disabled={loading}
                >
                  <Text className="text-sm font-bold text-black">
                    Login
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
        dismissible={
          !loading
        }
        loading={false}
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


export default Signup;
