# Open Overview Home Portal Design

**Status:** Approved by Ivan on 2026-07-17

## Context

Open Overview is deployed at `/web/open-overview/`, but the SD Forest homepage
does not expose it. The homepage currently presents fifteen projects through a
three-column portal lattice. Each standard `.portal` node is discovered by the
inline homepage controller for serpentine reveal and preview-stage selection.
Its named hologram is registered separately in the existing shared Three.js
tile engine. That registry currently contains the fifteen existing project
keys, so `open-overview` must be added explicitly to receive a matching 3D
identity.

## Goals

- Make Open Overview discoverable from the SD Forest homepage.
- Make the entry indistinguishable in structure and interaction from the
  existing project portals.
- Describe the currently deployed evidence honestly as a public snapshot.
- Preserve the current homepage animation architecture and responsive layout.

## Non-goals

- Do not change Open Overview data collection, fixture policy, or live-data
  credentials.
- Do not redesign the homepage grid or introduce a second animation engine.
- Do not alter the Open Overview subpages.
- Do not change the behavior or destination of any existing portal.

## Homepage Placement and Content

Add Open Overview as the sixteenth standard portal immediately after
“Library & Platforms.” The board kicker changes from `15 nodes` to `16 nodes`.
The existing three-column desktop grid remains unchanged; the added item does
not span columns or receive a unique card size.

The portal contract is:

- Project key: `open-overview`
- Title: `Open Overview`
- Metadata: `AI ecosystem radar`
- Status: `Public snapshot`
- Destination: `/web/open-overview/index.html`
- Primary accent: `#73e9ff`, the Open Overview cyan-teal
- Secondary icon accent: `#a9b2ff`, the Open Overview violet
- Description: `Compare OpenRouter models and apps with GitHub AI ecosystems
  through ten-deep rankings, observed relationships, lifecycle signals, and
  clearly labeled source evidence.`

The status must not say “Live” while production is displaying the labeled
deterministic snapshot.

## Icon and Motion

Add one inline SVG symbol to the homepage definition block. Its geometry is a
small matrix/network: bounded outer structure, linked nodes, and a central
evidence point. It uses the same `icon-ring`, `icon-line`, and `icon-fill`
classes as every existing symbol. A narrowly scoped secondary-fill treatment
uses the portal's violet custom property.

Extend the existing `web/shared/forest-three/tiles.js` registry with an
`open-overview` builder. The tile is a cross-source evidence matrix: OpenRouter
and GitHub node columns, animated links between them, and a pulsing central
evidence marker. The builder uses the portal's cyan-teal primary accent and
violet secondary accent. This is an extension of the active shared Three.js
runtime, not a new engine, dependency, script, or standalone animation loop.

Because the card uses the standard `.portal` structure and a registered tile
builder, the existing engines provide all motion:

- serpentine scroll reveal and card assembly;
- the existing SVG icon idle/alive treatment;
- a named Three.js matrix hologram on pointer, keyboard focus, and touch
  selection;
- preview glyph cloning and accent propagation;
- static, fully visible presentation under reduced motion;
- lightweight behavior for coarse pointers and compact viewports.

The inline homepage controller already derives card count and preview indices
from the DOM, so it requires no Open Overview-specific branch. Only the shared
Three.js tile registry receives the new named builder.

## Accessibility and Navigation

The entry remains a real `button` with `aria-pressed="false"`, matching the
existing two-step card-selection interaction. Pointer hover and keyboard focus
must populate the preview with “Open Overview,” “Public snapshot,” its
description, and an internal “Enter project” link. The destination opens in the
same tab. Reduced-motion users receive the same content and navigation without
animated loops.

## Verification

Update static and browser tests to assert:

- the homepage exposes exactly sixteen portals and reports `16 nodes`;
- exactly one portal has `data-project="open-overview"`;
- its title, metadata, truthful status, description, SVG symbol, and internal
  destination are correct;
- the shared Three.js registry creates an `open-overview` tile using both
  approved accent colors;
- focus/selection updates the preview and exposes the working destination;
- existing shared homepage animation assets remain in place;
- desktop, mobile, coarse-pointer, and reduced-motion homepage behavior still
  pass;
- every live internal portal, including Open Overview, resolves in the built
  Vercel artifact.

The previous Open Overview test that prohibited every homepage change must be
replaced with an explicit integration contract. It should continue guarding
route isolation and shared animation presence without rejecting this approved
homepage entry.

## Release

Run the relevant Node suites, homepage browser smoke tests, Open Overview
Chromium acceptance, the static production build, and `git diff --check`.
Publish through a pull request into `main`, require a green Vercel preview, then
verify the production homepage portal, preview interaction, destination, and
unchanged homepage animation behavior on `sdforest.site`.
