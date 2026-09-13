# Site feedback

Status: implementation in progress; production is not yet verified.

## Delivery contract

- Cover every shipped SDForest HTML page with one small, always-available control.
- Capture the originating page automatically without sending URL query strings or fragments.
- Send directly to the first-party contrib gateway as `app_id: sdforest`; do not use a third-party form or tracker.
- Preserve feedback type, content, page context, and the gateway receipt.
- Make submissions visible through the authenticated contrib admin feedback queue.
- Treat local tests, a static build, and production deployment/read-back as separate gates.

## Acceptance evidence still required

- Source inventory proves every shipped HTML page loads the same cache-busted widget.
- Browser test proves success, failure, keyboard/focus, privacy, and payload behavior.
- Gateway test proves a submitted item is returned by the admin queue with its page provenance.
- Production test submits a labeled canary from `sdforest.site` and reads the same receipt from the admin queue.
