import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';

const AdminScreenHeader = ({
  navigation,
  title,
  subtitle,
  icon,
  action,
}) => (
  <View className="mb-5 mt-4 min-h-14 flex-row items-center">
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Back from ${title}`}
      className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100"
    >
      <Ionicons name="arrow-back-outline" size={22} color="black" />
    </TouchableOpacity>

    <View className="ml-3 flex-1">
      <Text numberOfLines={1} className="text-2xl font-extrabold text-black">
        {title}
      </Text>
      <Text numberOfLines={2} className="mt-1 text-xs leading-4 text-gray-500">
        {subtitle}
      </Text>
    </View>

    {action ? (
      <TouchableOpacity
        onPress={action.onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        className="ml-3 h-11 w-11 items-center justify-center rounded-2xl bg-black"
      >
        <Ionicons name={action.icon || icon} size={22} color="white" />
      </TouchableOpacity>
    ) : (
      <View className="ml-3 h-11 w-11 items-center justify-center rounded-2xl bg-black">
        <Ionicons name={icon} size={21} color="white" />
      </View>
    )}
  </View>
);

export default AdminScreenHeader;
