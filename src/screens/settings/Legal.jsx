import React from 'react';

import {
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


const Legal = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const policies = [
    {
      title:
        'Privacy Policy',
      subtitle:
        'How ExCloth handles account and shopping data',
      icon:
        'shield-checkmark-outline',
      policy:
        'privacy',
    },
    {
      title:
        'Terms & Conditions',
      subtitle:
        'Rules for using ExCloth',
      icon:
        'document-text-outline',
      policy:
        'terms',
    },
    {
      title:
        'Shipping Policy',
      subtitle:
        'Delivery, addresses and shipping information',
      icon:
        'car-outline',
      policy:
        'shipping',
    },
    {
      title:
        'Return & Refund Policy',
      subtitle:
        'Returns, eligibility and refunds',
      icon:
        'return-down-back-outline',
      policy:
        'returns',
    },
  ];


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
              Legal
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Policies and terms
            </Text>
          </View>
        </View>


        <View className="mt-7 rounded-3xl bg-black p-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <Ionicons
              name="document-lock-outline"
              size={27}
              color="black"
            />
          </View>

          <Text className="mt-5 text-2xl font-extrabold text-white">
            ExCloth Policies
          </Text>

          <Text className="mt-2 leading-6 text-gray-300">
            Review the policies that apply to your account, purchases, deliveries and returns.
          </Text>
        </View>


        <View className="mt-7 overflow-hidden rounded-3xl bg-gray-100 px-4">
          {
            policies.map(
              (
                item,
                index,
              ) => (
                <React.Fragment
                  key={
                    item.policy
                  }
                >
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate(
                        'PolicyDetails',
                        {
                          policy:
                            item.policy,
                        },
                      )
                    }
                    activeOpacity={0.8}
                    className="flex-row items-center py-4"
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                      <Ionicons
                        name={
                          item.icon
                        }
                        size={22}
                        color="black"
                      />
                    </View>

                    <View className="ml-4 flex-1">
                      <Text className="font-extrabold text-black">
                        {
                          item.title
                        }
                      </Text>

                      <Text className="mt-1 text-xs leading-5 text-gray-500">
                        {
                          item.subtitle
                        }
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward-outline"
                      size={19}
                      color="#6B7280"
                    />
                  </TouchableOpacity>

                  {
                    index <
                    policies.length -
                      1 ? (
                      <View className="ml-16 h-px bg-gray-200" />
                    ) : null
                  }
                </React.Fragment>
              ),
            )
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default Legal;
