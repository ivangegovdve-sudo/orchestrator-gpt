// Vercel serverless proxy — forwards all /api/library/* requests to KVM2 library API
// Keeps browser from hitting HTTP directly (mixed-content block)

const KVM2_BASE = "http://187.127.86.176:8765";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // Build target URL from path segments
  const pathSegments = req.query.path || [];
  const subpath = Array.isArray(pathSegments) ? pathSegments.join("/") : pathSegments;
  const qs = new URLSearchParams(
    Object.entries(req.query).filter(([k]) => k !== "path")
  ).toString();
  const target = `${KVM2_BASE}/${subpath}${qs ? "?" + qs : ""}`;

  // Forward relevant headers
  const headers = { "Content-Type": "application/json" };
  if (req.headers.authorization) {
    headers["Authorization"] = req.headers.authorization;
  }

  const fetchOpts = {
    method: req.method,
    headers,
  };

  if (req.method === "POST" && req.body) {
    fetchOpts.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(target, fetchOpts);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Library API unreachable", detail: err.message });
  }
}
