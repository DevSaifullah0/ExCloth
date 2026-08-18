import React, {
  useState,
} from 'react';

import {
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import Config from 'react-native-config';

import AppModal from '../../components/common/AppModal';

import {
  getSafeHttpsUrl,
} from '../../utils/externalLinks';


const POLICIES = {
  privacy: {
    title:
      'Privacy Policy',
    icon:
      'shield-checkmark-outline',
    url:
      Config.PRIVACY_POLICY_URL,
  },

  terms: {
    title:
      'Terms & Conditions',
    icon:
      'document-text-outline',
    url:
      Config.TERMS_OF_SERVICE_URL,
  },

  shipping: {
    title:
      'Shipping Policy',
    icon:
      'car-outline',
    url:
      Config.SHIPPING_POLICY_URL,
  },

  returns: {
    title:
      'Return & Refund Policy',
    icon:
      'return-down-back-outline',
    url:
      Config.RETURN_REFUND_POLICY_URL,
  },
};


const PolicyDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const policyKey =
    route.params?.policy ||
    'privacy';

  const policy =
    POLICIES[
      policyKey
    ] ||
    POLICIES.privacy;

  const policyUrl =
    getSafeHttpsUrl(
      policy.url,
    );


  const openPolicy =
    async () => {
      if (!policyUrl) {
        return;
      }


      try {
        const canOpen =
          await Linking.canOpenURL(
            policyUrl,
          );


        if (!canOpen) {
          throw new Error(
            'The policy URL cannot be opened.',
          );
        }


        await Linking.openURL(
          policyUrl,
        );

      } catch (error) {
        setModal({
          visible: true,
          type: 'error',
          title:
            'Unable to Open Policy',
          message:
            'The published policy could not be opened. Please try again later.',
        });
      }
    };


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
            accessibilityRole="button"
            accessibilityLabel="Go back"
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
              {policy.title}
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Policy document
            </Text>
          </View>
        </View>


        <View className="mt-7 rounded-3xl bg-black p-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <Ionicons
              name={
                policy.icon
              }
              size={27}
              color="black"
            />
          </View>

          <Text className="mt-5 text-2xl font-extrabold text-white">
            {policy.title}
          </Text>

          <Text className="mt-2 leading-6 text-gray-300">
            {
              policyUrl
                ? 'Open the current published document in your browser.'
                : 'A published document is not available in the app right now.'
            }
          </Text>

          {
            policyUrl ? (
              <TouchableOpacity
                testID="open-policy-button"
                onPress={
                  openPolicy
                }
                accessibilityRole="link"
                accessibilityLabel={`Open ${policy.title}`}
                activeOpacity={0.85}
                className="mt-5 h-12 flex-row items-center justify-center rounded-2xl bg-white"
              >
                <Ionicons
                  name="open-outline"
                  size={20}
                  color="black"
                />

                <Text className="ml-2 font-extrabold text-black">
                  Open Published Policy
                </Text>
              </TouchableOpacity>
            ) : null
          }
        </View>


        {
          !policyUrl ? (
            <View className="mt-6 rounded-3xl bg-gray-100 p-5">
              <Text className="text-lg font-extrabold text-black">
                Document unavailable
              </Text>

              <Text className="mt-3 leading-7 text-gray-600">
                Please contact support if you need help with this policy.
              </Text>
            </View>
          ) : null
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


export default PolicyDetails;
