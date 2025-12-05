import base64
import datetime
import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
GENERATED_DIR = REPO_ROOT / "data" / "generated_images"


def _json_response(handler: SimpleHTTPRequestHandler, status: int, payload: dict) -> None:
    data = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


class OrchestratorHandler(SimpleHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802 (uppercase required by protocol)
        if self.path != "/api/save_image":
            self.send_error(404, "Not Found")
            return

        content_length = int(self.headers.get("Content-Length", "0") or 0)
        try:
            raw_body = self.rfile.read(content_length)
            payload = json.loads(raw_body)
            image_data = payload.get("image_data")
            seed = payload.get("seed")
            steps = payload.get("steps")
            sampler = payload.get("sampler")

            if not image_data:
                _json_response(self, 400, {"status": "error", "message": "Missing image_data"})
                return

            GENERATED_DIR.mkdir(parents=True, exist_ok=True)

            try:
                png_bytes = base64.b64decode(image_data)
            except Exception as exc:  # pragma: no cover - defensive
                _json_response(self, 400, {"status": "error", "message": f"Invalid base64 image data: {exc}"})
                return

            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            seed_part = seed if seed is not None else "RND"
            filename = f"generated_{timestamp}_seed{seed_part}.png"
            filepath = GENERATED_DIR / filename

            with open(filepath, "wb") as f:
                f.write(png_bytes)

            response = {
                "status": "ok",
                "filename": filename,
                "path": f"data/generated_images/{filename}",
                "url": f"/data/generated_images/{filename}",
                "meta": {"seed": seed, "steps": steps, "sampler": sampler},
            }
            _json_response(self, 200, response)
        except json.JSONDecodeError:
            _json_response(self, 400, {"status": "error", "message": "Invalid JSON body"})
        except Exception as exc:  # pragma: no cover - defensive
            _json_response(self, 500, {"status": "error", "message": str(exc)})


def run(port: int) -> None:
    os.chdir(REPO_ROOT)
    handler_cls = OrchestratorHandler
    server = HTTPServer(("", port), handler_cls)
    print(f"Serving Orchestrator HTTP on http://localhost:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    port_arg = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run(port_arg)
