import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomTabNavigator from './BottomTabNavigator';

import Search from '../screens/home/Search';
import ProductDetails from '../screens/home/ProductDetails';
import CategoryProducts from '../screens/categories/CategoryProducts';

import Checkout from '../screens/checkout/Checkout';
import ShippingAddresses from '../screens/checkout/ShippingAddresses';
import AddressForm from '../screens/checkout/AddressForm';
import Payment from '../screens/payment/Payment';
import OrderSuccess from '../screens/checkout/OrderSuccess';

import MyOrders from '../screens/orders/MyOrders';
import OrderDetails from '../screens/orders/OrderDetails';
import OrderTracking from '../screens/orders/OrderTracking';
import CancelOrder from '../screens/orders/CancelOrder';

import ReturnRequest from '../screens/orders/ReturnRequest';
import ReturnDetails from '../screens/orders/ReturnDetails';

import EditProfile from '../screens/profile/EditProfile';

import Notifications from '../screens/notifications/Notifications';
import NotificationDetails from '../screens/notifications/NotificationDetails';

import CardPayment from '../screens/payment/CardPayment';
import EasypaisaPayment from '../screens/payment/EasypaisaPayment';
import JazzCashPayment from '../screens/payment/JazzCashPayment';
import BankTransfer from '../screens/payment/BankTransfer';
import PaymentProcessing from '../screens/payment/PaymentProcessing';
import PaymentSuccess from '../screens/payment/PaymentSuccess';
import PaymentFailed from '../screens/payment/PaymentFailed';

import ProductReviews from '../screens/reviews/ProductReviews';
import WriteReview from '../screens/reviews/WriteReview';

import Settings from '../screens/settings/Settings';
import ChangePassword from '../screens/settings/ChangePassword';
import NotificationSettings from '../screens/settings/NotificationSettings';
import Preferences from '../screens/settings/Preferences';
import HelpSupport from '../screens/settings/HelpSupport';
import Legal from '../screens/settings/Legal';
import PolicyDetails from '../screens/settings/PolicyDetails';
import About from '../screens/settings/About';
import DeleteAccount from '../screens/settings/DeleteAccount';


const Stack = createNativeStackNavigator();


const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
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
        name="MainTabs"
        component={BottomTabNavigator}
        options={{
          animation: 'fade',
        }}
      />

      <Stack.Screen
        name="Search"
        component={Search}
      />

      <Stack.Screen
        name="ProductDetails"
        component={ProductDetails}
      />

      <Stack.Screen
        name="CategoryProducts"
        component={CategoryProducts}
      />

      <Stack.Screen
        name="Checkout"
        component={Checkout}
      />

      <Stack.Screen
        name="ShippingAddresses"
        component={ShippingAddresses}
      />

      <Stack.Screen
        name="AddressForm"
        component={AddressForm}
      />

      <Stack.Screen
        name="Payment"
        component={Payment}
      />

      <Stack.Screen
        name="CardPayment"
        component={CardPayment}
      />

      <Stack.Screen
        name="EasypaisaPayment"
        component={EasypaisaPayment}
      />

      <Stack.Screen
        name="JazzCashPayment"
        component={JazzCashPayment}
      />

      <Stack.Screen
        name="BankTransfer"
        component={BankTransfer}
      />

      <Stack.Screen
        name="PaymentProcessing"
        component={PaymentProcessing}
        options={{
          gestureEnabled: false,
          animation: 'fade',
        }}
      />

      <Stack.Screen
        name="PaymentSuccess"
        component={PaymentSuccess}
        options={{
          gestureEnabled: false,
          animation: 'fade',
        }}
      />

      <Stack.Screen
        name="PaymentFailed"
        component={PaymentFailed}
        options={{
          animation: 'fade',
        }}
      />

      <Stack.Screen
        name="OrderSuccess"
        component={OrderSuccess}
        options={{
          animation: 'fade',
        }}
      />

      <Stack.Screen
        name="MyOrders"
        component={MyOrders}
      />

      <Stack.Screen
        name="OrderDetails"
        component={OrderDetails}
      />

      <Stack.Screen
        name="OrderTracking"
        component={OrderTracking}
      />

      <Stack.Screen
        name="CancelOrder"
        component={CancelOrder}
      />

      <Stack.Screen
        name="ReturnRequest"
        component={ReturnRequest}
      />

      <Stack.Screen
        name="ReturnDetails"
        component={ReturnDetails}
      />

      <Stack.Screen
        name="EditProfile"
        component={EditProfile}
      />

      <Stack.Screen
        name="Notifications"
        component={Notifications}
      />

      <Stack.Screen
        name="NotificationDetails"
        component={NotificationDetails}
      />

      <Stack.Screen
        name="ProductReviews"
        component={ProductReviews}
      />

      <Stack.Screen
        name="WriteReview"
        component={WriteReview}
      />

      <Stack.Screen
        name="Settings"
        component={Settings}
      />

      <Stack.Screen
        name="ChangePassword"
        component={ChangePassword}
      />

      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
      />

      <Stack.Screen
        name="Preferences"
        component={Preferences}
      />

      <Stack.Screen
        name="HelpSupport"
        component={HelpSupport}
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

      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccount}
      />
    </Stack.Navigator>
  );
};


export default AppNavigator;
