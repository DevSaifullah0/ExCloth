import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';

import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useFocusEffect,
} from '@react-navigation/native';

import { supabase } from '../../lib/supabase';


const FILTERS = [
  'all',
  'pending',
  'approved',
  'verified',
];


const AdminReviews = ({
  navigation,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    reviews,
    setReviews,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    selectedFilter,
    setSelectedFilter,
  ] = useState('all');

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


  const fetchReviews =
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


          const {
            data,
            error,
          } =
            await supabase.rpc(
              'get_admin_reviews_secure',
            );


          if (error) {
            throw error;
          }


          const list =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data?.reviews,
                )
              ? data.reviews
              : [];


          setReviews(list);

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Admin Reviews Load Error:',
              error.message,
            );
          }

          setErrorMessage(
            'Unable to load reviews.',
          );

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );


  useFocusEffect(
    useCallback(
      () => {
        fetchReviews();
      },
      [fetchReviews],
    ),
  );


  const filteredReviews =
    useMemo(
      () => {
        const query =
          search.trim()
            .toLowerCase();


        return reviews.filter(
          review => {
            if (
              selectedFilter ===
                'pending' &&
              review.is_approved
            ) {
              return false;
            }


            if (
              selectedFilter ===
                'approved' &&
              !review.is_approved
            ) {
              return false;
            }


            if (
              selectedFilter ===
                'verified' &&
              !review.is_verified_purchase
            ) {
              return false;
            }


            if (!query) {
              return true;
            }


            const haystack = [
              review.reviewer_name,
              review.title,
              review.review_text,
              review.product_name,
              review.product_id,
              review.rating,
            ]
              .filter(
                value =>
                  value !== null &&
                  value !== undefined,
              )
              .join(' ')
              .toLowerCase();


            return haystack.includes(
              query,
            );
          },
        );
      },
      [
        reviews,
        search,
        selectedFilter,
      ],
    );


  const formatFilter =
    value =>
      String(value)
        .replace(/_/g, ' ')
        .replace(
          /\b\w/g,
          letter =>
            letter.toUpperCase(),
        );


  const formatDate =
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

      return date.toLocaleDateString(
        'en-GB',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
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
                size={15}
                color="black"
              />
            ),
          )}
        </View>
      );
    };


  const renderReview = ({
    item,
  }) => {
    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate(
            'AdminReviewDetails',
            {
              reviewId:
                item.id,
            },
          )
        }
        activeOpacity={0.85}
        className="mb-4 rounded-3xl bg-gray-100 p-5"
      >
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <View className="flex-row flex-wrap items-center">
              <Text
                numberOfLines={1}
                className="mr-2 flex-shrink text-lg font-extrabold text-black"
              >
                {item.reviewer_name ||
                  'Customer'}
              </Text>

              {item.is_verified_purchase ? (
                <View className="rounded-full bg-white px-2.5 py-1">
                  <Text className="text-[10px] font-extrabold text-black">
                    VERIFIED
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              numberOfLines={1}
              className="mt-1 text-sm text-gray-500"
            >
              {item.product_name ||
                `Product #${item.product_id}`}
            </Text>
          </View>

          <View
            className={`rounded-full px-3 py-1.5 ${
              item.is_approved
                ? 'bg-black'
                : 'bg-white'
            }`}
          >
            <Text
              className={`text-xs font-extrabold ${
                item.is_approved
                  ? 'text-white'
                  : 'text-black'
              }`}
            >
              {item.is_approved
                ? 'Approved'
                : 'Pending'}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-white p-4">
          {renderStars(
            item.rating,
          )}

          <Text className="text-xs font-semibold text-gray-500">
            {formatDate(
              item.created_at,
            )}
          </Text>
        </View>

        {item.title ? (
          <Text
            numberOfLines={1}
            className="mt-4 text-base font-extrabold text-black"
          >
            {item.title}
          </Text>
        ) : null}

        <Text
          numberOfLines={3}
          className="mt-2 leading-6 text-gray-600"
        >
          {item.review_text}
        </Text>

        <View className="mt-4 flex-row items-center justify-between border-t border-gray-200 pt-4">
          <Text className="text-sm font-semibold text-gray-500">
            Rating {Number(
              item.rating ||
                0,
            )}/5
          </Text>

          <View className="flex-row items-center rounded-xl bg-white px-3 py-2">
            <Text className="mr-2 text-sm font-extrabold text-black">
              Review Details
            </Text>

            <Ionicons
              name="chevron-forward-outline"
              size={18}
              color="black"
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <ActivityIndicator
            size="large"
            color="black"
          />
        </View>

        <Text className="mt-4 font-semibold text-gray-500">
          Loading reviews...
        </Text>
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
      <View className="px-5">
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

            <Text className="mt-1 text-sm text-gray-500">
              Moderate ratings and customer feedback.
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

        <View className="mt-6 flex-row">
          <View className="mr-3 flex-1 rounded-3xl bg-black p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Reviews
            </Text>

            <Text className="mt-2 text-3xl font-extrabold text-white">
              {reviews.length}
            </Text>
          </View>

          <View className="flex-1 rounded-3xl bg-gray-100 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Showing
            </Text>

            <Text className="mt-2 text-3xl font-extrabold text-black">
              {filteredReviews.length}
            </Text>
          </View>
        </View>

        <View className="mt-5 h-14 flex-row items-center rounded-2xl bg-gray-100 px-4">
          <Ionicons
            name="search-outline"
            size={20}
            color="#6B7280"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search reviewer, product or text..."
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            className="ml-3 flex-1 text-black"
          />

          {search ? (
            <TouchableOpacity
              onPress={() =>
                setSearch('')
              }
              activeOpacity={0.8}
              className="h-9 w-9 items-center justify-center rounded-xl bg-white"
            >
              <Ionicons
                name="close-outline"
                size={19}
                color="black"
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{
            paddingRight: 20,
          }}
          renderItem={({ item }) => {
            const active =
              selectedFilter ===
              item;

            return (
              <TouchableOpacity
                onPress={() =>
                  setSelectedFilter(
                    item,
                  )
                }
                activeOpacity={0.85}
                className={`mr-2 rounded-full px-4 py-2.5 ${
                  active
                    ? 'bg-black'
                    : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-sm font-extrabold ${
                    active
                      ? 'text-white'
                      : 'text-black'
                  }`}
                >
                  {formatFilter(
                    item,
                  )}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {errorMessage ? (
        <View className="mx-5 mt-6 items-center rounded-3xl bg-gray-100 p-7">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
            <Ionicons
              name="alert-circle-outline"
              size={30}
              color="black"
            />
          </View>

          <Text className="mt-4 text-xl font-extrabold text-black">
            Unable to load reviews
          </Text>

          <Text className="mt-2 text-center leading-6 text-gray-500">
            {errorMessage}
          </Text>

          <TouchableOpacity
            onPress={() =>
              fetchReviews()
            }
            activeOpacity={0.85}
            className="mt-5 h-12 items-center justify-center rounded-2xl bg-black px-7"
          >
            <Text className="font-extrabold text-white">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={
            item =>
              String(item.id)
          }
          renderItem={renderReview}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);

                fetchReviews({
                  silent: true,
                });
              }}
              tintColor="black"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom:
              Math.max(
                insets.bottom,
                24,
              ) + 30,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <Ionicons
                  name="star-outline"
                  size={36}
                  color="black"
                />
              </View>

              <Text className="mt-5 text-xl font-extrabold text-black">
                No reviews found
              </Text>

              <Text className="mt-2 text-center leading-6 text-gray-500">
                No reviews match your current search or filter.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};


export default AdminReviews;
