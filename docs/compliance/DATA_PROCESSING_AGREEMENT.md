# ExCloth Data Processing Agreement

Version: 1.0

This document is an internal contract template for situations where one party processes personal data on behalf of another party in connection with ExCloth.

It is not intended to be shown as a normal customer-facing app policy.

Controller: `[Controller Legal Name]`

Processor: `[Processor Legal Name]`

Controller Address: `[Controller Address]`

Processor Address: `[Processor Address]`

Effective Date: `[Contract Effective Date]`

Governing Law: `[Jurisdiction]`

## Scope

The processing may support ExCloth operations such as:

- Authentication
- Account management
- Orders
- Shipping
- Returns
- Refunds
- Reviews
- Notifications
- Support
- Security
- Infrastructure

## Data subjects

The processing may involve:

- Customers
- Administrators
- Authorized business users
- Support users

## Personal data

The data may include:

- Name
- Email
- Phone
- Account ID
- Profile information
- Shipping address
- Order information
- Return information
- Review information
- Push token
- Notification preferences
- Authentication metadata
- Technical records

## Payment data

The processor should not intentionally store raw:

- CVV
- Card PIN
- Banking password
- OTP
- Other prohibited payment authentication secrets

unless the production payment architecture explicitly requires it and the environment is designed and certified for that purpose.

## Processing instructions

The processor should only process data:

- For the agreed purpose
- On documented instructions
- For the required duration
- In accordance with the applicable agreement and law

## Confidentiality

Anyone with access to personal data should be subject to appropriate confidentiality obligations.

## Security

The processor should maintain controls appropriate to the data being handled.

For ExCloth, that can include:

- Authentication
- Least privilege
- Role separation
- RLS
- Secure RPCs
- Restricted secrets
- Server-side privileged operations
- Logging
- Incident handling
- Dependency management

## Subprocessors

Known project providers currently include:

- Supabase
- Firebase Cloud Messaging

The current list should be maintained in `SUBPROCESSOR_REGISTER.md`.

## User rights support

Where required, the processor should reasonably assist with requests involving:

- Access
- Correction
- Deletion
- Restriction
- Portability
- Objection

## Security incidents

A confirmed personal-data incident should be escalated without unnecessary delay.

The internal process is documented in `INCIDENT_RESPONSE_PLAN.md`.

## End of processing

At the end of the processing relationship, data should be returned, deleted, or retained only where there is a valid legal or contractual reason.

## International transfers

If personal data crosses borders, the production agreement should identify the legal transfer mechanism required by the applicable jurisdiction.

## Signatures

Controller

Name: `[Name]`

Title: `[Title]`

Signature: `[Signature]`

Date: `[Date]`

Processor

Name: `[Name]`

Title: `[Title]`

Signature: `[Signature]`

Date: `[Date]`