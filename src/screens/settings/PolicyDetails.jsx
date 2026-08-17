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


const POLICIES = {
  privacy: {
    title:
      'Privacy Policy',
    icon:
      'shield-checkmark-outline',
    updated:
      '17 August 2026',
    sections: [
      {
        heading:
          'Information We Use',
        body:
          'ExCloth may use account information, profile details, shipping addresses, order information, return information and app activity that is required to provide shopping and account features.',
      },
      {
        heading:
          'Payments',
        body:
          'Payment information should only be processed through the configured payment flow. ExCloth should not store raw card PINs, OTPs, CVVs or other sensitive payment secrets in the application database.',
      },
      {
        heading:
          'Notifications',
        body:
          'Push tokens may be stored for authenticated users so ExCloth can deliver account, order, return and promotional notifications according to available notification preferences.',
      },
      {
        heading:
          'Account Security',
        body:
          'Authentication is handled through the configured Supabase Auth project. Users are responsible for keeping their credentials private.',
      },
      {
        heading:
          'Account Deletion',
        body:
          'Account deletion disables the authentication account. Transaction records may need to be retained where required for order history, fraud prevention, accounting or legal obligations.',
      },
    ],
  },

  terms: {
    title:
      'Terms & Conditions',
    icon:
      'document-text-outline',
    updated:
      '17 August 2026',
    sections: [
      {
        heading:
          'Using ExCloth',
        body:
          'Users must provide accurate account and delivery information and must not misuse the application, attempt unauthorized access or interfere with store operations.',
      },
      {
        heading:
          'Products & Availability',
        body:
          'Product availability, sizes, colors, prices and promotions may change. An order is subject to successful validation and available inventory.',
      },
      {
        heading:
          'Orders',
        body:
          'Customers are responsible for reviewing cart items, quantities, shipping information and payment method before placing an order.',
      },
      {
        heading:
          'Promotions',
        body:
          'Coupons and promotions may have eligibility rules, usage limits, minimum order amounts and expiry dates.',
      },
      {
        heading:
          'Administration',
        body:
          'Administrative functionality is restricted to authorized ExCloth administrator accounts and is separate from customer shopping functionality.',
      },
    ],
  },

  shipping: {
    title:
      'Shipping Policy',
    icon:
      'car-outline',
    updated:
      '17 August 2026',
    sections: [
      {
        heading:
          'Shipping Address',
        body:
          'Customers should provide a complete and reachable shipping address, including phone number and relevant area or landmark information.',
      },
      {
        heading:
          'Order Tracking',
        body:
          'Available order statuses may include pending, confirmed, processing, shipped, out for delivery, delivered and cancelled.',
      },
      {
        heading:
          'Delivery Time',
        body:
          'Delivery estimates depend on destination, inventory, order processing and courier operations. An estimated time is not a guaranteed delivery time.',
      },
      {
        heading:
          'Failed Delivery',
        body:
          'Delivery may be delayed or fail when the address or contact information is incorrect, incomplete or unreachable.',
      },
    ],
  },

  returns: {
    title:
      'Return & Refund Policy',
    icon:
      'return-down-back-outline',
    updated:
      '17 August 2026',
    sections: [
      {
        heading:
          'Return Requests',
        body:
          'Eligible customers can request a return from the relevant delivered order while the order remains within the configured return eligibility rules.',
      },
      {
        heading:
          'Return Review',
        body:
          'A return request may be approved or rejected after review. Approved returns can proceed through pickup, received and refund-processing stages.',
      },
      {
        heading:
          'Returned Items',
        body:
          'Returned products should match the items included in the approved return request and should meet the condition requirements defined by the store.',
      },
      {
        heading:
          'Refunds',
        body:
          'Refund timing and method depend on the original payment method, return approval and completion of the return workflow.',
      },
    ],
  },
};


const PolicyDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const policyKey =
    route.params?.policy ||
    'privacy';

  const policy =
    POLICIES[
      policyKey
    ] ||
    POLICIES.privacy;


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
              {
                policy.title
              }
            </Text>

            <Text className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Updated {
                policy.updated
              }
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
            {
              policy.title
            }
          </Text>

          <Text className="mt-2 leading-6 text-gray-300">
            This in-app policy text is a product draft for ExCloth and should be reviewed before production or store publication.
          </Text>
        </View>


        {
          policy.sections.map(
            (
              section,
              index,
            ) => (
              <View
                key={
                  section.heading
                }
                className={`rounded-3xl bg-gray-100 p-5 ${
                  index === 0
                    ? 'mt-6'
                    : 'mt-4'
                }`}
              >
                <Text className="text-lg font-extrabold text-black">
                  {
                    section.heading
                  }
                </Text>

                <Text className="mt-3 leading-7 text-gray-600">
                  {
                    section.body
                  }
                </Text>
              </View>
            ),
          )
        }
      </ScrollView>
    </SafeAreaView>
  );
};


export default PolicyDetails;
