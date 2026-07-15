import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] || "vercel-public");
const port = Number(process.argv[3] || 4173);
const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".mjs": "text/javascript; charset=utf-8" };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1"); let relative = decodeURIComponent(url.pathname); if (relative.endsWith("/")) relative += "index.html";
    const file = path.resolve(root, `.${relative}`); if (file !== root && !file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end("Forbidden"); return; }
    const info = await stat(file); const resolved = info.isDirectory() ? path.join(file, "index.html") : file;
    response.writeHead(200, { "Content-Type": types[path.extname(resolved)] || "application/octet-stream", "Cache-Control": "no-store" }); createReadStream(resolved).pipe(response);
  } catch { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); response.end("Not found"); }
});
server.listen(port, "127.0.0.1", () => process.stdout.write(`Open Overview static server listening on ${port}\n`));
