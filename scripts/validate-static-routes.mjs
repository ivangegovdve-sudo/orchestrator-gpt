import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { discoverCopiedHtmlRoutes, validateRouteRegistry } from './static-route-registry.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { redirects = [] } = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const issues = validateRouteRegistry({
  discoveredHtmlRoutes: discoverCopiedHtmlRoutes(root),
  vercelRedirects: redirects,
});

for (const { message } of issues) process.stderr.write(`${message}\n`);
if (issues.length) process.exitCode = 1;
