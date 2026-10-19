# Kids’ Library design preview

This is the approved interactive Kids’ Library route, available at `/web/kids-library-preview/`. Its movie shelf contains 63 titles with an Iris verification ledger in `src/researchVerification.js`. The prior Cool Kids Animation Filmography remains only as an untrusted candidate seed; active title/year/director/studio fields come from the Iris ledger, and flagged or unverified fields stay labeled. The book shelf is intentionally empty pending its own curation. Every movie has a generated turned-away image; the three initial samples are retained as approved references. Official poster targets remain separate from the generated catalog artwork and require licensing review before public launch.

The search, age and theme filters, movie selection, country lookup, watched state, turned-away-to-poster flip, and separate Movies and Books controls are usable. Availability opens a country-specific JustWatch search; the route does not claim a particular service carries a film. Country choices are limited to the 18 shown in the prototype. Research audience profiles and editorial parent notes remain explicitly separated from official ratings.

To rebuild the checked-in, static preview from this directory:

```sh
npm ci
npm run build:preview
npm run test:library
```

`build:preview` replaces the generated contents of `web/kids-library-preview/`. The repository's normal static build then copies that directory into the site output. The Vite base and artwork paths are deliberately scoped to that route. `npm run build` and `npm run test:sites` retain the original Sites packaging scaffolding and test its output files and worker behavior; standalone Sites hosting at this nested base has not been verified.

Licenses for the bundled fonts, icons, and React runtime are included in `public/licenses/` and copied with the preview.
