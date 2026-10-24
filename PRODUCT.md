# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript, packaged as a Tauri desktop app (same base as Culinary Restaurant). Confirmed by the user.

## Users

The provider of Culinary Restaurant and at most two or three trusted people, working from one or two office computers. They issue and adjust the licenses customers pay for, answer support tickets from restaurant branches, and publish software updates.

## Product Purpose

The provider's administration program for Culinary Restaurant. It talks only to CulinaryServer (a Cloudflare Worker, `/admin/v1`, contract in `C:\Users\kikin\Desktop\CulinaryServer\docs\API.md`). Success: a license is created, changed, renewed, revoked or released in seconds and without mistakes; no ticket waits unnoticed; an update reaches exactly the licenses it was meant for.

## Positioning

The only place licenses are minted. Each license is signed by the provider's root key in CulinaryServer and bound to one branch machine (TPM or hardware fingerprint). The panel never holds the root key.

## Operating Context

- Sign-in is three factors: a non-exportable device key (WebCrypto, Ed25519 or P-256), password, and TOTP. One account per device; another computer needs an invitation and the old account is removed.
- Licenses: customer, branch, siteId, tenantId, plan (trial with chosen days, monthly, annual, permanent), features (reservations, reviews, customerRequests, printing, courses, promotions, multiBranch), limits (maxUsers, maxTables). Status pending, active, expired, revoked. Activation code shown once; the branch also needs the license ID.
- Actions: create, edit, renew one period or until a date, revoke (permanent), release the machine (new activation code).
- Updates: multipart upload to R2, then publish to all licenses or to chosen licenses; withdraw.
- Support: tickets open, answered, closed; reply and close.
- Branch registry for the multi-company central (`--provision-tenant` fields), audit log, root public key.
- The branch has 3 days of offline grace; an expired license locks the branch completely.

## Capabilities and Constraints

- Session lasts 8 hours; five bad attempts lock an account 15 minutes.
- Creating invitations and deleting admins needs a fresh device signature.
- The panel's origin must be listed in the Worker's ADMIN_ORIGINS.
- Prices are not managed here.

## Brand Commitments

Product family name "Culinary Restaurant"; this program is "CulinaryAdmin". Spanish (Mexico) interface.

## Evidence on Hand

No customers, metrics or testimonials are provided; do not invent any.

## Product Principles

1. Irreversible actions (revoke, release, delete admin) are always explicit and named.
2. One-time secrets (activation codes, TOTP setup) are shown once, clearly, and easy to copy.
3. Status and expiry dates are readable at a glance.
4. The panel trusts the server, never itself: everything shown comes from CulinaryServer.

## Accessibility & Inclusion

Keyboard operable, visible focus, WCAG AA contrast in light and dark themes.
