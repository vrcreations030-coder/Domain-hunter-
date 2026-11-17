# Domain Hunter Security Specification

## Data Invariants
1. Every document under `/users/{userId}` and its subcollections (`bookmarks`, `searchHistory`, `domainAlerts`) belongs strictly to `userId == request.auth.uid`.
2. Users must be authenticated with a verified email (`request.auth.token.email_verified == true`).
3. No user can read, list, create, update, or delete another user's profile, email PII, bookmarks, search history, or domain alerts.
4. All IDs (`userId`, `bookmarkId`, `historyId`, `alertId`) must match `^[a-zA-Z0-9_-]+$` and be <= 128 characters.
5. `createdAt` and `updatedAt` timestamps must match `request.time`; `createdAt`, `uid`/`userId`, `domain`, and `email` (on alerts) are immutable after creation.
6. Unexpected shadow fields (`role`, `isAdmin`, `verified`, etc.) are rejected via strict `hasOnly()` key validation.
7. `domainAlerts.email` must strictly match `request.auth.token.email` to prevent email-target spoofing.
8. When `domainAlerts.trigger == "price_below_budget"`, `maxPriceUsd` must be a numeric budget in `[1, 10000000]`.

## Dirty Dozen Adversarial Payloads
1. Unauthenticated read/write to `/users/u1/bookmarks/example_com` -> PERMISSION_DENIED.
2. Authenticated user `u2` attempting `get` on `/users/u1` (PII email leak) -> PERMISSION_DENIED.
3. Authenticated user `u2` attempting `create` under `/users/u1/domainAlerts/example_com` with `userId: "u2"` -> PERMISSION_DENIED.
4. User `u1` with `email_verified: false` attempting `create` -> PERMISSION_DENIED.
5. User `u1` creating profile or domainAlert with shadow field `isAdmin: true` -> PERMISSION_DENIED.
6. User `u1` updating bookmark or domainAlert to change `userId` or `createdAt` -> PERMISSION_DENIED.
7. User `u1` creating domainAlert with third-party victim email `victim@other.com` instead of `request.auth.token.email` -> PERMISSION_DENIED.
8. User `u1` creating bookmark/domainAlert with invalid domain string `"not a domain!!"` -> PERMISSION_DENIED.
9. User `u1` creating domainAlert with invalid `channel: "sms_blast"` -> PERMISSION_DENIED.
10. User `u1` creating domainAlert with poisoned 500-char document ID -> PERMISSION_DENIED.
11. User `u1` creating domainAlert with forged past `createdAt` timestamp instead of `request.time` -> PERMISSION_DENIED.
12. Any user attempting `list` on `/users` root collection -> PERMISSION_DENIED.
13. User `u1` creating `price_below_budget` domainAlert with negative, string, or missing `maxPriceUsd` -> PERMISSION_DENIED.
