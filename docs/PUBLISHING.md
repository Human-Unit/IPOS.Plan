# IPOS.Plan — named public pages

## Purpose

Publish an explicit, read-only, publicly accessible **snapshot** of a local IPOS plan at a short, human-readable address like `/p/ipos-october-2026-a1b2c3d4e5f60708`. This is **not** cloud autosave or shared editing.

## Architecture

- Editable plans, tasks, versions and backups stay entirely in browser IndexedDB. No schema changes.
- Existing `/view#p=…` gzip/Base64URL self-contained links remain supported.
- The Share dialog can optionally publish the exact flushed snapshot to a **private Vercel Blob store** via server-side Next.js API routes.
- `POST /api/publications`: creates an immutable initial snapshot, returns `id` and a random 256-bit **manager key**.
- `GET /api/publications/[id]`: returns only public read-only document content; omits manager hashes and keys.
- `PUT /api/publications/[id]`: explicitly replaces a snapshot after the caller proves knowledge of its manager key. Conditional etag write protects concurrent changes.
- `DELETE /api/publications/[id]`: unpublishes with the manager key and invalidates the URL.
- `/p/[id]`: read-only publication view using the existing PlanRenderer. Page is `noindex` but publicly accessible to anyone with its URL.
- The server stores a SHA-256 hash of the manager key. The key is returned only once and remembered in browser `localStorage` under `ipos-publication:<local-plan-id>`. **Users should separately back up this key**; clearing their browser data may permanently lose management access.
- Page identifiers combine a human-readable Latin slug with 16 cryptographically random hex characters; subsequent title changes retain the original permalink.
- There is no user login or multi-device ownership recovery in this MVP. Do not claim otherwise.

## Configuration

Provision one **private** Vercel Blob store linked to the existing IPOS Vercel project. Ensure `BLOB_READ_WRITE_TOKEN` is configured server-side in production and preview. Install and lock `@vercel/blob`.

Set `IPOS_PUBLISH_ACCESS_KEY` in Vercel **encrypted** environment variables (minimum 20 characters). The publish form requires this owner code to prevent unrestricted anonymous uploads and storage-billing abuse. Never add it as `NEXT_PUBLIC_*`, commit it or embed it in client code.

**Changing the publishing code** does not revoke existing page manager keys. The owner code gates *creating* new pages; the unique manager key authorizes update and unpublish.

For local testing, pull Vercel env variables to ignored `.env.local`; do not commit secrets.

## UX and limitations

1. Open a saved plan; click **Поделиться**. The existing long snapshot link remains unchanged.
2. Under **Короткая публичная страница**, enter a visible title and a Latin URL slug.
3. Enter the private publishing code and click **Опубликовать страницу**.
4. Copy/open the short URL. The page is read-only and its content does not change when the local plan is edited.
5. Edit the plan and use **Обновить страницу** to explicitly publish a new snapshot at the same link.
6. Use **Снять с публикации** to invalidate the link.
7. Save the backup management key off-browser to avoid losing the ability to update/remove a published page.

Published snapshots are stored **unencrypted at rest in the private Blob store**; they are not publicly accessible via raw Blob URLs but are intentionally readable through the IPOS public page. Avoid publishing secrets or private personal information. A URL is not an access control system. A `noindex` instruction discourages search indexing but does not make a page private. Private Blob reads/writes, database operations, and bandwidth may incur Vercel usage charges.

## QA

Test fresh publisher code rejection (403), creation, read-only GET, wrong manager key rejection (403), explicit update, unpublish and final 404. Verify generated links are stable, no backend secret appears in public JSON, and that publishing does not mutate IndexedDB. Verify print/A4, existing long share links, theme, read-only rendering, mobile view and reduced motion.

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`. A passing Vercel build does not replace interaction testing.
