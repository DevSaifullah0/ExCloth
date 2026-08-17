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

const packageJson =
  require('../../../package.json');


const About = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const version =
    packageJson?.version ||
    '1.0.0';


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
              About ExCloth
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Application information
            </Text>
          </View>
        </View>


        <View className="mt-7 items-center rounded-3xl bg-black p-8">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-white">
            <Text className="text-3xl font-black text-black">
              EC
            </Text>
          </View>

          <Text className="mt-5 text-3xl font-extrabold text-white">
            ExCloth
          </Text>

          <Text className="mt-2 text-center leading-6 text-gray-300">
            A modern fashion ecommerce experience for discovering products, managing orders, returns and account activity.
          </Text>

          <View className="mt-5 rounded-full bg-white px-4 py-2">
            <Text className="text-xs font-extrabold text-black">
              Version {
                version
              }
            </Text>
          </View>
        </View>


        <Text className="mb-3 mt-8 text-lg font-extrabold text-black">
          Features
        </Text>

        {
          [
            [
              'storefront-outline',
              'Shopping',
              'Products, categories, search, cart and wishlist',
            ],
            [
              'card-outline',
              'Checkout',
              'Shipping, coupons and payment flows',
            ],
            [
              'bag-check-outline',
              'Orders',
              'Order history, details and tracking',
            ],
            [
              'return-down-back-outline',
              'Returns',
              'Return requests and refund tracking',
            ],
            [
              'notifications-outline',
              'Notifications',
              'Order, return and store updates',
            ],
          ].map(
            item => (
              <View
                key={
                  item[1]
                }
                className="mb-3 flex-row items-center rounded-2xl bg-gray-100 p-4"
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name={
                      item[0]
                    }
                    size={21}
                    color="black"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-black">
                    {
                      item[1]
                    }
                  </Text>

                  <Text className="mt-1 text-xs leading-5 text-gray-500">
                    {
                      item[2]
                    }
                  </Text>
                </View>
              </View>
            ),
          )
        }
      </ScrollView>
    </SafeAreaView>
  );
};


export default About;
