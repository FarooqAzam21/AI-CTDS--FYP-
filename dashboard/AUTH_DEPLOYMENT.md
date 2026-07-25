# Google sign-in deployment checklist

The dashboard sends Google sign-in and sign-up callbacks to
`VITE_AUTH_REDIRECT_URL` (or the current browser origin when it is not set).
It uses PKCE, so a successful callback contains a short-lived `code` rather
than access or refresh tokens.

## Vercel

Add these environment variables to the **Production** environment and redeploy:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_AUTH_REDIRECT_URL=https://YOUR_APP.vercel.app`

Do not include a trailing slash in `VITE_AUTH_REDIRECT_URL`.

## Supabase Auth

In **Authentication → URL Configuration**:

- Set **Site URL** to `https://YOUR_APP.vercel.app`.
- Add `https://YOUR_APP.vercel.app/**` to **Redirect URLs**.
- Add `http://localhost:5173/**` too if local development is required.

The Site URL alone is not enough when the application passes a `redirectTo`
value, so the Redirect URLs entry is required.

## Google Cloud

In the OAuth client used by Supabase, add this exact authorized redirect URI:

`https://ssegsbvpqmnwmzvqetye.supabase.co/auth/v1/callback`

This is the Supabase callback, not the Vercel URL. A Google `redirect_uri_mismatch`
or “Bad OAuth” error is caused by a missing or different value here. Copy the
Google client ID and secret into **Supabase → Authentication → Providers → Google**
and save the provider settings.
