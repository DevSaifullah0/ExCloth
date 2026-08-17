import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';

import React from 'react';

import Ionicons from '@react-native-vector-icons/ionicons/static';


const AppModal = ({
  visible = false,
  type = 'info',
  title = '',
  message = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = false,
  dismissible = true,
  loading = false,
}) => {

  // ==========================================
  // MODAL CONFIG
  // ==========================================

  const modalConfig = {
    success: {
      icon: 'checkmark-circle',
      label: 'Success',
      iconColor: '#16A34A',
      // iconBackground: 'bg-green-100',
    },

    error: {
      icon: 'close-circle-outline',
      label: 'Error',
      iconColor: '#DC2626',
      // iconBackground: 'bg-red-100',
    },

    warning: {
      icon: 'warning-outline',
      label: 'Warning',
      iconColor: '#D97706',
      // iconBackground: 'bg-amber-100',
    },

    info: {
      icon: 'information-circle-outline',
      label: 'Information',
      iconColor: '#000000',
      // iconBackground: 'bg-gray-100',
    },

    confirm: {
      icon: 'help-circle-outline',
      label: 'Confirmation',
      iconColor: '#000000',
      // iconBackground: 'bg-gray-100',
    },
  };


  const config =
    modalConfig[type] ||
    modalConfig.info;


  // ==========================================
  // CLOSE MODAL
  // ==========================================

  const handleClose = () => {
    if (
      !dismissible ||
      loading
    ) {
      return;
    }

    if (
      typeof onCancel ===
      'function'
    ) {
      onCancel();
      return;
    }

    if (
      typeof onConfirm ===
      'function'
    ) {
      onConfirm();
    }
  };


  // ==========================================
  // CONFIRM
  // ==========================================

  const handleConfirm = () => {
    if (loading) {
      return;
    }

    if (
      typeof onConfirm ===
      'function'
    ) {
      onConfirm();
    }
  };


  // ==========================================
  // CANCEL
  // ==========================================

  const handleCancel = () => {
    if (loading) {
      return;
    }

    if (
      typeof onCancel ===
      'function'
    ) {
      onCancel();
    }
  };


  // ==========================================
  // UI
  // ==========================================

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      onRequestClose={handleClose}
    >

      <TouchableWithoutFeedback
        onPress={handleClose}
      >

        <View className="flex-1 items-center justify-center bg-black/60 px-6">

          <TouchableWithoutFeedback
            onPress={() => {}}
          >

            <View
              accessibilityViewIsModal
              accessibilityLabel={
                title ||
                config.label
              }
              className="w-full max-w-sm overflow-hidden rounded-3xl bg-white"
            >

              {/* ==============================
                  CONTENT
              ============================== */}

              <View className="items-center px-5 pb-5 pt-6">

                {/* ICON */}

                <View
                  className={`h-16 w-16 items-center justify-center rounded-2xl ${config.iconBackground}`}
                >

                  <Ionicons
                    name={config.icon}
                    size={60}
                    color={config.iconColor}
                  />

                </View>


                {/* TYPE LABEL */}

                <View className="mt-3 rounded-full bg-gray-100 px-3 py-1">

                  <Text className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                    {config.label}
                  </Text>

                </View>


                {/* TITLE */}

                {title ? (
                  <Text className="mt-3 text-center text-xl font-extrabold text-black">
                    {title}
                  </Text>
                ) : null}


                {/* MESSAGE */}

                {message ? (
                  <Text className="mt-2 text-center text-sm leading-5 text-gray-500">
                    {message}
                  </Text>
                ) : null}

              </View>


              {/* ==============================
                  BUTTONS
              ============================== */}

              <View className="border-t border-gray-100 px-5 pb-5 pt-4">

                <View
                  className={
                    showCancel
                      ? 'flex-row'
                      : ''
                  }
                >

                  {/* CANCEL */}

                  {showCancel ? (
                    <TouchableOpacity
                      onPress={handleCancel}
                      disabled={loading}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={cancelText}
                      className="mr-3 h-12 flex-1 items-center justify-center rounded-xl bg-gray-100"
                    >

                      <Text className="text-sm font-extrabold text-black">
                        {cancelText}
                      </Text>

                    </TouchableOpacity>
                  ) : null}


                  {/* CONFIRM */}

                  <TouchableOpacity
                    onPress={handleConfirm}
                    disabled={loading}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={confirmText}
                    className={`h-12 items-center justify-center rounded-xl bg-black ${
                      showCancel
                        ? 'flex-1'
                        : 'w-full'
                    }`}
                  >

                    {loading ? (
                      <ActivityIndicator
                        size="small"
                        color="white"
                      />
                    ) : (
                      <Text className="text-sm font-extrabold text-white">
                        {confirmText}
                      </Text>
                    )}

                  </TouchableOpacity>

                </View>

              </View>

            </View>

          </TouchableWithoutFeedback>

        </View>

      </TouchableWithoutFeedback>

    </Modal>
  );
};


export default AppModal;