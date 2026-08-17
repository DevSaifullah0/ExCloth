import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import AppModal from '../../components/common/AppModal';


const THEME_KEY =
  '@excloth/theme';

const LANGUAGE_KEY =
  '@excloth/language';


const Preferences = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    theme,
    setTheme,
  ] = useState('system');

  const [
    language,
    setLanguage,
  ] = useState('en');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });


  useEffect(() => {
    const load =
      async () => {
        try {
          const [
            storedTheme,
            storedLanguage,
          ] =
            await Promise.all([
              AsyncStorage.getItem(
                THEME_KEY,
              ),

              AsyncStorage.getItem(
                LANGUAGE_KEY,
              ),
            ]);


          if (
            storedTheme
          ) {
            setTheme(
              storedTheme,
            );
          }


          if (
            storedLanguage
          ) {
            setLanguage(
              storedLanguage,
            );
          }

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Preferences Load Error:',
              error?.message ||
                error,
            );
          }

        } finally {
          setLoading(false);
        }
      };


    load();
  }, []);


  const saveTheme =
    async value => {
      try {
        setTheme(value);

        await AsyncStorage.setItem(
          THEME_KEY,
          value,
        );

        setModal({
          visible: true,
          type: 'success',
          title:
            'Theme Preference Saved',
          message:
            'Your theme preference has been saved. App-wide theme application requires the global theme layer to consume this preference.',
        });

      } catch (error) {
        setModal({
          visible: true,
          type: 'error',
          title:
            'Unable to Save',
          message:
            'Unable to save theme preference.',
        });
      }
    };


  const saveLanguage =
    async value => {
      try {
        setLanguage(value);

        await AsyncStorage.setItem(
          LANGUAGE_KEY,
          value,
        );

        setModal({
          visible: true,
          type: 'success',
          title:
            'Language Preference Saved',
          message:
            'Your language preference has been saved. App-wide translation requires the global translation layer to consume this preference.',
        });

      } catch (error) {
        setModal({
          visible: true,
          type: 'error',
          title:
            'Unable to Save',
          message:
            'Unable to save language preference.',
        });
      }
    };


  const Option = ({
    title,
    subtitle,
    selected,
    onPress,
    icon,
  }) => (
    <TouchableOpacity
      onPress={
        onPress
      }
      activeOpacity={0.8}
      className={`mb-3 flex-row items-center rounded-2xl border p-4 ${
        selected
          ? 'border-black bg-black'
          : 'border-gray-200 bg-white'
      }`}
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-xl ${
          selected
            ? 'bg-white'
            : 'bg-gray-100'
        }`}
      >
        <Ionicons
          name={icon}
          size={21}
          color="black"
        />
      </View>

      <View className="ml-4 flex-1">
        <Text
          className={`font-extrabold ${
            selected
              ? 'text-white'
              : 'text-black'
          }`}
        >
          {title}
        </Text>

        {
          subtitle ? (
            <Text
              className={`mt-1 text-xs ${
                selected
                  ? 'text-gray-300'
                  : 'text-gray-500'
              }`}
            >
              {subtitle}
            </Text>
          ) : null
        }
      </View>

      <Ionicons
        name={
          selected
            ? 'radio-button-on'
            : 'radio-button-off'
        }
        size={22}
        color={
          selected
            ? 'white'
            : '#9CA3AF'
        }
      />
    </TouchableOpacity>
  );


  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            Math.max(
              insets.bottom,
              24,
            ) + 40,
        }}
      >
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
            <Text className="text-2xl font-extrabold text-black">
              Preferences
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Appearance and language
            </Text>
          </View>
        </View>


        {
          loading ? (
            <View className="mt-16 items-center">
              <ActivityIndicator
                size="large"
                color="black"
              />

              <Text className="mt-3 font-semibold text-gray-500">
                Loading preferences...
              </Text>
            </View>
          ) : (
            <>
              <Text className="mb-3 mt-8 text-lg font-extrabold text-black">
                Appearance
              </Text>

              <Option
                title="System Default"
                subtitle="Follow your device appearance"
                icon="phone-portrait-outline"
                selected={
                  theme ===
                  'system'
                }
                onPress={() =>
                  saveTheme(
                    'system',
                  )
                }
              />

              <Option
                title="Light"
                subtitle="Always use light appearance"
                icon="sunny-outline"
                selected={
                  theme ===
                  'light'
                }
                onPress={() =>
                  saveTheme(
                    'light',
                  )
                }
              />

              <Option
                title="Dark"
                subtitle="Use dark appearance when global theme is wired"
                icon="moon-outline"
                selected={
                  theme ===
                  'dark'
                }
                onPress={() =>
                  saveTheme(
                    'dark',
                  )
                }
              />


              <Text className="mb-3 mt-6 text-lg font-extrabold text-black">
                Language
              </Text>

              <Option
                title="English"
                subtitle="English interface"
                icon="language-outline"
                selected={
                  language ===
                  'en'
                }
                onPress={() =>
                  saveLanguage(
                    'en',
                  )
                }
              />

              <Option
                title="Urdu"
                subtitle="Urdu interface after translation layer is connected"
                icon="language-outline"
                selected={
                  language ===
                  'ur'
                }
                onPress={() =>
                  saveLanguage(
                    'ur',
                  )
                }
              />


              <View className="mt-5 rounded-2xl bg-gray-100 p-4">
                <Text className="font-extrabold text-black">
                  Important
                </Text>

                <Text className="mt-2 text-sm leading-6 text-gray-500">
                  These preferences are persisted now. Your current ExCloth screens still use fixed black/white classes and English text, so applying dark mode and Urdu everywhere requires a separate app-wide theme and translation refactor.
                </Text>
              </View>
            </>
          )
        }
      </ScrollView>


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
        confirmText="OK"
        showCancel={false}
        onConfirm={() =>
          setModal(
            current => ({
              ...current,
              visible: false,
            }),
          )
        }
        onCancel={() =>
          setModal(
            current => ({
              ...current,
              visible: false,
            }),
          )
        }
      />
    </SafeAreaView>
  );
};


export default Preferences;
