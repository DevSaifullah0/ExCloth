import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import React, {
  useCallback,
  useState,
} from 'react';

import { useFocusEffect } from '@react-navigation/native';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getMessaging,
  getToken,
  deleteToken,
} from '@react-native-firebase/messaging';

import { supabase } from '../../lib/supabase';
import AppModal from '../../components/common/AppModal';

const Profile = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [modal, setModal] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    showCancel: false,
    cancelText: 'Cancel',
    onConfirm: null,
  });

  const closeModal = () => {
    setModal(current => ({
      ...current,
      visible: false,
    }));
  };

  const fetchProfile = useCallback(
    async () => {
      try {
        setErrorMessage('');

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

        setEmail(user.email || '');

        const {
          data,
          error,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            phone,
            avatar_url,
            created_at,
            updated_at
          `)
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }
        setProfile(
          data || {
            id: user.id,
            first_name:
              user.user_metadata
                ?.first_name || '',
            last_name:
              user.user_metadata
                ?.last_name || '',
            phone:
              user.user_metadata?.phone ||
              '',
            avatar_url: null,
          },
        );
      } catch (error) {
        if (__DEV__) {
          console.error(
            'Profile Error:',
            error.message,
          );
        }

        setErrorMessage(
          'Unable to load profile.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const performLogout = async () => {
    try {
      setLoggingOut(true);
      closeModal();


      try {
        const messaging =
          getMessaging();

        const currentPushToken =
          await getToken(
            messaging,
          );


        if (currentPushToken) {
          const {
            error:
              unregisterError,
          } =
            await supabase.rpc(
              'unregister_push_token_secure',
              {
                p_token:
                  currentPushToken,
              },
            );


          if (unregisterError) {
            if (__DEV__) {
              console.error(
                'Push token unregister error:',
                unregisterError.message,
              );
            }
          }


          try {
            await deleteToken(
              messaging,
            );
          } catch (
            tokenDeleteError
          ) {
            if (__DEV__) {
              console.error(
                'FCM Token Delete Error:',
                tokenDeleteError?.message ||
                  tokenDeleteError,
              );
            }
          }
        }

      } catch (
        tokenCleanupError
      ) {
        if (__DEV__) {
          console.error(
            'Push token cleanup error:',
            tokenCleanupError?.message ||
              tokenCleanupError,
          );
        }
      }


      const {
        error,
      } =
        await supabase.auth.signOut({
          scope: 'local',
        });


      if (error) {
        throw error;
      }

    } catch (error) {
      if (__DEV__) {
        console.error(
          'Logout Error:',
          error?.message ||
            error,
        );
      }


      setModal({
        visible: true,
        type: 'error',
        title: 'Logout Error',
        message:
          'Unable to logout.',
        confirmText: 'OK',
        showCancel: false,
        cancelText: 'Cancel',
        onConfirm: null,
      });

    } finally {
      setLoggingOut(false);
    }
  };


  const handleLogout = () => {
    setModal({
      visible: true,
      type: 'confirm',
      title: 'Logout',
      message:
        'Are you sure you want to logout?',
      confirmText: 'Logout',
      showCancel: true,
      cancelText: 'Cancel',
      onConfirm: performLogout,
    });
  };

  const fullName = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const initials = `${
    profile?.first_name?.[0] || ''
  }${
    profile?.last_name?.[0] || ''
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
      <ScrollView
        className="px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 44,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* HEADER */}
        <View className="mt-5 flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-extrabold text-black">
              Profile
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Manage your ExCloth account
            </Text>
          </View>

          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
            <Ionicons
              name="person-outline"
              size={23}
              color="black"
            />
          </View>
        </View>

        {/* ERROR */}
        {errorMessage ? (
          <View className="mt-8 items-center rounded-3xl border border-gray-200 bg-gray-50 p-7">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color="black"
              />
            </View>

            <Text className="mt-4 text-lg font-extrabold text-black">
              Couldn&apos;t load profile
            </Text>

            <Text className="mt-2 text-center text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={fetchProfile}
              activeOpacity={0.85}
              className="mt-5 rounded-xl bg-black px-6 py-3"
            >
              <Text className="font-bold text-white">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!errorMessage && profile ? (
          <>
            {/* PREMIUM USER CARD */}
            <View className="mt-7 overflow-hidden rounded-[28px] bg-black p-6">
              <View className="flex-row items-center">
                <View className="rounded-full border-2 border-white/30 p-1">
                  {profile.avatar_url ? (
                    <Image
                      source={{
                        uri: profile.avatar_url,
                      }}
                      className="h-20 w-20 rounded-full bg-gray-800"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                      {initials ? (
                        <Text className="text-2xl font-extrabold text-black">
                          {initials}
                        </Text>
                      ) : (
                        <Ionicons
                          name="person-outline"
                          size={34}
                          color="black"
                        />
                      )}
                    </View>
                  )}
                </View>

                <View className="ml-4 flex-1">
                  <View className="self-start rounded-full bg-white/15 px-3 py-1">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-white">
                      ExCloth Member
                    </Text>
                  </View>

                  <Text
                    numberOfLines={1}
                    className="mt-2 text-2xl font-extrabold text-white"
                  >
                    {fullName ||
                      'ExCloth User'}
                  </Text>

                  <Text
                    numberOfLines={1}
                    className="mt-1 text-sm text-gray-300"
                  >
                    {email}
                  </Text>
                </View>
              </View>

              {profile.phone ? (
                <View className="mt-5 flex-row items-center rounded-2xl bg-white/10 px-4 py-3">
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color="white"
                  />

                  <Text className="ml-2 text-sm font-semibold text-white">
                    {profile.phone}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'EditProfile',
                  )
                }
                activeOpacity={0.85}
                className="mt-5 h-12 flex-row items-center justify-center rounded-2xl bg-white"
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color="black"
                />

                <Text className="ml-2 font-extrabold text-black">
                  Edit Profile
                </Text>
              </TouchableOpacity>
            </View>

            {/* ACCOUNT */}
            <View className="mb-3 mt-8 flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-black">
                Account
              </Text>

              <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Quick Access
              </Text>
            </View>

            <View className="overflow-hidden rounded-3xl bg-gray-100 px-4">
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'MyOrders',
                  )
                }
                activeOpacity={0.8}
                className="flex-row items-center py-4"
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                  <Ionicons
                    name="bag-handle-outline"
                    size={22}
                    color="black"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-black">
                    My Orders
                  </Text>

                  <Text className="mt-1 text-xs text-gray-500">
                    Track and manage your orders
                  </Text>
                </View>

                <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                  <Ionicons
                    name="chevron-forward-outline"
                    size={18}
                    color="black"
                  />
                </View>
              </TouchableOpacity>

              <View className="ml-16 h-px bg-gray-200" />

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'Settings',
                  )
                }
                activeOpacity={0.8}
                className="flex-row items-center py-4"
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                  <Ionicons
                    name="settings-outline"
                    size={22}
                    color="black"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-black">
                    Settings
                  </Text>

                  <Text className="mt-1 text-xs text-gray-500">
                    Account, security and preferences
                  </Text>
                </View>

                <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                  <Ionicons
                    name="chevron-forward-outline"
                    size={18}
                    color="black"
                  />
                </View>
              </TouchableOpacity>

              <View className="ml-16 h-px bg-gray-200" />

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'Notifications',
                  )
                }
                activeOpacity={0.8}
                className="flex-row items-center py-4"
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color="black"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-black">
                    Notifications
                  </Text>

                  <Text className="mt-1 text-xs text-gray-500">
                    Orders, returns and account updates
                  </Text>
                </View>

                <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                  <Ionicons
                    name="chevron-forward-outline"
                    size={18}
                    color="black"
                  />
                </View>
              </TouchableOpacity>
            </View>
            {/* INFORMATION */}
            <View className="mb-3 mt-8 flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-black">
                Information
              </Text>

              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#6B7280"
              />
            </View>

            <View className="rounded-3xl border border-gray-200 bg-white p-4">
              <View className="flex-row items-center rounded-2xl bg-gray-100 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="black"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Full Name
                  </Text>

                  <Text className="mt-1 font-bold text-black">
                    {fullName || '-'}
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-row items-center rounded-2xl bg-gray-100 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="black"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Email Address
                  </Text>

                  <Text
                    numberOfLines={1}
                    className="mt-1 font-bold text-black"
                  >
                    {email || '-'}
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-row items-center rounded-2xl bg-gray-100 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color="black"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Phone Number
                  </Text>

                  <Text className="mt-1 font-bold text-black">
                    {profile.phone ||
                      'Not added'}
                  </Text>
                </View>
              </View>
            </View>

            {/* LOGOUT */}
            <TouchableOpacity
              onPress={handleLogout}
              disabled={loggingOut}
              activeOpacity={0.85}
              className="mt-8 h-14 flex-row items-center justify-center rounded-2xl border border-gray-300 bg-white"
            >
              {loggingOut ? (
                <ActivityIndicator
                  color="black"
                />
              ) : (
                <>
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                    <Ionicons
                      name="log-out-outline"
                      size={19}
                      color="black"
                    />
                  </View>

                  <Text className="ml-3 text-base font-extrabold text-black">
                    Logout
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text className="mt-4 text-center text-xs text-gray-400">
              ExCloth • Your style, your account
            </Text>
          </>
        ) : null}
      </ScrollView>

      <AppModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        showCancel={modal.showCancel}
        dismissible={!loggingOut}
        loading={loggingOut}
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

export default Profile;
