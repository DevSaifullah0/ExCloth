# ExCloth Incident Response Plan

Version: 1.0

This is the working security incident process for ExCloth.

The point of this document is not to create bureaucracy. It is to make sure that if something serious happens, the response is predictable and fast.

## What counts as an incident

Examples include:

- Admin account compromise
- Customer account takeover
- Exposed service-role key
- Public database write access
- Broken RLS
- Unauthorized refund
- Unauthorized order update
- Leaked production secret
- Push-notification abuse
- Sensitive data in logs
- Malicious Edge Function activity
- Payment secret compromise

## Severity

### Critical

Examples:

- Service-role key exposed
- Large data exposure
- Admin privilege escalation
- Production database publicly writable
- Payment secret compromise

### High

Examples:

- Admin account takeover
- Unauthorized refund operations
- Broad customer-data access issue

### Medium

Examples:

- Limited data exposure
- Workflow abuse with restricted impact

### Low

Examples:

- Minor configuration issue with low exploitability

## First response

When an incident is discovered:

1. Record when it was detected.
2. Identify affected systems.
3. Preserve relevant logs.
4. Stop the active damage.
5. Rotate or revoke compromised credentials.
6. Restrict affected access.
7. Identify affected users and data.

## Secret leak

If a secret is exposed:

1. Revoke or rotate it immediately.
2. Find where it was used.
3. Review logs for abuse.
4. Remove the old secret from active systems.
5. Replace deployment configuration.
6. Verify the secret is not inside a mobile build.

## Admin account compromise

If an admin account is compromised:

1. Remove or disable admin authorization.
2. Revoke active access where possible.
3. Reset credentials.
4. Review admin actions.
5. Review product, coupon, user, review, broadcast, order, return, and refund changes.
6. Restore unauthorized changes.

## Customer account compromise

Review:

- Password/session
- Shipping address changes
- Recent orders
- Return requests
- Push-token changes
- Profile changes

## Database exposure

If database exposure is suspected:

- Lock down affected access
- Review RLS
- Review API keys
- Review authentication activity
- Identify affected tables
- Identify affected accounts
- Preserve evidence

## Payment incident

When real payments are enabled, a payment incident should trigger:

- Provider secret rotation if required
- Payment-provider contact
- Transaction review
- Temporary disablement if necessary
- Careful handling of payment logs

Sensitive payment credentials should never be copied into incident notes.

## Recovery

Before restoring normal operation:

- Confirm the root cause is fixed
- Confirm credentials are safe
- Confirm RLS is correct
- Confirm admin authorization is correct
- Confirm affected functions are patched
- Add regression tests

## Post-incident review

Every significant incident should end with:

- Timeline
- Root cause
- Impact
- What was changed
- What should prevent recurrence
- Owner
- Completion date

## Contacts

Security Lead: `[Name / Email]`

Engineering Lead: `[Name / Email]`

Legal / Compliance: `[Name / Email]`

Customer Support: `[Name / Email]`