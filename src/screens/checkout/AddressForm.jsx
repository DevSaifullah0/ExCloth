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
  useState,
} from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import {
  SafeAreaView,
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


const PROVINCES = [
  'Sindh',
  'Punjab',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu & Kashmir',
];


const AddressForm = ({
  navigation,
  route,
}) => {
  const editingAddress =
    route.params?.address ||
    null;

  const returnTo =
    route.params?.returnTo ||
    'ShippingAddresses';

  const isEditing =
    Boolean(
      editingAddress?.id,
    );


  const [
    fullName,
    setFullName,
  ] = useState(
    editingAddress
      ?.full_name ||
      '',
  );

  const [
    phone,
    setPhone,
  ] = useState(
    editingAddress
      ?.phone ||
      '',
  );

  const [
    label,
    setLabel,
  ] = useState(
    editingAddress
      ?.label ||
      'Home',
  );

  const [
    houseBuilding,
    setHouseBuilding,
  ] = useState(
    editingAddress
      ?.house_building ||
      '',
  );

  const [
    streetAddress,
    setStreetAddress,
  ] = useState(
    editingAddress
      ?.street_address ||
      editingAddress
        ?.address ||
      '',
  );

  const [
    area,
    setArea,
  ] = useState(
    editingAddress
      ?.area ||
      '',
  );

  const [
    landmark,
    setLandmark,
  ] = useState(
    editingAddress
      ?.landmark ||
      '',
  );

  const [
    city,
    setCity,
  ] = useState(
    editingAddress
      ?.city ||
      '',
  );

  const [
    province,
    setProvince,
  ] = useState(
    editingAddress
      ?.province ||
      'Sindh',
  );

  const [
    postalCode,
    setPostalCode,
  ] = useState(
    editingAddress
      ?.postal_code ||
      '',
  );

  const [
    isDefault,
    setIsDefault,
  ] = useState(
    Boolean(
      editingAddress
        ?.is_default,
    ),
  );

  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    modal,
    setModal,
  ] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
  });


  const showModal = ({
    type = 'info',
    title = '',
    message = '',
    confirmText = 'OK',
  }) => {
    setModal({
      visible: true,
      type,
      title,
      message,
      confirmText,
    });
  };


  const closeModal = () => {
    setModal(current => ({
      ...current,
      visible: false,
    }));
  };


  // ==========================================
  // PHONE
  // ==========================================

  const handlePhoneChange =
    value => {
      setPhone(
        value
          .replace(
            /\D/g,
            '',
          )
          .slice(
            0,
            11,
          ),
      );
    };


  // ==========================================
  // POSTAL CODE
  // ==========================================

  const handlePostalCode =
    value => {
      setPostalCode(
        value
          .replace(
            /\D/g,
            '',
          )
          .slice(
            0,
            5,
          ),
      );
    };


  // ==========================================
  // VALIDATE
  // ==========================================

  const validateForm =
    () => {
      if (
        fullName.trim()
          .length <
        2
      ) {
        showModal({
          type: 'warning',
          title: 'Full Name',
          message:
            'Please enter the recipient full name.',
        });

        return false;
      }


      if (
        !/^03\d{9}$/.test(
          phone,
        )
      ) {
        showModal({
          type: 'warning',
          title: 'Mobile Number',
          message:
            'Enter a valid Pakistani mobile number, for example 03XXXXXXXXX.',
        });

        return false;
      }


      if (
        houseBuilding.trim()
          .length <
        1
      ) {
        showModal({
          type: 'warning',
          title: 'House / Building',
          message:
            'Please enter house, flat, apartment or building details.',
        });

        return false;
      }


      if (
        streetAddress.trim()
          .length <
        3
      ) {
        showModal({
          type: 'warning',
          title: 'Street Address',
          message:
            'Please enter a valid street address.',
        });

        return false;
      }


      if (
        area.trim()
          .length <
        2
      ) {
        showModal({
          type: 'warning',
          title: 'Area',
          message:
            'Please enter your area or neighborhood.',
        });

        return false;
      }


      if (
        city.trim()
          .length <
        2
      ) {
        showModal({
          type: 'warning',
          title: 'City',
          message:
            'Please enter your city.',
        });

        return false;
      }


      if (!province) {
        showModal({
          type: 'warning',
          title: 'Province',
          message:
            'Please select your province or region.',
        });

        return false;
      }


      if (
        postalCode &&
        !/^\d{5}$/.test(
          postalCode,
        )
      ) {
        showModal({
          type: 'warning',
          title: 'Postal Code',
          message:
            'Pakistan postal code must contain 5 digits.',
        });

        return false;
      }


      return true;
    };


  // ==========================================
  // SAVE ADDRESS
  // ==========================================

  const handleSave =
    async () => {
      if (saving) {
        return;
      }


      if (!validateForm()) {
        return;
      }


      try {
        setSaving(true);


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


        let shouldBeDefault =
          isDefault;


        // Existing default remains default unless
        // another address is explicitly made default.
        if (
          editingAddress
            ?.is_default
        ) {
          shouldBeDefault =
            true;
        }


        // First saved address becomes default.
        if (!isEditing) {
          const {
            count,
            error:
              countError,
          } =
            await supabase
              .from(
                'shipping_addresses',
              )
              .select(
                'id',
                {
                  count:
                    'exact',
                  head:
                    true,
                },
              )
              .eq(
                'user_id',
                user.id,
              );


          if (countError) {
            throw countError;
          }


          if (
            Number(
              count || 0,
            ) ===
            0
          ) {
            shouldBeDefault =
              true;
          }
        }


        // If this address is becoming default,
        // remove the current default first.
        if (
          shouldBeDefault
        ) {
          let resetQuery =
            supabase
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


          if (
            isEditing
          ) {
            resetQuery =
              resetQuery.neq(
                'id',
                editingAddress.id,
              );
          }


          const {
            error:
              resetError,
          } =
            await resetQuery;


          if (resetError) {
            throw resetError;
          }
        }


        const cleanHouse =
          houseBuilding.trim();

        const cleanStreet =
          streetAddress.trim();

        const cleanArea =
          area.trim();

        const cleanLandmark =
          landmark.trim();

        const cleanCity =
          city.trim();


        const canonicalAddress =
          [
            cleanHouse,
            cleanStreet,
            cleanArea,
          ]
            .filter(Boolean)
            .join(', ');


        const payload = {
          user_id:
            user.id,

          full_name:
            fullName.trim(),

          phone,

          label,

          address:
            canonicalAddress,

          house_building:
            cleanHouse,

          street_address:
            cleanStreet,

          area:
            cleanArea,

          landmark:
            cleanLandmark ||
            null,

          city:
            cleanCity,

          province,

          postal_code:
            postalCode ||
            null,

          country:
            'Pakistan',

          is_default:
            shouldBeDefault,

          updated_at:
            new Date()
              .toISOString(),
        };


        let savedAddress;


        if (isEditing) {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                'shipping_addresses',
              )
              .update(
                payload,
              )
              .eq(
                'id',
                editingAddress.id,
              )
              .eq(
                'user_id',
                user.id,
              )
              .select(
                ADDRESS_COLUMNS,
              )
              .single();


          if (error) {
            throw error;
          }


          savedAddress =
            data;

        } else {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                'shipping_addresses',
              )
              .insert(
                payload,
              )
              .select(
                ADDRESS_COLUMNS,
              )
              .single();


          if (error) {
            throw error;
          }


          savedAddress =
            data;
        }


        if (
          returnTo ===
          'Checkout'
        ) {
          navigation.popTo(
            'Checkout',
            {
              selectedAddress:
                savedAddress,
            },
            {
              merge: true,
            },
          );

          return;
        }


        navigation.goBack();

      } catch (error) {
        if (__DEV__) {
          console.error(
            'Save Address Error:',
            error.message,
          );
        }


        showModal({
          type: 'error',
          title: 'Address Error',
          message:
            error.message ||
            'Unable to save your shipping address.',
        });

      } finally {
        setSaving(false);
      }
    };


  return (
    <SafeAreaView className="flex-1 bg-white">
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
            paddingBottom: 44,
          }}
        >
          {/* HEADER */}
          <View className="mt-4 flex-row items-center">
            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              disabled={
                saving
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
                  ? 'Edit Address'
                  : 'Add Address'}
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Accurate details help us deliver without delays.
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


          {/* HERO */}
          <View className="mt-7 rounded-3xl bg-black p-5">
            <View className="flex-row items-center">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
                <Ionicons
                  name={
                    isEditing
                      ? 'create-outline'
                      : 'home-outline'
                  }
                  size={26}
                  color="black"
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-lg font-extrabold text-white">
                  {isEditing
                    ? 'Update Delivery Address'
                    : 'New Delivery Address'}
                </Text>

                <Text className="mt-1 text-sm leading-5 text-gray-300">
                  Saved addresses can be selected anytime during checkout.
                </Text>
              </View>
            </View>
          </View>


          {/* CONTACT */}
          <View className="mt-8">
            <View className="mb-4 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="black"
                />
              </View>

              <View className="ml-3">
                <Text className="text-xl font-extrabold text-black">
                  Contact Information
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Who will receive the order?
                </Text>
              </View>
            </View>

            <View className="rounded-3xl bg-gray-100 p-4">
              <Text className="mb-2 text-sm font-bold text-black">
                Full Name
              </Text>

              <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
                <Ionicons
                  name="person-outline"
                  size={19}
                  color="#6B7280"
                />

                <TextInput
                  value={
                    fullName
                  }
                  onChangeText={
                    setFullName
                  }
                  editable={
                    !saving
                  }
                  placeholder="Recipient full name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  className="ml-3 flex-1 text-black"
                />
              </View>

              <Text className="mb-2 mt-4 text-sm font-bold text-black">
                Mobile Number
              </Text>

              <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
                <Ionicons
                  name="call-outline"
                  size={19}
                  color="#6B7280"
                />

                <TextInput
                  value={
                    phone
                  }
                  onChangeText={
                    handlePhoneChange
                  }
                  editable={
                    !saving
                  }
                  placeholder="03XXXXXXXXX"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={11}
                  className="ml-3 flex-1 text-black"
                />
              </View>
            </View>
          </View>


          {/* ADDRESS TYPE */}
          <View className="mt-8">
            <Text className="text-xl font-extrabold text-black">
              Address Type
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Choose a label for quick selection.
            </Text>

            <View className="mt-4 flex-row">
              {[
                {
                  name:
                    'Home',
                  icon:
                    'home-outline',
                },
                {
                  name:
                    'Office',
                  icon:
                    'business-outline',
                },
                {
                  name:
                    'Other',
                  icon:
                    'location-outline',
                },
              ].map(
                item => {
                  const selected =
                    label ===
                    item.name;

                  return (
                    <TouchableOpacity
                      key={
                        item.name
                      }
                      onPress={() =>
                        setLabel(
                          item.name,
                        )
                      }
                      disabled={
                        saving
                      }
                      activeOpacity={0.85}
                      className={`mr-3 flex-1 items-center rounded-2xl border-2 px-3 py-4 ${
                        selected
                          ? 'border-black bg-black'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <Ionicons
                        name={
                          item.icon
                        }
                        size={21}
                        color={
                          selected
                            ? 'white'
                            : 'black'
                        }
                      />

                      <Text
                        className={`mt-2 text-sm font-extrabold ${
                          selected
                            ? 'text-white'
                            : 'text-black'
                        }`}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>
          </View>


          {/* DELIVERY ADDRESS */}
          <View className="mt-8">
            <View className="mb-4 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons
                  name="map-outline"
                  size={20}
                  color="black"
                />
              </View>

              <View className="ml-3">
                <Text className="text-xl font-extrabold text-black">
                  Delivery Address
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Enter your complete location.
                </Text>
              </View>
            </View>

            <View className="rounded-3xl bg-gray-100 p-4">
              <Text className="mb-2 text-sm font-bold text-black">
                House / Flat / Building
              </Text>

              <TextInput
                value={
                  houseBuilding
                }
                onChangeText={
                  setHouseBuilding
                }
                editable={
                  !saving
                }
                placeholder="House 24, Flat 5B, Building name"
                placeholderTextColor="#9CA3AF"
                className="h-14 rounded-2xl bg-white px-4 text-black"
              />

              <Text className="mb-2 mt-4 text-sm font-bold text-black">
                Street Address
              </Text>

              <TextInput
                value={
                  streetAddress
                }
                onChangeText={
                  setStreetAddress
                }
                editable={
                  !saving
                }
                placeholder="Street, road or block"
                placeholderTextColor="#9CA3AF"
                className="h-14 rounded-2xl bg-white px-4 text-black"
              />

              <Text className="mb-2 mt-4 text-sm font-bold text-black">
                Area / Neighborhood
              </Text>

              <TextInput
                value={
                  area
                }
                onChangeText={
                  setArea
                }
                editable={
                  !saving
                }
                placeholder="Gulshan-e-Iqbal, DHA, Clifton..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                className="h-14 rounded-2xl bg-white px-4 text-black"
              />

              <Text className="mb-2 mt-4 text-sm font-bold text-black">
                Nearby Landmark
                <Text className="font-normal text-gray-400">
                  {' '}
                  (Optional)
                </Text>
              </Text>

              <TextInput
                value={
                  landmark
                }
                onChangeText={
                  setLandmark
                }
                editable={
                  !saving
                }
                placeholder="Near school, mall, mosque..."
                placeholderTextColor="#9CA3AF"
                className="h-14 rounded-2xl bg-white px-4 text-black"
              />

              <Text className="mb-2 mt-4 text-sm font-bold text-black">
                City
              </Text>

              <TextInput
                value={
                  city
                }
                onChangeText={
                  setCity
                }
                editable={
                  !saving
                }
                placeholder="Karachi"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                className="h-14 rounded-2xl bg-white px-4 text-black"
              />
            </View>
          </View>


          {/* PROVINCE */}
          <View className="mt-8">
            <Text className="text-xl font-extrabold text-black">
              Province / Region
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Select your province or territory.
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              className="mt-4"
            >
              {PROVINCES.map(
                item => {
                  const selected =
                    province ===
                    item;

                  return (
                    <TouchableOpacity
                      key={
                        item
                      }
                      onPress={() =>
                        setProvince(
                          item,
                        )
                      }
                      disabled={
                        saving
                      }
                      activeOpacity={0.85}
                      className={`mr-3 rounded-2xl border-2 px-4 py-3 ${
                        selected
                          ? 'border-black bg-black'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <Text
                        className={`font-extrabold ${
                          selected
                            ? 'text-white'
                            : 'text-black'
                        }`}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>
          </View>


          {/* POSTAL + COUNTRY */}
          <View className="mt-8 rounded-3xl bg-gray-100 p-4">
            <Text className="mb-2 text-sm font-bold text-black">
              Postal Code
              <Text className="font-normal text-gray-400">
                {' '}
                (Optional)
              </Text>
            </Text>

            <TextInput
              value={
                postalCode
              }
              onChangeText={
                handlePostalCode
              }
              editable={
                !saving
              }
              placeholder="75300"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={5}
              className="h-14 rounded-2xl bg-white px-4 text-black"
            />

            <Text className="mb-2 mt-4 text-sm font-bold text-black">
              Country
            </Text>

            <View className="h-14 flex-row items-center rounded-2xl bg-white px-4">
              <Ionicons
                name="flag-outline"
                size={19}
                color="#6B7280"
              />

              <Text className="ml-3 font-extrabold text-black">
                Pakistan
              </Text>
            </View>
          </View>


          {/* DEFAULT ADDRESS */}
          <TouchableOpacity
            onPress={() => {
              if (
                editingAddress
                  ?.is_default
              ) {
                return;
              }

              setIsDefault(
                value =>
                  !value,
              );
            }}
            disabled={
              saving
            }
            activeOpacity={0.85}
            className="mt-7 flex-row items-center rounded-3xl border border-gray-200 bg-white p-5"
          >
            <View
              className={`h-12 w-12 items-center justify-center rounded-2xl ${
                isDefault ||
                editingAddress
                  ?.is_default
                  ? 'bg-black'
                  : 'bg-gray-100'
              }`}
            >
              <Ionicons
                name={
                  isDefault ||
                  editingAddress
                    ?.is_default
                    ? 'star'
                    : 'star-outline'
                }
                size={22}
                color={
                  isDefault ||
                  editingAddress
                    ?.is_default
                    ? 'white'
                    : 'black'
                }
              />
            </View>

            <View className="ml-4 flex-1">
              <Text className="font-extrabold text-black">
                Make this my default address
              </Text>

              <Text className="mt-1 text-sm leading-5 text-gray-500">
                Your default address is automatically selected at checkout.
              </Text>
            </View>

            <View
              className={`h-7 w-7 items-center justify-center rounded-full border ${
                isDefault ||
                editingAddress
                  ?.is_default
                  ? 'border-black bg-black'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {isDefault ||
              editingAddress
                ?.is_default ? (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color="white"
                />
              ) : null}
            </View>
          </TouchableOpacity>


          {/* SAVE */}
          <TouchableOpacity
            onPress={
              handleSave
            }
            disabled={
              saving
            }
            activeOpacity={0.85}
            className={`mt-8 h-14 flex-row items-center justify-center rounded-2xl ${
              saving
                ? 'bg-gray-400'
                : 'bg-black'
            }`}
          >
            {saving ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={20}
                  color="white"
                />

                <Text className="ml-2 text-base font-extrabold text-white">
                  {isEditing
                    ? 'Update Address'
                    : 'Save Address'}
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
          closeModal
        }
        onCancel={
          closeModal
        }
      />
    </SafeAreaView>
  );
};


export default AddressForm;
