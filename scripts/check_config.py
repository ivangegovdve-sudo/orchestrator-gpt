import json
from pathlib import Path

config_path = Path("config/runware-item-icons.json")
data = json.loads(config_path.read_text(encoding="utf-8"))

for key in ["runwareApiUrl", "defaults", "schema"]:
    if key not in data:
        raise SystemExit(f"Missing top-level key in config: {key}")

defaults = data["defaults"]
for key in ["prompts", "baseModel"]:
    if key not in defaults:
        raise SystemExit(f"Missing defaults key: {key}")

schema = data["schema"]
for key in ["rarities", "elements", "biomes", "styles", "categories", "loraPacks"]:
    if key not in schema:
        raise SystemExit(f"Missing schema key: {key}")

print("Config OK")
