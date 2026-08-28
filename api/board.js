"use strict";
// Fleet coordination board — proxies the snapshot branch of this repo.
//
// WHERE THE DATA COMES FROM, AND WHY NOT FROM THE BUILD
// ----------------------------------------------------
// The board is generated on Ivan's machine by reconcile.ps1 every ~15 minutes. It cannot
// be baked into the site build, because a build only happens when someone pushes: the page
// would be accurate at deploy time and wrong forever after, which is the exact problem
// this deployment exists to solve.
//
// Nor can the snapshot be committed to `main` on that cadence — every push to main is a
// production deploy, and ~96 of those a day would be both wasteful and disruptive. So
// reconcile.ps1 force-pushes the snapshot to an orphan branch (BRANCH below), which
// carries no site code and is excluded from deployment in vercel.json. Publishing the
// board therefore never rebuilds the site.
//
// WHY A PROXY RATHER THAN FETCHING raw.githubusercontent FROM THE PAGE
// --------------------------------------------------------------------
// Same reasoning as api/fleet/status.js, which does this for the Oracle host. It keeps the
// request same-origin (no CORS dependency on a third party), and it lets the cache window
// be set here rather than inherited from GitHub's ~5 minute default — a 15-minute board
// behind a 5-minute cache can read as 20 minutes old for no reason.
//
// This endpoint is READ-ONLY and public. It can only ever return the two files named in
// FILES, from one branch of one public repo, so it cannot be turned into a general fetch
// proxy by anything a caller sends.

const OWNER = "ivangegovdve-sudo";
const REPO = "orchestrator-gpt";
const BRANCH = "board-live";
const TIMEOUT_MS = 10000;

// An allowlist rather than a path parameter. `file` is attacker-controlled input, and the
// difference between a lookup in this object and interpolating it into a URL is the
// difference between an endpoint and an open redirect.
const FILES = {
  html: { path: "board.html", type: "text/html; charset=utf-8" },
  state: { path: "state.json", type: "application/json; charset=utf-8" },
};

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requested = String(req.query?.file ?? "state");
  const target = Object.prototype.hasOwnProperty.call(FILES, requested) ? FILES[requested] : null;
  if (!target) {
    return res.status(400).json({ error: `Unknown file. Expected one of: ${Object.keys(FILES).join(", ")}` });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(
      `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${target.path}`,
      { signal: controller.signal, headers: { "User-Agent": "sdforest-board" } },
    );
    // A 404 here is the meaningful case: the snapshot branch does not exist yet, or the
    // publisher has never run. Said plainly rather than as a generic upstream failure,
    // because the two call for completely different fixes.
    if (upstream.status === 404) {
      return res.status(404).json({
        error: "No board snapshot has been published yet.",
        detail: `${BRANCH} branch has no ${target.path}. reconcile.ps1 publishes it every ~15 minutes.`,
      });
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: `Upstream returned ${upstream.status}` });
    }
    const body = await upstream.text();

    // 60s at the edge. The board regenerates every ~15 minutes, so this is short enough to
    // be invisible against that cadence and long enough that a page left open all day does
    // not hammer GitHub. `stale-while-revalidate` keeps a left-open tab responsive across
    // the refresh rather than showing it a spinner.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");
    res.setHeader("Content-Type", target.type);
    res.setHeader("Access-Control-Allow-Origin", "*");
    // The board is an operations view, not a project page. Keeping it out of indexes is
    // the difference between unlisted and published.
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    return res.status(200).send(body);
  } catch (e) {
    return res.status(502).json({ error: "Board snapshot unreachable", detail: e.message });
  } finally {
    clearTimeout(timer);
  }
};
