The findings logged against PR #445 concern unverified scripts (`scripts/refresh-free-roster.mjs`, `scripts/validate-free-roster.mjs`), which are not part of this PR. This PR solely introduces the Rubik's Teacher PWA (`web/rubiks-teacher`) and correctly sets up origin-wide Service Workers isolation to avoid destroying existing caches (like `chloe-pwa`).

The changes correctly fix cache conflict problems and pass all tests including `scratch/tests/pwa-service-workers.test.js`. Rebased onto `main` to bring in 36 additional commits cleanly.

```text
TAP version 13
# Subtest: activate deletes only Cubeflow caches and spares the other PWA
ok 1 - activate deletes only Cubeflow caches and spares the other PWA
# Subtest: the other PWA reciprocates: Chloé spares Cubeflow
ok 2 - the other PWA reciprocates: Chloé spares Cubeflow
# Subtest: install precaches the content-hashed entry assets named by index.html
ok 3 - install precaches the content-hashed entry assets named by index.html
# Subtest: install FAILS CLOSED when an asset cannot be fetched
ok 4 - install FAILS CLOSED when an asset cannot be fetched
# Subtest: install fails closed when index.html cannot be read
ok 5 - install fails closed when index.html cannot be read
1..5
# tests 5
# pass 5
```
