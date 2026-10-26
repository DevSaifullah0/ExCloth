import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons/static';

import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminOrders from '../screens/admin/AdminOrders';
import AdminReturns from '../screens/admin/AdminReturns';
import AdminProducts from '../screens/admin/AdminProducts';
import AdminCoupons from '../screens/admin/AdminCoupons';
import AdminOrderDetails from '../screens/admin/AdminOrderDetails';
import AdminReturnDetails from '../screens/admin/AdminReturnDetails';
import AdminProductDetails from '../screens/admin/AdminProductDetails';
import AdminCategories from '../screens/admin/AdminCategories';
import AdminCategoryDetails from '../screens/admin/AdminCategoryDetails';
import AdminCouponDetails from '../screens/admin/AdminCouponDetails';
import AdminUsers from '../screens/admin/AdminUsers';
import AdminUserDetails from '../screens/admin/AdminUserDetails';
import AdminReviews from '../screens/admin/AdminReviews';
import AdminReviewDetails from '../screens/admin/AdminReviewDetails';
import AdminBroadcasts from '../screens/admin/AdminBroadcasts';
import AdminBroadcastDetails from '../screens/admin/AdminBroadcastDetails';
import AdminBanners from '../screens/admin/AdminBanners';
import AdminReports from '../screens/admin/AdminReports';
import AdminRolesPermissions from '../screens/admin/AdminRolesPermissions';
import SupportTickets from '../screens/support/SupportTickets';
import SupportTicketDetails from '../screens/support/SupportTicketDetails';
import AdminSettings from '../screens/settings/AdminSettings';
import ChangePassword from '../screens/settings/ChangePassword';
import Legal from '../screens/settings/Legal';
import PolicyDetails from '../screens/settings/PolicyDetails';
import About from '../screens/settings/About';
import createTabBarOptions from './createTabBarOptions';

const Tab =
  Platform.OS === 'ios'
    ? createNativeBottomTabNavigator()
    : createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stackOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: '#FFFFFF' },
};

const DashboardStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="DashboardHome" component={AdminDashboard} />
    <Stack.Screen name="AdminOrderDetails" component={AdminOrderDetails} />
    <Stack.Screen name="AdminReturnDetails" component={AdminReturnDetails} />
    <Stack.Screen name="AdminCategories" component={AdminCategories} />
    <Stack.Screen name="AdminCategoryDetails" component={AdminCategoryDetails} />
    <Stack.Screen name="AdminUsers" component={AdminUsers} />
    <Stack.Screen name="AdminUserDetails" component={AdminUserDetails} />
    <Stack.Screen name="AdminReviews" component={AdminReviews} />
    <Stack.Screen name="AdminReviewDetails" component={AdminReviewDetails} />
    <Stack.Screen name="AdminBroadcasts" component={AdminBroadcasts} />
    <Stack.Screen name="AdminBroadcastDetails" component={AdminBroadcastDetails} />
    <Stack.Screen name="AdminBanners" component={AdminBanners} />
    <Stack.Screen name="AdminReports" component={AdminReports} />
    <Stack.Screen name="AdminRolesPermissions" component={AdminRolesPermissions} />
    <Stack.Screen name="AdminSupportTickets" component={SupportTickets} initialParams={{ isAdmin: true }} />
    <Stack.Screen name="SupportTicketDetails" component={SupportTicketDetails} initialParams={{ isAdmin: true }} />
    <Stack.Screen name="AdminSettings" component={AdminSettings} />
    <Stack.Screen name="ChangePassword" component={ChangePassword} />
    <Stack.Screen name="Legal" component={Legal} />
    <Stack.Screen name="PolicyDetails" component={PolicyDetails} />
    <Stack.Screen name="About" component={About} />
  </Stack.Navigator>
);

const OrdersStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="OrdersHome" component={AdminOrders} />
    <Stack.Screen name="AdminOrderDetails" component={AdminOrderDetails} />
  </Stack.Navigator>
);

const ReturnsStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="ReturnsHome" component={AdminReturns} />
    <Stack.Screen name="AdminReturnDetails" component={AdminReturnDetails} />
  </Stack.Navigator>
);

const ProductsStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="ProductsHome" component={AdminProducts} />
    <Stack.Screen name="AdminProductDetails" component={AdminProductDetails} />
  </Stack.Navigator>
);

const CouponsStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="CouponsHome" component={AdminCoupons} />
    <Stack.Screen name="AdminCouponDetails" component={AdminCouponDetails} />
  </Stack.Navigator>
);

const TAB_ICONS = {
  Dashboard: ['grid', 'grid-outline'],
  Orders: ['bag-handle', 'bag-handle-outline'],
  Returns: ['return-down-back', 'return-down-back-outline'],
  Products: ['shirt', 'shirt-outline'],
  Coupons: ['pricetags', 'pricetags-outline'],
};

const IOS_TAB_ICONS = {
  Dashboard: ['square.grid.2x2.fill', 'square.grid.2x2'],
  Orders: ['shippingbox.fill', 'shippingbox'],
  Returns: ['arrow.uturn.backward', 'arrow.uturn.backward'],
  Products: ['tshirt.fill', 'tshirt'],
  Coupons: ['tag.fill', 'tag'],
};

const AdminTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
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
            const [activeIcon, inactiveIcon] = TAB_ICONS[route.name];

            return (
              <Ionicons
                name={focused ? activeIcon : inactiveIcon}
                size={23}
                color={color}
              />
            );
          },
        };
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Orders" component={OrdersStack} />
      <Tab.Screen name="Returns" component={ReturnsStack} />
      <Tab.Screen name="Products" component={ProductsStack} />
      <Tab.Screen name="Coupons" component={CouponsStack} />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;
