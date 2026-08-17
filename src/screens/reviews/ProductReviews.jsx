import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  useFocusEffect,
} from '@react-navigation/native';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

import RatingStars from '../../components/reviews/RatingStars';


const ProductReviews = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const product =
    route.params?.product || null;

  const productId =
    product?.id ||
    route.params?.productId ||
    null;

  const productName =
    product?.name ||
    route.params?.productName ||
    'Product';


  const [
    reviews,
    setReviews,
  ] = useState([]);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(null);

  const [
    canReview,
    setCanReview,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


  // ==========================================
  // FETCH REVIEWS
  // ==========================================

  const fetchReviews =
    useCallback(async () => {
      try {
        setErrorMessage('');

        if (!productId) {
          throw new Error(
            'Product information is missing.',
          );
        }


        // ======================================
        // CURRENT USER
        // ======================================

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth
            .getUser();


        if (userError) {
          throw userError;
        }


        if (!user) {
          throw new Error(
            'User session not found.',
          );
        }


        setCurrentUserId(
          user.id,
        );


        // ======================================
        // PRODUCT REVIEWS
        // ======================================

        const {
          data: reviewData,
          error: reviewError,
        } =
          await supabase
            .from(
              'product_reviews',
            )
            .select(`
              id,
              user_id,
              product_id,
              order_id,
              rating,
              title,
              review_text,
              reviewer_name,
              is_verified_purchase,
              is_approved,
              created_at,
              updated_at
            `)
            .eq(
              'product_id',
              productId,
            )
            .order(
              'created_at',
              {
                ascending: false,
              },
            );


        if (reviewError) {
          throw reviewError;
        }


        setReviews(
          reviewData || [],
        );


        // ======================================
        // REVIEW ELIGIBILITY
        // ======================================
        //
        // User can review only after a
        // delivered order containing product.
        //
        // Server also verifies this again.
        // ======================================

        const {
          data: deliveredOrders,
          error: orderError,
        } =
          await supabase
            .from('orders')
            .select(`
              id
            `)
            .eq(
              'user_id',
              user.id,
            )
            .eq(
              'status',
              'delivered',
            );


        if (orderError) {
          throw orderError;
        }


        const deliveredOrderIds =
          (deliveredOrders || [])
            .map(
              order => order.id,
            )
            .filter(Boolean);


        if (
          deliveredOrderIds.length ===
          0
        ) {
          setCanReview(false);
          return;
        }


        const {
          data: purchasedItems,
          error: itemError,
        } =
          await supabase
            .from('order_items')
            .select(`
              id,
              order_id
            `)
            .eq(
              'product_id',
              productId,
            )
            .in(
              'order_id',
              deliveredOrderIds,
            )
            .limit(1);


        if (itemError) {
          throw itemError;
        }


        setCanReview(
          Boolean(
            purchasedItems &&
            purchasedItems.length > 0,
          ),
        );

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Product Reviews Error:',
            error.message,
          );
        }

        setErrorMessage(
          'Unable to load product reviews.',
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [productId]);


  // ==========================================
  // REFRESH WHEN SCREEN OPENS
  // ==========================================

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      fetchReviews();
    }, [fetchReviews]),
  );


  // ==========================================
  // PULL TO REFRESH
  // ==========================================

  const handleRefresh =
    () => {
      setRefreshing(true);

      fetchReviews();
    };


  // ==========================================
  // USER REVIEW
  // ==========================================

  const userReview =
    useMemo(
      () =>
        reviews.find(
          review =>
            review.user_id ===
            currentUserId,
        ) || null,
      [
        reviews,
        currentUserId,
      ],
    );


  // ==========================================
  // AVERAGE RATING
  // ==========================================

  const averageRating =
    useMemo(() => {
      if (
        reviews.length === 0
      ) {
        return 0;
      }

      const total =
        reviews.reduce(
          (
            sum,
            review,
          ) =>
            sum +
            Number(
              review.rating || 0,
            ),
          0,
        );

      return (
        total /
        reviews.length
      );
    }, [reviews]);


  // ==========================================
  // RATING DISTRIBUTION
  // ==========================================

  const ratingCounts =
    useMemo(() => {
      const counts = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      };

      reviews.forEach(
        review => {
          const rating =
            Number(
              review.rating,
            );

          if (
            counts[rating] !==
            undefined
          ) {
            counts[rating] += 1;
          }
        },
      );

      return counts;
    }, [reviews]);


  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate =
    date => {
      if (!date) {
        return '';
      }

      return new Date(
        date,
      ).toLocaleDateString(
        undefined,
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        },
      );
    };


  // ==========================================
  // WRITE / EDIT REVIEW
  // ==========================================

  const handleWriteReview =
    () => {
      navigation.navigate(
        'WriteReview',
        {
          product:
            product || {
              id: productId,
              name: productName,
            },

          existingReview:
            userReview,
        },
      );
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
            ) + 36,
        }}
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
        }
      >
        {/* HEADER */}
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
            <Text className="text-3xl font-extrabold text-black">
              Reviews
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


        {/* LOADING */}
        {loading ? (
          <View className="items-center py-24">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <ActivityIndicator
                size="large"
                color="black"
              />
            </View>

            <Text className="mt-4 font-semibold text-gray-500">
              Loading reviews...
            </Text>
          </View>
        ) : null}


        {/* ERROR */}
        {!loading &&
        errorMessage ? (
          <View className="mt-8 items-center rounded-3xl bg-gray-100 p-7">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="alert-circle-outline"
                size={30}
                color="black"
              />
            </View>

            <Text className="mt-4 text-lg font-extrabold text-black">
              Reviews unavailable
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={() => {
                setLoading(true);
                fetchReviews();
              }}
              activeOpacity={0.85}
              className="mt-5 rounded-2xl bg-black px-6 py-3"
            >
              <Text className="font-extrabold text-white">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}


        {!loading &&
        !errorMessage ? (
          <>
            {/* RATING HERO */}
            <View className="mt-7 overflow-hidden rounded-3xl bg-black p-6">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Overall Rating
                  </Text>

                  <Text className="mt-2 text-5xl font-extrabold text-white">
                    {averageRating.toFixed(
                      1,
                    )}
                  </Text>

                  <View className="mt-3">
                    <RatingStars
                      rating={
                        averageRating
                      }
                      size={20}
                      readOnly
                    />
                  </View>

                  <Text className="mt-3 text-sm font-semibold text-gray-400">
                    {reviews.length}{' '}
                    {reviews.length ===
                    1
                      ? 'review'
                      : 'reviews'}
                  </Text>
                </View>

                <View className="ml-6 flex-1">
                  {[
                    5,
                    4,
                    3,
                    2,
                    1,
                  ].map(
                    rating => {
                      const count =
                        ratingCounts[
                          rating
                        ];

                      const percentage =
                        reviews.length >
                        0
                          ? (
                              count /
                              reviews.length
                            ) *
                            100
                          : 0;

                      return (
                        <View
                          key={
                            rating
                          }
                          className="mb-2.5 flex-row items-center"
                        >
                          <Text className="w-4 text-xs font-bold text-white">
                            {rating}
                          </Text>

                          <Ionicons
                            name="star"
                            size={12}
                            color="white"
                          />

                          <View className="mx-2 h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
                            <View
                              className="h-full rounded-full bg-white"
                              style={{
                                width:
                                  `${percentage}%`,
                              }}
                            />
                          </View>

                          <Text className="w-6 text-right text-xs font-semibold text-gray-400">
                            {count}
                          </Text>
                        </View>
                      );
                    },
                  )}
                </View>
              </View>
            </View>


            {/* REVIEW ELIGIBILITY */}
            {canReview ? (
              <TouchableOpacity
                onPress={
                  handleWriteReview
                }
                activeOpacity={0.85}
                className="mt-5 flex-row items-center rounded-3xl bg-gray-100 p-5"
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black">
                  <Ionicons
                    name={
                      userReview
                        ? 'create-outline'
                        : 'star-outline'
                    }
                    size={22}
                    color="white"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-black">
                    {userReview
                      ? 'Edit Your Review'
                      : 'Write a Review'}
                  </Text>

                  <Text className="mt-1 text-sm leading-5 text-gray-500">
                    Share your experience as a verified customer.
                  </Text>
                </View>

                <Ionicons
                  name="arrow-forward-outline"
                  size={20}
                  color="black"
                />
              </TouchableOpacity>
            ) : (
              <View className="mt-5 flex-row items-start rounded-3xl bg-gray-100 p-5">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
                  <Ionicons
                    name="information-circle-outline"
                    size={21}
                    color="black"
                  />
                </View>

                <Text className="ml-3 flex-1 text-sm leading-6 text-gray-500">
                  You can review this product after your order has been delivered.
                </Text>
              </View>
            )}


            {/* EMPTY */}
            {reviews.length ===
            0 ? (
              <View className="mt-10 items-center rounded-3xl bg-gray-100 px-6 py-10">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={34}
                    color="black"
                  />
                </View>

                <Text className="mt-5 text-xl font-extrabold text-black">
                  No reviews yet
                </Text>

                <Text className="mt-2 text-center leading-6 text-gray-500">
                  Be the first verified customer to review this product.
                </Text>
              </View>
            ) : null}


            {/* CUSTOMER REVIEWS */}
            {reviews.length >
            0 ? (
              <View className="mt-8">
                <View className="mb-4 flex-row items-end justify-between">
                  <View>
                    <Text className="text-xl font-extrabold text-black">
                      Customer Reviews
                    </Text>

                    <Text className="mt-1 text-sm text-gray-500">
                      Verified feedback from ExCloth customers.
                    </Text>
                  </View>

                  <View className="rounded-full bg-black px-3 py-2">
                    <Text className="text-xs font-extrabold text-white">
                      {reviews.length}
                    </Text>
                  </View>
                </View>

                {reviews.map(
                  (
                    review,
                    index,
                  ) => (
                    <View
                      key={
                        review.id
                      }
                      className={`rounded-3xl border border-gray-200 bg-white p-5 ${
                        index > 0
                          ? 'mt-4'
                          : ''
                      }`}
                    >
                      <View className="flex-row items-start">
                        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black">
                          <Ionicons
                            name="person-outline"
                            size={21}
                            color="white"
                          />
                        </View>

                        <View className="ml-3 flex-1">
                          <View className="flex-row items-center">
                            <Text
                              numberOfLines={1}
                              className="flex-1 font-extrabold text-black"
                            >
                              {
                                review.reviewer_name
                              }
                            </Text>

                            {review.user_id ===
                            currentUserId ? (
                              <View className="ml-2 rounded-full bg-gray-100 px-2.5 py-1">
                                <Text className="text-[11px] font-extrabold text-black">
                                  You
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <Text className="mt-1 text-xs font-semibold text-gray-400">
                            {formatDate(
                              review.created_at,
                            )}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-4 flex-row flex-wrap items-center">
                        <RatingStars
                          rating={
                            review.rating
                          }
                          size={18}
                          readOnly
                        />

                        {review
                          .is_verified_purchase ? (
                          <View className="ml-3 flex-row items-center rounded-full bg-gray-100 px-3 py-1.5">
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color="black"
                            />

                            <Text className="ml-1.5 text-[11px] font-extrabold text-black">
                              Verified Purchase
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {review.title ? (
                        <Text className="mt-4 text-base font-extrabold text-black">
                          {
                            review.title
                          }
                        </Text>
                      ) : null}

                      <Text className="mt-2 text-base leading-7 text-gray-600">
                        {
                          review.review_text
                        }
                      </Text>

                      {review.user_id ===
                        currentUserId &&
                      canReview ? (
                        <TouchableOpacity
                          onPress={
                            handleWriteReview
                          }
                          activeOpacity={0.8}
                          className="mt-5 flex-row items-center self-start rounded-xl bg-gray-100 px-4 py-2.5"
                        >
                          <Ionicons
                            name="create-outline"
                            size={17}
                            color="black"
                          />

                          <Text className="ml-2 text-sm font-extrabold text-black">
                            Edit Review
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ),
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};


export default ProductReviews;
