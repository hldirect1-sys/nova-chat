# Nova Chat (static web app)

This is a standalone chat page for **Nova**. It replaces the GoHighLevel Vibe-builder page. The whole app is one file, `index.html`, with the HTML, CSS and JS inline. There is no build step and no framework, and the only thing it needs at runtime is `supabase-js` loaded from jsDelivr.

```
index.html      the app
README.md       this file
.gitignore
tests/e2e.cjs   optional headless test that mocks Supabase and the chat endpoint
```

## How it works

### Auth (Supabase Auth, `supabase-js` v2 UMD)
- The client is created with `persistSession: true`, `autoRefreshToken: true` and `detectSessionInUrl: true`, so sessions survive reloads and tokens refresh in the background.
- The sign-in screen offers two options:
  - **Email + password** through `signInWithPassword`.
  - **Email me a sign-in link** through `signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: false } })`. When the user opens the link they land back on the site root, and `supabase-js` picks the session up from the URL. The URL is then cleaned.
- Users who have not confirmed their email (no `email_confirmed_at`) are signed out locally and asked to confirm first.
- **Sign out** calls `signOut({ scope: 'local' })` and also deletes that user's locally stored transcript.

### Chat
- `POST https://cwlktrvvappvwdmhefxo.supabase.co/functions/v1/nova-site-chat`
  - Headers: only `Authorization: Bearer <access_token>`, `apikey: <publishable key>` and `content-type: application/json`.
  - Body: `{"message": "...", "session_id": "..."}`
- Before each request the app calls `auth.getSession()`. If the token expires within 60 s, it calls `auth.refreshSession()` first.
- **session_id** looks like `web_<base36 time>_<16 random chars>` (about 29 chars, `[A-Za-z0-9_-]`). It is created once per conversation. The current id and the visible transcript (last 200 messages) are kept in `localStorage` under `nova.chat.v1:<user id>`. Every storage access is wrapped in try/catch, so private mode still works. **New chat** cancels any request in flight and starts a new id.
- **Responses:** `{ok, reply, assistant, session_id?}`. The reply is shown as escaped text with line breaks kept, URLs auto-linked (`target=_blank rel=noopener`), and support for `**bold**`, `- ` / `* ` bullets, `1.` numbered lists, `# ` headings and `[label](https://…)` links. HTML is always escaped first.
- **"Sign in again…" replies** (and HTTP 401): the app forces one session refresh and retries once. If it fails again, the app signs out locally and shows the sign-in screen. The unsent message is put back in the composer after the user signs in again.
- **Timeouts and errors:**
  - The request is aborted after 170 s by an `AbortController`. The server itself gives up at about 150 s. While waiting, the typing indicator adds "Still working on it…" at 20 s and a longer note at 60 s.
  - A real fetch/network failure shows "I'm having trouble reaching the server right now." with a **Retry** button.
  - A timeout shows its own message with Retry.
  - Any non-200 response (other than 401) shows "The server returned an error (HTTP n)" with Retry.
  - An unreadable or empty JSON body shows its own message with Retry.
  - Retry sends the exact same text and session id without adding a second user bubble.
- **Starter cards** are real `<button>`s. Clicking one, or pressing Enter/Space on it, calls the same `sendMessage()` the composer uses.
- **Composer:** the textarea grows as you type (up to 200 px). Enter sends, Shift+Enter adds a new line, and IME composition is respected. The send button, starter cards and Retry buttons are disabled while a reply is pending.

### Accessibility and layout
- The message list is `role="log"` with `aria-live="polite"`. Inputs have labels, icon-only buttons have `aria-label`, and focus rings are visible. Reduced motion is respected.
- Tested at a 360 px width with no horizontal scroll. On narrow screens the header buttons collapse to icons and the starter cards stack.

### Security notes
- The publishable key (`sb_publishable_…`) is designed to be public. Access control comes from the user's JWT and the edge function and RLS checks.
- A `<meta>` Content-Security-Policy allows only these sources: jsDelivr for scripts, Google Fonts, and the Supabase project for `connect-src`. **If you change the Supabase project URL, update the CSP too.** Otherwise every auth and chat call will be blocked.
- Optional hardening: pin the library to an exact version, e.g. `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.x.y/dist/umd/supabase.js`, and add an `integrity` attribute.

## Hosting

The repo root is the site, so there is nothing to build.

### Cloudflare Pages
1. Go to Workers & Pages → Create → Pages → Connect to Git and pick the repo.
2. Framework preset: **None**. Build command: *(leave empty)*. Build output directory: **`/`** (the repo root).
3. Deploy. Then go to Custom domains → add `chat.smplyai.com` and follow the DNS (CNAME) instructions.

### Vercel
1. Add New → Project → import the repo.
2. Framework preset: **Other**. Build command: *(empty / override to nothing)*. Output directory: **`.`** (the root). Install command: *(empty)*.
3. Deploy. Then go to Settings → Domains → add `chat.smplyai.com`.

### Supabase settings to update (required for the magic link)
In the Supabase dashboard, go to **Authentication → URL Configuration**:
- Set **Site URL** to `https://chat.smplyai.com` (or keep it as is and just add the redirect below).
- Add `https://chat.smplyai.com` to **Redirect URLs**. While testing, also add any preview URL, e.g. `https://*.pages.dev` or `https://*.vercel.app`, and `http://localhost:8080`.

If the origin is not on the allow-list, Supabase falls back to the Site URL and the link sends people to the wrong place.

Also make sure the `nova-site-chat` function's CORS allows the new origin. Per the contract it already does, but check this if a browser console shows CORS errors from the new domain.

## Local preview
```bash
python3 -m http.server 8080   # then open http://localhost:8080
```
Opening the file with `file://` will not work for magic links. Use a local server.

## Tests (optional)
`tests/e2e.cjs` serves `index.html` locally and replaces the jsDelivr script with a fake `supabase` global. It also intercepts the chat endpoint, so it never contacts the real backend. It runs 50 checks covering the request contract and headers, starter buttons (click/Enter/Space), the composer, network/timeout/HTTP-500 errors and Retry, the "Sign in again" refresh-and-retry, the pre-expiry refresh, session_id persistence, HTML escaping and the 360 px layout.

```bash
npm i -D playwright && npx playwright install chromium
node tests/e2e.cjs
```

Because the repo root is published as-is, `tests/e2e.cjs` will also be publicly reachable. It contains nothing secret, but you can delete the folder before pushing if you prefer.
