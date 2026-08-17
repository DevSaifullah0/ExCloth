import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboard from '../screens/admin/AdminDashboard';

import AdminOrders from '../screens/admin/AdminOrders';
import AdminOrderDetails from '../screens/admin/AdminOrderDetails';

import AdminReturns from '../screens/admin/AdminReturns';
import AdminReturnDetails from '../screens/admin/AdminReturnDetails';

import AdminProducts from '../screens/admin/AdminProducts';
import AdminProductDetails from '../screens/admin/AdminProductDetails';

import AdminCategories from '../screens/admin/AdminCategories';
import AdminCategoryDetails from '../screens/admin/AdminCategoryDetails';

import AdminCoupons from '../screens/admin/AdminCoupons';
import AdminCouponDetails from '../screens/admin/AdminCouponDetails';

import AdminUsers from '../screens/admin/AdminUsers';
import AdminUserDetails from '../screens/admin/AdminUserDetails';

import AdminReviews from '../screens/admin/AdminReviews';
import AdminReviewDetails from '../screens/admin/AdminReviewDetails';

import AdminBroadcasts from '../screens/admin/AdminBroadcasts';
import AdminBroadcastDetails from '../screens/admin/AdminBroadcastDetails';

import AdminSettings from '../screens/settings/AdminSettings';
import ChangePassword from '../screens/settings/ChangePassword';
import Legal from '../screens/settings/Legal';
import PolicyDetails from '../screens/settings/PolicyDetails';
import About from '../screens/settings/About';


const Stack = createNativeStackNavigator();


const AdminNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        presentation: 'card',
        contentStyle: {
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{
          gestureEnabled: false,
          animation: 'fade',
        }}
      />

      <Stack.Screen
        name="AdminOrders"
        component={AdminOrders}
      />

      <Stack.Screen
        name="AdminOrderDetails"
        component={AdminOrderDetails}
      />

      <Stack.Screen
        name="AdminReturns"
        component={AdminReturns}
      />

      <Stack.Screen
        name="AdminReturnDetails"
        component={AdminReturnDetails}
      />

      <Stack.Screen
        name="AdminProducts"
        component={AdminProducts}
      />

      <Stack.Screen
        name="AdminProductDetails"
        component={AdminProductDetails}
      />

      <Stack.Screen
        name="AdminCategories"
        component={AdminCategories}
      />

      <Stack.Screen
        name="AdminCategoryDetails"
        component={AdminCategoryDetails}
      />

      <Stack.Screen
        name="AdminCoupons"
        component={AdminCoupons}
      />

      <Stack.Screen
        name="AdminCouponDetails"
        component={AdminCouponDetails}
      />

      <Stack.Screen
        name="AdminUsers"
        component={AdminUsers}
      />

      <Stack.Screen
        name="AdminUserDetails"
        component={AdminUserDetails}
      />

      <Stack.Screen
        name="AdminReviews"
        component={AdminReviews}
      />

      <Stack.Screen
        name="AdminReviewDetails"
        component={AdminReviewDetails}
      />

      <Stack.Screen
        name="AdminBroadcasts"
        component={AdminBroadcasts}
      />

      <Stack.Screen
        name="AdminBroadcastDetails"
        component={AdminBroadcastDetails}
      />

      <Stack.Screen
        name="AdminSettings"
        component={AdminSettings}
      />

      <Stack.Screen
        name="ChangePassword"
        component={ChangePassword}
      />

      <Stack.Screen
        name="Legal"
        component={Legal}
      />

      <Stack.Screen
        name="PolicyDetails"
        component={PolicyDetails}
      />

      <Stack.Screen
        name="About"
        component={About}
      />
    </Stack.Navigator>
  );
};


export default AdminNavigator;
