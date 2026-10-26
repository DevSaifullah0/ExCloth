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
  StyleSheet,
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
import { useAuth } from '../../context/AuthContext';

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
    paddingHorizontal: 24,
  },
});


const Signup = ({
  navigation,
}) => {
  const { showAccountCreatedNotice } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

        if (
          data.user &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0
        ) {
          showModal({
            type: 'error',
            title: 'Email Already In Use',
            message:
              'This email is already registered. Please log in or reset your password.',
            confirmText: 'Go to Login',
            onConfirm: () => {
              closeModal();
              navigation.navigate('Login');
            },
          });
          return;
        }


        // No role is selected or accepted from the signup form.
        // Normal signup accounts remain customer accounts.
        // Admin access is granted only by the secure admin backend.


        if (data.session) {
          showAccountCreatedNotice();
          return;
        }

        showAccountCreatedNotice();
        navigation.navigate('Login');

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
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.form}>
            <View className="items-center">
              <Image
                source={require('../../images/Logo.png')}
                className="h-40 w-50"
                resizeMode="contain"
              />
            </View>


            <View className="mt-6 items-center">
              <Text className="text-[10px] font-bold tracking-[2px] text-gray-500">A GOOD PLACE TO START</Text>
              <Text className="mt-2 text-3xl font-extrabold text-black">
                Create your account.
              </Text>

              <Text className="mt-2 text-center text-sm leading-5 text-gray-500">
                Join ExCloth and make every choice your own.
              </Text>
            </View>


            <View className="mt-5">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-2 font-semibold text-black">
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
                    className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm text-black"
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 font-semibold text-black">
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
                    className="h-12 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm text-black"
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

              <View className="h-12 flex-row items-center rounded-xl border border-gray-300 bg-gray-50 px-4">
                <TextInput
                  placeholder="Enter password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  className="h-full flex-1 p-0 text-black"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(current => !current)}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={21}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>


              <Text className="mb-1.5 mt-3 font-semibold text-black">
                Confirm Password
              </Text>

              <View className="h-12 flex-row items-center rounded-xl border border-gray-300 bg-gray-50 px-4">
                <TextInput
                  placeholder="Confirm password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                  className="h-full flex-1 p-0 text-black"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(current => !current)}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={21}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>


              <TouchableOpacity
                onPress={
                  handleSignup
                }
                disabled={loading}
                activeOpacity={0.8}
                className={`mt-6 h-14 items-center justify-center rounded-2xl ${
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
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>


              <View className="mt-4 flex-row justify-center">
                <Text className="text-base text-gray-500">
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
                  <Text className="text-base font-bold text-black">
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
