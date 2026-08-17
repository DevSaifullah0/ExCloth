import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';

import React, {
  useEffect,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  launchImageLibrary,
} from 'react-native-image-picker';

import { supabase } from '../../lib/supabase';
import AppModal from '../../components/common/AppModal';

const EditProfile = ({ navigation }) => {
  const [userId, setUserId] =
    useState(null);

  const [firstName, setFirstName] =
    useState('');

  const [lastName, setLastName] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [originalEmail, setOriginalEmail] =
    useState('');

  const [avatarUrl, setAvatarUrl] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploadingAvatar, setUploadingAvatar] =
    useState(false);

  const [modal, setModal] = useState({
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
    setModal(current => ({
      ...current,
      visible: false,
    }));
  };

  const showModal = ({
    type = 'info',
    title = '',
    message = '',
    confirmText = 'OK',
    cancelText = 'Cancel',
    showCancel = false,
    onConfirm = null,
  }) => {
    setModal({
      visible: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel,
      onConfirm,
    });
  };

  useEffect(() => {
    fetchProfile();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          'User session not found.',
        );
      }

      setUserId(user.id);
      setEmail(user.email || '');
      setOriginalEmail(
        user.email || '',
      );

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          avatar_url
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      setFirstName(
        profile?.first_name ||
          user.user_metadata
            ?.first_name ||
          '',
      );

      setLastName(
        profile?.last_name ||
          user.user_metadata
            ?.last_name ||
          '',
      );

      setPhone(
        profile?.phone ||
          user.user_metadata?.phone ||
          '',
      );

      setAvatarUrl(
        profile?.avatar_url || null,
      );
    } catch (error) {
      if (__DEV__) {
        console.error(
          'Edit Profile Fetch Error:',
          error.message,
        );
      }

      showModal({
        type: 'error',
        title: 'Unable to Load Profile',
        message:
          'Unable to load profile.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChooseAvatar =
    async () => {
      try {
        if (!userId) {
          throw new Error(
            'User ID is missing.',
          );
        }

        const result =
          await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
            quality: 0.8,
            includeBase64: false,
          });

        if (result.didCancel) {
          return;
        }

        if (result.errorCode) {
          throw new Error(
            result.errorMessage ||
              'Unable to select image.',
          );
        }

        const asset =
          result.assets?.[0];

        if (!asset?.uri) {
          throw new Error(
            'Selected image is invalid.',
          );
        }

        setUploadingAvatar(true);

        const fileExtension =
          asset.fileName
            ?.split('.')
            .pop()
            ?.toLowerCase() ||
          asset.type
            ?.split('/')
            .pop()
            ?.toLowerCase() ||
          'jpg';

        const filePath =
          `${userId}/avatar.${fileExtension}`;

        const response =
          await fetch(asset.uri);

        const arrayBuffer =
          await response.arrayBuffer();

        const {
          error: uploadError,
        } = await supabase.storage
          .from('profile-avatars')
          .upload(
            filePath,
            arrayBuffer,
            {
              contentType:
                asset.type ||
                'image/jpeg',
              upsert: true,
              cacheControl: '3600',
            },
          );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: publicUrlData,
        } = supabase.storage
          .from('profile-avatars')
          .getPublicUrl(filePath);

        if (
          !publicUrlData?.publicUrl
        ) {
          throw new Error(
            'Unable to generate avatar URL.',
          );
        }

        const newAvatarUrl =
          `${publicUrlData.publicUrl}?v=${Date.now()}`;

        const {
          error: profileError,
        } = await supabase
          .from('profiles')
          .update({
            avatar_url:
              newAvatarUrl,
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', userId);

        if (profileError) {
          throw profileError;
        }

        setAvatarUrl(
          newAvatarUrl,
        );

        showModal({
          type: 'success',
          title: 'Photo Updated',
          message:
            'Your profile photo has been updated successfully.',
        });
      } catch (error) {
        if (__DEV__) {
          console.error(
            'Avatar Upload Error:',
            error.message,
          );
        }

        showModal({
          type: 'error',
          title: 'Upload Failed',
          message:
            'Unable to upload profile photo.',
        });
      } finally {
        setUploadingAvatar(false);
      }
    };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const cleanFirstName =
      firstName.trim();

    const cleanLastName =
      lastName.trim();

    const cleanPhone =
      phone.trim();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanFirstName) {
      showModal({
        type: 'warning',
        title: 'First Name Required',
        message:
          'Please enter your first name.',
      });

      return;
    }

    if (!cleanLastName) {
      showModal({
        type: 'warning',
        title: 'Last Name Required',
        message:
          'Please enter your last name.',
      });

      return;
    }

    if (!cleanEmail) {
      showModal({
        type: 'warning',
        title: 'Email Required',
        message:
          'Please enter your email address.',
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
        message:
          'Please enter a valid email address.',
      });

      return;
    }

    try {
      setSaving(true);

      if (!userId) {
        throw new Error(
          'User ID is missing.',
        );
      }

      const {
        error: profileError,
      } = await supabase
        .from('profiles')
        .update({
          first_name:
            cleanFirstName,
          last_name:
            cleanLastName,
          phone:
            cleanPhone || null,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      const emailChanged =
        cleanEmail !==
        originalEmail.toLowerCase();

      if (emailChanged) {
        const {
          error: emailError,
        } =
          await supabase.auth.updateUser(
            {
              email:
                cleanEmail,
            },
          );

        if (emailError) {
          showModal({
            type: 'warning',
            title: 'Profile Partially Saved',
            message:
              `Name and phone were saved, but email could not be changed.\n\n${emailError.message}`,
          });

          return;
        }

        showModal({
          type: 'success',
          title: 'Check Your Email',
          message:
            'Profile updated. Complete email confirmation to finish changing your email address.',
          onConfirm: () => {
            closeModal();
            navigation.goBack();
          },
        });

        return;
      }

      showModal({
        type: 'success',
        title: 'Profile Updated',
        message:
          'Your profile has been updated successfully.',
        onConfirm: () => {
          closeModal();
          navigation.goBack();
        },
      });
    } catch (error) {
      if (__DEV__) {
        console.error(
          'Edit Profile Error:',
          error.message,
        );
      }

      showModal({
        type: 'error',
        title: 'Update Failed',
        message:
          'Unable to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const initials =
    `${
      firstName?.[0] || ''
    }${
      lastName?.[0] || ''
    }`.toUpperCase();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <ActivityIndicator
            size="large"
            color="black"
          />
        </View>

        <Text className="mt-4 font-semibold text-gray-500">
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

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
          className="px-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: 44,
          }}
        >
          {/* HEADER */}
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
              <Text className="text-3xl font-extrabold text-black">
                Edit Profile
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Update your personal information
              </Text>
            </View>
          </View>

          {/* AVATAR CARD */}
          <View className="mt-7 items-center overflow-hidden rounded-[28px] bg-black px-5 py-7">
            <View className="relative rounded-full border-2 border-white/30 p-1">
              {avatarUrl ? (
                <Image
                  source={{
                    uri: avatarUrl,
                  }}
                  className="h-28 w-28 rounded-full bg-gray-800"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-28 w-28 items-center justify-center rounded-full bg-white">
                  {initials ? (
                    <Text className="text-3xl font-extrabold text-black">
                      {initials}
                    </Text>
                  ) : (
                    <Ionicons
                      name="person-outline"
                      size={42}
                      color="black"
                    />
                  )}
                </View>
              )}

              <TouchableOpacity
                onPress={
                  handleChooseAvatar
                }
                disabled={
                  uploadingAvatar
                }
                activeOpacity={0.85}
                className="absolute bottom-0 right-0 h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-white"
              >
                {uploadingAvatar ? (
                  <ActivityIndicator
                    size="small"
                    color="black"
                  />
                ) : (
                  <Ionicons
                    name="camera-outline"
                    size={21}
                    color="black"
                  />
                )}
              </TouchableOpacity>
            </View>

            <Text className="mt-4 text-xl font-extrabold text-white">
              {firstName ||
              lastName
                ? `${firstName} ${lastName}`.trim()
                : 'Your Profile'}
            </Text>

            <Text className="mt-1 text-sm text-gray-300">
              {email ||
                'Update your account information'}
            </Text>

            <TouchableOpacity
              onPress={
                handleChooseAvatar
              }
              disabled={
                uploadingAvatar
              }
              activeOpacity={0.85}
              className="mt-5 flex-row items-center rounded-2xl bg-white px-5 py-3"
            >
              <Ionicons
                name="images-outline"
                size={18}
                color="black"
              />

              <Text className="ml-2 font-extrabold text-black">
                {uploadingAvatar
                  ? 'Uploading...'
                  : 'Change Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* PERSONAL INFO */}
          <View className="mb-3 mt-8 flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-black">
              Personal Information
            </Text>

            <Ionicons
              name="person-circle-outline"
              size={21}
              color="#6B7280"
            />
          </View>

          <View className="rounded-3xl bg-gray-100 p-4">
            {/* FIRST NAME */}
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              First Name
            </Text>

            <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
              <Ionicons
                name="person-outline"
                size={20}
                color="#6B7280"
              />

              <TextInput
                value={firstName}
                onChangeText={
                  setFirstName
                }
                placeholder="First name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                className="ml-3 flex-1 text-base font-semibold text-black"
              />
            </View>

            {/* LAST NAME */}
            <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-gray-500">
              Last Name
            </Text>

            <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
              <Ionicons
                name="person-outline"
                size={20}
                color="#6B7280"
              />

              <TextInput
                value={lastName}
                onChangeText={
                  setLastName
                }
                placeholder="Last name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                className="ml-3 flex-1 text-base font-semibold text-black"
              />
            </View>

            {/* PHONE */}
            <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-gray-500">
              Phone Number
            </Text>

            <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
              <Ionicons
                name="call-outline"
                size={20}
                color="#6B7280"
              />

              <TextInput
                value={phone}
                onChangeText={
                  setPhone
                }
                placeholder="+92 300 1234567"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                className="ml-3 flex-1 text-base font-semibold text-black"
              />
            </View>
          </View>

          {/* ACCOUNT INFO */}
          <View className="mb-3 mt-8 flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-black">
              Account Information
            </Text>

            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#6B7280"
            />
          </View>

          <View className="rounded-3xl bg-gray-100 p-4">
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              Email Address
            </Text>

            <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
              <Ionicons
                name="mail-outline"
                size={20}
                color="#6B7280"
              />

              <TextInput
                value={email}
                onChangeText={
                  setEmail
                }
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="ml-3 flex-1 text-base font-semibold text-black"
              />
            </View>

            <View className="mt-3 flex-row rounded-2xl bg-white px-4 py-3">
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#6B7280"
              />

              <Text className="ml-2 flex-1 text-xs leading-5 text-gray-500">
                Changing your email may require confirmation from your new email address.
              </Text>
            </View>
          </View>

          {/* SAVE */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={
              saving ||
              uploadingAvatar
            }
            activeOpacity={0.85}
            className={`mt-8 h-14 flex-row items-center justify-center rounded-2xl ${
              saving ||
              uploadingAvatar
                ? 'bg-gray-400'
                : 'bg-black'
            }`}
          >
            {saving ? (
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

                <Text className="ml-2 text-base font-extrabold text-white">
                  Save Changes
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text className="mt-4 text-center text-xs text-gray-400">
            Keep your account information up to date
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        showCancel={modal.showCancel}
        dismissible={
          !saving &&
          !uploadingAvatar
        }
        onCancel={closeModal}
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

export default EditProfile;
