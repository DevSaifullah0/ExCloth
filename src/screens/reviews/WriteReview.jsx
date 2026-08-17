import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

import React, {
  useMemo,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

import RatingStars from '../../components/reviews/RatingStars';

import AppModal from '../../components/common/AppModal';


const WriteReview = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const product =
    route.params?.product || null;

  const existingReview =
    route.params?.existingReview ||
    null;


  const productId =
    product?.id ||
    existingReview?.product_id ||
    null;

  const productName =
    product?.name ||
    'Product';


  // ==========================================
  // FORM STATE
  // ==========================================

  const [
    rating,
    setRating,
  ] = useState(
    Number(
      existingReview?.rating ||
      0,
    ),
  );

  const [
    title,
    setTitle,
  ] = useState(
    existingReview?.title ||
    '',
  );

  const [
    reviewText,
    setReviewText,
  ] = useState(
    existingReview
      ?.review_text ||
    '',
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  // ==========================================
  // MODAL STATE
  // ==========================================

  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    action: 'close',
  });


  // ==========================================
  // SHOW MODAL
  // ==========================================

  const showModal = ({
    type = 'info',
    title = '',
    message = '',
    confirmText = 'OK',
    action = 'close',
  }) => {
    setModal({
      visible: true,
      type,
      title,
      message,
      confirmText,
      action,
    });
  };


  // ==========================================
  // CLOSE MODAL
  // ==========================================

  const closeModal = () => {
    setModal(prev => ({
      ...prev,
      visible: false,
    }));
  };


  // ==========================================
  // MODAL CONFIRM
  // ==========================================

  const handleModalConfirm =
    () => {
      const action =
        modal.action;

      closeModal();

      if (
        action === 'back'
      ) {
        navigation.goBack();
      }
    };


  // ==========================================
  // EDIT MODE
  // ==========================================

  const isEditing =
    Boolean(
      existingReview?.id,
    );


  // ==========================================
  // RATING TEXT
  // ==========================================

  const ratingText =
    useMemo(() => {
      switch (rating) {
        case 1:
          return 'Poor';

        case 2:
          return 'Fair';

        case 3:
          return 'Good';

        case 4:
          return 'Very Good';

        case 5:
          return 'Excellent';

        default:
          return 'Select your rating';
      }
    }, [rating]);


  // ==========================================
  // EDGE FUNCTION ERROR
  // ==========================================

  const getFunctionErrorMessage =
    async error => {
      try {
        const response =
          error?.context;

        if (
          response &&
          typeof response.json ===
            'function'
        ) {
          const body =
            await response.json();

          if (
            typeof body?.error ===
            'string'
          ) {
            return body.error;
          }

          if (
            typeof body?.message ===
            'string'
          ) {
            return body.message;
          }
        }
      } catch (parseError) {
        console.log(
          'Review Error Parse:',
          parseError.message,
        );
      }

      return (
        error?.message ||
        'Unable to submit your review.'
      );
    };


  // ==========================================
  // VALIDATE
  // ==========================================

  const validateForm =
    () => {
      if (!productId) {
        showModal({
          type: 'error',
          title:
            'Product Missing',
          message:
            'Product information is missing.',
        });

        return false;
      }


      if (
        !Number.isInteger(
          Number(rating),
        ) ||
        Number(rating) < 1 ||
        Number(rating) > 5
      ) {
        showModal({
          type: 'warning',
          title:
            'Rating Required',
          message:
            'Please select a rating from 1 to 5 stars.',
          confirmText:
            'Select Rating',
        });

        return false;
      }


      if (
        title.trim().length >
        100
      ) {
        showModal({
          type: 'warning',
          title:
            'Review Title',
          message:
            'Review title cannot exceed 100 characters.',
        });

        return false;
      }


      const cleanReview =
        reviewText.trim();


      if (
        cleanReview.length < 5
      ) {
        showModal({
          type: 'warning',
          title:
            'Review Required',
          message:
            'Please write at least 5 characters about the product.',
          confirmText:
            'Continue Writing',
        });

        return false;
      }


      if (
        cleanReview.length >
        1000
      ) {
        showModal({
          type: 'warning',
          title:
            'Review Too Long',
          message:
            'Review cannot exceed 1000 characters.',
        });

        return false;
      }


      return true;
    };


  // ==========================================
  // SUBMIT REVIEW
  // ==========================================

  const handleSubmit =
    async () => {
      if (submitting) {
        return;
      }


      if (!validateForm()) {
        return;
      }


      try {
        setSubmitting(true);


        // ======================================
        // SESSION CHECK
        // ======================================

        const {
          data: { session },
          error: sessionError,
        } =
          await supabase.auth
            .getSession();


        if (sessionError) {
          throw sessionError;
        }


        if (!session?.user) {
          throw new Error(
            'Your session has expired. Please login again.',
          );
        }


        // ======================================
        // CALL SECURE EDGE FUNCTION
        // ======================================

        const {
          data,
          error,
        } =
          await supabase.functions
            .invoke(
              'submit-review',
              {
                body: {
                  product_id:
                    productId,

                  rating:
                    Number(rating),

                  title:
                    title.trim(),

                  review_text:
                    reviewText.trim(),
                },
              },
            );


        if (error) {
          const serverMessage =
            await getFunctionErrorMessage(
              error,
            );

          throw new Error(
            serverMessage,
          );
        }


        if (data?.error) {
          throw new Error(
            typeof data.error ===
              'string'
              ? data.error
              : 'Unable to submit your review.',
          );
        }


        if (!data?.success) {
          throw new Error(
            'Review could not be saved.',
          );
        }


        // ======================================
        // SUCCESS MODAL
        // ======================================

        showModal({
          type: 'success',

          title:
            isEditing
              ? 'Review Updated'
              : 'Review Submitted',

          message:
            isEditing
              ? 'Your review has been updated successfully.'
              : 'Thank you. Your review has been submitted successfully.',

          confirmText:
            'Done',

          action:
            'back',
        });

      } catch (error) {
        console.log(
          'Submit Review Error:',
          error.message,
        );


        showModal({
          type: 'error',

          title:
            'Review Error',

          message:
            error.message ||
            'Unable to submit your review.',

          confirmText:
            'Try Again',
        });

      } finally {
        setSubmitting(false);
      }
    };


  return (
    <SafeAreaView
      edges={[
        'top',
        'left',
        'right',
      ]}
      className="flex-1 bg-white"
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom:
              Math.max(
                insets.bottom,
                24,
              ) + 36,
          }}
        >
          {/* HEADER */}
          <View className="mt-4 flex-row items-center">
            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              disabled={
                submitting
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
                {isEditing
                  ? 'Edit Review'
                  : 'Write Review'}
              </Text>

              <Text
                numberOfLines={1}
                className="mt-1 text-sm text-gray-500"
              >
                {productName}
              </Text>
            </View>

            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
              <Ionicons
                name="star-outline"
                size={21}
                color="white"
              />
            </View>
          </View>


          {/* VERIFIED PURCHASE */}
          <View className="mt-7 flex-row items-start rounded-3xl bg-gray-100 p-5">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
              <Ionicons
                name="checkmark-circle"
                size={22}
                color="black"
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="font-extrabold text-black">
                Verified Purchase Review
              </Text>

              <Text className="mt-1 text-sm leading-6 text-gray-500">
                Reviews can only be submitted for products from delivered orders.
              </Text>
            </View>
          </View>


          {/* RATING */}
          <View className="mt-6 overflow-hidden rounded-3xl bg-black p-6">
            <Text className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400">
              Your Rating
            </Text>

            <Text className="mt-3 text-center text-2xl font-extrabold text-white">
              How was this product?
            </Text>

            <View className="mt-6 items-center rounded-2xl bg-white py-5">
              <RatingStars
                rating={
                  rating
                }
                onChange={
                  setRating
                }
                size={38}
                disabled={
                  submitting
                }
              />
            </View>

            <Text className="mt-5 text-center text-lg font-extrabold text-white">
              {ratingText}
            </Text>

            <Text className="mt-1 text-center text-sm text-gray-400">
              {rating > 0
                ? `${rating} out of 5`
                : 'Tap a star to rate'}
            </Text>
          </View>


          {/* REVIEW CONTENT */}
          <View className="mt-7 rounded-3xl bg-gray-100 p-4">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                <Ionicons
                  name="create-outline"
                  size={20}
                  color="black"
                />
              </View>

              <View className="ml-3">
                <Text className="text-lg font-extrabold text-black">
                  Review Details
                </Text>

                <Text className="mt-1 text-xs text-gray-500">
                  Tell other customers about your experience.
                </Text>
              </View>
            </View>

            <View className="mt-5 flex-row items-center justify-between">
              <Text className="text-sm font-bold text-black">
                Review Title
              </Text>

              <Text className="text-xs font-semibold text-gray-400">
                Optional
              </Text>
            </View>

            <TextInput
              value={
                title
              }
              onChangeText={
                value =>
                  setTitle(
                    value.slice(
                      0,
                      100,
                    ),
                  )
              }
              editable={
                !submitting
              }
              placeholder="Summarize your experience"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="sentences"
              maxLength={100}
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />

            <Text className="mt-2 text-right text-xs font-semibold text-gray-400">
              {title.length}/100
            </Text>


            <Text className="mt-5 text-sm font-bold text-black">
              Your Review
            </Text>

            <TextInput
              value={
                reviewText
              }
              onChangeText={
                value =>
                  setReviewText(
                    value.slice(
                      0,
                      1000,
                    ),
                  )
              }
              editable={
                !submitting
              }
              placeholder="Tell other customers about the quality, fit, material and your overall experience..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              maxLength={1000}
              className="mt-2 min-h-44 rounded-2xl bg-white px-4 py-4 text-black"
            />

            <View className="mt-2 flex-row justify-between">
              <Text className="text-xs font-semibold text-gray-400">
                Minimum 5 characters
              </Text>

              <Text className="text-xs font-semibold text-gray-400">
                {reviewText.length}/1000
              </Text>
            </View>
          </View>


          {/* GUIDELINES */}
          <View className="mt-5 flex-row items-start rounded-3xl border border-gray-200 bg-white p-5">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
              <Ionicons
                name="information-circle-outline"
                size={21}
                color="black"
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="font-extrabold text-black">
                Review Guidelines
              </Text>

              <Text className="mt-1 text-sm leading-6 text-gray-500">
                Share your genuine product experience. Avoid personal information, payment details or unrelated content.
              </Text>
            </View>
          </View>


          {/* SUBMIT */}
          <TouchableOpacity
            onPress={
              handleSubmit
            }
            disabled={
              submitting
            }
            activeOpacity={0.85}
            className={`mt-7 h-14 flex-row items-center justify-center rounded-2xl ${
              submitting
                ? 'bg-gray-400'
                : 'bg-black'
            }`}
          >
            {submitting ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Ionicons
                  name={
                    isEditing
                      ? 'save-outline'
                      : 'paper-plane-outline'
                  }
                  size={20}
                  color="white"
                />

                <Text className="ml-2 text-base font-extrabold text-white">
                  {isEditing
                    ? 'Update Review'
                    : 'Submit Review'}
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
        onConfirm={
          handleModalConfirm
        }
        onCancel={
          closeModal
        }
        dismissible={
          modal.action !==
          'back'
        }
      />
    </SafeAreaView>
  );
};


export default WriteReview;
