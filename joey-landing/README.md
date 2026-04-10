# joey-landing

Landing page you can deploy while `joey-app` is in active development.

## Local dev

```bash
cd joey-landing
npm install
npm run dev
```

## Environment variables

These control where the buttons point:

- `NEXT_PUBLIC_JOEY_APP_URL` (example: `https://app.joeythebrand.com`)
- `NEXT_PUBLIC_JOEY_ADMIN_URL` (example: `https://admin.joeythebrand.com`)

Newsletter subscribe endpoint (optional):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

