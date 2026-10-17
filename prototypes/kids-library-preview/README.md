# Kids’ Library design preview

This is the approved interactive design preview, available at `/web/kids-library-preview/`. It contains three films from the **Cool Kids Animation Filmography** research: *My Neighbor Totoro* (Studio Ghibli), *The Iron Giant* (American animation), and *Ernest & Celestine* (European animation). The book shelf is intentionally empty pending its own curation. This preview is not the completed research-backed catalog, and it does not replace either existing movie-library route.

The search, age and theme filters, movie selection, country lookup, and separate Movies and Books controls are usable. Availability opens a country-specific JustWatch search; the preview does not claim a particular service carries a film. Country choices are limited to the 18 shown in the prototype.

To rebuild the checked-in, static preview from this directory:

```sh
npm ci
npm run build:preview
npm run test:library
```

`build:preview` replaces the generated contents of `web/kids-library-preview/`. The repository's normal static build then copies that directory into the site output. The Vite base and artwork paths are deliberately scoped to that route. `npm run build` and `npm run test:sites` retain the original Sites packaging scaffolding and test its output files and worker behavior; standalone Sites hosting at this nested base has not been verified.

Licenses for the bundled fonts, icons, and React runtime are included in `public/licenses/` and copied with the preview.
