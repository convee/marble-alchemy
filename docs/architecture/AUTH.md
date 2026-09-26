# Account and Google sign-in boundary

The public site is intentionally anonymous today: a visitor can browse the catalog, play either Marble Alchemy build, and support the workshop without an account. There is no Google OAuth client, callback route, user table, or browser-stored access token in this repository.

If accounts become necessary for cross-device progress, saved runs, or payment entitlements, use Google as the only sign-in provider in the first release:

1. Create a separate production OAuth client for `chaoschemy.com`; keep the client ID public but keep the client secret in the server secret store.
2. Add a server callback that validates the authorization code, issuer, audience, nonce and redirect URI before creating an application session.
3. Store an internal user ID, Google subject ID and verified email state. Do not use the email address as the primary key.
4. Bind anonymous telemetry and local progress to the signed-in user only after an explicit merge step. Existing anonymous play must continue when the visitor declines sign-in.
5. Let Paddle webhook reconciliation attach paid entitlements to the internal user ID after a verified transaction. A browser return URL alone must never grant access.
6. Add account deletion, data export, session revocation and privacy copy before enabling the sign-in button.

The current multi-game catalog does not require login. This keeps the public game loop and the payment support flow reviewable while Google OAuth remains a separate, unimplemented workstream.
