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
} from 'react-native';

import React, {
  useState,
} from 'react';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { supabase } from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const Login = ({
  navigation,
}) => {
  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
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
  });


  const showModal = ({
    type = 'info',
    title = '',
    message = '',
    confirmText = 'OK',
  }) => {
    setModal({
      visible: true,
      type,
      title,
      message,
      confirmText,
    });
  };


  const closeModal = () => {
    setModal(current => ({
      ...current,
      visible: false,
    }));
  };


  const handleLogin =
    async () => {
      if (loading) {
        return;
      }


      const cleanEmail =
        email
          .trim()
          .toLowerCase();


      if (!cleanEmail) {
        showModal({
          type: 'warning',
          title:
            'Email Required',
          message:
            'Please enter your email.',
          confirmText:
            'Enter Email',
        });

        return;
      }


      if (!password) {
        showModal({
          type: 'warning',
          title:
            'Password Required',
          message:
            'Please enter your password.',
          confirmText:
            'Enter Password',
        });

        return;
      }


      try {
        setLoading(true);


        const {
          error,
        } =
          await supabase.auth
            .signInWithPassword({
              email:
                cleanEmail,

              password,
            });


        if (error) {
          throw error;
        }


        // No manual navigation here.
        // AuthContext checks the authenticated account
        // and RootNavigator opens the customer or admin navigator.

      } catch (error) {
        showModal({
          type: 'error',
          title:
            'Login Failed',
          message:
            getUserFriendlyError(error, 'Unable to login.'),
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
        <View className="flex-1 px-6">
          <View className="mt-8 items-center">
            <Image
              source={require('../../images/Logo.png')}
              className="h-44 w-44"
              resizeMode="contain"
            />
          </View>


          <View className="mt-4">
            <Text className="text-3xl font-extrabold text-black">
              Welcome Back
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Sign in to continue to your account
            </Text>
          </View>


          <View className="mt-7">
            <Text className="mb-1.5 font-semibold text-black">
              Email
            </Text>

            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              returnKeyType="next"
              className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 text-black"
            />


            <Text className="mb-1.5 mt-4 font-semibold text-black">
              Password
            </Text>


            <View className="relative">
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={
                  !showPassword
                }
                value={password}
                onChangeText={
                  setPassword
                }
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={
                  handleLogin
                }
                className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-4 pr-12 text-black"
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword(
                    current =>
                      !current,
                  )
                }
                disabled={loading}
                activeOpacity={0.7}
                className="absolute right-4 top-0 h-12 items-center justify-center"
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>


            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  'ForgotPassword',
                )
              }
              disabled={loading}
              className="mt-3 self-end"
            >
              <Text className="font-semibold text-blue-600">
                Forgot Password?
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              onPress={
                handleLogin
              }
              disabled={loading}
              activeOpacity={0.8}
              className={`mt-6 h-12 items-center justify-center rounded-xl ${
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
                  Login
                </Text>
              )}
            </TouchableOpacity>


            <View className="mt-5 flex-row justify-center">
              <Text className="text-sm text-gray-500">
                Don&apos;t have an account?{' '}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'Signup',
                  )
                }
                disabled={loading}
              >
                <Text className="text-sm font-bold text-black">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
        onCancel={
          closeModal
        }
        onConfirm={
          closeModal
        }
      />
    </SafeAreaView>
  );
};


export default Login;
