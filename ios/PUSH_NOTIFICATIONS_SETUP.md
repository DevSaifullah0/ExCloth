# iOS push notification release setup

The code path is intentionally disabled until real Apple/Firebase credentials are injected. Do not enable the flag with placeholder files.

## Required external setup

1. Register `com.devsaifullah.excloth` in a paid Apple Developer Program team.
2. Create an APNs authentication key (`.p8`) and upload it to Firebase Cloud Messaging. Keep the key outside this repository.
3. Register the same bundle ID in Firebase and inject the downloaded file at `ios/ExCloth/GoogleService-Info.plist`. The Xcode build phase validates its `BUNDLE_ID` and copies it into the app; the credential file stays ignored by Git.
4. Run `bundle exec pod install` from `ios/` after installing dependencies. The committed lockfile includes RNFirebase/Firebase Messaging; rerun this whenever native dependencies change.
5. Confirm the Push Notifications capability and the `remote-notification` background mode for the target.
6. Set `IOS_PUSH_NOTIFICATIONS_ENABLED=true` only in credentialed iOS builds. The native build fails if that flag is enabled without the plist.

`AppDelegate.swift` initializes Firebase only when the plist is present, so local and CI builds remain safe without credentials. `ExCloth.entitlements` contains the development APNs environment; the distribution provisioning profile supplies the production entitlement when archiving for release.

Notification presses use Notifee in every app state. The single background handler is registered in `index.js`, stores only allowlisted routing fields, and RootNavigator consumes the pending press after authentication and navigation are ready. Do not reintroduce RNFirebase notification-open listeners alongside Notifee.

## Physical-device verification

- Install a signed build on an iPhone.
- Accept the notification permission prompt.
- Confirm an iOS token is stored with platform `ios`.
- Test foreground, background, terminated-app, token-refresh, and notification-tap routing flows.
- Verify order and return update subtypes route by their validated identifiers, not only by an exact notification type string.
- Confirm disabled notification categories do not receive a push.

See the [React Native Firebase iOS setup](https://rnfirebase.io/) and [Firebase Cloud Messaging Apple guide](https://firebase.google.com/docs/cloud-messaging/ios/get-started).
