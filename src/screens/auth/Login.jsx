import { getUserFriendlyError } from '../../utils/getUserFriendlyError';
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { supabase } from '../../lib/supabase';
import { AUTH_REDIRECT_URL } from '../../lib/authRedirect';
import { useAuth } from '../../context/AuthContext';

import AppModal from '../../components/common/AppModal';


const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  form: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
});


const Login = ({
  navigation,
}) => {
  const { oauthError, clearOAuthError } = useAuth();
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


  const showModal = useCallback(({
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
  }, []);


  const closeModal = () => {
    setModal(current => ({
      ...current,
      visible: false,
    }));
  };

  useEffect(() => {
    if (!oauthError) return;

    showModal({
      type: 'error',
      title: 'Google Login Failed',
      message: getUserFriendlyError(
        new Error(oauthError),
        'Google sign-in could not be completed. Please try again.',
      ),
      confirmText: 'Try Again',
    });
    clearOAuthError();
  }, [oauthError, clearOAuthError, showModal]);


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

  const handleGoogleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: AUTH_REDIRECT_URL,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Google sign-in could not be started.');

      await Linking.openURL(data.url);
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Google Login Failed',
        message: getUserFriendlyError(error, 'Unable to start Google sign-in. Please try again.'),
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
          className="flex-1 px-6"
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
          <View className="items-center">
            <Image
              source={require('../../images/Logo.png')}
              className="h-40 w-50"
              resizeMode="contain"
            />
          </View>


          <View className="mt-8 items-center">
            <Text className="text-[10px] font-bold tracking-[2px] text-gray-500">
              YOUR STYLE, YOUR SPACE
            </Text>
            <Text className="mt-2 text-3xl font-extrabold text-black">
              Welcome back.
            </Text>

            <Text className="mt-2 text-center text-sm leading-5 text-gray-500">
              Sign in to pick up right where you left off.
            </Text>
          </View>


          <View className="mt-7">
            <Text className="mb-2 text-xs font-bold tracking-wide text-black">
              Email
            </Text>

            <TextInput
              accessibilityLabel="Email address"
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


            <Text className="mb-2 mt-4 font-semibold text-black">
              Password
            </Text>


            <View className="relative">
              <TextInput
                accessibilityLabel="Password"
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
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                accessibilityState={{
                  disabled: loading,
                }}
                activeOpacity={0.7}
                className="absolute right-0 top-0 h-12 w-12 items-center justify-center"
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
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
              className="mt-3 self-end"
            >
              <Text className="font-semibold text-black">
                Forgot Password?
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              onPress={
                handleLogin
              }
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Log in"
              accessibilityState={{
                disabled: loading,
                busy: loading,
              }}
              activeOpacity={0.8}
              className={`mt-7 h-14 items-center justify-center rounded-2xl ${
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
                <Text className="text-sm font-bold tracking-wide text-white">
                  Login
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              className="mt-3 h-14 flex-row items-center justify-center rounded-lg border border-[#DADCE0] bg-white"
            >
              {loading ? (
                <ActivityIndicator color="black" />
              ) : (
                <>
                  <Image
                    source={require('../../images/GoogleMark.png')}
                    accessible={false}
                    className="h-5 w-5"
                    resizeMode="contain"
                  />
                  <Text className="ml-3 text-sm font-medium text-[#3C4043]">Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>


            <View className="mt-7 flex-row justify-center">
              <Text className="text-base text-gray-500">
                Don&apos;t have an account?{' '}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'Signup',
                  )
                }
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Create an account"
              >
                <Text className="text-base font-bold text-black">
                  Sign Up
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
