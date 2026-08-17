# ExCloth Security Assessment

## Overview

Security assessment performed using Strix AI against the ExCloth React Native application.

**Risk Rating:** Moderate

**Assessment Type:** White-box security review

## Executive Summary

A white-box security review identified several dependency-related CVEs and mobile hardening opportunities.

No application-layer vulnerability was dynamically confirmed in authentication, order processing, admin RPC, or storage upload flows.

## Key Findings

- 9 dependency CVEs identified
- 1 Critical dependency vulnerability
- Several High severity dependency issues
- No unauthorized access to sensitive Supabase RPCs
- No unauthorized order or return operations confirmed
- Supabase Storage rejected unauthenticated writes
- Sessions currently persisted using AsyncStorage
- Android debug keystore is tracked
- Release obfuscation/minification is disabled

## Positive Security Results

The following controls successfully resisted unauthenticated testing:

- Admin role checks
- Order state operations
- Return operations
- Supabase Edge Functions
- Storage writes
- Sensitive database access

## Recommendations

1. Upgrade vulnerable dependencies.
2. Regenerate dependency lockfiles.
3. Move sensitive session storage to secure device storage where appropriate.
4. Remove production reliance on debug signing.
5. Enable release minification/obfuscation.
6. Perform authenticated authorization testing.
7. Periodically repeat dependency security scans.

## Testing Limitations

- Native Android/iOS execution was unavailable in the testing environment.
- Authenticated testing was limited because a reusable test account could not be created.
- Some hosted Supabase functions were not present in the repository source.

## Tooling

Security assessment performed with:

- Strix
- Semgrep
- Trivy
- Secret/configuration scanning
- Source-aware static analysis

## Disclaimer

This assessment represents the state of the project at the time of testing and does not guarantee the absence of security vulnerabilities.