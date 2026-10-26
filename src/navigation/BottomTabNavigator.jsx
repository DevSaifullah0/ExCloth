import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Ionicons from '@react-native-vector-icons/ionicons/static';

import Home from '../screens/home/Home';
import Categories from '../screens/categories/Categories';
import Wishlist from '../screens/wishlist/Wishlist';
import Cart from '../screens/cart/Cart';
import Profile from '../screens/profile/Profile';
import createTabBarOptions from './createTabBarOptions';

const Tab =
  Platform.OS === 'ios'
    ? createNativeBottomTabNavigator()
    : createBottomTabNavigator();

const IOS_TAB_ICONS = {
  Home: ['house.fill', 'house'],
  Categories: ['square.grid.2x2.fill', 'square.grid.2x2'],
  Wishlist: ['heart.fill', 'heart'],
  Cart: ['cart.fill', 'cart'],
  Profile: ['person.fill', 'person'],
};

const ANDROID_TAB_ICONS = {
  Home: ['home', 'home-outline'],
  Categories: ['grid', 'grid-outline'],
  Wishlist: ['heart', 'heart-outline'],
  Cart: ['cart', 'cart-outline'],
  Profile: ['person', 'person-outline'],
};

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        if (Platform.OS === 'ios') {
          return {
            headerShown: false,
            tabBarActiveTintColor: '#111111',
            tabBarInactiveTintColor: '#777B84',
            tabBarBlurEffect: 'systemUltraThinMaterial',
            tabBarStyle: {
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
            tabBarIcon: ({ focused }) => ({
              type: 'sfSymbol',
              name: IOS_TAB_ICONS[route.name][focused ? 0 : 1],
            }),
          };
        }

        return {
          ...createTabBarOptions(insets),
          tabBarIcon: ({ color, focused }) => {
            const iconNames = ANDROID_TAB_ICONS[route.name];

            return (
              <Ionicons
                name={iconNames[focused ? 0 : 1]}
                size={23}
                color={color}
              />
            );
          },
        };
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
      />

      <Tab.Screen
        name="Categories"
        component={Categories}
      />

      <Tab.Screen
        name="Wishlist"
        component={Wishlist}
      />

      <Tab.Screen
        name="Cart"
        component={Cart}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
