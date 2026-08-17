# ExCloth Security

Version: 1.0

This document explains the security decisions behind ExCloth.

The project is a mobile e-commerce application, so I assume the client can be inspected, modified, or called outside the normal UI. Because of that, I do not treat hidden buttons or navigation checks as real security.

The backend remains the final authority.

## Authentication

Supabase Auth handles user authentication.

The application restores the authenticated session and then resolves the user's role.

Passwords are never stored as plain text in normal application tables.

## Role separation

ExCloth currently has:

- Customer
- Administrator

There is no role-selection screen.

Admin status comes from trusted backend authorization.

A normal user cannot become an admin by changing:

- Local state
- AsyncStorage
- Navigation params
- Signup values
- Client metadata

## Customer and admin navigation

The app uses separate navigation trees.

Customer navigation contains shopping features.

Admin navigation contains management features.

This prevents accidental role mixing, but it is still only part of the security model.

## Backend authorization

Sensitive actions must still be protected by:

- Row Level Security
- Secure RPC functions
- Server-side authorization checks

Any admin RPC should verify admin status independently of the UI.

## Row Level Security

RLS is used to prevent users from reading or modifying data they should not own or access.

Policies should be written around:

- Authenticated user ID
- Ownership
- Admin authorization
- Allowed operation

## Secure RPCs

Sensitive database functions should:

- Verify the authenticated user
- Verify authorization
- Validate input
- Restrict allowed state transitions
- Return only the data the caller needs

## Edge Functions

Operations that require privileged credentials should run server-side.

The Supabase service-role key must never be included in:

- React Native code
- Public environment files
- APK
- AAB
- Client-side JavaScript

## Orders

The client should not be trusted to calculate the final order amount.

The backend should validate:

- Product
- Variant
- Quantity
- Stock
- Price
- Coupon
- Discount
- Shipping
- Final total

If admins are not allowed to place customer orders, the order-creation backend should reject admin accounts explicitly.

## Returns

A return request should verify:

- The order belongs to the customer
- The order is eligible
- The item exists in the order
- The quantity is valid
- The item was not already fully returned
- The return state is valid

Admin return updates should only allow valid transitions.

## Reviews

Review creation should validate:

- Authenticated user
- Product
- Rating
- Review content
- Purchase eligibility where required
- Duplicate-review rules

Admin moderation should remain admin-only.

## Push notifications

Push tokens are security-sensitive identifiers.

They should be:

- Registered for authenticated users
- Removed when invalid
- Removed on account deletion
- Unregistered where appropriate on logout

Notification payloads should avoid carrying more personal data than necessary.

## Payments

A production payment integration should follow a strict rule: the mobile client never decides that money was successfully received.

Payment status should be verified server-side.

ExCloth should never store:

- CVV
- PIN
- OTP
- Banking password
- Wallet password

## Logging

Logs are useful, but they should not contain secrets.

Do not log:

- Passwords
- OTPs
- CVVs
- Service-role keys
- Payment secrets
- Signing keys

## Secrets

Sensitive values should stay in secure server-side configuration.

Examples:

- Supabase service-role key
- Payment-provider secret
- Firebase server credentials
- Database password
- Signing secrets

## Dependencies

Dependencies should be reviewed and updated carefully.

I avoid blindly running breaking upgrade commands just to remove audit warnings. A dependency update should be tested against the actual React Native build.

## Release security

Before a production Android release:

- Use release signing
- Protect the signing key
- Verify production environment values
- Remove debug-only behavior
- Review logs
- Test authentication
- Test admin authorization
- Test order security
- Test return security
- Test account deletion
- Test notifications

## Security work still worth doing

The highest-value final checks are:

- Audit every RLS policy
- Audit every admin RPC
- Verify admin accounts cannot place customer orders if that is a hard business rule
- Verify notification preference enforcement in the push sender
- Test direct API calls outside the UI
- Test ownership checks for orders, addresses, returns, and reviews