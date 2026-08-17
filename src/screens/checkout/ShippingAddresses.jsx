import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import React, {
  useCallback,
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

import {
  supabase,
} from '../../lib/supabase';

import AppModal from '../../components/common/AppModal';


const ADDRESS_COLUMNS = `
  id,
  user_id,
  full_name,
  phone,
  label,
  address,
  house_building,
  street_address,
  area,
  landmark,
  city,
  province,
  postal_code,
  country,
  is_default,
  created_at,
  updated_at
`;


const ShippingAddresses = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const [
    addresses,
    setAddresses,
  ] = useState([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState(
    route.params
      ?.selectedAddressId ||
      null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoadingId,
    setActionLoadingId,
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


  const closeModal = () => {
    setModal(current => ({
      ...current,
      visible: false,
    }));
  };


  const showModal = ({
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


  const loadAddresses =
    useCallback(
      async () => {
        try {
          setLoading(true);

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
                'Please login again.',
            });

            return;
          }

          const {
            data,
            error,
          } =
            await supabase
              .from(
                'shipping_addresses',
              )
              .select(
                ADDRESS_COLUMNS,
              )
              .eq(
                'user_id',
                user.id,
              )
              .order(
                'is_default',
                {
                  ascending:
                    false,
                },
              )
              .order(
                'updated_at',
                {
                  ascending:
                    false,
                },
              );

          if (error) {
            throw error;
          }

          const loaded =
            data || [];

          setAddresses(
            loaded,
          );

          setSelectedId(
            current => {
              if (
                current &&
                loaded.some(
                  item =>
                    item.id ===
                    current,
                )
              ) {
                return current;
              }

              const passedId =
                route.params
                  ?.selectedAddressId;

              if (
                passedId &&
                loaded.some(
                  item =>
                    item.id ===
                    passedId,
                )
              ) {
                return passedId;
              }

              return (
                loaded.find(
                  item =>
                    item.is_default,
                )?.id ||
                loaded[0]?.id ||
                null
              );
            },
          );
        } catch (error) {
          if (__DEV__) {
            console.error(
              'Shipping Addresses Error:',
              error.message,
            );
          }

          showModal({
            type: 'error',
            title:
              'Address Error',
            message:
              'Unable to load your addresses.',
          });
        } finally {
          setLoading(false);
        }
      },
      [
        route.params
          ?.selectedAddressId,
      ],
    );


  useFocusEffect(
    useCallback(
      () => {
        loadAddresses();
      },
      [
        loadAddresses,
      ],
    ),
  );


  const getAddressText =
    address => {
      const structured = [
        address.house_building,
        address.street_address,
        address.area,
      ]
        .filter(Boolean)
        .join(', ');

      return (
        structured ||
        address.address ||
        ''
      );
    };


  const getLocationText =
    address =>
      [
        address.city,
        address.province,
        address.postal_code,
        address.country,
      ]
        .filter(Boolean)
        .join(', ');


  const handleUseAddress =
    () => {
      const selected =
        addresses.find(
          item =>
            item.id ===
            selectedId,
        );

      if (!selected) {
        showModal({
          type: 'warning',
          title:
            'Select Address',
          message:
            'Please select a shipping address.',
        });

        return;
      }

      navigation.popTo(
        'Checkout',
        {
          selectedAddress:
            selected,
        },
        {
          merge: true,
        },
      );
    };


  const handleSetDefault =
    async address => {
      if (
        address.is_default
      ) {
        return;
      }

      try {
        setActionLoadingId(
          address.id,
        );

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

        const {
          error:
            resetError,
        } =
          await supabase
            .from(
              'shipping_addresses',
            )
            .update({
              is_default:
                false,
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'user_id',
              user.id,
            )
            .eq(
              'is_default',
              true,
            );

        if (resetError) {
          throw resetError;
        }

        const {
          error:
            defaultError,
        } =
          await supabase
            .from(
              'shipping_addresses',
            )
            .update({
              is_default:
                true,
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              address.id,
            )
            .eq(
              'user_id',
              user.id,
            );

        if (defaultError) {
          throw defaultError;
        }

        await loadAddresses();
      } catch (error) {
        if (__DEV__) {
          console.error(
            'Set Default Error:',
            error.message,
          );
        }

        showModal({
          type: 'error',
          title:
            'Default Address',
          message:
            'Unable to set the default address.',
        });
      } finally {
        setActionLoadingId(
          null,
        );
      }
    };


  const deleteAddress =
    async address => {
    if (actionLoadingId) {
      return;
    }

      try {
        setActionLoadingId(
          address.id,
        );

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

        const {
          error:
            deleteError,
        } =
          await supabase
            .from(
              'shipping_addresses',
            )
            .delete()
            .eq(
              'id',
              address.id,
            )
            .eq(
              'user_id',
              user.id,
            );

        if (deleteError) {
          throw deleteError;
        }

        if (
          address.is_default
        ) {
          const remaining =
            addresses.filter(
              item =>
                item.id !==
                address.id,
            );

          if (
            remaining.length >
            0
          ) {
            const {
              error:
                nextDefaultError,
            } =
              await supabase
                .from(
                  'shipping_addresses',
                )
                .update({
                  is_default:
                    true,
                  updated_at:
                    new Date()
                      .toISOString(),
                })
                .eq(
                  'id',
                  remaining[0]
                    .id,
                )
                .eq(
                  'user_id',
                  user.id,
                );

            if (
              nextDefaultError
            ) {
              throw nextDefaultError;
            }
          }
        }

        if (
          selectedId ===
          address.id
        ) {
          setSelectedId(
            null,
          );
        }

        await loadAddresses();

        showModal({
          type: 'success',
          title:
            'Address Deleted',
          message:
            'Shipping address has been removed.',
        });
      } catch (error) {
        if (__DEV__) {
          console.error(
            'Delete Address Error:',
            error.message,
          );
        }

        showModal({
          type: 'error',
          title:
            'Delete Address',
          message:
            'Unable to delete the address.',
        });
      } finally {
        setActionLoadingId(
          null,
        );
      }
    };


  const handleDelete =
    address => {
      showModal({
        type: 'confirm',
        title:
          'Delete Address?',
        message:
          'Are you sure you want to delete this shipping address?',
        confirmText:
          'Delete',
        cancelText:
          'Cancel',
        showCancel:
          true,
        onConfirm:
          async () => {
            closeModal();

            await deleteAddress(
              address,
            );
          },
      });
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
          Loading addresses...
        </Text>

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
  }


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
            160 +
            Math.max(
              insets.bottom,
              16,
            ),
        }}
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
              Shipping
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Select your delivery address.
            </Text>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black">
            <Ionicons
              name="location-outline"
              size={22}
              color="white"
            />
          </View>
        </View>


        {/* SUMMARY */}
        <View className="mt-7 flex-row items-center justify-between rounded-3xl bg-black p-5">
          <View className="flex-1 pr-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Saved Addresses
            </Text>

            <Text className="mt-2 text-2xl font-extrabold text-white">
              {addresses.length}
            </Text>

            <Text className="mt-1 text-sm text-gray-300">
              Choose the address for this order.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                'AddressForm',
                {
                  returnTo:
                    'ShippingAddresses',
                },
              )
            }
            activeOpacity={0.85}
            className="h-14 w-14 items-center justify-center rounded-2xl bg-white"
          >
            <Ionicons
              name="add-outline"
              size={26}
              color="black"
            />
          </TouchableOpacity>
        </View>


        {/* ADD NEW */}
        <TouchableOpacity
          onPress={() =>
            navigation.navigate(
              'AddressForm',
              {
                returnTo:
                  'ShippingAddresses',
              },
            )
          }
          activeOpacity={0.85}
          className="mt-5 h-14 flex-row items-center justify-center rounded-2xl border border-gray-300 bg-white"
        >
          <Ionicons
            name="add-circle-outline"
            size={21}
            color="black"
          />

          <Text className="ml-2 text-base font-extrabold text-black">
            Add New Address
          </Text>
        </TouchableOpacity>


        {/* EMPTY */}
        {addresses.length ===
        0 ? (
          <View className="mt-10 items-center rounded-3xl bg-gray-100 p-10">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
              <Ionicons
                name="location-outline"
                size={38}
                color="#6B7280"
              />
            </View>

            <Text className="mt-5 text-xl font-extrabold text-black">
              No addresses yet
            </Text>

            <Text className="mt-2 px-6 text-center leading-6 text-gray-500">
              Add your first shipping address to continue checkout.
            </Text>
          </View>
        ) : null}


        {/* ADDRESS LIST */}
        {addresses.map(
          address => {
            const isSelected =
              selectedId ===
              address.id;

            const isBusy =
              actionLoadingId ===
              address.id;

            const label =
              address.label ||
              'Address';

            const isOffice =
              String(
                label,
              ).toLowerCase() ===
              'office';

            return (
              <TouchableOpacity
                key={
                  address.id
                }
                onPress={() =>
                  setSelectedId(
                    address.id,
                  )
                }
                disabled={
                  isBusy
                }
                activeOpacity={0.85}
                className={`mt-5 overflow-hidden rounded-3xl border-2 p-5 ${
                  isSelected
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-start">
                  <View
                    className={`h-14 w-14 items-center justify-center rounded-2xl ${
                      isSelected
                        ? 'bg-black'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Ionicons
                      name={
                        isOffice
                          ? 'business-outline'
                          : 'home-outline'
                      }
                      size={24}
                      color={
                        isSelected
                          ? 'white'
                          : 'black'
                      }
                    />
                  </View>

                  <View className="ml-4 flex-1">
                    <View className="flex-row flex-wrap items-center">
                      <Text className="text-lg font-extrabold text-black">
                        {label}
                      </Text>

                      {address.is_default ? (
                        <View className="ml-2 rounded-full bg-black px-2.5 py-1">
                          <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white">
                            Default
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text className="mt-3 font-extrabold text-black">
                      {address.full_name ||
                        'Recipient'}
                    </Text>

                    {address.phone ? (
                      <View className="mt-2 flex-row items-center">
                        <Ionicons
                          name="call-outline"
                          size={15}
                          color="#6B7280"
                        />

                        <Text className="ml-2 text-sm font-semibold text-gray-500">
                          {address.phone}
                        </Text>
                      </View>
                    ) : null}

                    <View className="mt-3 flex-row items-start">
                      <Ionicons
                        name="location-outline"
                        size={17}
                        color="#6B7280"
                        style={{
                          marginTop: 2,
                        }}
                      />

                      <View className="ml-2 flex-1">
                        <Text className="leading-5 text-gray-600">
                          {getAddressText(
                            address,
                          )}
                        </Text>

                        <Text className="mt-1 leading-5 text-gray-500">
                          {getLocationText(
                            address,
                          )}
                        </Text>
                      </View>
                    </View>

                    {address.landmark ? (
                      <Text className="mt-2 text-xs font-semibold text-gray-400">
                        Landmark: {address.landmark}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    className={`h-8 w-8 items-center justify-center rounded-full ${
                      isSelected
                        ? 'bg-black'
                        : 'bg-gray-100'
                    }`}
                  >
                    {isSelected ? (
                      <Ionicons
                        name="checkmark"
                        size={17}
                        color="white"
                      />
                    ) : null}
                  </View>
                </View>


                {/* ACTIONS */}
                <View className="mt-5 flex-row flex-wrap border-t border-gray-200 pt-4">
                  <TouchableOpacity
                    onPress={event => {
                      event.stopPropagation();

                      navigation.navigate(
                        'AddressForm',
                        {
                          address,
                          returnTo:
                            'ShippingAddresses',
                        },
                      );
                    }}
                    disabled={
                      isBusy
                    }
                    activeOpacity={0.8}
                    className="mr-2 flex-row items-center rounded-xl bg-gray-100 px-3 py-2.5"
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color="black"
                    />

                    <Text className="ml-1.5 text-xs font-extrabold text-black">
                      Edit
                    </Text>
                  </TouchableOpacity>

                  {!address.is_default ? (
                    <TouchableOpacity
                      onPress={event => {
                        event.stopPropagation();

                        handleSetDefault(
                          address,
                        );
                      }}
                      disabled={
                        isBusy
                      }
                      activeOpacity={0.8}
                      className="mr-2 flex-row items-center rounded-xl bg-gray-100 px-3 py-2.5"
                    >
                      <Ionicons
                        name="star-outline"
                        size={17}
                        color="black"
                      />

                      <Text className="ml-1.5 text-xs font-extrabold text-black">
                        Default
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    onPress={event => {
                      event.stopPropagation();

                      handleDelete(
                        address,
                      );
                    }}
                    disabled={
                      isBusy
                    }
                    activeOpacity={0.8}
                    className="flex-row items-center rounded-xl bg-gray-100 px-3 py-2.5"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color="black"
                    />

                    <Text className="ml-1.5 text-xs font-extrabold text-black">
                      Delete
                    </Text>
                  </TouchableOpacity>

                  {isBusy ? (
                    <ActivityIndicator
                      className="ml-3 self-center"
                      size="small"
                      color="black"
                    />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          },
        )}
      </ScrollView>


      {/* USE ADDRESS */}
      {addresses.length >
      0 ? (
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
          <TouchableOpacity
            onPress={
              handleUseAddress
            }
            disabled={
              !selectedId
            }
            activeOpacity={0.85}
            className={`h-14 flex-row items-center justify-center rounded-2xl ${
              selectedId
                ? 'bg-black'
                : 'bg-gray-400'
            }`}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={21}
              color="white"
            />

            <Text className="ml-2 text-base font-extrabold text-white">
              Use This Address
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}


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
          !actionLoadingId
        }
        loading={
          Boolean(
            actionLoadingId,
          )
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


export default ShippingAddresses;
