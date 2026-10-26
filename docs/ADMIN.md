# IPOS.Plan — Administrator access

## Scope

The single-owner administrator workspace is available at `/admin`. It requires a server-verified password and a signed **HttpOnly, Secure (in production), SameSite=Strict** cookie. Visitors without a valid session are redirected to `/admin/login`.

The dashboard currently allows the owner to **create and open plans in the existing full IPOS editor**. Its plan list is populated by the same browser's IndexedDB as the public home dashboard. This is a deliberate local-first first phase, **not** cloud account storage or synchronized admin drafts: switching browser/device will not expose documents stored in the previous browser, and logging out does not delete those documents.

## Deployment configuration

Set these **encrypted** environment variables in Vercel for the appropriate environments:

- `IPOS_ADMIN_PASSWORD`: unique randomly generated owner credential, at least 24 characters. Store securely; do not commit or expose as `NEXT_PUBLIC_*`.
- `IPOS_ADMIN_SESSION_SECRET`: unique strong random HMAC signing key, at least 48 characters. Changing it invalidates all existing admin sessions.

The admin password is distinct from `IPOS_PUBLISH_ACCESS_KEY`, which remains used by the standalone public-page publishing flow. Neither the login endpoint nor signed cookies grant control over previously published snapshots. Their management keys are separate.

## Security behavior

- Requests to `/admin` verify the HttpOnly cookie on the server, never solely in React.
- Login checks a high-entropy password using a constant-time digest comparison. Sessions are HMAC-signed and expire after seven days. The session token is never stored in localStorage.
- Session creation and logout require a matching `Origin`; requests from other origins are rejected.
- Responses from the session API are `Cache-Control: no-store`; login/admin pages are dynamic and `noindex`.
- Incorrect passwords do not establish a session. Logout clears the cookie.
- This is intentionally **single-owner password authentication**, not a public multi-user account system. Do not mistake it for full identity management; public unauthenticated local-plan editing on the home page still exists by design. Before building a shared cloud-admin database or collaboration features, introduce explicit owner permissions, rate-limiting, audit logs, and a recoverable identity model.

## User journey

1. Open `/admin` or use the Admin link in the dashboard navigation.
2. Enter the dedicated admin password.
3. Review local plans; create a new one with **Новый план**.
4. The full existing `/plan/[id]` editor opens and continues local IndexedDB autosave.
5. Open existing plans from the admin list.
6. Use **Выйти** to end the administrator session.

No existing IndexedDB schema, exports, A4 printing, public-page publishing API, or long self-contained sharing format is modified by the administrator feature.

## QA

Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`. Optional integration test for successful login uses `IPOS_TEST_ADMIN_PASSWORD` **only in the test runner environment**; never commit it or echo it to a build log.

Verify unauthenticated redirects, wrong password rejection, same-origin enforcement, valid cookie and logout, cookie flags, mobile layout, new plan creation, and that existing local plans remain unchanged.
