#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Stable Diffusion Inventory Snapshot for Ivan's setup.

Scans:
  C:\\Ivan\\_StableDiffusion\\stable-diffusion-webui\\

Writes:
  C:\\Ivan\\_StableDiffusion\\orchestrator-gpt\\data\\sd_inventory.json
  C:\\Ivan\\_StableDiffusion\\orchestrator-gpt\\docs\\sd_inventory.md

Then:
  - If those files changed: git add + commit + push.
  - If they didn't: skip git commit.

The script prints a final SUMMARY line and exits with:
  - code 0 on success (whether changes were committed or not),
  - non-zero on actual errors.
"""

import os
import json
import subprocess
import sys
from datetime import datetime

# ----- CONFIG (hardcoded for this machine) -----
SD_ROOT = r"C:\Ivan\_StableDiffusion\stable-diffusion-webui"
REPO_ROOT = r"C:\Ivan\_StableDiffusion\orchestrator-gpt"

JSON_PATH = os.path.join(REPO_ROOT, "data", "sd_inventory.json")
MD_PATH = os.path.join(REPO_ROOT, "docs", "sd_inventory.md")
# ------------------------------------------------


def categorize_file(rel_path, ext_lower):
    """Return a category string for the file, or None."""
    p = rel_path.replace("\\", "/").lower()

    # Checkpoints / base models
    if p.startswith("models/stable-diffusion/") and ext_lower in (".safetensors", ".ckpt", ".pt", ".bin"):
        return "checkpoints"

    # LoRAs
    if p.startswith("models/lora/") and ext_lower in (".safetensors", ".pt"):
        return "loras"

    # Embeddings (A1111 default folder)
    if p.startswith("embeddings/") and ext_lower in (".pt", ".bin", ".png"):
        return "embeddings"

    # ControlNet / adapters
    if "controlnet" in p and ext_lower in (".safetensors", ".pt", ".pth"):
        return "controlnet"

    # Animatediff / motion models
    if "animatediff" in p and ext_lower in (".safetensors", ".ckpt", ".pt"):
        return "animatediff"

    # Upscalers / ESRGAN etc.
    if p.startswith("models/esrgan/") or p.startswith("models/realesrgan/"):
        return "upscalers"

    # Other models that don't fit above
    if p.startswith("models/"):
        return "other_models"

    # Extensions
    if p.startswith("extensions/"):
        return "extensions"

    return None


def scan_sd_tree():
    print(f"Scanning SD root: {SD_ROOT}")
    if not os.path.isdir(SD_ROOT):
        raise RuntimeError(f"SD root does not exist: {SD_ROOT}")

    all_files = []
    all_dirs = []

    total_size_bytes = 0
    total_files = 0
    total_dirs = 0
    max_mtime = 0.0

    # Top-level stats
    top_level_stats = {}  # name -> {subdirs: set(), files: int}

    # Extensions summary
    extension_dirs = set()
    extension_file_counts = {}

    for dirpath, dirnames, filenames in os.walk(SD_ROOT):
        rel_dir = os.path.relpath(dirpath, SD_ROOT)
        if rel_dir == ".":
            rel_dir = ""

        # Directory accounting
        total_dirs += 1
        all_dirs.append({
            "rel_path": rel_dir.replace("\\", "/") if rel_dir else "."
        })

        # Top-level directory stats
        if rel_dir:
            parts = rel_dir.split(os.sep)
            top = parts[0]
            entry = top_level_stats.setdefault(top, {"subdirs": set(), "files": 0})

            if len(parts) > 1:
                entry["subdirs"].add(rel_dir)

            # Extension root directories (extensions\name)
            parent_rel = os.path.dirname(rel_dir)
            if parent_rel == "extensions":
                ext_name = os.path.basename(rel_dir)
                extension_dirs.add(ext_name)

        # Files in this directory
        for filename in filenames:
            rel_file = os.path.join(rel_dir, filename) if rel_dir else filename
            full_path = os.path.join(SD_ROOT, rel_file)
            try:
                size = os.path.getsize(full_path)
                mtime = os.path.getmtime(full_path)
            except OSError:
                # Skip files that cannot be accessed
                continue

            total_files += 1
            total_size_bytes += size
            if mtime > max_mtime:
                max_mtime = mtime

            ext = os.path.splitext(filename)[1].lower()
            rel_file_norm = rel_file.replace("\\", "/")

            file_entry = {
                "rel_path": rel_file_norm,
                "name": filename,
                "ext": ext,
                "size_bytes": size,
                "modified_ts": int(mtime),
            }
            all_files.append(file_entry)

            # Per-top-level file counts
            parts_for_file = rel_file_norm.split("/")
            if parts_for_file:
                top_for_file = parts_for_file[0]
                t_entry = top_level_stats.setdefault(top_for_file, {"subdirs": set(), "files": 0})
                t_entry["files"] += 1

            # Extension file counts
            if rel_file_norm.lower().startswith("extensions/") and len(parts_for_file) >= 2:
                ext_name = parts_for_file[1]
                extension_file_counts[ext_name] = extension_file_counts.get(ext_name, 0) + 1

    if max_mtime == 0.0:
        # Empty tree? Fallback to now, but this should only happen in weird cases.
        inventory_last_modified = datetime.now().isoformat(timespec="seconds")
    else:
        inventory_last_modified = datetime.fromtimestamp(max_mtime).isoformat(timespec="seconds")

    # Build top-level dirs summary
    top_level_dirs = []
    for name in sorted(top_level_stats.keys()):
        data = top_level_stats[name]
        top_level_dirs.append({
            "name": name,
            "num_subdirs": len(data["subdirs"]),
            "num_files": data["files"],
        })

    # Categorize files
    categories = {
        "checkpoints": [],
        "loras": [],
        "embeddings": [],
        "controlnet": [],
        "animatediff": [],
        "upscalers": [],
        "other_models": [],
        "extensions": [],
        "uncategorized": [],
    }

    for f in all_files:
        cat = categorize_file(f["rel_path"], f["ext"])
        if cat is None:
            categories["uncategorized"].append(f)
        else:
            categories[cat].append(f)

    summary = {
        "schema": "sd-inventory-ivan-v1",
        "sd_root": SD_ROOT,
        "inventory_for_tree_last_modified": inventory_last_modified,
        "total_files": total_files,
        "total_dirs": total_dirs,
        "total_size_bytes": total_size_bytes,
        "top_level_dirs": top_level_dirs,
        "categories_counts": {
            k: len(v) for k, v in categories.items()
        },
        "extension_summary": {
            "names": sorted(extension_dirs),
            "file_counts": dict(sorted(extension_file_counts.items())),
        },
    }

    inventory = {
        "summary": summary,
        "categories": categories,
        "all_files": all_files,
        "all_dirs": all_dirs,
    }

    return inventory


def ensure_parent_dirs(path):
    parent = os.path.dirname(path)
    if parent and not os.path.isdir(parent):
        os.makedirs(parent, exist_ok=True)


def write_json_if_changed(path, data):
    """Write JSON only if content changes. Returns True if file changed."""
    ensure_parent_dirs(path)
    new_text = json.dumps(data, indent=2, sort_keys=True)
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            old_text = f.read()
        if old_text == new_text:
            print(f"No changes in JSON: {path}")
            return False

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_text)
    print(f"Wrote JSON: {path}")
    return True


def human_size(num_bytes):
    """Return human-readable size (e.g. 1.23 GB)."""
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(num_bytes)
    for unit in units:
        if size < 1024.0 or unit == units[-1]:
            return f"{size:.2f} {unit}"
        size /= 1024.0


def build_markdown(inventory):
    s = inventory["summary"]
    cats = inventory["categories"]

    total_size_human = human_size(s["total_size_bytes"])

    lines = []
    lines.append("# Stable Diffusion Inventory Snapshot")
    lines.append("")
    lines.append(f"- SD root: `{s['sd_root']}`")
    lines.append(f"- Inventory tree last modified: `{s['inventory_for_tree_last_modified']}`")
    lines.append(f"- Total files: **{s['total_files']}**")
    lines.append(f"- Total directories: **{s['total_dirs']}**")
    lines.append(f"- Approx total size: **{total_size_human}**")
    lines.append("")

    # Top-level directories
    lines.append("## Top-level directories")
    lines.append("")
    if s["top_level_dirs"]:
        lines.append("| Directory | Subdirs | Files |")
        lines.append("|-----------|---------|-------|")
        for d in s["top_level_dirs"]:
            lines.append(f"| `{d['name']}` | {d['num_subdirs']} | {d['num_files']} |")
    else:
        lines.append("_No top-level directories found?_")
    lines.append("")

    # Helper to add a table section for a category
    def add_model_section(title, key):
        files = cats.get(key, [])
        lines.append(f"### {title} ({len(files)})")
        lines.append("")
        if not files:
            lines.append("_None detected._")
            lines.append("")
            return
        lines.append("| Name | Relative path | Size |")
        lines.append("|------|---------------|------|")
        # Show up to 50 entries to keep this readable
        for f in sorted(files, key=lambda x: x["name"])[:50]:
            size_h = human_size(f["size_bytes"])
            lines.append(f"| `{f['name']}` | `{f['rel_path']}` | {size_h} |")
        if len(files) > 50:
            lines.append(f"…and {len(files) - 50} more.")
        lines.append("")

    lines.append("## Models and Assets")
    lines.append("")
    add_model_section("Checkpoint models", "checkpoints")
    add_model_section("LoRA models", "loras")
    add_model_section("Embeddings", "embeddings")
    add_model_section("ControlNet / T2I models", "controlnet")
    add_model_section("Animatediff / motion models", "animatediff")
    add_model_section("Upscalers / ESRGAN", "upscalers")
    add_model_section("Other models", "other_models")

    # Extensions
    ext_summary = s.get("extension_summary", {})
    ext_names = ext_summary.get("names", [])
    ext_counts = ext_summary.get("file_counts", {})

    lines.append("## Extensions")
    lines.append("")
    if not ext_names:
        lines.append("_No extensions folder or extensions not detected._")
    else:
        lines.append("| Extension | Files (approx) |")
        lines.append("|-----------|----------------|")
        for name in sorted(ext_names):
            cnt = ext_counts.get(name, 0)
            lines.append(f"| `{name}` | {cnt} |")
    lines.append("")

    # Uncategorized
    unc = cats.get("uncategorized", [])
    lines.append(f"## Uncategorized files ({len(unc)})")
    lines.append("")
    if unc:
        lines.append("Only a small sample is shown below:")
        lines.append("")
        lines.append("| Name | Relative path | Size |")
        lines.append("|------|---------------|------|")
        for f in sorted(unc, key=lambda x: x["name"])[:30]:
            size_h = human_size(f["size_bytes"])
            lines.append(f"| `{f['name']}` | `{f['rel_path']}` | {size_h} |")
        if len(unc) > 30:
            lines.append(f"…and {len(unc) - 30} more.")
    else:
        lines.append("_All files were categorized into known buckets._")
    lines.append("")

    lines.append("---")
    lines.append("_This file is auto-generated by `sd_inventory.py`. Do not edit by hand._")
    lines.append("")

    return "\n".join(lines)


def write_markdown_if_changed(path, markdown_text):
    """Write Markdown only if content changes. Returns True if file changed."""
    ensure_parent_dirs(path)
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            old = f.read()
        if old == markdown_text:
            print(f"No changes in Markdown: {path}")
            return False

    with open(path, "w", encoding="utf-8") as f:
        f.write(markdown_text)
    print(f"Wrote Markdown: {path}")
    return True


def git_commit_and_push():
    """
    Run git add/commit/push if there are diffs for the inventory files.

    Returns a dict:
      {
        "committed": bool,
        "reason": str,  # e.g. "committed_and_pushed", "git_missing", "commit_failed", "no_diff"
      }
    """
    print("Checking for git changes in inventory files...")
    files = ["data/sd_inventory.json", "docs/sd_inventory.md"]

    # First, see if there's a diff.
    try:
        result = subprocess.run(
            ["git", "diff", "--quiet", "--"] + files,
            cwd=REPO_ROOT,
            capture_output=True
        )
        if result.returncode == 0:
            print("git diff: no differences detected (unexpected, but continuing).")
            return {"committed": False, "reason": "no_diff"}
        elif result.returncode not in (0, 1):
            print("git diff returned an error; will not attempt commit/push.")
            return {"committed": False, "reason": "diff_error"}
    except FileNotFoundError:
        print("git executable not found. Skipping git operations.")
        return {"committed": False, "reason": "git_missing"}

    # Stage files
    print("Running git add...")
    try:
        subprocess.run(["git", "add"] + files, cwd=REPO_ROOT, check=True)
    except subprocess.CalledProcessError:
        print("git add failed.")
        return {"committed": False, "reason": "add_failed"}

    # Commit with timestamp in message
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = f"Update SD inventory snapshot {ts}"
    print(f"Running git commit: {msg}")
    commit_proc = subprocess.run(["git", "commit", "-m", msg], cwd=REPO_ROOT)
    if commit_proc.returncode != 0:
        print("git commit failed or nothing to commit.")
        return {"committed": False, "reason": "commit_failed"}

    # Push
    print("Running git push...")
    push_proc = subprocess.run(["git", "push"], cwd=REPO_ROOT)
    if push_proc.returncode != 0:
        print("git push failed.")
        return {"committed": False, "reason": "push_failed"}

    return {"committed": True, "reason": "committed_and_pushed"}


def main():
    print("=== Stable Diffusion Inventory Snapshot ===")
    print(f"Repo root: {REPO_ROOT}")
    try:
        os.chdir(REPO_ROOT)
    except FileNotFoundError:
        print("ERROR: Repo root does not exist.")
        print("SUMMARY: Error - repo root not found.")
        return 2

    try:
        inventory = scan_sd_tree()
    except Exception as e:
        print(f"ERROR during scan: {e}")
        print("SUMMARY: Error while scanning Stable Diffusion root.")
        return 2

    try:
        json_changed = write_json_if_changed(JSON_PATH, inventory)
        md_text = build_markdown(inventory)
        md_changed = write_markdown_if_changed(MD_PATH, md_text)
    except Exception as e:
        print(f"ERROR while writing inventory files: {e}")
        print("SUMMARY: Error while writing inventory files.")
        return 2

    if json_changed or md_changed:
        git_result = git_commit_and_push()
        if git_result["committed"]:
            print("SUMMARY: Changes detected; inventory files updated, committed and pushed to remote.")
            return 0
        else:
            print(f"SUMMARY: Changes detected; inventory files updated BUT git commit/push did not complete ({git_result['reason']}).")
            # Non-zero to signal an issue to the .bat, but not a crash.
            return 1
    else:
        print("SUMMARY: No changes detected; inventory files already up to date. No git commit needed.")
        return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
