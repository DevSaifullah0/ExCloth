# ExCloth Data Retention Policy

Version: 1.0

This document explains how I expect ExCloth data to be retained from an engineering and operational point of view.

The exact production retention periods still need to be approved based on business, accounting, legal, and security requirements.

## General rule

The basic rule is simple: keep data for as long as there is a real reason to keep it, and remove it when that reason no longer exists.

I do not want the application to keep personal data forever by default.

## Account data

Profile data is needed while the account is active.

After account deletion, profile information that is no longer required should be removed or disconnected from the active account.

## Shipping addresses

Saved shipping addresses are account-level convenience data.

They should be removable by the customer.

Order records may still contain shipping snapshots if they are needed to preserve the historical transaction.

## Cart

Cart data is temporary shopping data.

It should only exist while it is useful to the customer experience.

## Wishlist

Wishlist data can remain while the account is active unless the user removes it.

## Orders

Orders need longer retention than ordinary profile data.

They may be required for:

- Customer support
- Accounting
- Fraud prevention
- Disputes
- Refund verification
- Tax records
- Business reporting

## Returns and refunds

Return and refund history should remain connected to the related order for as long as the transaction record is legitimately needed.

## Reviews

Reviews can remain while they are published or while moderation history is required.

A production policy should define how deleted accounts affect review display.

## Push tokens

Push tokens should not be treated as permanent records.

They should be removed when:

- They are invalid
- The user logs out where cleanup is required
- The account is deleted
- The device token changes
- The token is no longer needed

## Notification preferences

Notification preferences are useful while the account exists.

They can be removed when the account is deleted.

## Security logs

Security logs should have a defined retention period.

They should not be kept forever unless there is a specific requirement.

## Backups

Deleting data from the active database may not remove it immediately from backups.

Production backup retention should therefore have its own defined period.

## Legal holds

If a record is involved in a dispute, investigation, or legal requirement, normal deletion may need to be paused.

## Production retention table

Before launch, the following values should be finalized:

| Data | Retention |
|---|---|
| Deleted profile data | `[Period]` |
| Orders | `[Period]` |
| Returns | `[Period]` |
| Refund records | `[Period]` |
| Reviews | `[Period]` |
| Security logs | `[Period]` |
| Backups | `[Period]` |