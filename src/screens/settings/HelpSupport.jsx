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

import AppModal from '../../components/common/AppModal';


const FAQS = [
  {
    question:
      'How can I track my order?',
    answer:
      'Open Profile, select My Orders, choose an order and open Order Tracking.',
  },
  {
    question:
      'How do I cancel an order?',
    answer:
      'Open the order details. If the order is still eligible for cancellation, the Cancel Order option will be available.',
  },
  {
    question:
      'How do returns work?',
    answer:
      'Open a delivered order and start a return request for eligible items. You can then track the return and refund status from the app.',
  },
  {
    question:
      'How do I change my shipping address?',
    answer:
      'Open Settings, then Shipping Addresses. You can add, edit and choose your saved addresses.',
  },
  {
    question:
      'Why am I not receiving notifications?',
    answer:
      'Open Settings, then Notification Settings and make sure device notification permission is enabled.',
  },
];


const HelpSupport = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    expanded,
    setExpanded,
  ] = useState(null);

  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });


  const contactSupport =
    async () => {
      try {
        const subject =
          encodeURIComponent(
            'ExCloth Support Request',
          );

        const body =
          encodeURIComponent(
            'Please describe your issue here:\n\n',
          );

        await Linking.openURL(
          `mailto:?subject=${subject}&body=${body}`,
        );

      } catch (error) {
        setModal({
          visible: true,
          type: 'error',
          title:
            'Unable to Open Email',
          message:
            'No compatible email app was found on this device.',
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
              Help & Support
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Find answers and get help
            </Text>
          </View>
        </View>


        <View className="mt-7 rounded-3xl bg-black p-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <Ionicons
              name="headset-outline"
              size={27}
              color="black"
            />
          </View>

          <Text className="mt-5 text-2xl font-extrabold text-white">
            Need help?
          </Text>

          <Text className="mt-2 leading-6 text-gray-300">
            Check common questions below or contact support from your email app.
          </Text>

          <TouchableOpacity
            onPress={
              contactSupport
            }
            activeOpacity={0.85}
            className="mt-5 h-12 flex-row items-center justify-center rounded-2xl bg-white"
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color="black"
            />

            <Text className="ml-2 font-extrabold text-black">
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>


        <Text className="mb-3 mt-8 text-lg font-extrabold text-black">
          Frequently Asked Questions
        </Text>

        {
          FAQS.map(
            (
              item,
              index,
            ) => {
              const isOpen =
                expanded ===
                index;

              return (
                <TouchableOpacity
                  key={
                    item.question
                  }
                  onPress={() =>
                    setExpanded(
                      isOpen
                        ? null
                        : index,
                    )
                  }
                  activeOpacity={0.85}
                  className="mb-3 rounded-2xl bg-gray-100 p-5"
                >
                  <View className="flex-row items-start">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                      <Ionicons
                        name="help-outline"
                        size={20}
                        color="black"
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="font-extrabold leading-6 text-black">
                        {
                          item.question
                        }
                      </Text>
                    </View>

                    <Ionicons
                      name={
                        isOpen
                          ? 'chevron-up-outline'
                          : 'chevron-down-outline'
                      }
                      size={19}
                      color="#6B7280"
                    />
                  </View>

                  {
                    isOpen ? (
                      <Text className="ml-[52px] mt-3 leading-6 text-gray-500">
                        {
                          item.answer
                        }
                      </Text>
                    ) : null
                  }
                </TouchableOpacity>
              );
            },
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


export default HelpSupport;
