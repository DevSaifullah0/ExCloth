# ExCloth Access Control Policy

Version: 1.0

This document defines who should be able to do what inside ExCloth.

The main rule is least privilege: a user should only receive the access needed for their role.

## Roles

ExCloth currently has two application roles:

- Customer
- Administrator

## Customer access

A customer can access their own shopping and account workflows.

That includes:

- Profile
- Shipping addresses
- Cart
- Wishlist
- Checkout
- Orders
- Returns
- Reviews
- Notifications
- Settings

A customer must not be able to access:

- Admin Dashboard
- Product Management
- Category Management
- Coupon Management
- User Management
- Review Moderation
- Broadcast Management
- Global Order Management
- Global Return Management

## Admin access

Admins can access store management features.

The admin application is intentionally separated from customer shopping.

If the business rule is that admins cannot purchase from the app, that restriction should also be enforced by the order-creation backend.

## How admin access is assigned

Admin access must come from trusted backend administration.

It must not come from:

- Signup
- Client-side role selector
- Local storage
- User-editable metadata
- Navigation state

## Authentication

Protected actions require an authenticated user unless the feature is intentionally public.

## Backend enforcement

The real enforcement layer is:

- RLS
- Secure RPCs
- Server-side functions

Navigation is not enough.

## Access removal

Access should be removed when:

- A customer deletes the account
- Admin authorization is revoked
- A staff member no longer needs access
- A security incident requires suspension

## Admin review

Administrator access should be reviewed periodically.

The review should answer:

- Does this account still need admin access?
- Is the account still controlled by the right person?
- Are there old admin accounts that should be removed?
- Has anyone been given more privilege than necessary?

## Tests I expect to pass

- Customer cannot call admin RPCs
- Customer cannot read another customer's order
- Customer cannot update another customer's address
- Customer cannot moderate reviews
- Customer cannot manage coupons
- Unauthenticated writes fail
- Admin-only operations fail for normal users
- Admin customer-order creation fails if the business rule prohibits it