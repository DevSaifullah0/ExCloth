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


const AdminCategoryDetails = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const routeCategoryId =
    route.params?.categoryId ??
    null;

  const [
    currentCategoryId,
    setCurrentCategoryId,
  ] = useState(
    routeCategoryId,
  );

  const isEditing =
    Boolean(
      currentCategoryId,
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
    sortOrder,
    setSortOrder,
  ] = useState('0');

  const [
    isActive,
    setIsActive,
  ] = useState(true);

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


  const applyCategoryData =
    data => {
      const category =
        data?.category ||
        data ||
        null;


      if (!category) {
        return;
      }


      setName(
        category.name ||
          '',
      );

      setSlug(
        category.slug ||
          '',
      );

      setSortOrder(
        String(
          category.sort_order ??
            0,
        ),
      );

      setIsActive(
        category.is_active !==
          false,
      );

      setCurrentImageUrl(
        category.image_url ||
          '',
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
            !currentCategoryId
          ) {
            return;
          }


          const {
            data,
            error,
          } =
            await supabase.rpc(
              'get_admin_category_details_secure',
              {
                p_category_id:
                  currentCategoryId,
              },
            );


          if (error) {
            throw error;
          }


          applyCategoryData(
            data,
          );

        } catch (error) {
          if (__DEV__) {
            console.error(
              'Admin Category Details Error:',
              error.message,
            );
          }

          setErrorMessage(
            error.message ||
              'Unable to load category.',
          );

        } finally {
          setLoading(false);
        }
      },
      [
        currentCategoryId,
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


  const pickCategoryImage =
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
            error.message ||
            'Unable to select image.',
        });
      }
    };


  const uploadSelectedImage =
    async categoryId => {
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
          `categories/${categoryId}/${Date.now()}-${Math.random()
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
            'set_admin_category_image_secure',
            {
              p_category_id:
                categoryId,
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
                'Old Category Image Delete Error:',
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


  const validateCategory =
    () => {
      if (
        name.trim().length <
        2
      ) {
        throw new Error(
          'Category name is required.',
        );
      }


      if (
        slugify(
          slug ||
          name,
        ).length <
        2
      ) {
        throw new Error(
          'Category slug is required.',
        );
      }


      const numericSort =
        Number(
          sortOrder,
        );


      if (
        !Number.isInteger(
          numericSort,
        ) ||
        numericSort < 0
      ) {
        throw new Error(
          'Sort order must be a whole number.',
        );
      }
    };


  const saveCategory =
    async () => {
      if (
        saving ||
        imageUploading
      ) {
        return;
      }


      try {
        validateCategory();

        setSaving(
          true,
        );


        const finalSlug =
          slugify(
            slug ||
            name,
          );


        const {
          data,
          error,
        } =
          await supabase.rpc(
            'save_admin_category_secure',
            {
              p_category_id:
                currentCategoryId ||
                null,

              p_name:
                name.trim(),

              p_slug:
                finalSlug,

              p_sort_order:
                Number(
                  sortOrder,
                ),

              p_is_active:
                isActive,
            },
          );


        if (error) {
          throw error;
        }


        const savedCategoryId =
          Number(
            data?.category_id ??
              data?.id ??
              currentCategoryId,
          );


        if (
          !savedCategoryId
        ) {
          throw new Error(
            'Category ID was not returned.',
          );
        }


        setCurrentCategoryId(
          savedCategoryId,
        );

        setSlug(
          finalSlug,
        );


        if (
          selectedImage
        ) {
          await uploadSelectedImage(
            savedCategoryId,
          );
        }


        showModal({
          type: 'success',
          title:
            currentCategoryId
              ? 'Category Updated'
              : 'Category Created',
          message:
            'Category information has been saved successfully.',
          confirmText:
            'OK',
          onConfirm:
            () => {
              closeModal();

              navigation.setParams({
                categoryId:
                  savedCategoryId,
              });

              fetchDetails({
                silent: true,
              });
            },
        });

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Save Category Error:',
            error.message,
          );
        }

        showModal({
          type: 'error',
          title:
            'Save Failed',
          message:
            error.message ||
            'Unable to save category.',
        });

      } finally {
        setSaving(
          false,
        );
      }
    };


  const removeCurrentImage =
    () => {
      if (
        selectedImage
      ) {
        setSelectedImage(
          null,
        );

        return;
      }


      if (
        !currentCategoryId ||
        !currentImageUrl
      ) {
        return;
      }


      showModal({
        type: 'confirm',
        title:
          'Remove Category Image?',
        message:
          'The current category image will be removed.',
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
                  'set_admin_category_image_secure',
                  {
                    p_category_id:
                      currentCategoryId,
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
                      'Category Image Delete Error:',
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
                  'Category image has been removed.',
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
                  error.message ||
                  'Unable to remove category image.',
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


  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">

        <ActivityIndicator
          size="large"
          color="black"
        />

        <Text className="mt-3 text-gray-500">
          Loading category...
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
              Category
            </Text>

          </View>


          <View className="mt-20 items-center">

            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#D1D5DB"
            />

            <Text className="mt-5 text-xl font-extrabold text-black">
              Unable to load category
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
                  ? 'Edit Category'
                  : 'Add Category'}
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Category image and visibility
              </Text>

            </View>

          </View>


          <Text className="mb-3 mt-7 text-lg font-bold text-black">
            Category Image
          </Text>


          <View className="rounded-3xl bg-gray-100 p-4">

            <View className="aspect-square w-full overflow-hidden rounded-2xl bg-white">

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
                    No category image
                  </Text>

                </View>
              )}

            </View>


            <TouchableOpacity
              onPress={
                pickCategoryImage
              }
              disabled={busy}
              activeOpacity={0.85}
              className="mt-4 flex-row items-center rounded-2xl bg-white p-4"
            >

              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">

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
                className="mt-3 flex-row items-center justify-center rounded-2xl border border-gray-300 bg-white p-4"
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
            Category Information
          </Text>


          <View className="rounded-3xl bg-gray-100 p-5">

            <Text className="font-semibold text-black">
              Category Name
            </Text>

            <TextInput
              value={name}
              onChangeText={
                value => {
                  setName(
                    value,
                  );

                  if (
                    !currentCategoryId &&
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
              placeholder="Hoodies"
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
              placeholder="hoodies"
              placeholderTextColor="#9CA3AF"
              className="mt-2 h-14 rounded-2xl bg-white px-4 text-black"
            />


            <Text className="mt-5 font-semibold text-black">
              Sort Order
            </Text>

            <TextInput
              value={
                sortOrder
              }
              onChangeText={
                value =>
                  setSortOrder(
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
                  Active Category
                </Text>

                <Text className="mt-1 text-xs text-gray-500">
                  Customers can see this category when enabled
                </Text>

              </View>

            </TouchableOpacity>

          </View>


          <TouchableOpacity
            onPress={
              saveCategory
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
                    ? 'Save Category'
                    : 'Create Category'}
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




export default AdminCategoryDetails;
