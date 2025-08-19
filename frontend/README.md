# Media Mapper Frontend
/*
Goal: Refactor MediaMapper’s gallery UI to a robust "XPrime/Netflix"-style system:
- Rebuild MediaTile, MediaRowCarousel, and Home rows.
- SafeImage wrapper + placeholder fallback.
- Fully typed (no any). Works with TMDB v3 or v4 via helper.
- Categories: Movies, TV/Anime, Games, Books.
- Tiles: hover overlay meta; click -> detail route.
- Rows: keyboard / drag scroll + arrow buttons.
- Skeleton loading states.
- Use only internal Next API routes (no direct secret exposure).
- Minimal next.config.js image remotePatterns.
Acceptance criteria: 4+ rows, no broken images, hover overlay, navigation works, low CLS, lazy images, clean lint/TS.
*/

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
 
```text
Goal: Refactor MediaMapper’s gallery UI to a robust "XPrime/Netflix"-style system:

List:
 - Rebuild MediaTile, MediaRowCarousel, and Home rows.
 - SafeImage wrapper + placeholder fallback.
 - Fully typed (no any). Works with TMDB v3 or v4 via helper.
 - Categories: Movies, TV/Anime, Games, Books.
 - Tiles: hover overlay meta; click -> detail route.
 - Rows: keyboard / drag scroll + arrow buttons.
 - Skeleton loading states.
 - Use only internal Next API routes (no direct secret exposure).
 - Minimal next.config.js image remotePatterns.

Acceptance criteria: 4+ rows, no broken images, hover overlay, navigation works, low CLS, lazy images, clean lint/TS.
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Copilot Instruction Block

/*
Copilot: make this Next.js app build and route correctly on Vercel.

Goals:

- Ensure routing works by guaranteeing either /app/page.tsx (App Router) or /pages/index.tsx (Pages Router).
- Remove or fix any rewrites/redirects/basePath/middleware that cause global 404s.
- If both app/ and pages/ exist, prefer app/ and migrate pages to app/; delete unused router folders.
- Eliminate all references to process.env.NEXT_PUBLIC_BACKEND_URL unless we truly have a separate backend; prefer /api/... routes instead.
- Ensure next.config.js is minimal and valid; configure images.remotePatterns for all real external hosts.
- Fix all TypeScript errors and broken imports; ensure every page/component has a valid default export.
- Make sure only NEXT_PUBLIC_* vars are used on the client; move secret keys to server-only (API routes or server components).
- After changes, npm run build must succeed locally; npm start must render the home route without 404.
*/

## Copilot Finalization Block

/*
Copilot: finalize single-app Next.js setup for Vercel.

- Delete frontend/next.config.ts; keep frontend/next.config.js only.
- Consolidate router: keep either /src/app or /app (prefer /src/app); move pages and delete the other.
- Guarantee a working root route: ensure /src/app/page.tsx exists and renders.
- Remove all references to process.env.NEXT_PUBLIC_BACKEND_URL; replace client fetches with relative /api/... calls.
- Move any needed logic from the old /backend into /src/app/api/`<route>`/route.ts and ensure server-only secrets are used there.
- Ensure images.remotePatterns in next.config.js match actual external image hosts.
- Verify environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on client; server-only secrets without NEXT_PUBLIC_ in API routes.
- Ensure `pnpm run build` succeeds locally, then deploy with Vercel Root Directory = frontend.
*/
