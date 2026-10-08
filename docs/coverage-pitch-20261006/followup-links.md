# Trending and personal links

The public landing mentions GitHub trending as a secondary capability and links
to `/web/open-dashboard/github/#trending`. Personal links live on that subpage.
They are ordinary navigation cards, separate from the curated activity rankings;
no repository was inserted into a ranking or snapshot.

| Link | Verified destination and evidence |
| --- | --- |
| Live GitHub trending | `https://openrouter-github-dashboard.vercel.app/trending` returned HTTP 200. The existing Next route publishes its source and collection time and supports daily, weekly and monthly views. |
| Direct GitHub source | `https://github.com/trending`, also linked when the dashboard is unavailable. |
| Ivan's GitHub profile | `https://github.com/ivangegovdve-sudo`, verified through the public GitHub user API. |
| Repo Shelf source | `https://github.com/ivangegovdve-sudo/repo-shelf`, verified through GitHub repository metadata and its README. The README attributes the original bookshelf application to BkashJEE. |
| Published 3D library | `https://ivangegovdve-sudo.github.io/repo-shelf/` returned HTTP 200 and the title “Ivan's 3D repository library.” GitHub's Pages API reports this URL as built. |

The source repository and the GitHub Pages library are the same Repo Shelf
project. No separate personal website was inferred: the account's root Pages
URL returned 404 and the account profile publishes no website.

Research checked 2026-10-06. Existing chart data, category momentum calculations,
and JavaScript loaders are unchanged.

Browser verification checked all five destinations using the page's native
links without loading the project JavaScript. The subpage has no horizontal
overflow at 1440, 740, 390 or 320 pixels. The new sections use the existing plum
and paper palette; their external-link arrows are SVG to avoid font glyph gaps.

- [Trending navigation](./github-trending-links.png)
- [Personal library links](./github-personal-links.png)
