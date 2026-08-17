import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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


const AdminReviewDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const reviewId =
    route.params?.reviewId;


  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    review,
    setReview,
  ] = useState(null);


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
      if (actionLoading) {
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


          if (!reviewId) {
            throw new Error(
              'Review ID is missing.',
            );
          }


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


          const {
            data,
            error,
          } =
            await supabase.rpc(
              'get_admin_review_details_secure',
              {
                p_review_id:
                  reviewId,
              },
            );


          if (error) {
            throw error;
          }


          setReview(
            data?.review ||
              data ||
              null,
          );

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Admin Review Details Error:',
              error.message,
            );
          }

          setErrorMessage(
            error.message ||
              'Unable to load review.',
          );

        } finally {
          setLoading(false);
        }
      },
      [
        reviewId,
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


  const formatDateTime =
    value => {
      if (!value) {
        return 'Not available';
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return 'Not available';
      }

      return date.toLocaleString(
        'en-GB',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      );
    };


  const renderStars =
    rating => {
      const numericRating =
        Math.max(
          0,
          Math.min(
            5,
            Number(rating || 0),
          ),
        );

      return (
        <View className="flex-row items-center">
          {[1, 2, 3, 4, 5].map(
            star => (
              <Ionicons
                key={star}
                name={
                  star <= numericRating
                    ? 'star'
                    : 'star-outline'
                }
                size={24}
                color="black"
              />
            ),
          )}
        </View>
      );
    };


  const setApproval =
    async approved => {
      if (
        actionLoading ||
        !reviewId
      ) {
        return;
      }


      try {
        setActionLoading(
          true,
        );


        const {
          error,
        } =
          await supabase.rpc(
            'set_admin_review_approval_secure',
            {
              p_review_id:
                reviewId,
              p_is_approved:
                approved,
            },
          );


        if (error) {
          throw error;
        }


        await fetchDetails({
          silent: true,
        });


        setModal({
          visible: true,
          type: 'success',
          title:
            approved
              ? 'Review Approved'
              : 'Review Hidden',
          message:
            approved
              ? 'This review is now approved for customers.'
              : 'This review is no longer approved for customers.',
          confirmText: 'OK',
          cancelText: 'Cancel',
          showCancel: false,
          onConfirm: null,
        });

      } catch (error) {
        setModal({
          visible: true,
          type: 'error',
          title:
            'Action Failed',
          message:
            error.message ||
            'Unable to update review status.',
          confirmText: 'OK',
          cancelText: 'Cancel',
          showCancel: false,
          onConfirm: null,
        });

      } finally {
        setActionLoading(
          false,
        );
      }
    };


  const confirmApprovalAction =
    () => {
      const nextApprovedState =
        !review?.is_approved;


      showModal({
        type: 'confirm',
        title:
          nextApprovedState
            ? 'Approve Review?'
            : 'Hide Review?',
        message:
          nextApprovedState
            ? 'This review will become visible wherever approved reviews are shown.'
            : 'This review will be marked unapproved and hidden from approved review lists.',
        confirmText:
          nextApprovedState
            ? 'Approve'
            : 'Hide Review',
        cancelText:
          'Cancel',
        showCancel:
          true,
        onConfirm:
          async () => {
            setModal(
              current => ({
                ...current,
                visible: false,
              }),
            );

            await setApproval(
              nextApprovedState,
            );
          },
      });
    };


  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">

        <ActivityIndicator
          size="large"
          color="black"
        />

        <Text className="mt-3 text-gray-500">
          Loading review...
        </Text>

      </SafeAreaView>
    );
  }


  if (
    errorMessage ||
    !review
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
              Review Details
            </Text>

          </View>


          <View className="mt-20 items-center">

            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#D1D5DB"
            />

            <Text className="mt-5 text-xl font-extrabold text-black">
              Unable to load review
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage ||
                'Review data is unavailable.'}
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
            ) + 50,
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

            <Text className="text-2xl font-extrabold text-black">
              Review Details
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Review moderation
            </Text>

          </View>

        </View>


        <View className="mt-6 rounded-3xl bg-black p-6">

          <View className="flex-row items-start justify-between">

            <View className="mr-3 flex-1">

              <Text className="text-xl font-extrabold text-white">
                {review.reviewer_name ||
                  'Customer'}
              </Text>

              <Text className="mt-1 text-sm text-gray-400">
                {review.product_name ||
                  `Product #${review.product_id}`}
              </Text>

            </View>


            <View className="rounded-full bg-white px-3 py-1.5">

              <Text className="text-xs font-bold text-black">
                {review.is_approved
                  ? 'Approved'
                  : 'Pending'}
              </Text>

            </View>

          </View>


          <View className="mt-5">

            {
              renderStars(
                review.rating,
              )
            }

          </View>


          {review.title ? (
            <Text className="mt-5 text-lg font-extrabold text-white">
              {review.title}
            </Text>
          ) : null}


          <Text className="mt-3 text-base leading-7 text-gray-300">
            {review.review_text}
          </Text>

        </View>


        <Text className="mb-3 mt-7 text-lg font-bold text-black">
          Review Information
        </Text>


        <View className="rounded-3xl bg-gray-100 p-5">

          <View className="flex-row items-center justify-between">

            <Text className="text-sm font-semibold text-gray-500">
              Rating
            </Text>

            <Text className="font-extrabold text-black">
              {Number(
                review.rating ||
                  0,
              )} / 5
            </Text>

          </View>


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row items-center justify-between">

            <Text className="text-sm font-semibold text-gray-500">
              Verified Purchase
            </Text>

            <Text className="font-extrabold text-black">
              {review.is_verified_purchase
                ? 'Yes'
                : 'No'}
            </Text>

          </View>


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row items-start justify-between">

            <Text className="text-sm font-semibold text-gray-500">
              Created
            </Text>

            <Text className="ml-5 flex-1 text-right font-bold text-black">
              {
                formatDateTime(
                  review.created_at,
                )
              }
            </Text>

          </View>


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row items-start justify-between">

            <Text className="text-sm font-semibold text-gray-500">
              Updated
            </Text>

            <Text className="ml-5 flex-1 text-right font-bold text-black">
              {
                formatDateTime(
                  review.updated_at,
                )
              }
            </Text>

          </View>


          <View className="my-4 h-px bg-gray-200" />


          <View className="flex-row items-start justify-between">

            <Text className="text-sm font-semibold text-gray-500">
              Review ID
            </Text>

            <Text className="ml-5 flex-1 text-right font-bold text-black">
              #{review.id}
            </Text>

          </View>


          {review.order_id ? (
            <>
              <View className="my-4 h-px bg-gray-200" />

              <View className="flex-row items-start justify-between">

                <Text className="text-sm font-semibold text-gray-500">
                  Order
                </Text>

                <Text
                  numberOfLines={1}
                  className="ml-5 flex-1 text-right font-bold text-black"
                >
                  {review.order_number ||
                    review.order_id}
                </Text>

              </View>
            </>
          ) : null}

        </View>


        {review.user_email ? (
          <>
            <Text className="mb-3 mt-7 text-lg font-bold text-black">
              Customer
            </Text>


            <View className="rounded-3xl bg-gray-100 p-5">

              <View className="flex-row items-center">

                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">

                  <Ionicons
                    name="mail-outline"
                    size={21}
                    color="black"
                  />

                </View>

                <View className="ml-3 flex-1">

                  <Text className="text-xs font-semibold text-gray-500">
                    Email
                  </Text>

                  <Text className="mt-1 font-bold text-black">
                    {review.user_email}
                  </Text>

                </View>

              </View>

            </View>
          </>
        ) : null}


        <Text className="mb-3 mt-7 text-lg font-bold text-black">
          Moderation
        </Text>


        <TouchableOpacity
          onPress={
            confirmApprovalAction
          }
          disabled={
            actionLoading
          }
          activeOpacity={0.85}
          className="flex-row items-center rounded-2xl bg-gray-100 p-5"
        >

          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">

            <Ionicons
              name={
                review.is_approved
                  ? 'eye-off-outline'
                  : 'checkmark-circle-outline'
              }
              size={24}
              color="black"
            />

          </View>


          <View className="ml-4 flex-1">

            <Text className="text-lg font-extrabold text-black">
              {review.is_approved
                ? 'Hide Review'
                : 'Approve Review'}
            </Text>

            <Text className="mt-1 text-sm leading-5 text-gray-500">
              {review.is_approved
                ? 'Mark this review as unapproved.'
                : 'Approve this review for customer visibility.'}
            </Text>

          </View>


          {actionLoading ? (
            <ActivityIndicator
              color="black"
            />
          ) : (
            <Ionicons
              name="chevron-forward-outline"
              size={22}
              color="#6B7280"
            />
          )}

        </TouchableOpacity>

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
          !actionLoading
        }
        loading={
          actionLoading
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




export default AdminReviewDetails;
