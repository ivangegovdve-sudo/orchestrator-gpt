#!/usr/bin/env python3
"""scroll-world-fal — fal.ai asset pipeline for scroll-scrubbed "fly through the world" heroes.

Adapts the scroll-world skill's Higgsfield pipeline to fal.ai:
  images  : fal-ai/flux/schnell                                (~$0.003/image)
  video   : fal-ai/kling-video/v2.1/standard/image-to-video    (~$0.145 / 5s clip)

Kling *standard* has no tail_image_url (end-frame lock), so instead of the skill's
architecture B (parallel dives + end-locked connectors) this runs a SEQUENTIAL CHAIN
(architecture A applied to the dive/connector alternation): every leg's start image is
the previous leg's actual extracted last frame, so every seam is frame-identical with
start-image conditioning alone. Legs cannot be parallelized — that is the trade-off.

Usage:
  set FAL_KEY, then
  uv run --with fal-client python scripts/scroll-world-fal.py <config.json> [phase]
  phase: stills | chain | encode | all (default)

Re-roll a bad leg: delete its mp4 from the workdir and run the chain phase again —
every phase skips outputs that already exist (idempotent resume). Deleting leg k
does NOT invalidate leg k+1's seam as long as you also delete every later leg you
want re-chained; a re-rolled leg k with surviving leg k+1 will pop at that seam.

Config (JSON):
{
  "name": "my-world",
  "workdir": "path for raw sources/frames (NOT committed)",
  "assets_dir": "web/<page>/assets  (committed; stills + vid/ go here)",
  "budget_usd": 5.0,
  "rates": { "image": 0.003, "clip": 0.145 },
  "image_model": "fal-ai/flux/schnell",
  "video_model": "fal-ai/kling-video/v2.1/standard/image-to-video",
  "image_size": "landscape_16_9",
  "clip_duration": "5",
  "style": "<style preamble, identical in every still prompt>",
  "negative": "<negative prompt for video legs>",
  "scenes":     [ { "id": "...", "still": "...", "motion": "..." }, ... ],
  "connectors": [ "<transit prompt scene0->1>", ... ]        // length = scenes-1
}
"""
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

# --- cost ledger ------------------------------------------------------------
class Ledger:
    def __init__(self, path, budget, rates):
        self.path, self.budget, self.rates = path, budget, rates
        self.items = json.loads(path.read_text()) if path.exists() else []

    @property
    def spent(self):
        return sum(i["usd"] for i in self.items)

    def charge(self, kind, label):
        cost = self.rates[kind]
        if self.spent + cost > self.budget:
            sys.exit(f"BUDGET STOP: {label} would cost ${cost:.3f}, "
                     f"spent ${self.spent:.3f} of ${self.budget:.2f} cap. Aborting.")
        self.items.append({"kind": kind, "label": label, "usd": cost, "ts": time.strftime("%Y-%m-%d %H:%M:%S")})
        self.path.write_text(json.dumps(self.items, indent=1))
        print(f"  [cost] {label}: +${cost:.3f}  (total ${self.spent:.3f} / ${self.budget:.2f})", flush=True)


def download(url, dest):
    urllib.request.urlretrieve(url, dest)
    print(f"  saved {dest} ({dest.stat().st_size // 1024} KB)", flush=True)


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def extract_last_frame(mp4, png):
    # -sseof -0.15: a hair before EOF so we never land on a black/partial final frame
    ffmpeg("-sseof", "-0.15", "-i", str(mp4), "-frames:v", "1", "-q:v", "2", str(png))


def extract_first_frame(mp4, png):
    ffmpeg("-ss", "0", "-i", str(mp4), "-frames:v", "1", "-q:v", "2", str(png))


def main():
    import fal_client  # deferred so --help style failures don't need the dep

    cfg_path = Path(sys.argv[1])
    phase = sys.argv[2] if len(sys.argv) > 2 else "all"
    cfg = json.loads(cfg_path.read_text())
    root = cfg_path.resolve().parent.parent  # repo root (configs live in scripts/…)
    work = (root / cfg["workdir"]).resolve() if not Path(cfg["workdir"]).is_absolute() else Path(cfg["workdir"])
    assets = (root / cfg["assets_dir"]).resolve()
    (assets / "vid").mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)
    if not os.environ.get("FAL_KEY"):
        sys.exit("FAL_KEY env var is not set")

    scenes = cfg["scenes"]
    conns = cfg["connectors"]
    assert len(conns) == len(scenes) - 1, "connectors must be scenes-1"
    ledger = Ledger(work / "cost-log.json", cfg["budget_usd"], cfg["rates"])

    def gen_image(prompt, dest):
        res = fal_client.subscribe(cfg["image_model"], arguments={
            "prompt": prompt, "image_size": cfg.get("image_size", "landscape_16_9"),
            "num_images": 1, "output_format": "png"})
        ledger.charge("image", dest.name)
        download(res["images"][0]["url"], dest)

    def gen_clip(prompt, start_png, dest):
        url = fal_client.upload_file(str(start_png))
        res = fal_client.subscribe(cfg["video_model"], arguments={
            "prompt": prompt, "image_url": url,
            "duration": cfg.get("clip_duration", "5"),
            "negative_prompt": cfg.get("negative", "blur, distort, low quality, text, letters, watermark"),
            "cfg_scale": 0.5})
        ledger.charge("clip", dest.name)
        download(res["video"]["url"], dest)

    # --- phase: stills --------------------------------------------------------
    if phase in ("stills", "all"):
        print("== stills ==", flush=True)
        for s in scenes:
            dest = work / f"still_{s['id']}.png"
            if dest.exists():
                print(f"  skip {dest.name} (exists)", flush=True)
                continue
            print(f"  gen still {s['id']}", flush=True)
            gen_image(f"{cfg['style']} {s['still']}", dest)

    # --- phase: chain (sequential — each leg starts on the previous leg's last frame)
    # Leg order: dive_0, conn_0, dive_1, conn_1, … dive_{N-1}
    legs = []
    for i, s in enumerate(scenes):
        legs.append(("dive", s["id"], s["motion"]))
        if i < len(conns):
            legs.append(("conn", f"{i}", conns[i]))
    if phase in ("chain", "all"):
        print("== video chain (sequential, frame-locked seams) ==", flush=True)
        prev_mp4 = None
        for kind, name, prompt in legs:
            dest = work / f"{kind}_{name}.mp4"
            if dest.exists():
                print(f"  skip {dest.name} (exists)", flush=True)
                prev_mp4 = dest
                continue
            if prev_mp4 is None:
                start = work / f"still_{scenes[0]['id']}.png"
            else:
                start = work / f"handoff_{dest.stem}.png"
                extract_last_frame(prev_mp4, start)
            print(f"  gen {dest.name}  (start: {start.name})", flush=True)
            for attempt in range(3):
                try:
                    gen_clip(prompt, start, dest)
                    break
                except Exception as e:  # transient queue/moderation errors: re-roll
                    print(f"  attempt {attempt + 1} failed: {e}", flush=True)
                    if attempt == 2:
                        raise
                    time.sleep(10)
            prev_mp4 = dest

    # --- phase: encode --------------------------------------------------------
    if phase in ("encode", "all"):
        print("== encode (native res, crf20, GOP 8, faststart) ==", flush=True)
        for kind, name, _ in legs:
            src = work / f"{kind}_{name}.mp4"
            out = assets / "vid" / (f"{name}.mp4" if kind == "dive" else f"conn{int(name) + 1}.mp4")
            ffmpeg("-i", str(src), "-an", "-vf", "unsharp=5:5:0.8:5:5:0.0",
                   "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
                   "-g", "8", "-keyint_min", "8", "-sc_threshold", "0",
                   "-movflags", "+faststart", str(out))
            print(f"  enc {out.name} ({out.stat().st_size // 1024} KB)", flush=True)
        # Posters = each scene clip's ACTUAL first frame (not the flux still), so the
        # poster->video takeover is invisible. Encoded as webp straight from ffmpeg.
        for s in scenes:
            frame = work / f"poster_{s['id']}.png"
            extract_first_frame(work / f"dive_{s['id']}.mp4", frame)
            ffmpeg("-i", str(frame), "-vf", "scale=1600:-2", "-quality", "82",
                   str(assets / f"{s['id']}.webp"))
            print(f"  poster {s['id']}.webp", flush=True)

    print(f"DONE. Total spent: ${ledger.spent:.3f} of ${cfg['budget_usd']:.2f} "
          f"(rates are estimates — verify on the fal.ai dashboard)", flush=True)


if __name__ == "__main__":
    main()
