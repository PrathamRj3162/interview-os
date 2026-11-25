# Deployment (all free tiers, no credit card)

## 1. Supabase
1. Create a project at https://supabase.com (Free plan).
2. SQL Editor → paste and run `supabase/migrations/0001_init.sql`.
3. Authentication → URL Configuration: Site URL = your production URL; add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to Redirect URLs.
4. Project Settings → API: copy the URL, the anon/publishable key, and the service_role key.

## 2. AI key (at least one)
- Gemini: https://aistudio.google.com/apikey
- Groq: https://console.groq.com/keys

## 3. Local
```
cp .env.example .env.local   # fill in values
npm install && npm run dev
```

## 4. Vercel
```
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production   # repeat for every var in .env.example
vercel --prod
```
Then set `NEXT_PUBLIC_SITE_URL` to the production URL and update Supabase redirect URLs.
Verify: `curl https://<domain>/api/health` → `"database":"configured"` and your AI providers listed.

## 5. Region
`vercel.json` pins functions to `bom1` (Mumbai) to sit next to a Supabase project in `ap-south-1`. If your Supabase project is elsewhere, change it to the nearest Vercel region; check with `curl https://<domain>/api/health?db=1` (round trips should be tens of ms).

## 6. Keep Supabase awake
`.github/workflows/keepalive.yml` calls the `ping()` RPC every 3 days so the free project isn't paused. Add repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the public anon key — no service key needed).
