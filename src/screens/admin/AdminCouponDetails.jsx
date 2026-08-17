import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const DISCOUNT_TYPES = [
  {
    key: 'percentage',
    label: 'Percentage',
    example: '10% OFF',
  },
  {
    key: 'fixed',
    label: 'Fixed Amount',
    example: 'Rs 500 OFF',
  },
];


const AdminCouponDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const routeCouponId =
    route.params?.couponId ??
    null;

  const [
    currentCouponId,
    setCurrentCouponId,
  ] = useState(
    routeCouponId,
  );

  const isEditing =
    Boolean(
      currentCouponId,
    );


  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


  const [
    code,
    setCode,
  ] = useState('');

  const [
    discountType,
    setDiscountType,
  ] = useState(
    'percentage',
  );

  const [
    discountValue,
    setDiscountValue,
  ] = useState('');

  const [
    minimumOrderAmount,
    setMinimumOrderAmount,
  ] = useState('0');

  const [
    maximumDiscountAmount,
    setMaximumDiscountAmount,
  ] = useState('');

  const [
    usageLimit,
    setUsageLimit,
  ] = useState('');

  const [
    perUserLimit,
    setPerUserLimit,
  ] = useState('1');

  const [
    startsAt,
    setStartsAt,
  ] = useState('');

  const [
    expiresAt,
    setExpiresAt,
  ] = useState('');

  const [
    isActive,
    setIsActive,
  ] = useState(true);

  const [
    usageCount,
    setUsageCount,
  ] = useState(0);


  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
    onConfirm: null,
  });


  const closeModal =
    () => {
      if (saving) {
        return;
      }

      setModal(
        current => ({
          ...current,
          visible: false,
        }),
      );
    };


  const showModal =
    ({
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


  const normalizeCode =
    value =>
      String(value || '')
        .toUpperCase()
        .replace(
          /[^A-Z0-9_-]/g,
          '',
        );


  const toDateInput =
    value => {
      if (!value) {
        return '';
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return '';
      }

      const year =
        date.getUTCFullYear();

      const month =
        String(
          date.getUTCMonth() +
            1,
        ).padStart(
          2,
          '0',
        );

      const day =
        String(
          date.getUTCDate(),
        ).padStart(
          2,
          '0',
        );

      return `${year}-${month}-${day}`;
    };


  const isValidDateText =
    value => {
      if (!value) {
        return true;
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          value,
        )
      ) {
        return false;
      }

      const date =
        new Date(
          `${value}T00:00:00.000Z`,
        );

      return !Number.isNaN(
        date.getTime(),
      );
    };


  const startOfDateIso =
    value =>
      value
        ? `${value}T00:00:00.000Z`
        : null;


  const endOfDateIso =
    value =>
      value
        ? `${value}T23:59:59.999Z`
        : null;


  const applyCouponData =
    data => {
      const coupon =
        data?.coupon ||
        data ||
        null;


      if (!coupon) {
        return;
      }


      setCode(
        coupon.code ||
          '',
      );

      setDiscountType(
        coupon.discount_type ||
          'percentage',
      );

      setDiscountValue(
        coupon.discount_value ===
          null ||
        coupon.discount_value ===
          undefined
          ? ''
          : String(
              coupon.discount_value,
            ),
      );

      setMinimumOrderAmount(
        String(
          coupon.minimum_order_amount ??
            0,
        ),
      );

      setMaximumDiscountAmount(
        coupon.maximum_discount_amount ===
          null ||
        coupon.maximum_discount_amount ===
          undefined
          ? ''
          : String(
              coupon.maximum_discount_amount,
            ),
      );

      setUsageLimit(
        coupon.usage_limit ===
          null ||
        coupon.usage_limit ===
          undefined
          ? ''
          : String(
              coupon.usage_limit,
            ),
      );

      setPerUserLimit(
        coupon.per_user_limit ===
          null ||
        coupon.per_user_limit ===
          undefined
          ? ''
          : String(
              coupon.per_user_limit,
            ),
      );

      setStartsAt(
        toDateInput(
          coupon.starts_at,
        ),
      );

      setExpiresAt(
        toDateInput(
          coupon.expires_at,
        ),
      );

      setIsActive(
        coupon.is_active !==
          false,
      );

      setUsageCount(
        Number(
          coupon.usage_count ??
            coupon.redemption_count ??
            data?.usage_count ??
            0,
        ),
      );
    };


  const fetchDetails =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setLoading(true);
          }

          setErrorMessage('');


          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth
              .getUser();


          if (userError) {
            throw userError;
          }


          if (!user) {
            throw new Error(
              'Admin session not found.',
            );
          }


          if (
            !currentCouponId
          ) {
            return;
          }


          const {
            data,
            error,
          } =
            await supabase.rpc(
              'get_admin_coupon_details_secure',
              {
                p_coupon_id:
                  currentCouponId,
              },
            );


          if (error) {
            throw error;
          }


          applyCouponData(
            data,
          );

        } catch (error) {
          console.log(
            'Admin Coupon Details Error:',
            error.message,
          );

          setErrorMessage(
            error.message ||
              'Unable to load coupon.',
          );

        } finally {
          setLoading(false);
        }
      },
      [
        currentCouponId,
      ],
    );


  useEffect(
    () => {
      fetchDetails();
    },
    [
      fetchDetails,
    ],
  );


  const validateCoupon =
    () => {
      if (
        code.trim().length <
        2
      ) {
        throw new Error(
          'Coupon code is required.',
        );
      }


      const numericDiscount =
        Number(
          discountValue,
        );


      if (
        !Number.isFinite(
          numericDiscount,
        ) ||
        numericDiscount <= 0
      ) {
        throw new Error(
          'Discount value must be greater than 0.',
        );
      }


      if (
        discountType ===
          'percentage' &&
        numericDiscount > 100
      ) {
        throw new Error(
          'Percentage discount cannot exceed 100%.',
        );
      }


      const numericMinimum =
        Number(
          minimumOrderAmount ||
            0,
        );


      if (
        !Number.isFinite(
          numericMinimum,
        ) ||
        numericMinimum < 0
      ) {
        throw new Error(
          'Minimum order amount is invalid.',
        );
      }


      if (
        maximumDiscountAmount
          .trim()
      ) {
        const numericMaximum =
          Number(
            maximumDiscountAmount,
          );

        if (
          !Number.isFinite(
            numericMaximum,
          ) ||
          numericMaximum <= 0
        ) {
          throw new Error(
            'Maximum discount amount is invalid.',
          );
        }
      }


      if (
        usageLimit.trim()
      ) {
        const numericUsage =
          Number(
            usageLimit,
          );

        if (
          !Number.isInteger(
            numericUsage,
          ) ||
          numericUsage <= 0
        ) {
          throw new Error(
            'Usage limit must be a positive whole number.',
          );
        }
      }


      if (
        perUserLimit.trim()
      ) {
        const numericPerUser =
          Number(
            perUserLimit,
          );

        if (
          !Number.isInteger(
            numericPerUser,
          ) ||
          numericPerUser <= 0
        ) {
          throw new Error(
            'Per-user limit must be a positive whole number.',
          );
        }
      }


      if (
        !isValidDateText(
          startsAt,
        )
      ) {
        throw new Error(
          'Start date must use YYYY-MM-DD format.',
        );
      }


      if (
        !isValidDateText(
          expiresAt,
        )
      ) {
        throw new Error(
          'Expiry date must use YYYY-MM-DD format.',
        );
      }


      if (
        startsAt &&
        expiresAt
      ) {
        const start =
          new Date(
            startOfDateIso(
              startsAt,
            ),
          ).getTime();

        const expiry =
          new Date(
            endOfDateIso(
              expiresAt,
            ),
          ).getTime();


        if (
          expiry <= start
        ) {
          throw new Error(
            'Expiry date must be after the start date.',
          );
        }
      }
    };


  const saveCoupon =
    async () => {
      if (saving) {
        return;
      }


      try {
        validateCoupon();

        setSaving(true);


        const {
          data,
          error,
        } =
          await supabase.rpc(
            'save_admin_coupon_secure',
            {
              p_coupon_id:
                currentCouponId ||
                null,

              p_code:
                normalizeCode(
                  code,
                ),

              p_discount_type:
                discountType,

              p_discount_value:
                Number(
                  discountValue,
                ),

              p_minimum_order_amount:
                Number(
                  minimumOrderAmount ||
                    0,
                ),

              p_maximum_discount_amount:
                maximumDiscountAmount
                  .trim()
                  ? Number(
                      maximumDiscountAmount,
                    )
                  : null,

              p_usage_limit:
                usageLimit.trim()
                  ? Number(
                      usageLimit,
                    )
                  : null,

              p_per_user_limit:
                perUserLimit.trim()
                  ? Number(
                      perUserLimit,
                    )
                  : null,

              p_starts_at:
                startOfDateIso(
                  startsAt,
                ),

              p_expires_at:
                endOfDateIso(
                  expiresAt,
                ),

              p_is_active:
                isActive,
            },
          );


        if (error) {
          throw error;
        }


        const savedCouponId =
          data?.coupon_id ??
          data?.id ??
          currentCouponId;


        if (
          savedCouponId ===
            null ||
          savedCouponId ===
            undefined
        ) {
          throw new Error(
            'Coupon ID was not returned.',
          );
        }


        setCurrentCouponId(
          savedCouponId,
        );


        showModal({
          type: 'success',
          title:
            currentCouponId
              ? 'Coupon Updated'
              : 'Coupon Created',
          message:
            'Coupon has been saved successfully.',
          confirmText:
            'OK',
          onConfirm:
            () => {
              setModal(
                current => ({
                  ...current,
                  visible: false,
                }),
              );

              navigation.setParams({
                couponId:
                  savedCouponId,
              });

              fetchDetails({
                silent: true,
              });
            },
        });

      } catch (error) {
        console.log(
          'Save Coupon Error:',
          error.message,
        );

        showModal({
          type: 'error',
          title:
            'Save Failed',
          message:
            error.message ||
            'Unable to save coupon.',
        });

      } finally {
        setSaving(false);
      }
    };


  const busy =
    saving;


  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">

        <ActivityIndicator
          size="large"
          color="black"
        />

        <Text className="mt-3 text-gray-500">
          Loading coupon...
        </Text>

      </SafeAreaView>
    );
  }


  if (
    errorMessage
  ) {
    return (
      <SafeAreaView className="flex-1 bg-white">

        <View className="px-5">

          <View className="mt-4 flex-row items-center">

            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
            >
              <Ionicons
                name="arrow-back-outline"
                size={22}
                color="black"
              />
            </TouchableOpacity>

            <Text className="ml-4 text-2xl font-extrabold text-black">
              Coupon
            </Text>

          </View>


          <View className="mt-20 items-center">

            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#D1D5DB"
            />

            <Text className="mt-5 text-xl font-extrabold text-black">
              Unable to load coupon
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={() =>
                fetchDetails()
              }
              activeOpacity={0.85}
              className="mt-6 rounded-2xl bg-black px-7 py-4"
            >
              <Text className="font-bold text-white">
                Try Again
              </Text>
            </TouchableOpacity>

          </View>

        </View>

      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={[
        'top',
        'left',
        'right',
      ]}
    >

      <KeyboardAvoidingView
        className="flex-1"
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingBottom:
              Math.max(
                insets.bottom,
                24,
              ) + 80,
          }}
        >

          <View className="mt-4 flex-row items-center">

            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
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
                {isEditing
                  ? 'Edit Coupon'
                  : 'Add Coupon'}
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Discount rules and limits
              </Text>

            </View>

          </View>


          {isEditing ? (
            <View className="mt-6 rounded-3xl bg-black p-5">

              <Text className="text-sm font-semibold text-gray-400">
                Total Redemptions
              </Text>

              <Text className="mt-1 text-3xl font-extrabold text-white">
                {usageCount}
              </Text>

            </View>
          ) : null}


          <Text className="mb-3 mt-7 text-lg font-bold text-black">
            Coupon Information
          </Text>


          <View className="rounded-3xl bg-gray-100 p-5">

            <Text className="font-semibold text-black">
              Coupon Code
            </Text>

            <TextInput
              value={code}
              onChangeText={
                value =>
                  setCode(
                    normalizeCode(
                      value,
                    ),
                  )
              }
              autoCapitalize="characters"
              placeholder="WELCOME10"
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />


            <Text className="mt-5 font-semibold text-black">
              Discount Type
            </Text>


            <View className="mt-2 flex-row gap-3">

              {DISCOUNT_TYPES.map(
                item => {
                  const selected =
                    discountType ===
                    item.key;

                  return (
                    <TouchableOpacity
                      key={
                        item.key
                      }
                      onPress={() =>
                        setDiscountType(
                          item.key,
                        )
                      }
                      activeOpacity={0.85}
                      className={`flex-1 rounded-xl p-4 ${
                        selected
                          ? 'bg-black'
                          : 'bg-white'
                      }`}
                    >
                      <Text
                        className={`font-bold ${
                          selected
                            ? 'text-white'
                            : 'text-black'
                        }`}
                      >
                        {
                          item.label
                        }
                      </Text>

                      <Text
                        className={`mt-1 text-xs ${
                          selected
                            ? 'text-gray-300'
                            : 'text-gray-500'
                        }`}
                      >
                        {
                          item.example
                        }
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}

            </View>


            <Text className="mt-5 font-semibold text-black">
              Discount Value
            </Text>

            <TextInput
              value={
                discountValue
              }
              onChangeText={
                value =>
                  setDiscountValue(
                    value.replace(
                      /[^0-9.]/g,
                      '',
                    ),
                  )
              }
              keyboardType="decimal-pad"
              placeholder={
                discountType ===
                'percentage'
                  ? '10'
                  : '500'
              }
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />


            <Text className="mt-5 font-semibold text-black">
              Minimum Order Amount
            </Text>

            <TextInput
              value={
                minimumOrderAmount
              }
              onChangeText={
                value =>
                  setMinimumOrderAmount(
                    value.replace(
                      /[^0-9.]/g,
                      '',
                    ),
                  )
              }
              keyboardType="decimal-pad"
              placeholder="1000"
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />


            <Text className="mt-5 font-semibold text-black">
              Maximum Discount Amount
            </Text>

            <TextInput
              value={
                maximumDiscountAmount
              }
              onChangeText={
                value =>
                  setMaximumDiscountAmount(
                    value.replace(
                      /[^0-9.]/g,
                      '',
                    ),
                  )
              }
              keyboardType="decimal-pad"
              placeholder="Optional"
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />

            <Text className="mt-2 text-xs leading-5 text-gray-500">
              Useful for percentage coupons. Leave empty for no cap.
            </Text>

          </View>


          <Text className="mb-3 mt-7 text-lg font-bold text-black">
            Usage Limits
          </Text>


          <View className="rounded-3xl bg-gray-100 p-5">

            <Text className="font-semibold text-black">
              Total Usage Limit
            </Text>

            <TextInput
              value={
                usageLimit
              }
              onChangeText={
                value =>
                  setUsageLimit(
                    value.replace(
                      /[^0-9]/g,
                      '',
                    ),
                  )
              }
              keyboardType="number-pad"
              placeholder="Optional"
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />


            <Text className="mt-5 font-semibold text-black">
              Per User Limit
            </Text>

            <TextInput
              value={
                perUserLimit
              }
              onChangeText={
                value =>
                  setPerUserLimit(
                    value.replace(
                      /[^0-9]/g,
                      '',
                    ),
                  )
              }
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />

          </View>


          <Text className="mb-3 mt-7 text-lg font-bold text-black">
            Validity
          </Text>


          <View className="rounded-3xl bg-gray-100 p-5">

            <Text className="font-semibold text-black">
              Start Date
            </Text>

            <TextInput
              value={
                startsAt
              }
              onChangeText={
                setStartsAt
              }
              autoCapitalize="none"
              placeholder="YYYY-MM-DD (Optional)"
              placeholderTextColor="#9CA3AF"
              maxLength={10}
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />


            <Text className="mt-5 font-semibold text-black">
              Expiry Date
            </Text>

            <TextInput
              value={
                expiresAt
              }
              onChangeText={
                setExpiresAt
              }
              autoCapitalize="none"
              placeholder="YYYY-MM-DD (Optional)"
              placeholderTextColor="#9CA3AF"
              maxLength={10}
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />


            <TouchableOpacity
              onPress={() =>
                setIsActive(
                  !isActive,
                )
              }
              activeOpacity={0.85}
              className="mt-5 flex-row items-center rounded-2xl bg-white p-4"
            >

              <View
                className={`h-7 w-7 items-center justify-center rounded-lg ${
                  isActive
                    ? 'bg-black'
                    : 'bg-gray-100'
                }`}
              >
                {isActive ? (
                  <Ionicons
                    name="checkmark"
                    size={17}
                    color="white"
                  />
                ) : null}
              </View>

              <View className="ml-3 flex-1">

                <Text className="font-bold text-black">
                  Active Coupon
                </Text>

                <Text className="mt-1 text-xs text-gray-500">
                  Customers can use this coupon when enabled
                </Text>

              </View>

            </TouchableOpacity>

          </View>


          <TouchableOpacity
            onPress={
              saveCoupon
            }
            disabled={busy}
            activeOpacity={0.85}
            className="mt-7 h-14 flex-row items-center justify-center rounded-2xl bg-black"
          >

            {busy ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={21}
                  color="white"
                />

                <Text className="ml-2 text-base font-bold text-white">
                  {isEditing
                    ? 'Save Coupon'
                    : 'Create Coupon'}
                </Text>
              </>
            )}

          </TouchableOpacity>

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
        cancelText={
          modal.cancelText
        }
        showCancel={
          modal.showCancel
        }
        dismissible={
          !busy
        }
        loading={
          busy
        }
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




export default AdminCouponDetails;
