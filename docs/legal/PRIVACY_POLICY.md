# ExCloth Privacy Policy

Effective Date: 17 August 2026

This document describes how ExCloth handles user information inside the application.

It reflects the current project architecture. Before a public commercial launch, the final wording should be reviewed for the countries where ExCloth will operate.

## Who operates ExCloth

Legal Business Name: `[Legal Business Name]`

Business Address: `[Business Address]`

Privacy Contact: `[Privacy Email]`

Support Contact: `[Support Email]`

## Information we use

ExCloth only needs information that supports the shopping and account experience.

This can include:

- First name
- Last name
- Email address
- Phone number
- Profile image
- Account identifier
- Shipping addresses
- Order details
- Return details
- Review information
- Push notification token
- Notification preferences

## Why we use this information

We use account and shopping information to:

- Create and manage accounts
- Authenticate users
- Show account information
- Save shipping addresses
- Process orders
- Track order status
- Handle cancellations
- Handle returns
- Track refunds
- Show customer reviews
- Send relevant notifications
- Provide support
- Protect the service from misuse

## Authentication

Authentication is handled through Supabase Auth.

ExCloth does not store plain-text passwords in normal application tables.

Password changes and account authentication are handled through the authentication provider.

## Shipping information

Shipping information is used to deliver orders and support order-related workflows.

This may include:

- Recipient name
- Phone number
- Address
- Area
- Landmark
- City
- Province
- Postal code
- Country

Users are responsible for keeping this information accurate.

## Orders and returns

ExCloth stores order and return information because the application needs a history of what happened during the transaction.

That includes information such as:

- Products purchased
- Quantity
- Product variants
- Order total
- Coupon usage
- Order status
- Return status
- Refund status

Some transaction records may need to remain even after an account is closed because they can be required for accounting, fraud prevention, dispute handling, or other legitimate obligations.

## Payments

ExCloth should never store highly sensitive payment secrets such as:

- CVV
- Card PIN
- Banking password
- OTP
- Mobile wallet password

A production payment integration should use an approved payment provider.

The application may keep non-sensitive payment records such as:

- Payment method
- Payment status
- Transaction reference
- Order ID
- Amount

## Push notifications

ExCloth uses push notifications for things such as:

- Order updates
- Return updates
- Promotions
- Coupons
- Announcements

A push token may be stored against the authenticated account so notifications can reach the correct device.

Users can also control notification permission from their device settings.

## Service providers

The project currently uses:

- Supabase
- Firebase Cloud Messaging

These services support authentication, database operations, storage, server-side logic, and push delivery.

The production project should keep an up-to-date subprocessor register.

## Data retention

We do not want to keep personal information indefinitely without a reason.

Different data has different retention needs.

For example:

- Active profile data is needed while the account exists.
- Push tokens should be removed when they are no longer valid or needed.
- Order and refund records may need longer retention.

The internal retention approach is documented in `DATA_RETENTION_POLICY.md`.

## Account deletion

Customers can request account deletion where the feature is enabled.

The deletion flow is designed to remove or disable the authentication account and remove account-specific data that is no longer required.

Some transaction records may remain if there is a valid business, accounting, fraud-prevention, or legal reason to keep them.

Admin accounts are not deleted through the normal customer deletion flow.

## Security

ExCloth uses several layers of protection, including:

- Supabase Auth
- Row Level Security
- Backend role checks
- Secure RPC functions
- Server-side privileged operations
- Separate admin and customer navigation

No system can promise absolute security, but the project is designed so the mobile client is not the final authority for sensitive actions.

## Your choices

Depending on the available feature, users can:

- Edit profile information
- Manage shipping addresses
- Change password
- Manage notification preferences
- Disable device notifications
- Request account deletion

## Children

ExCloth is not designed to intentionally collect children's personal information in violation of applicable law.

Any production age requirement should be defined based on the market where the app is launched.

## Changes to this policy

This policy may change when the app adds new functionality, service providers, countries, or business processes.

## Contact

Privacy questions:

`[Privacy Email]`

Support:

`[Support Email]`