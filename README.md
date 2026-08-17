This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.


Payment integrations are currently implemented as demonstration/test flows. No real payment is processed.# ExCloth


# ExCloth

ExCloth is a fashion e-commerce mobile app that I built using React Native CLI and Supabase.

The main idea behind the project was to build more than just a basic shopping UI. I wanted the app to cover the complete flow of an e-commerce application, from browsing products to placing an order, tracking it, requesting a return, receiving notifications, and managing everything from a separate admin side.

## What the app includes

On the customer side, users can create an account, browse products and categories, search for products, add items to their wishlist or cart, manage shipping addresses, apply coupons, complete checkout, and view their orders.

Customers can also track their order status, cancel eligible orders, request returns, follow the refund process, write product reviews, manage their profile, and receive push notifications.

The admin side is completely separate from the customer shopping flow. Admin accounts are taken directly to the admin dashboard after login and can manage products, categories, coupons, users, reviews, broadcasts, orders, returns, and refunds.

## Tech Stack

- React Native CLI
- JavaScript / JSX
- NativeWind
- React Navigation
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security
- PostgreSQL RPC Functions
- Supabase Edge Functions
- Firebase Cloud Messaging
- Notifee

## Authentication and Roles

ExCloth currently has two account types:

- Customer
- Admin

There is no role-selection screen during login.

A user simply enters their email and password. After authentication, the app checks the account on the backend and automatically decides which part of the application should open.

A normal customer is sent to the shopping app, while an authorized admin is sent directly to the admin dashboard.

Admin access is not available through signup and is not based on a role value controlled by the client.

## Customer Features

The customer application currently includes:

- Login and signup
- Password recovery
- Home screen
- Product categories
- Product search
- Product details
- Wishlist
- Cart
- Shipping addresses
- Checkout
- Coupons
- Multiple payment-flow screens
- Order placement
- My Orders
- Order details
- Order tracking
- Order cancellation
- Return requests
- Return and refund tracking
- Product reviews
- Profile management
- Push notifications
- Settings
- Password change
- Account deletion

## Admin Features

The admin side includes:

- Admin dashboard
- Product management
- Category management
- Coupon management
- User management
- Review moderation
- Broadcast notifications
- Order management
- Return management
- Refund workflow

Admin and customer navigation are kept separate so an admin does not use customer features such as Cart, Wishlist, Checkout, or Place Order.

## Backend

Supabase is used as the backend for the project.

PostgreSQL stores the application data, while Supabase Auth handles authentication.

I am also using Row Level Security and secure PostgreSQL functions for operations that should not be trusted to the mobile client alone.

Sensitive operations such as admin actions are protected on the backend instead of relying only on hidden screens or navigation checks.

## Push Notifications

Android push notifications are implemented using Firebase Cloud Messaging and Notifee.

The app currently supports notifications related to things such as:

- Order updates
- Return updates
- Promotions
- Coupons
- Announcements

Notifications can also open the relevant screen when the user taps them.

## Orders

The current order flow supports statuses such as:

- Pending
- Confirmed
- Processing
- Shipped
- Out for Delivery
- Delivered
- Cancelled

Customers can follow these updates from the order-tracking screen, while admins can update the order from the management side.

## Returns and Refunds

ExCloth also includes a return workflow instead of stopping at basic order placement.

A return can move through stages such as:

- Requested
- Approved
- Rejected
- Pickup Scheduled
- Picked Up
- Received
- Refund Processing
- Refunded

The customer can follow the progress while the admin handles the return from the admin panel.

## Payments

The application currently contains payment flows for:

- Cash on Delivery
- Card Payment
- Easypaisa
- JazzCash
- Bank Transfer

These are currently part of the application flow and demonstration of the checkout system.

Production payment processing will require integration with an approved payment provider before real transactions are enabled.

Sensitive information such as card CVV, PIN, OTP, or banking passwords is not intended to be stored in the application database.

## Project Structure

The project is organized mainly around separate screens, navigation, reusable components, hooks, backend utilities, and role-specific functionality.

```text
ExCloth/
├── android/
├── ios/
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── images/
│   ├── lib/
│   ├── navigation/
│   └── screens/
│       ├── admin/
│       ├── auth/
│       ├── payment/
│       ├── profile/
│       ├── settings/
│       └── ...
├── supabase/
├── docs/
├── App.jsx
└── package.json