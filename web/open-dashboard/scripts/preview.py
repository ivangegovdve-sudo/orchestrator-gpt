"""Local static preview with a fixed, read-only public API proxy. No credentials.
Run from repository root: python web/open-dashboard/scripts/preview.py
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit
import json
import re

ROOT = Path(__file__).resolve().parents[3]
PREFIX = '/__open_dashboard_api/'
UPSTREAM = 'https://openrouter-github-dashboard.vercel.app/api/public/v2/'
ALLOWED = re.compile(r'^(live-models|models|providers|apps|history|benchmarks|price-changes|deprecations|source-status|app-model-matrix|github/(repositories|rankings))$')

class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed = urlsplit(self.path)
        if not parsed.path.startswith(PREFIX):
            return super().do_GET()
        suffix = parsed.path[len(PREFIX):]
        if not ALLOWED.fullmatch(suffix) or len(parsed.query) > 5000:
            self.send_error(400, 'Unsupported preview route')
            return
        try:
            target = UPSTREAM + suffix + ('?' + parsed.query if parsed.query else '')
            with urlopen(Request(target, headers={'Accept': 'application/json'}), timeout=30) as response:
                data = response.read(20_000_001)
                if len(data) > 20_000_000:
                    raise ValueError('Response exceeds preview bound')
                json.loads(data)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception:
            self.send_error(502, 'Public source unavailable')

if __name__ == '__main__':
    print('Open Dashboard preview: http://127.0.0.1:4174/web/open-dashboard/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 4174), Preview).serve_forever()
