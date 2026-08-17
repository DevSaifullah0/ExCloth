# ExCloth Subprocessor Register

Version: 1.0

This file tracks external services that may process ExCloth data as part of the application infrastructure.

I want this list to stay practical. If a new service is added to the app and it receives user or operational data, it should be reviewed and added here.

## Current services

| Provider | Why ExCloth uses it | Data that may be involved |
|---|---|---|
| Supabase | Authentication, PostgreSQL, storage, Edge Functions, backend services | Account data, profile data, orders, shipping data, returns, reviews, notification preferences, operational data |
| Firebase Cloud Messaging | Android push delivery | Push token, notification payload, device delivery metadata |

## Payment providers

No production payment provider should be listed until it is actually integrated and used.

When one is added, this document should record:

- Provider name
- Purpose
- Data shared
- Processing location if relevant
- Contract or onboarding status

## Courier providers

If ExCloth integrates a courier API, that provider may receive:

- Customer name
- Phone
- Delivery address
- Order reference
- Delivery instructions

That provider should then be added to this register.

## When this file needs an update

Review this register when:

- A new SDK is installed
- A new analytics tool is added
- A payment provider is connected
- A courier API is connected
- A support platform is connected
- Backend infrastructure changes