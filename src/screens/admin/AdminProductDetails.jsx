import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  launchImageLibrary,
} from 'react-native-image-picker';

import {
  decode,
} from 'base64-arraybuffer';

import { supabase } from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const MAX_IMAGE_BYTES =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];


const AdminProductDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const routeProductId =
    route.params?.productId ??
    null;

  const [
    currentProductId,
    setCurrentProductId,
  ] = useState(
    routeProductId,
  );

  const isEditing =
    Boolean(
      currentProductId,
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
    imageUploading,
    setImageUploading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


  const [
    name,
    setName,
  ] = useState('');

  const [
    slug,
    setSlug,
  ] = useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    price,
    setPrice,
  ] = useState('');

  const [
    oldPrice,
    setOldPrice,
  ] = useState('');

  const [
    salePercentage,
    setSalePercentage,
  ] = useState('0');

  const [
    sku,
    setSku,
  ] = useState('');

  const [
    stockQuantity,
    setStockQuantity,
  ] = useState('0');

  const [
    isPopular,
    setIsPopular,
  ] = useState(false);

  const [
    isNew,
    setIsNew,
  ] = useState(false);

  const [
    isFeatured,
    setIsFeatured,
  ] = useState(false);

  const [
    isActive,
    setIsActive,
  ] = useState(true);


  const [
    categories,
    setCategories,
  ] = useState([]);

  const [
    selectedCategoryIds,
    setSelectedCategoryIds,
  ] = useState([]);


  const [
    variants,
    setVariants,
  ] = useState([]);


  const [
    currentImageUrl,
    setCurrentImageUrl,
  ] = useState('');

  const [
    selectedImage,
    setSelectedImage,
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
      if (
        saving ||
        imageUploading
      ) {
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


  const slugify =
    value =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          '-',
        )
        .replace(
          /^-+|-+$/g,
          '',
        );


  const fetchCategories =
    useCallback(
      async () => {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            'get_admin_categories_secure',
          );


        if (error) {
          throw error;
        }


        const list =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data?.categories,
              )
            ? data.categories
            : [];


        setCategories(
          list,
        );
      },
      [],
    );


  const applyProductData =
    data => {
      const product =
        data?.product ||
        null;


      if (!product) {
        return;
      }


      setName(
        product.name || '',
      );

      setSlug(
        product.slug || '',
      );

      setDescription(
        product.description ||
          '',
      );

      setPrice(
        product.price != null
          ? String(
              product.price,
            )
          : '',
      );

      setOldPrice(
        product.old_price != null
          ? String(
              product.old_price,
            )
          : '',
      );

      const numericProductPrice =
        Number(
          product.price ?? 0,
        );

      const numericProductOldPrice =
        Number(
          product.old_price ?? 0,
        );

      if (
        numericProductOldPrice > 0 &&
        numericProductOldPrice >
          numericProductPrice
      ) {
        const calculatedSale =
          ((numericProductOldPrice -
            numericProductPrice) /
            numericProductOldPrice) *
          100;

        setSalePercentage(
          String(
            Number(
              calculatedSale.toFixed(2),
            ),
          ),
        );
      } else {
        setSalePercentage('0');
      }

      setSku(
        product.sku || '',
      );

      setStockQuantity(
        String(
          product.stock_quantity ??
            0,
        ),
      );

      setIsPopular(
        Boolean(
          product.is_popular,
        ),
      );

      setIsNew(
        Boolean(
          product.is_new,
        ),
      );

      setIsFeatured(
        Boolean(
          product.is_featured,
        ),
      );

      setIsActive(
        product.is_active !==
          false,
      );

      setCurrentImageUrl(
        product.image_url ||
          '',
      );


      const categoryIds =
        Array.isArray(
          data?.category_ids,
        )
          ? data.category_ids
          : Array.isArray(
              product.categories,
            )
          ? product.categories
              .map(
                category =>
                  category?.id,
              )
              .filter(Boolean)
          : [];


      setSelectedCategoryIds(
        categoryIds.map(
          value =>
            Number(value),
        ),
      );


      const variantList =
        Array.isArray(
          data?.variants,
        )
          ? data.variants
          : [];


      setVariants(
        variantList.map(
          variant => ({
            ...variant,
            size:
              variant.size || '',
            color:
              variant.color || '',
            sku:
              variant.sku || '',
            stock_quantity:
              String(
                variant
                  .stock_quantity ??
                  0,
              ),
            price_adjustment:
              String(
                variant
                  .price_adjustment ??
                  0,
              ),
            is_active:
              variant.is_active !==
                false,
          }),
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


          await fetchCategories();


          if (
            !currentProductId
          ) {
            return;
          }


          const {
            data,
            error,
          } =
            await supabase.rpc(
              'get_admin_product_details_secure',
              {
                p_product_id:
                  currentProductId,
              },
            );


          if (error) {
            throw error;
          }


          applyProductData(
            data,
          );

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Admin Product Details Error:',
              error.message,
            );
          }

          setErrorMessage(
            'Unable to load product.',
          );

        } finally {
          setLoading(false);
        }
      },
      [
        currentProductId,
        fetchCategories,
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


  const toggleCategory =
    categoryId => {
      const id =
        Number(
          categoryId,
        );


      setSelectedCategoryIds(
        current =>
          current.includes(id)
            ? current.filter(
                item =>
                  item !== id,
              )
            : [
                ...current,
                id,
              ],
      );
    };


  const updateVariantField =
    (
      index,
      key,
      value,
    ) => {
      setVariants(
        current =>
          current.map(
            (
              variant,
              variantIndex,
            ) =>
              variantIndex ===
              index
                ? {
                    ...variant,
                    [key]:
                      value,
                  }
                : variant,
          ),
      );
    };


  const addVariant =
    () => {
      if (
        !currentProductId
      ) {
        showModal({
          type: 'warning',
          title:
            'Save Product First',
          message:
            'Create the product first, then add variants.',
        });

        return;
      }


      setVariants(
        current => [
          ...current,
          {
            id: null,
            product_id:
              currentProductId,
            size: '',
            color: '',
            sku: '',
            stock_quantity:
              '0',
            price_adjustment:
              '0',
            is_active: true,
            _new: true,
          },
        ],
      );
    };


  const normalizeDecimalInput =
    value => {
      const cleaned =
        String(value || '')
          .replace(
            /[^0-9.]/g,
            '',
          );

      const parts =
        cleaned.split('.');

      if (
        parts.length <= 1
      ) {
        return cleaned;
      }

      return `${parts[0]}.${parts
        .slice(1)
        .join('')
        .slice(0, 2)}`;
    };


  const calculateSalePrice =
    (regular, percentage) => {
      const numericRegular =
        Number(regular);

      const numericPercentage =
        Number(percentage);

      if (
        !Number.isFinite(
          numericRegular,
        ) ||
        numericRegular < 0 ||
        !Number.isFinite(
          numericPercentage,
        ) ||
        numericPercentage < 0 ||
        numericPercentage >= 100
      ) {
        return '';
      }

      const discounted =
        numericRegular *
        (1 -
          numericPercentage / 100);

      return String(
        Number(
          discounted.toFixed(2),
        ),
      );
    };


  const handleRegularPriceChange =
    value => {
      const normalized =
        normalizeDecimalInput(
          value,
        );

      const numericSale =
        Number(
          salePercentage || 0,
        );

      if (
        Number.isFinite(
          numericSale,
        ) &&
        numericSale > 0 &&
        numericSale < 100
      ) {
        setOldPrice(
          normalized,
        );

        setPrice(
          calculateSalePrice(
            normalized,
            numericSale,
          ),
        );

        return;
      }

      setOldPrice('');
      setPrice(normalized);
    };


  const handleSalePercentageChange =
    value => {
      const normalized =
        normalizeDecimalInput(
          value,
        );

      setSalePercentage(
        normalized,
      );

      const numericSale =
        Number(
          normalized || 0,
        );

      const regularPrice =
        oldPrice.trim()
          ? oldPrice
          : price;

      if (
        !Number.isFinite(
          Number(regularPrice),
        )
      ) {
        return;
      }

      if (
        normalized === '' ||
        numericSale === 0
      ) {
        if (
          oldPrice.trim()
        ) {
          setPrice(
            oldPrice,
          );
          setOldPrice('');
        }

        return;
      }

      if (
        numericSale > 0 &&
        numericSale < 100
      ) {
        if (
          !oldPrice.trim()
        ) {
          setOldPrice(
            price,
          );
        }

        setPrice(
          calculateSalePrice(
            regularPrice,
            numericSale,
          ),
        );
      }
    };


  const validateProduct =
    () => {
      if (
        name.trim().length <
        2
      ) {
        throw new Error(
          'Product name is required.',
        );
      }


      const numericPrice =
        Number(price);


      if (
        !Number.isFinite(
          numericPrice,
        ) ||
        numericPrice < 0
      ) {
        throw new Error(
          'Enter a valid product price.',
        );
      }


      const numericStock =
        Number(
          stockQuantity,
        );


      if (
        !Number.isInteger(
          numericStock,
        ) ||
        numericStock < 0
      ) {
        throw new Error(
          'Stock must be a whole number.',
        );
      }


      const numericSalePercentage =
        Number(
          salePercentage || 0,
        );


      if (
        !Number.isFinite(
          numericSalePercentage,
        ) ||
        numericSalePercentage < 0 ||
        numericSalePercentage >= 100
      ) {
        throw new Error(
          'Sale percentage must be between 0 and 99.99.',
        );
      }


      if (
        numericSalePercentage > 0
      ) {
        const numericOldPrice =
          Number(
            oldPrice,
          );


        if (
          !Number.isFinite(
            numericOldPrice,
          ) ||
          numericOldPrice <=
            numericPrice
        ) {
          throw new Error(
            'Sale price could not be calculated correctly.',
          );
        }
      }
    };


  const getStoragePathFromUrl =
    url => {
      if (!url) {
        return null;
      }


      const marker =
        '/product-images/';


      const index =
        String(url)
          .indexOf(
            marker,
          );


      if (index < 0) {
        return null;
      }


      const path =
        String(url).slice(
          index +
            marker.length,
        );


      return path
        ? decodeURIComponent(
            path,
          )
        : null;
    };


  const pickProductImage =
    async () => {
      try {
        const result =
          await launchImageLibrary({
            mediaType:
              'photo',
            selectionLimit:
              1,
            includeBase64:
              true,
            quality:
              0.85,
            maxWidth:
              1600,
            maxHeight:
              1600,
            restrictMimeTypes:
              ALLOWED_IMAGE_TYPES,
          });


        if (
          result.didCancel
        ) {
          return;
        }


        if (
          result.errorCode
        ) {
          throw new Error(
            result.errorMessage ||
              'Unable to select image.',
          );
        }


        const asset =
          result.assets?.[0];


        if (
          !asset?.uri ||
          !asset?.base64
        ) {
          throw new Error(
            'Selected image data is unavailable.',
          );
        }


        const type =
          asset.type ||
          'image/jpeg';


        if (
          !ALLOWED_IMAGE_TYPES.includes(
            type,
          )
        ) {
          throw new Error(
            'Only JPG, PNG and WEBP images are allowed.',
          );
        }


        if (
          Number(
            asset.fileSize ||
              0,
          ) >
          MAX_IMAGE_BYTES
        ) {
          throw new Error(
            'Image must be 5 MB or smaller.',
          );
        }


        setSelectedImage({
          uri:
            asset.uri,
          base64:
            asset.base64,
          type,
          fileName:
            asset.fileName ||
            '',
          fileSize:
            asset.fileSize ||
            0,
        });

      } catch (error) {
        showModal({
          type: 'error',
          title:
            'Image Selection Failed',
          message:
            'Unable to select image.',
        });
      }
    };


  const uploadSelectedImage =
    async productId => {
      if (
        !selectedImage
      ) {
        return currentImageUrl;
      }


      setImageUploading(
        true,
      );


      try {
        const extensionMap = {
          'image/jpeg':
            'jpg',
          'image/png':
            'png',
          'image/webp':
            'webp',
        };


        const extension =
          extensionMap[
            selectedImage.type
          ] ||
          'jpg';


        const path =
          `products/${productId}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}.${extension}`;


        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from(
              'product-images',
            )
            .upload(
              path,
              decode(
                selectedImage.base64,
              ),
              {
                contentType:
                  selectedImage.type,
                cacheControl:
                  '3600',
                upsert: false,
              },
            );


        if (
          uploadError
        ) {
          throw uploadError;
        }


        const {
          data:
            publicData,
        } =
          supabase.storage
            .from(
              'product-images',
            )
            .getPublicUrl(
              path,
            );


        const publicUrl =
          publicData
            ?.publicUrl;


        if (!publicUrl) {
          throw new Error(
            'Unable to create image URL.',
          );
        }


        const {
          error:
            imageSaveError,
        } =
          await supabase.rpc(
            'set_admin_product_image_secure',
            {
              p_product_id:
                productId,
              p_image_url:
                publicUrl,
            },
          );


        if (
          imageSaveError
        ) {
          await supabase.storage
            .from(
              'product-images',
            )
            .remove([
              path,
            ]);

          throw imageSaveError;
        }


        const oldPath =
          getStoragePathFromUrl(
            currentImageUrl,
          );


        if (
          oldPath &&
          oldPath !== path
        ) {
          const {
            error:
              removeOldError,
          } =
            await supabase.storage
              .from(
                'product-images',
              )
              .remove([
                oldPath,
              ]);


          if (
            removeOldError
          ) {
            if (__DEV__) {
              console.error(
                'Old Product Image Delete Error:',
                removeOldError.message,
              );
            }
          }
        }


        setCurrentImageUrl(
          publicUrl,
        );

        setSelectedImage(
          null,
        );


        return publicUrl;

      } finally {
        setImageUploading(
          false,
        );
      }
    };


  const saveProduct =
    async () => {
      if (
        saving ||
        imageUploading
      ) {
        return;
      }


      try {
        validateProduct();


        setSaving(
          true,
        );


        const finalSlug =
          slug.trim() ||
          slugify(name);


        const {
          data,
          error,
        } =
          await supabase.rpc(
            'save_admin_product_secure',
            {
              p_product_id:
                currentProductId ||
                null,

              p_name:
                name.trim(),

              p_slug:
                finalSlug,

              p_description:
                description.trim() ||
                null,

              p_price:
                Number(price),

              p_old_price:
                oldPrice.trim()
                  ? Number(
                      oldPrice,
                    )
                  : null,

              p_sku:
                sku.trim() ||
                null,

              p_stock_quantity:
                Number(
                  stockQuantity,
                ),

              p_is_popular:
                isPopular,

              p_is_new:
                isNew,

              p_is_featured:
                isFeatured,

              p_is_active:
                isActive,

              p_category_ids:
                selectedCategoryIds,
            },
          );


        if (error) {
          throw error;
        }


        const savedProductId =
          Number(
            data?.product_id ??
              data?.id ??
              currentProductId,
          );


        if (
          !savedProductId
        ) {
          throw new Error(
            'Product ID was not returned.',
          );
        }


        setCurrentProductId(
          savedProductId,
        );

        setSlug(
          finalSlug,
        );


        if (
          selectedImage
        ) {
          await uploadSelectedImage(
            savedProductId,
          );
        }


        showModal({
          type: 'success',
          title:
            currentProductId
              ? 'Product Updated'
              : 'Product Created',
          message:
            'Product information has been saved successfully.',
          confirmText:
            'OK',
          onConfirm: () => {
            closeModal();

            navigation.setParams({
              productId:
                savedProductId,
            });

            fetchDetails({
              silent: true,
            });
          },
        });

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Save Product Error:',
            error.message,
          );
        }

        showModal({
          type: 'error',
          title:
            'Save Failed',
          message:
            'Unable to save product.',
        });

      } finally {
        setSaving(false);
      }
    };


  const saveVariant =
    async (
      variant,
      index,
    ) => {
    if (
      saving ||
      imageUploading
    ) {
      return;
    }

      if (
        !currentProductId
      ) {
        return;
      }


      try {
        const stock =
          Number(
            variant.stock_quantity,
          );

        const adjustment =
          Number(
            variant.price_adjustment ||
              0,
          );


        if (
          !Number.isInteger(
            stock,
          ) ||
          stock < 0
        ) {
          throw new Error(
            'Variant stock must be a whole number.',
          );
        }


        if (
          !Number.isFinite(
            adjustment,
          )
        ) {
          throw new Error(
            'Variant price adjustment is invalid.',
          );
        }


        setSaving(
          true,
        );


        const {
          data,
          error,
        } =
          await supabase.rpc(
            'save_admin_product_variant_secure',
            {
              p_variant_id:
                variant.id ||
                null,

              p_product_id:
                currentProductId,

              p_size:
                variant.size.trim() ||
                null,

              p_color:
                variant.color.trim() ||
                null,

              p_sku:
                variant.sku.trim() ||
                null,

              p_stock_quantity:
                stock,

              p_price_adjustment:
                adjustment,

              p_is_active:
                variant.is_active !==
                false,
            },
          );


        if (error) {
          throw error;
        }


        updateVariantField(
          index,
          'id',
          data?.variant_id ??
            data?.id ??
            variant.id,
        );


        showModal({
          type: 'success',
          title:
            'Variant Saved',
          message:
            'Variant information has been updated.',
          onConfirm: () => {
            closeModal();

            fetchDetails({
              silent: true,
            });
          },
        });

      } catch (error) {
        showModal({
          type: 'error',
          title:
            'Variant Save Failed',
          message:
            'Unable to save variant.',
        });

      } finally {
        setSaving(false);
      }
    };


  const removeCurrentImage =
    async () => {
      if (
        selectedImage
      ) {
        setSelectedImage(
          null,
        );

        return;
      }


      if (
        !currentProductId ||
        !currentImageUrl
      ) {
        return;
      }


      showModal({
        type: 'confirm',
        title:
          'Remove Product Image?',
        message:
          'The current product image will be removed.',
        confirmText:
          'Remove',
        cancelText:
          'Not Now',
        showCancel:
          true,
        onConfirm:
          async () => {
            try {
              setSaving(
                true,
              );


              const {
                error:
                  imageSaveError,
              } =
                await supabase.rpc(
                  'set_admin_product_image_secure',
                  {
                    p_product_id:
                      currentProductId,
                    p_image_url:
                      null,
                  },
                );


              if (
                imageSaveError
              ) {
                throw imageSaveError;
              }


              const oldPath =
                getStoragePathFromUrl(
                  currentImageUrl,
                );


              if (
                oldPath
              ) {
                const {
                  error:
                    removeError,
                } =
                  await supabase.storage
                    .from(
                      'product-images',
                    )
                    .remove([
                      oldPath,
                    ]);


                if (
                  removeError
                ) {
                  if (__DEV__) {
                    console.error(
                      'Product Image Delete Error:',
                      removeError.message,
                    );
                  }
                }
              }


              setCurrentImageUrl(
                '',
              );

              setSelectedImage(
                null,
              );


              setModal({
                visible: true,
                type: 'success',
                title:
                  'Image Removed',
                message:
                  'Product image has been removed.',
                confirmText:
                  'OK',
                cancelText:
                  'Cancel',
                showCancel:
                  false,
                onConfirm:
                  closeModal,
              });

            } catch (error) {
              setModal({
                visible: true,
                type: 'error',
                title:
                  'Remove Failed',
                message:
                  'Unable to remove product image.',
                confirmText:
                  'OK',
                cancelText:
                  'Cancel',
                showCancel:
                  false,
                onConfirm:
                  closeModal,
              });

            } finally {
              setSaving(
                false,
              );
            }
          },
      });
    };


  const previewImage =
    selectedImage?.uri ||
    currentImageUrl;


  const busy =
    saving ||
    imageUploading;


  const toggles =
    useMemo(
      () => [
        {
          label:
            'Active',
          value:
            isActive,
          setter:
            setIsActive,
        },
        {
          label:
            'Popular',
          value:
            isPopular,
          setter:
            setIsPopular,
        },
        {
          label:
            'New',
          value:
            isNew,
          setter:
            setIsNew,
        },
        {
          label:
            'Featured',
          value:
            isFeatured,
          setter:
            setIsFeatured,
        },
      ],
      [
        isActive,
        isPopular,
        isNew,
        isFeatured,
      ],
    );


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
              Product
            </Text>

          </View>


          <View className="mt-20 items-center">

            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#D1D5DB"
            />

            <Text className="mt-5 text-xl font-extrabold text-black">
              Unable to load product
            </Text>

            <Text className="mt-2 text-center leading-6 text-gray-500">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={() =>
                fetchDetails()
              }
              activeOpacity={0.85}
              className="mt-6 rounded-xl bg-black px-7 py-4"
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
          showsVerticalScrollIndicator={false}
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
                  ? 'Edit Product'
                  : 'Add Product'}
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Product, image and inventory
              </Text>

            </View>

          </View>


          <Text className="mb-3 mt-7 text-lg font-bold text-black">
            Product Image
          </Text>


          <View className="rounded-3xl bg-gray-100 p-4">

            <View className="aspect-square w-full overflow-hidden rounded-3xl bg-white">

              {previewImage ? (
                <Image
                  source={{
                    uri:
                      previewImage,
                  }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">

                  <Ionicons
                    name="image-outline"
                    size={54}
                    color="#9CA3AF"
                  />

                  <Text className="mt-3 font-semibold text-gray-500">
                    No product image
                  </Text>

                </View>
              )}

            </View>


            <TouchableOpacity
              onPress={
                pickProductImage
              }
              disabled={busy}
              activeOpacity={0.85}
              className="mt-4 flex-row items-center rounded-2xl bg-white p-4"
            >

              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">

                <Ionicons
                  name="images-outline"
                  size={21}
                  color="black"
                />

              </View>

              <View className="ml-3 flex-1">

                <Text className="font-bold text-black">
                  {previewImage
                    ? 'Change Image'
                    : 'Select Image'}
                </Text>

                <Text className="mt-1 text-xs text-gray-500">
                  JPG, PNG or WEBP • Max 5 MB
                </Text>

              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color="#6B7280"
              />

            </TouchableOpacity>


            {previewImage ? (
              <TouchableOpacity
                onPress={
                  removeCurrentImage
                }
                disabled={busy}
                activeOpacity={0.85}
                className="mt-3 flex-row items-center justify-center rounded-xl border border-gray-300 bg-white p-4"
              >
                <Ionicons
                  name="trash-outline"
                  size={19}
                  color="black"
                />

                <Text className="ml-2 font-bold text-black">
                  Remove Image
                </Text>
              </TouchableOpacity>
            ) : null}

          </View>


          <Text className="mb-3 mt-7 text-lg font-bold text-black">
            Basic Information
          </Text>


          <View className="rounded-3xl bg-gray-100 p-5">

            <Text className="font-semibold text-black">
              Product Name
            </Text>

            <TextInput
              value={name}
              onChangeText={
                value => {
                  setName(value);

                  if (
                    !currentProductId &&
                    !slug.trim()
                  ) {
                    setSlug(
                      slugify(
                        value,
                      ),
                    );
                  }
                }
              }
              placeholder="Premium Hoodie"
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />


            <Text className="mt-5 font-semibold text-black">
              Slug
            </Text>

            <TextInput
              value={slug}
              onChangeText={
                value =>
                  setSlug(
                    slugify(
                      value,
                    ),
                  )
              }
              autoCapitalize="none"
              placeholder="premium-hoodie"
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />


            <Text className="mt-5 font-semibold text-black">
              Description
            </Text>

            <TextInput
              value={
                description
              }
              onChangeText={
                setDescription
              }
              placeholder="Product description..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              className="mt-2 min-h-32 rounded-2xl bg-white p-4 text-black"
            />


            <Text className="mt-5 font-semibold text-black">
              SKU
            </Text>

            <TextInput
              value={sku}
              onChangeText={
                setSku
              }
              autoCapitalize="characters"
              placeholder="EX-HOODIE-001"
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />

          </View>


          <Text className="mb-3 mt-7 text-lg font-bold text-black">
            Pricing & Stock
          </Text>


          <View className="rounded-3xl bg-gray-100 p-5">

            <View className="flex-row gap-3">

              <View className="flex-1">

                <Text className="font-semibold text-black">
                  Regular Price
                </Text>

                <TextInput
                  value={
                    oldPrice.trim()
                      ? oldPrice
                      : price
                  }
                  onChangeText={
                    handleRegularPriceChange
                  }
                  keyboardType="decimal-pad"
                  placeholder="5000"
                  placeholderTextColor="#9CA3AF"
                  className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
                />

              </View>


              <View className="flex-1">

                <Text className="font-semibold text-black">
                  Sale %
                </Text>

                <TextInput
                  value={
                    salePercentage
                  }
                  onChangeText={
                    handleSalePercentageChange
                  }
                  keyboardType="decimal-pad"
                  placeholder="20"
                  placeholderTextColor="#9CA3AF"
                  className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
                />

              </View>

            </View>


            <View className="mt-4 flex-row items-center justify-between rounded-xl bg-white p-4">

              <View>

                <Text className="text-sm font-semibold text-gray-500">
                  Selling Price
                </Text>

                <Text className="mt-1 text-xs text-gray-400">
                  0% means no sale
                </Text>

              </View>

              <Text className="text-xl font-extrabold text-black">
                Rs {price || '0'}
              </Text>

            </View>


            {Number(
              salePercentage || 0,
            ) > 0 &&
            oldPrice.trim() ? (

              <View className="mt-3 flex-row items-center rounded-xl bg-black px-4 py-3">

                <Ionicons
                  name="pricetag-outline"
                  size={18}
                  color="white"
                />

                <Text className="ml-2 flex-1 font-semibold text-white">
                  {salePercentage}% OFF
                </Text>

                <Text className="font-bold text-white">
                  Save Rs {String(
                    Number(
                      (
                        Number(oldPrice) -
                        Number(price || 0)
                      ).toFixed(2),
                    ),
                  )}
                </Text>

              </View>

            ) : null}


            <Text className="mt-5 font-semibold text-black">
              Main Stock
            </Text>

            <TextInput
              value={
                stockQuantity
              }
              onChangeText={
                value =>
                  setStockQuantity(
                    value.replace(
                      /[^0-9]/g,
                      '',
                    ),
                  )
              }
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />

          </View>


          <Text className="mb-3 mt-7 text-lg font-bold text-black">
            Categories
          </Text>


          <View className="flex-row flex-wrap">

            {categories.map(
              category => {
                const selected =
                  selectedCategoryIds
                    .includes(
                      Number(
                        category.id,
                      ),
                    );

                return (
                  <TouchableOpacity
                    key={
                      category.id
                    }
                    onPress={() =>
                      toggleCategory(
                        category.id,
                      )
                    }
                    activeOpacity={0.85}
                    className={`mb-3 mr-3 rounded-full px-4 py-3 ${
                      selected
                        ? 'bg-black'
                        : 'bg-gray-100'
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
                        category.name
                      }
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}

          </View>


          <Text className="mb-3 mt-5 text-lg font-bold text-black">
            Product Visibility
          </Text>


          <View className="rounded-3xl bg-gray-100 p-4">

            {toggles.map(
              (
                item,
                index,
              ) => (
                <TouchableOpacity
                  key={
                    item.label
                  }
                  onPress={() =>
                    item.setter(
                      !item.value,
                    )
                  }
                  activeOpacity={0.85}
                  className={`flex-row items-center p-2 ${
                    index <
                    toggles.length -
                      1
                      ? 'mb-2'
                      : ''
                  }`}
                >

                  <View
                    className={`h-7 w-7 items-center justify-center rounded-lg ${
                      item.value
                        ? 'bg-black'
                        : 'bg-white'
                    }`}
                  >
                    {item.value ? (
                      <Ionicons
                        name="checkmark"
                        size={17}
                        color="white"
                      />
                    ) : null}
                  </View>

                  <Text className="ml-3 flex-1 font-bold text-black">
                    {
                      item.label
                    }
                  </Text>

                </TouchableOpacity>
              ),
            )}

          </View>


          <TouchableOpacity
            onPress={
              saveProduct
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
                    ? 'Save Product'
                    : 'Create Product'}
                </Text>
              </>
            )}

          </TouchableOpacity>


          {currentProductId ? (
            <>
              <View className="mt-9 flex-row items-center justify-between">

                <View>

                  <Text className="text-xl font-extrabold text-black">
                    Variants
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    Size, color and variant stock
                  </Text>

                </View>


                <TouchableOpacity
                  onPress={
                    addVariant
                  }
                  disabled={busy}
                  activeOpacity={0.85}
                  className="flex-row items-center rounded-xl bg-gray-100 px-4 py-3"
                >
                  <Ionicons
                    name="add-outline"
                    size={19}
                    color="black"
                  />

                  <Text className="ml-1 font-bold text-black">
                    Add
                  </Text>
                </TouchableOpacity>

              </View>


              <View className="mt-4">

                {variants.length ===
                0 ? (
                  <View className="rounded-3xl bg-gray-100 p-5">

                    <Text className="text-center font-semibold text-gray-500">
                      No variants added yet.
                    </Text>

                  </View>
                ) : null}


                {variants.map(
                  (
                    variant,
                    index,
                  ) => (
                    <View
                      key={
                        variant.id ||
                        `new-${index}`
                      }
                      className="mb-4 rounded-2xl bg-gray-100 p-5"
                    >

                      <View className="flex-row gap-3">

                        <View className="flex-1">

                          <Text className="font-semibold text-black">
                            Size
                          </Text>

                          <TextInput
                            value={
                              variant.size
                            }
                            onChangeText={
                              value =>
                                updateVariantField(
                                  index,
                                  'size',
                                  value,
                                )
                            }
                            placeholder="M"
                            placeholderTextColor="#9CA3AF"
                            className="mt-2 h-12 rounded-2xl bg-white px-4 text-black"
                          />

                        </View>


                        <View className="flex-1">

                          <Text className="font-semibold text-black">
                            Color
                          </Text>

                          <TextInput
                            value={
                              variant.color
                            }
                            onChangeText={
                              value =>
                                updateVariantField(
                                  index,
                                  'color',
                                  value,
                                )
                            }
                            placeholder="Black"
                            placeholderTextColor="#9CA3AF"
                            className="mt-2 h-12 rounded-2xl bg-white px-4 text-black"
                          />

                        </View>

                      </View>


                      <Text className="mt-4 font-semibold text-black">
                        Variant SKU
                      </Text>

                      <TextInput
                        value={
                          variant.sku
                        }
                        onChangeText={
                          value =>
                            updateVariantField(
                              index,
                              'sku',
                              value,
                            )
                        }
                        autoCapitalize="characters"
                        placeholder="EX-HOODIE-M-BLK"
                        placeholderTextColor="#9CA3AF"
                        className="mt-2 h-12 rounded-2xl bg-white px-4 text-black"
                      />


                      <View className="mt-4 flex-row gap-3">

                        <View className="flex-1">

                          <Text className="font-semibold text-black">
                            Stock
                          </Text>

                          <TextInput
                            value={
                              variant.stock_quantity
                            }
                            onChangeText={
                              value =>
                                updateVariantField(
                                  index,
                                  'stock_quantity',
                                  value.replace(
                                    /[^0-9]/g,
                                    '',
                                  ),
                                )
                            }
                            keyboardType="number-pad"
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                            className="mt-2 h-12 rounded-2xl bg-white px-4 text-black"
                          />

                        </View>


                        <View className="flex-1">

                          <Text className="font-semibold text-black">
                            Price Adjustment
                          </Text>

                          <TextInput
                            value={
                              variant.price_adjustment
                            }
                            onChangeText={
                              value =>
                                updateVariantField(
                                  index,
                                  'price_adjustment',
                                  value.replace(
                                    /[^0-9-]/g,
                                    '',
                                  ),
                                )
                            }
                            keyboardType="numbers-and-punctuation"
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                            className="mt-2 h-12 rounded-2xl bg-white px-4 text-black"
                          />

                        </View>

                      </View>


                      <TouchableOpacity
                        onPress={() =>
                          updateVariantField(
                            index,
                            'is_active',
                            !variant.is_active,
                          )
                        }
                        activeOpacity={0.85}
                        className="mt-4 flex-row items-center rounded-2xl bg-white p-4"
                      >

                        <View
                          className={`h-7 w-7 items-center justify-center rounded-lg ${
                            variant.is_active
                              ? 'bg-black'
                              : 'bg-gray-100'
                          }`}
                        >
                          {variant.is_active ? (
                            <Ionicons
                              name="checkmark"
                              size={17}
                              color="white"
                            />
                          ) : null}
                        </View>

                        <Text className="ml-3 font-bold text-black">
                          Active Variant
                        </Text>

                      </TouchableOpacity>


                      <TouchableOpacity
                        onPress={() =>
                          saveVariant(
                            variant,
                            index,
                          )
                        }
                        disabled={busy}
                        activeOpacity={0.85}
                        className="mt-4 h-12 flex-row items-center justify-center rounded-2xl bg-white"
                      >
                        <Ionicons
                          name="save-outline"
                          size={19}
                          color="black"
                        />

                        <Text className="ml-2 font-bold text-black">
                          Save Variant
                        </Text>
                      </TouchableOpacity>

                    </View>
                  ),
                )}

              </View>
            </>
          ) : null}

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




export default AdminProductDetails;
