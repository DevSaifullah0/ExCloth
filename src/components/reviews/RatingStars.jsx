import {
  View,
  TouchableOpacity,
} from 'react-native';

import React from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';


const RatingStars = ({
  rating = 0,
  onChange,
  size = 24,
  readOnly = false,
  disabled = false,
}) => {
  const safeRating =
    Math.min(
      5,
      Math.max(
        0,
        Number(
          rating ||
            0,
        ),
      ),
    );


  const roundedRating =
    Math.round(
      safeRating,
    );


  const handlePress =
    value => {
      if (
        readOnly ||
        disabled ||
        typeof onChange !==
          'function'
      ) {
        return;
      }

      onChange(
        value,
      );
    };


  return (
    <View
      className="flex-row items-center"
      accessibilityRole={
        readOnly
          ? 'text'
          : undefined
      }
      accessibilityLabel={
        readOnly
          ? `${safeRating.toFixed(
              1,
            )} out of 5 stars`
          : undefined
      }
    >
      {[
        1,
        2,
        3,
        4,
        5,
      ].map(
        (
          star,
          index,
        ) => {
          const isFilled =
            star <=
            roundedRating;

          const icon = (
            <Ionicons
              name={
                isFilled
                  ? 'star'
                  : 'star-outline'
              }
              size={
                size
              }
              color={
                isFilled
                  ? '#000000'
                  : '#D1D5DB'
              }
            />
          );


          if (
            readOnly
          ) {
            return (
              <View
                key={
                  star
                }
                className={
                  index < 4
                    ? 'mr-1.5'
                    : ''
                }
              >
                {icon}
              </View>
            );
          }


          return (
            <TouchableOpacity
              key={
                star
              }
              onPress={() =>
                handlePress(
                  star,
                )
              }
              disabled={
                disabled
              }
              activeOpacity={0.7}
              hitSlop={{
                top: 10,
                bottom: 10,
                left: 6,
                right: 6,
              }}
              accessibilityRole="button"
              accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
              accessibilityHint="Sets product rating"
              accessibilityState={{
                selected:
                  isFilled,
                disabled:
                  disabled,
              }}
              className={`items-center justify-center ${
                index < 4
                  ? 'mr-1.5'
                  : ''
              }`}
            >
              {icon}
            </TouchableOpacity>
          );
        },
      )}
    </View>
  );
};


export default RatingStars;
