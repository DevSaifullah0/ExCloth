import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';

import React, {
  useEffect,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import RatingStars from '../../components/reviews/RatingStars';
import AppModal from '../../components/common/AppModal';


const ProductDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const passedProduct =
    route.params?.product;

  const wishlistVariantId =
    route.params?.wishlistVariantId;


  // ==========================================
  // PRODUCT DATA
  // ==========================================

  const [product, setProduct] =
    useState(
      passedProduct || null,
    );

  const [images, setImages] =
    useState([]);

  const [
    selectedImageId,
    setSelectedImageId,
  ] = useState(null);

  const [variants, setVariants] =
    useState([]);


  // ==========================================
  // SELECTED VARIANT
  // ==========================================

  const [
    selectedSize,
    setSelectedSize,
  ] = useState(null);

  const [
    selectedColor,
    setSelectedColor,
  ] = useState(null);


  // ==========================================
  // LOADING STATES
  // ==========================================

  const [loading, setLoading] =
    useState(true);

  const [
    wishlistLoading,
    setWishlistLoading,
  ] = useState(false);

  const [
    cartLoading,
    setCartLoading,
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


  const closeModal = () => {
    setModal(prev => ({
      ...prev,
      visible: false,
    }));
  };


  const handleModalConfirm =
    () => {
      const action =
        modal.action;

      closeModal();

      if (action === 'back') {
        navigation.goBack();
      }
    };


  // ==========================================
  // REVIEW SUMMARY
  // ==========================================

  const [
    reviewSummary,
    setReviewSummary,
  ] = useState({
    averageRating: 0,
    reviewCount: 0,
  });


  // ==========================================
  // FETCH REVIEW SUMMARY
  // ==========================================

  const fetchReviewSummary =
    async productId => {
      try {
        if (!productId) {
          setReviewSummary({
            averageRating: 0,
            reviewCount: 0,
          });

          return;
        }


        const {
          data: reviewData,
          error: reviewError,
        } = await supabase
          .from(
            'product_reviews',
          )
          .select(`
            rating
          `)
          .eq(
            'product_id',
            productId,
          )
          .eq(
            'is_approved',
            true,
          );


        if (reviewError) {
          throw reviewError;
        }


        const reviews =
          reviewData || [];


        const reviewCount =
          reviews.length;


        const totalRating =
          reviews.reduce(
            (
              total,
              review,
            ) =>
              total +
              Number(
                review.rating || 0,
              ),
            0,
          );


        const averageRating =
          reviewCount > 0
            ? totalRating /
              reviewCount
            : 0;


        setReviewSummary({
          averageRating,
          reviewCount,
        });

      } catch (error) {
        console.log(
          'Review Summary Error:',
          error.message,
        );

        setReviewSummary({
          averageRating: 0,
          reviewCount: 0,
        });
      }
    };


  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    setProduct(
      passedProduct || null,
    );

    setImages([]);
    setVariants([]);

    setSelectedImageId(null);
    setSelectedSize(null);
    setSelectedColor(null);

    setReviewSummary({
      averageRating: 0,
      reviewCount: 0,
    });

    fetchProductDetails();
  }, [
    passedProduct?.id,
    wishlistVariantId,
  ]);


  // ==========================================
  // REFRESH REVIEW SUMMARY ON FOCUS
  // ==========================================

  useEffect(() => {
    const unsubscribe =
      navigation.addListener(
        'focus',
        () => {
          if (
            passedProduct?.id
          ) {
            fetchReviewSummary(
              passedProduct.id,
            );
          }
        },
      );

    return unsubscribe;
  }, [
    navigation,
    passedProduct?.id,
  ]);


  // ==========================================
  // FETCH PRODUCT DETAILS
  // ==========================================

  const fetchProductDetails =
    async () => {
      try {
        setLoading(true);


        if (!passedProduct?.id) {
          showModal({
            type: 'error',
            title: 'Product Error',
            message:
              'Product information is missing.',
            confirmText: 'Go Back',
            action: 'back',
          });

          return;
        }


        // =====================================
        // FETCH PRODUCT
        // =====================================

        const {
          data: productData,
          error: productError,
        } = await supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            description,
            price,
            old_price,
            image_url,
            stock_quantity,
            is_popular,
            is_new,
            is_featured
          `)
          .eq(
            'id',
            passedProduct.id,
          )
          .eq(
            'is_active',
            true,
          )
          .single();


        if (productError) {
          throw productError;
        }


        setProduct(
          productData,
        );


        // =====================================
        // FETCH REVIEW SUMMARY
        // =====================================

        await fetchReviewSummary(
          productData.id,
        );


        // =====================================
        // FETCH PRODUCT IMAGES
        // =====================================

        const {
          data: imageData,
          error: imageError,
        } = await supabase
          .from(
            'product_images',
          )
          .select(`
            id,
            image_url,
            color,
            is_primary,
            sort_order
          `)
          .eq(
            'product_id',
            passedProduct.id,
          )
          .order(
            'sort_order',
            {
              ascending: true,
            },
          );


        if (imageError) {
          throw imageError;
        }


        setImages(
          imageData || [],
        );


        // =====================================
        // FETCH PRODUCT VARIANTS
        // =====================================

        const {
          data: variantData,
          error: variantError,
        } = await supabase
          .from(
            'product_variants',
          )
          .select(`
            id,
            product_id,
            size,
            color,
            sku,
            stock_quantity,
            price_adjustment,
            is_active
          `)
          .eq(
            'product_id',
            passedProduct.id,
          )
          .eq(
            'is_active',
            true,
          )
          .order(
            'id',
            {
              ascending: true,
            },
          );


        if (variantError) {
          throw variantError;
        }


        const loadedVariants =
          variantData || [];


        setVariants(
          loadedVariants,
        );


        // =====================================
        // DEFAULT SELECTED VARIANT
        //
        // Prefer first variant with stock.
        // If all are sold out, select first
        // variant so UI can still display it.
        // =====================================

        if (
          loadedVariants.length >
          0
        ) {
          const wishlistVariant =
            wishlistVariantId
              ? loadedVariants.find(
                  item =>
                    String(
                      item.id,
                    ) ===
                    String(
                      wishlistVariantId,
                    ),
                )
              : null;

          const firstVariant =
            wishlistVariant ||
            loadedVariants.find(
              item =>
                Number(
                  item.stock_quantity,
                ) > 0,
            ) ||
            loadedVariants[0];


          setSelectedSize(
            firstVariant.size ||
              null,
          );

          setSelectedColor(
            firstVariant.color ||
              null,
          );
        }

      } catch (error) {
        console.log(
          'Product Details Error:',
          error.message,
        );


        showModal({
          type: 'error',
          title: 'Unable to Load Product',
          message:
            'Unable to load product details. Please try again.',
          confirmText: 'OK',
        });

      } finally {
        setLoading(false);
      }
    };


  // ==========================================
  // ADD TO WISHLIST
  // ==========================================

  const addToWishlist =
    async () => {
      try {
        setWishlistLoading(
          true,
        );


        // =====================================
        // EXACT SELECTED VARIANT CHECK
        // =====================================

        if (
          variants.length > 0 &&
          !selectedVariant
        ) {
          showModal({
            type: 'warning',
            title: 'Select Variant',
            message:
              'Please select an available size and color.',
            confirmText: 'Choose Option',
          });

          return;
        }


        // =====================================
        // AUTH USER
        // =====================================

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
          showModal({
            type: 'warning',
            title: 'Login Required',
            message:
              'Please login to use wishlist.',
            confirmText: 'OK',
          });

          return;
        }


        // =====================================
        // SAVE PRODUCT IN SUPABASE WISHLIST
        // =====================================

        const { error } =
          await supabase
            .from('wishlist')
            .upsert(
              {
                user_id:
                  user.id,

                product_id:
                  product.id,
              },
              {
                onConflict:
                  'user_id,product_id',

                ignoreDuplicates:
                  true,
              },
            );


        if (error) {
          throw error;
        }


        // =====================================
        // SAVE EXACT SELECTED VARIANT
        //
        // Wishlist.jsx reads the exact same key.
        // =====================================

        const storageKey =
          `wishlist_variant_${user.id}_${product.id}`;


        if (selectedVariant) {
          await AsyncStorage.setItem(
            storageKey,
            JSON.stringify(
              selectedVariant,
            ),
          );

        } else {
          await AsyncStorage.removeItem(
            storageKey,
          );
        }


        // =====================================
        // SUCCESS
        // =====================================

        const variantText =
          selectedVariant
            ? [
                selectedVariant.size,
                selectedVariant.color,
              ]
                .filter(Boolean)
                .join(' / ')
            : null;


        showModal({
          type: 'success',
          title: 'Added to Wishlist',
          message:
            variantText
              ? `${product.name} (${variantText}) added to wishlist.`
              : `${product.name} added to wishlist.`,
          confirmText: 'Done',
        });


      } catch (error) {
        console.log(
          'Wishlist Error:',
          error,
        );


        showModal({
          type: 'error',
          title: 'Wishlist Error',
          message:
            'Unable to add product to wishlist. Please try again.',
          confirmText: 'OK',
        });


      } finally {
        setWishlistLoading(
          false,
        );
      }
    };


  // ==========================================
  // SELECT SIZE
  // ==========================================

  const handleSizeSelect =
    size => {
      // Find variants of this size
      // that still have stock.

      const available =
        variants.filter(
          variant =>
            variant.size ===
              size &&
            Number(
              variant.stock_quantity,
            ) > 0,
        );


      if (
        available.length === 0
      ) {
        return;
      }


      // If currently selected color
      // also exists in this size,
      // keep that color.

      const sameColor =
        available.find(
          variant =>
            variant.color ===
            selectedColor,
        );


      const chosenVariant =
        sameColor ||
        available[0];


      setSelectedSize(
        chosenVariant.size ||
          null,
      );

      setSelectedColor(
        chosenVariant.color ||
          null,
      );
    };


  // ==========================================
  // SELECT COLOR
  // ==========================================

  const handleColorSelect =
    color => {
      let available =
        variants.filter(
          variant =>
            variant.color ===
              color &&
            Number(
              variant.stock_quantity,
            ) > 0,
        );


      // If a size is selected,
      // first try that exact size.

      if (selectedSize) {
        const sameSize =
          available.find(
            variant =>
              variant.size ===
              selectedSize,
          );


        if (sameSize) {
          setSelectedSize(
            sameSize.size ||
              null,
          );

          setSelectedColor(
            sameSize.color ||
              null,
          );

          return;
        }
      }


      // Selected color may only exist
      // for another size.
      // Automatically move to a valid
      // combination.

      const chosenVariant =
        available[0];


      if (!chosenVariant) {
        return;
      }


      setSelectedSize(
        chosenVariant.size ||
          null,
      );

      setSelectedColor(
        chosenVariant.color ||
          null,
      );
    };


  // ==========================================
  // ADD TO CART
  // ==========================================

  const addToCart =
    async () => {
      try {
        setCartLoading(true);


        // =====================================
        // FIND EXACT SELECTED VARIANT
        // =====================================

        const hasVariants =
          variants.length > 0;


        const selectedVariant =
          hasVariants
            ? variants.find(
                variant => {
                  const sizeMatch =
                    selectedSize
                      ? variant.size ===
                        selectedSize
                      : true;

                  const colorMatch =
                    selectedColor
                      ? variant.color ===
                        selectedColor
                      : true;

                  return (
                    sizeMatch &&
                    colorMatch
                  );
                },
              )
            : null;


        // =====================================
        // VARIANT VALIDATION
        // =====================================

        if (
          hasVariants &&
          !selectedVariant
        ) {
          showModal({
            type: 'warning',
            title: 'Select Variant',
            message:
              'Please select an available size and color.',
            confirmText: 'Choose Option',
          });

          return;
        }


        // =====================================
        // STOCK VALIDATION
        // =====================================

        const availableStock =
          selectedVariant
            ? Number(
                selectedVariant
                  .stock_quantity,
              )
            : Number(
                product
                  .stock_quantity,
              );


        if (
          availableStock <= 0
        ) {
          showModal({
            type: 'warning',
            title: 'Out of Stock',
            message:
              selectedVariant
                ? `The selected ${selectedVariant.size || ''} ${selectedVariant.color || ''} variant is currently unavailable.`
                : 'This product is currently unavailable.',
            confirmText: 'OK',
          });

          return;
        }


        // =====================================
        // AUTH USER
        // =====================================

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
          showModal({
            type: 'warning',
            title: 'Login Required',
            message:
              'Please login to add products to cart.',
            confirmText: 'OK',
          });

          return;
        }


        // =====================================
        // CHECK EXACT CART ITEM
        //
        // Product + Variant combination
        // must match.
        // =====================================

        let cartQuery =
          supabase
            .from('cart_items')
            .select(`
              id,
              quantity
            `)
            .eq(
              'user_id',
              user.id,
            )
            .eq(
              'product_id',
              product.id,
            );


        if (
          selectedVariant?.id
        ) {
          cartQuery =
            cartQuery.eq(
              'variant_id',
              selectedVariant.id,
            );

        } else {
          cartQuery =
            cartQuery.is(
              'variant_id',
              null,
            );
        }


        const {
          data:
            existingCartItem,

          error:
            cartCheckError,
        } =
          await cartQuery
            .maybeSingle();


        if (cartCheckError) {
          throw cartCheckError;
        }


        // =====================================
        // UPDATE EXISTING VARIANT
        // =====================================

        if (
          existingCartItem
        ) {
          const nextQuantity =
            Number(
              existingCartItem
                .quantity,
            ) + 1;


          if (
            nextQuantity >
            availableStock
          ) {
            showModal({
              type: 'warning',
              title: 'Stock Limit',
              message:
                `Only ${availableStock} item(s) are available for this selection.`,
              confirmText: 'OK',
            });

            return;
          }


          const {
            error:
              updateError,
          } =
            await supabase
              .from(
                'cart_items',
              )
              .update({
                quantity:
                  nextQuantity,
              })
              .eq(
                'id',
                existingCartItem.id,
              );


          if (updateError) {
            throw updateError;
          }

        } else {

          // ===================================
          // INSERT NEW VARIANT INTO CART
          // ===================================

          const {
            error:
              insertError,
          } =
            await supabase
              .from(
                'cart_items',
              )
              .insert({
                user_id:
                  user.id,

                product_id:
                  product.id,

                variant_id:
                  selectedVariant
                    ?.id ||
                  null,

                quantity:
                  1,
              });


          if (insertError) {
            throw insertError;
          }
        }


        // =====================================
        // SUCCESS
        // =====================================

        const variantText =
          selectedVariant
            ? [
                selectedVariant
                  .size,

                selectedVariant
                  .color,
              ]
                .filter(Boolean)
                .join(' / ')
            : null;


        showModal({
          type: 'success',
          title: 'Added to Cart',
          message:
            variantText
              ? `${product.name} (${variantText}) added to cart.`
              : 'Product added to cart.',
          confirmText: 'Done',
        });

      } catch (error) {
        console.log(
          'Cart Error:',
          error.message,
        );


        showModal({
          type: 'error',
          title: 'Cart Error',
          message:
            'Unable to add product to cart. Please try again.',
          confirmText: 'OK',
        });

      } finally {
        setCartLoading(false);
      }
    };


  // ==========================================
  // APP MODAL
  // ==========================================

  const renderAppModal =
    () => (
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
    );


  // ==========================================
  // LOADING UI
  // ==========================================

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">

        <ActivityIndicator
          size="large"
          color="black"
        />

        <Text className="mt-3 text-gray-500">
          Loading product...
        </Text>

        {renderAppModal()}

      </SafeAreaView>
    );
  }


  // ==========================================
  // PRODUCT NOT FOUND
  // ==========================================

  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">

        <Text className="text-gray-500">
          Product not found.
        </Text>

        {renderAppModal()}

      </SafeAreaView>
    );
  }


  // ==========================================
  // COLOR-AWARE PRODUCT IMAGES
  //
  // Images are linked to a product color in
  // public.product_images.
  //
  // Example:
  // Black  -> Black product images
  // White  -> White product images
  // Navy   -> Navy product images
  // Maroon -> Maroon product images
  // ==========================================

  const normalizeColor =
    value =>
      String(value || '')
        .trim()
        .toLowerCase();


  const getVariantColorHex =
    value => {
      const raw =
        String(value || '').trim();

      if (
        /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(
          raw,
        )
      ) {
        return raw;
      }

      const normalized =
        raw
          .toLowerCase()
          .replace(/[_-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const colorMap = {
        black: '#000000',
        white: '#FFFFFF',
        gray: '#808080',
        grey: '#808080',
        'light gray': '#D3D3D3',
        'light grey': '#D3D3D3',
        'dark gray': '#404040',
        'dark grey': '#404040',
        blue: '#0000FF',
        'light blue': '#ADD8E6',
        'dark blue': '#00008B',
        navy: '#000080',
        'navy blue': '#000080',
        olive: '#808000',
        pink: '#FFC0CB',
        'light pink': '#FFB6C1',
        maroon: '#800000',
        red: '#FF0000',
        green: '#008000',
        'dark green': '#006400',
        yellow: '#FFFF00',
        orange: '#FFA500',
        purple: '#800080',
        violet: '#EE82EE',
        brown: '#A52A2A',
        beige: '#F5F5DC',
        cream: '#FFFDD0',
        khaki: '#F0E68C',
        teal: '#008080',
        cyan: '#00FFFF',
        aqua: '#00FFFF',
        magenta: '#FF00FF',
        charcoal: '#36454F',
        gold: '#FFD700',
        silver: '#C0C0C0',
        peach: '#FFDAB9',
        burgundy: '#800020',
      };

      return (
        colorMap[normalized] ||
        '#6B7280'
      );
    };


  const isLightVariantColor =
    hexColor => {
      let hex =
        String(hexColor || '')
          .replace('#', '');

      if (hex.length === 3) {
        hex =
          hex
            .split('')
            .map(char =>
              `${char}${char}`,
            )
            .join('');
      }

      if (hex.length !== 6) {
        return false;
      }

      const red =
        parseInt(
          hex.slice(0, 2),
          16,
        );

      const green =
        parseInt(
          hex.slice(2, 4),
          16,
        );

      const blue =
        parseInt(
          hex.slice(4, 6),
          16,
        );

      const luminance =
        (0.299 * red +
          0.587 * green +
          0.114 * blue) /
        255;

      return luminance > 0.62;
    };


  const colorImages =
    selectedColor
      ? images.filter(
          image =>
            normalizeColor(
              image.color,
            ) ===
            normalizeColor(
              selectedColor,
            ),
        )
      : images;


  // If the selected color has mapped images,
  // show ONLY those images.
  //
  // If a product has no color-specific images
  // yet, we can still fall back to its generic
  // product image.

  const displayImages =
    selectedColor
      ? colorImages
      : images;


  const manuallySelectedImage =
    displayImages.find(
      image =>
        image.id ===
        selectedImageId,
    );


  const primaryImage =
    manuallySelectedImage
      ?.image_url ||
    displayImages.find(
      image =>
        image.is_primary,
    )?.image_url ||
    displayImages[0]
      ?.image_url ||
    product.image_url;


  // ==========================================
  // AVAILABLE SIZES
  // ==========================================

  const sizes = [
    ...new Set(
      variants
        .map(
          variant =>
            variant.size,
        )
        .filter(Boolean),
    ),
  ];


  // ==========================================
  // ALL COLORS
  // ==========================================

  const allColors = [
    ...new Set(
      variants
        .map(
          variant =>
            variant.color,
        )
        .filter(Boolean),
    ),
  ];


  // ==========================================
  // COLORS FOR SELECTED SIZE
  //
  // Example:
  //
  // Hoodie M:
  // Black + Gray
  //
  // Hoodie L:
  // Black only
  // ==========================================

  const colors =
    selectedSize
      ? [
          ...new Set(
            variants
              .filter(
                variant =>
                  variant.size ===
                  selectedSize,
              )
              .map(
                variant =>
                  variant.color,
              )
              .filter(Boolean),
          ),
        ]
      : allColors;


  // ==========================================
  // EXACT SELECTED VARIANT
  // ==========================================

  const selectedVariant =
    variants.length > 0
      ? variants.find(
          variant => {
            const sizeMatch =
              sizes.length === 0 ||
              variant.size ===
                selectedSize;

            const colorMatch =
              allColors.length ===
                0 ||
              variant.color ===
                selectedColor;

            return (
              sizeMatch &&
              colorMatch
            );
          },
        )
      : null;


  // ==========================================
  // CURRENT PRICE
  // ==========================================

  const basePrice =
    Number(
      product.price || 0,
    );


  const priceAdjustment =
    Number(
      selectedVariant
        ?.price_adjustment ||
        0,
    );


  const currentPrice =
    basePrice +
    priceAdjustment;


  // ==========================================
  // CURRENT STOCK
  // ==========================================

  const currentStock =
    variants.length > 0
      ? Number(
          selectedVariant
            ?.stock_quantity ||
            0,
        )
      : Number(
          product
            .stock_quantity ||
            0,
        );


  const canAddToCart =
    currentStock > 0;


  const regularPrice =
    Number(
      product.old_price || 0,
    );

  const salePercentage =
    regularPrice > currentPrice &&
    regularPrice > 0
      ? Math.round(
          ((regularPrice -
            currentPrice) /
            regularPrice) *
            100,
        )
      : 0;


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
        className="flex-1"
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            128 +
            Math.max(
              insets.bottom,
              16,
            ),
        }}
      >
        <View className="px-5 pt-4">

          {/* HERO */}
          <View className="relative overflow-hidden rounded-[28px] bg-gray-100">

            <View className="absolute left-4 right-4 top-4 z-10 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() =>
                  navigation.goBack()
                }
                activeOpacity={0.8}
                className="h-11 w-11 items-center justify-center rounded-2xl bg-white"
              >
                <Ionicons
                  name="arrow-back-outline"
                  size={22}
                  color="black"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={
                  addToWishlist
                }
                disabled={
                  wishlistLoading
                }
                activeOpacity={0.8}
                className="h-11 w-11 items-center justify-center rounded-2xl bg-white"
              >
                {wishlistLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="black"
                  />
                ) : (
                  <Ionicons
                    name="heart-outline"
                    size={22}
                    color="black"
                  />
                )}
              </TouchableOpacity>
            </View>

            <View className="absolute bottom-4 left-4 z-10 flex-row flex-wrap">
              {salePercentage > 0 ? (
                <View className="mr-2 rounded-full bg-black px-3 py-2">
                  <Text className="text-[11px] font-extrabold text-white">
                    {salePercentage}% OFF
                  </Text>
                </View>
              ) : null}

              {product.is_new ? (
                <View className="mr-2 rounded-full bg-white px-3 py-2">
                  <Text className="text-[11px] font-extrabold text-black">
                    NEW
                  </Text>
                </View>
              ) : null}

              {product.is_featured ? (
                <View className="rounded-full bg-white px-3 py-2">
                  <Text className="text-[11px] font-extrabold text-black">
                    FEATURED
                  </Text>
                </View>
              ) : null}
            </View>

            {primaryImage ? (
              <Image
                source={{
                  uri:
                    primaryImage,
                }}
                className="h-96 w-full"
                resizeMode="contain"
              />
            ) : (
              <View className="h-96 items-center justify-center">
                <View className="h-24 w-24 items-center justify-center rounded-full bg-white">
                  <Ionicons
                    name="shirt-outline"
                    size={48}
                    color="#9CA3AF"
                  />
                </View>
              </View>
            )}
          </View>


          {/* GALLERY */}
          {displayImages.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              className="mt-4"
            >
              {displayImages.map(
                image => {
                  const imageSelected =
                    primaryImage ===
                    image.image_url;

                  return (
                    <TouchableOpacity
                      key={
                        image.id
                      }
                      onPress={() =>
                        setSelectedImageId(
                          image.id,
                        )
                      }
                      activeOpacity={0.8}
                      className={`mr-3 overflow-hidden rounded-2xl border-2 ${
                        imageSelected
                          ? 'border-black'
                          : 'border-gray-200'
                      }`}
                    >
                      <Image
                        source={{
                          uri:
                            image.image_url,
                        }}
                        className="h-20 w-20 bg-gray-100"
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>
          ) : null}


          {/* TITLE + RATING */}
          <View className="mt-7">
            <View className="flex-row items-start justify-between">
              <Text className="flex-1 pr-4 text-3xl font-extrabold leading-10 text-black">
                {product.name}
              </Text>

              {reviewSummary.reviewCount >
              0 ? (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      'ProductReviews',
                      {
                        product,
                      },
                    )
                  }
                  activeOpacity={0.85}
                  className="flex-row items-center rounded-full bg-gray-100 px-3 py-2"
                >
                  <Ionicons
                    name="star"
                    size={15}
                    color="black"
                  />

                  <Text className="ml-1 text-sm font-extrabold text-black">
                    {reviewSummary.averageRating.toFixed(
                      1,
                    )}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text className="mt-2 text-sm font-semibold text-gray-400">
              Premium ExCloth Collection
            </Text>
          </View>


          {/* PRICE */}
          <View className="mt-5 rounded-3xl bg-black p-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Current Price
                </Text>

                <View className="mt-2 flex-row flex-wrap items-end">
                  <Text className="text-3xl font-extrabold text-white">
                    Rs {currentPrice}
                  </Text>

                  {regularPrice >
                  currentPrice ? (
                    <Text className="mb-1 ml-3 text-sm font-semibold text-gray-400 line-through">
                      Rs {regularPrice}
                    </Text>
                  ) : null}
                </View>
              </View>

              {salePercentage > 0 ? (
                <View className="rounded-2xl bg-white px-3 py-2">
                  <Text className="text-xs font-extrabold text-black">
                    SAVE {salePercentage}%
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="mt-5 h-px bg-gray-800" />

            <View className="mt-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className={`h-2.5 w-2.5 rounded-full ${
                    currentStock > 0
                      ? 'bg-white'
                      : 'bg-gray-500'
                  }`}
                />

                <Text className="ml-2 text-sm font-bold text-white">
                  {currentStock > 0
                    ? `In Stock • ${currentStock} available`
                    : 'Out of Stock'}
                </Text>
              </View>

              {selectedVariant?.sku ? (
                <Text
                  numberOfLines={1}
                  className="ml-3 max-w-[42%] text-xs font-semibold text-gray-400"
                >
                  SKU {selectedVariant.sku}
                </Text>
              ) : null}
            </View>
          </View>


          {/* DESCRIPTION */}
          <View className="mt-7">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons
                  name="information-circle-outline"
                  size={21}
                  color="black"
                />
              </View>

              <Text className="ml-3 text-xl font-extrabold text-black">
                Product Details
              </Text>
            </View>

            <Text className="mt-4 text-base leading-7 text-gray-500">
              {product.description ||
                'Premium quality clothing designed for comfort, style and everyday use.'}
            </Text>
          </View>


          {/* SIZE */}
          {sizes.length > 0 ? (
            <View className="mt-8">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-extrabold text-black">
                  Select Size
                </Text>

                {selectedSize ? (
                  <Text className="text-sm font-bold text-gray-500">
                    Selected: {selectedSize}
                  </Text>
                ) : null}
              </View>

              <View className="mt-4 flex-row flex-wrap gap-3">
                {sizes.map(
                  size => {
                    const sizeInStock =
                      variants.some(
                        variant =>
                          variant.size ===
                            size &&
                          Number(
                            variant.stock_quantity,
                          ) > 0,
                      );

                    const isSelected =
                      selectedSize ===
                      size;

                    return (
                      <TouchableOpacity
                        key={size}
                        onPress={() =>
                          handleSizeSelect(
                            size,
                          )
                        }
                        disabled={
                          !sizeInStock
                        }
                        activeOpacity={0.8}
                        className={`min-w-14 items-center justify-center rounded-2xl border px-4 py-3 ${
                          isSelected
                            ? 'border-black bg-black'
                            : sizeInStock
                              ? 'border-gray-200 bg-gray-100'
                              : 'border-gray-200 bg-gray-100 opacity-40'
                        }`}
                      >
                        <Text
                          className={`font-extrabold ${
                            isSelected
                              ? 'text-white'
                              : sizeInStock
                                ? 'text-black'
                                : 'text-gray-400'
                          }`}
                        >
                          {size}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            </View>
          ) : null}


          {/* COLOR */}
          {colors.length > 0 ? (
            <View className="mt-8">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-extrabold text-black">
                  Select Color
                </Text>

                {selectedColor ? (
                  <Text className="text-sm font-bold text-gray-500">
                    {selectedColor}
                  </Text>
                ) : null}
              </View>

              <View className="mt-4 flex-row flex-wrap gap-3">
                {colors.map(
                  color => {
                    const colorInStock =
                      variants.some(
                        variant => {
                          const colorMatch =
                            variant.color ===
                            color;

                          const sizeMatch =
                            selectedSize
                              ? variant.size ===
                                selectedSize
                              : true;

                          return (
                            colorMatch &&
                            sizeMatch &&
                            Number(
                              variant.stock_quantity,
                            ) > 0
                          );
                        },
                      );

                    const isSelected =
                      selectedColor ===
                      color;

                    const variantColor =
                      getVariantColorHex(
                        color,
                      );

                    const lightColor =
                      isLightVariantColor(
                        variantColor,
                      );

                    const textColor =
                      lightColor
                        ? '#000000'
                        : '#FFFFFF';

                    return (
                      <TouchableOpacity
                        key={color}
                        onPress={() =>
                          handleColorSelect(
                            color,
                          )
                        }
                        disabled={
                          !colorInStock
                        }
                        activeOpacity={0.8}
                        className={`flex-row items-center rounded-2xl border-2 px-4 py-3 ${
                          !colorInStock
                            ? 'opacity-35'
                            : ''
                        }`}
                        style={{
                          backgroundColor:
                            variantColor,
                          borderColor:
                            isSelected
                              ? '#000000'
                              : lightColor
                                ? '#D1D5DB'
                                : variantColor,
                        }}
                      >
                        <View
                          className="mr-2 h-5 w-5 items-center justify-center rounded-full"
                          style={{
                            backgroundColor:
                              lightColor
                                ? 'rgba(0,0,0,0.10)'
                                : 'rgba(255,255,255,0.22)',
                          }}
                        >
                          {isSelected ? (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color={
                                textColor
                              }
                            />
                          ) : null}
                        </View>

                        <Text
                          className="font-extrabold"
                          style={{
                            color:
                              textColor,
                          }}
                        >
                          {color}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            </View>
          ) : null}


          {/* SELECTED OPTION */}
          {selectedVariant ? (
            <View className="mt-7 flex-row items-center rounded-3xl bg-gray-100 p-4">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color="black"
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Selected Option
                </Text>

                <Text className="mt-1 text-base font-extrabold text-black">
                  {[
                    selectedVariant.size,
                    selectedVariant.color,
                  ]
                    .filter(Boolean)
                    .join(' / ')}
                </Text>
              </View>

              <Text className="text-sm font-bold text-gray-500">
                {selectedVariant.stock_quantity}{' '}
                left
              </Text>
            </View>
          ) : null}


          {/* REVIEWS */}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                'ProductReviews',
                {
                  product,
                },
              )
            }
            activeOpacity={0.85}
            className="mt-8 overflow-hidden rounded-3xl bg-gray-100 p-5"
          >
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name="star-outline"
                  size={23}
                  color="black"
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-lg font-extrabold text-black">
                  Reviews & Ratings
                </Text>

                {reviewSummary.reviewCount >
                0 ? (
                  <>
                    <View className="mt-2 flex-row items-center">
                      <RatingStars
                        rating={
                          reviewSummary.averageRating
                        }
                        size={17}
                        readOnly
                      />

                      <Text className="ml-2 font-extrabold text-black">
                        {reviewSummary.averageRating.toFixed(
                          1,
                        )}
                      </Text>
                    </View>

                    <Text className="mt-1 text-xs font-semibold text-gray-500">
                      Based on{' '}
                      {reviewSummary.reviewCount}{' '}
                      {reviewSummary.reviewCount ===
                      1
                        ? 'review'
                        : 'reviews'}
                    </Text>
                  </>
                ) : (
                  <Text className="mt-1 text-sm text-gray-500">
                    No reviews yet
                  </Text>
                )}
              </View>

              <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <Ionicons
                  name="arrow-forward-outline"
                  size={19}
                  color="black"
                />
              </View>
            </View>
          </TouchableOpacity>


          {/* BENEFITS */}
          <View className="mt-7 flex-row gap-3">
            <View className="flex-1 items-center rounded-2xl bg-gray-100 px-3 py-4">
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="black"
              />

              <Text className="mt-2 text-center text-xs font-extrabold text-black">
                Secure Order
              </Text>
            </View>

            <View className="flex-1 items-center rounded-2xl bg-gray-100 px-3 py-4">
              <Ionicons
                name="cube-outline"
                size={22}
                color="black"
              />

              <Text className="mt-2 text-center text-xs font-extrabold text-black">
                Quality Product
              </Text>
            </View>

            <View className="flex-1 items-center rounded-2xl bg-gray-100 px-3 py-4">
              <Ionicons
                name="refresh-outline"
                size={22}
                color="black"
              />

              <Text className="mt-2 text-center text-xs font-extrabold text-black">
                Easy Returns
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>


      {/* FIXED BOTTOM ACTIONS */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-5 pt-4"
        style={{
          paddingBottom:
            Math.max(
              insets.bottom,
              16,
            ),
        }}
      >
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={
              addToWishlist
            }
            disabled={
              wishlistLoading
            }
            activeOpacity={0.85}
            className="h-14 w-14 items-center justify-center rounded-2xl border border-gray-300 bg-white"
          >
            {wishlistLoading ? (
              <ActivityIndicator
                color="black"
              />
            ) : (
              <Ionicons
                name="heart-outline"
                size={23}
                color="black"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={
              addToCart
            }
            disabled={
              cartLoading ||
              !canAddToCart
            }
            activeOpacity={0.85}
            className={`h-14 flex-1 flex-row items-center justify-center rounded-2xl ${
              !canAddToCart
                ? 'bg-gray-400'
                : 'bg-black'
            }`}
          >
            {cartLoading ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Ionicons
                  name="bag-add-outline"
                  size={22}
                  color="white"
                />

                <Text className="ml-2 text-base font-extrabold text-white">
                  {canAddToCart
                    ? `Add to Cart • Rs ${currentPrice}`
                    : 'Out of Stock'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {renderAppModal()}
    </SafeAreaView>
  );
};


export default ProductDetails;
