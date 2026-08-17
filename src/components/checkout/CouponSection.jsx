import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import React, {
  useEffect,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import { supabase } from '../../lib/supabase';

import AppModal from '../common/AppModal';


const CouponSection = ({
  subtotal = 0,
  appliedCoupon = null,
  onCouponApplied,
  onCouponRemoved,
  disabled = false,
}) => {
  const [
    code,
    setCode,
  ] = useState(
    appliedCoupon?.code ||
      '',
  );

  const [
    applying,
    setApplying,
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


  const showModal = ({
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
  };


  const closeModal = () => {
    setModal(prev => ({
      ...prev,
      visible: false,
    }));
  };


  useEffect(() => {
    setCode(
      appliedCoupon?.code ||
        '',
    );
  }, [
    appliedCoupon?.code,
  ]);


  const handleApply =
    async () => {
      if (
        applying ||
        disabled
      ) {
        return;
      }


      const cleanCode =
        code
          .trim()
          .toUpperCase();


      if (!cleanCode) {
        showModal({
          type: 'warning',
          title:
            'Promo Code Required',
          message:
            'Please enter a promo code.',
          confirmText:
            'Enter Code',
        });

        return;
      }


      if (
        Number(subtotal) <= 0
      ) {
        showModal({
          type: 'warning',
          title:
            'Empty Cart',
          message:
            'Add products to your cart before applying a promo code.',
        });

        return;
      }


      try {
        setApplying(true);


        const {
          data,
          error,
        } =
          await supabase.rpc(
            'validate_coupon',
            {
              p_code:
                cleanCode,

              p_subtotal:
                Number(subtotal),
            },
          );


        if (error) {
          throw error;
        }


        if (!data?.valid) {
          showModal({
            type: 'warning',
            title:
              'Coupon Not Applied',
            message:
              data?.message ||
              'This promo code is not valid.',
            confirmText:
              'Try Another',
          });

          return;
        }


        const coupon = {
          id:
            data.coupon_id,

          code:
            data.code,

          discountType:
            data.discount_type,

          discountValue:
            Number(
              data.discount_value ||
                0,
            ),

          discountAmount:
            Number(
              data.discount_amount ||
                0,
            ),
        };


        setCode(
          coupon.code,
        );


        if (
          typeof onCouponApplied ===
          'function'
        ) {
          onCouponApplied(
            coupon,
          );
        }


        showModal({
          type: 'success',
          title:
            'Coupon Applied',
          message:
            `${coupon.code} saved you Rs ${coupon.discountAmount.toFixed(
              0,
            )}.`,
          confirmText:
            'Great',
        });

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Coupon Error:',
            error.message,
          );
        }


        showModal({
          type: 'error',
          title:
            'Coupon Error',
          message:
            'Unable to validate this promo code right now.',
          confirmText:
            'Try Again',
        });

      } finally {
        setApplying(false);
      }
    };


  const handleRemove =
    () => {
      if (
        applying ||
        disabled
      ) {
        return;
      }


      setCode('');


      if (
        typeof onCouponRemoved ===
        'function'
      ) {
        onCouponRemoved();
      }
    };


  return (
    <View className="rounded-3xl bg-gray-100 p-5">
      <View className="flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
          <Ionicons
            name="pricetag-outline"
            size={22}
            color="black"
          />
        </View>

        <View className="ml-4 flex-1">
          <Text className="text-lg font-extrabold text-black">
            Promo Code
          </Text>

          <Text className="mt-1 text-sm text-gray-500">
            Apply a valid coupon to your order.
          </Text>
        </View>
      </View>


      {appliedCoupon ? (
        <View className="mt-5 overflow-hidden rounded-3xl bg-black p-5">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color="black"
              />
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Applied
              </Text>

              <Text className="mt-1 text-lg font-extrabold text-white">
                {appliedCoupon.code}
              </Text>

              <Text className="mt-1 text-sm text-gray-300">
                You save Rs{' '}
                {Number(
                  appliedCoupon.discountAmount ||
                    0,
                ).toFixed(0)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={
              handleRemove
            }
            disabled={
              disabled ||
              applying
            }
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Remove coupon"
            className="mt-5 h-12 items-center justify-center rounded-2xl bg-white"
          >
            <Text className="font-extrabold text-black">
              Remove Coupon
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View className="mt-5 flex-row items-center rounded-2xl bg-white px-4">
            <Ionicons
              name="ticket-outline"
              size={20}
              color="#6B7280"
            />

            <TextInput
              value={
                code
              }
              onChangeText={
                value =>
                  setCode(
                    value
                      .toUpperCase()
                      .replace(
                        /\s/g,
                        '',
                      ),
                  )
              }
              editable={
                !disabled &&
                !applying
              }
              placeholder="Enter promo code"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={
                handleApply
              }
              className="ml-3 h-14 flex-1 font-extrabold text-black"
            />

            {code ? (
              <TouchableOpacity
                onPress={() =>
                  setCode('')
                }
                disabled={
                  applying ||
                  disabled
                }
                activeOpacity={0.8}
                className="h-9 w-9 items-center justify-center rounded-xl bg-gray-100"
              >
                <Ionicons
                  name="close-outline"
                  size={19}
                  color="black"
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={
              handleApply
            }
            disabled={
              disabled ||
              applying
            }
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Apply promo code"
            className={`mt-3 h-14 flex-row items-center justify-center rounded-2xl ${
              disabled ||
              applying
                ? 'bg-gray-300'
                : 'bg-black'
            }`}
          >
            {applying ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark-outline"
                  size={20}
                  color="white"
                />

                <Text className="ml-2 text-base font-extrabold text-white">
                  Apply Coupon
                </Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}


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
        onConfirm={
          closeModal
        }
        onCancel={
          closeModal
        }
      />
    </View>
  );
};


export default CouponSection;
