# Long-Term Memory

Use this file as a staging area for externally sourced findings before they are promoted into stable memory.

## new_learnings
<!-- research-scout:new_learnings:start -->
- 2026-04-04T00:00:00+03:00 | https://vercel.com/docs/routing/rewrites | Vercel rewrites can proxy /api/:path* to an external FastAPI origin without changing the browser URL; external-origin rewrites are uncached unless x-vercel-enable-rewrite-caching is added, which is the concrete same-origin fix path for the repo’s split static/API deployment.
- 2026-04-04T00:00:00+03:00 | https://expo.dev/changelog/sdk-55 | Expo SDK 55 keeps store-distributed Expo Go on SDK 54 during the transition and removes Legacy Architecture support, so the Voice Project Dashboard should document development builds as the default workflow instead of implying Expo Go is the normal path.
- 2026-04-04T00:00:00+03:00 | https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/ | Expo SQLite on SDK 55 now includes a zero-setup browser inspector plus db.sql tagged queries with automatic parameter binding/type inference, which is a better default for debugging and persistence work in the Expo app than ad hoc logging or raw exec strings.
- 2026-04-04T02:33:56.2417417+03:00 | https://vercel.com/docs/rewrites | Vercel docs now treat external-rewrite CDN caching as first-class via CDN-Cache-Control or vercel.json headers and position x-vercel-enable-rewrite-caching as fallback-only, superseding the earlier uncached-by-default guidance for the repo's /api proxy plan.
- 2026-04-04T04:36:18.3008188+03:00 | https://vercel.com/docs/frameworks/backend/fastapi | Vercel’s FastAPI runtime serves static assets from public/**, so this repo’s current root index.html plus web/** layout still needs either a public-dir reshuffle or split projects with rewrites rather than expecting one zero-config FastAPI deploy to host the whole hub.
- 2026-04-04T04:36:18.3008188+03:00 | https://vercel.com/guides/how-to-configure-the-cache-control-response-header-in-vercel-projects | Vercel CDN now honors targeted cache headers for newer projects, so any /api external rewrite on sdforest.site needs explicit Cache-Control/CDN-Cache-Control policy instead of assuming proxy responses stay uncached.
<!-- research-scout:new_learnings:end -->

## promotion_log
<!-- research-scout:promotion_log:start -->
_No promotions yet._
<!-- research-scout:promotion_log:end -->
