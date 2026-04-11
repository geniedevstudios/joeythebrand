# joey-landing

Coming-soon landing for **JOEY THE BRAND**.

## Local dev

```bash
cd joey-landing
npm install
npm run dev
```

## Environment variables

Use the same keys as **`joey-app`**: copy **`joey-app/.env.local`** to **`joey-landing/.env.local`** (or paste the same values in your host’s env UI).

**Newsletter (Brevo):** `BREVO_API_KEY`, `BREVO_SUBSCRIBE_LIST_ID`

**Supabase (same names as `joey-app`):** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and `NEXT_PUBLIC_SUPABASE_ANON_KEY` if you keep a full mirror)

The landing subscribe route does not require the anon key.

If **only** Brevo is set, subscriptions go to Brevo only (GET contact → POST if new).

**Landing-only (optional):** add to **`joey-landing/.env.local`** — `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_TWITTER_URL` (empty FB/X fall back to `#` in the UI).
