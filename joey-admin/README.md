This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Public media uploads on Cloudflare R2

Set these server environment variables in `joey-admin/.env.local` for local testing
and in the admin deployment when ready to switch uploads.

```dotenv
R2_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=joey-media
R2_PUBLIC_BASE_URL=https://media.joeythebrand.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

Use the S3 endpoint from the R2 dashboard and an **Object Read & Write** credential
limited to this bucket. The public URL is the connected custom domain, or the
bucket’s public development URL when testing. Store only public media in this bucket.

For direct uploads, add this CORS rule in the bucket settings. Replace or add origins
to match the URLs from which staff actually use the admin app.

```json
[
  {
    "AllowedOrigins": ["http://localhost:3001", "https://admin.joeythebrand.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Restart or redeploy Joey Admin after setting the variables. In the product and
homepage editors, upload a test photo and a web-ready MP4, then open the resulting
public URLs before switching existing records. The uploader issues five-minute
PUT URLs to signed-in, allowlisted admins. If all R2 settings are unset, the
existing Cloudinary upload configuration is used. Previously saved URLs keep
pointing to their original provider until migrated.
