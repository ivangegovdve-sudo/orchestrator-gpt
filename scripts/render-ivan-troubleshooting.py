"""Render Ivan's authoritative troubleshooting record as a static AI Kit page.

The Markdown file is deliberately committed beside the route.  The renderer is
deterministic and treats the document as untrusted data: it escapes all source
text before applying a small, safe subset of Markdown formatting.
"""

from __future__ import annotations

import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "web/pools/ai-d-kit/troubleshooting/TROUBLESHOOTING.md"
OUTPUT = ROOT / "web/pools/ai-d-kit/troubleshooting/index.html"

SOURCE_REPO = "ivangegovdve-sudo/hermes-agent"
SOURCE_BRANCH = "docs/ivan-troubleshooting-20260921"
SOURCE_SNAPSHOT = "e19037333c1f1e410c52ee4ef09d7484018fdf50"
SOURCE_REPAIR = "89f0d1b50cba8ff6d067ef284e4fec79c0764f79"
SOURCE_BLOB = "95c9936f58c5f55aa725231395065ea16f9a3522"
# The upstream branch above was deleted after the 2026-09-21 snapshot, so this committed
# file is now the only live copy and is extended here. Record each extension so the
# snapshot constants keep meaning "where Parts 1-14 came from", not "the current bytes".
SOURCE_EXTENSIONS = "Part 15 appended 2026-09-26 (Dispatch memory diagnosis)"


FIELD_RE = re.compile(
    r"^\*\*(Symptom|Cause|Cost|Check)\*\*\s*(?:—|--|:)\s*(.*)$"
)


def inline(value: str) -> str:
    """Escape source text, then apply safe inline Markdown conveniences."""

    value = html.escape(value, quote=False)
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", value)
    value = re.sub(
        r"\[([^\]]+)\]\((https?://[^)\s]+)\)",
        r'<a href="\2" target="_blank" rel="noopener">\1 ↗</a>',
        value,
    )
    return value


def render_blocks(lines: list[str]) -> str:
    """Render ordinary Markdown blocks without executing or trusting them."""

    output: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue

        if line.startswith("```") or line.startswith("~~~"):
            fence = line[:3]
            language = html.escape(line[3:].strip(), quote=True)
            index += 1
            code: list[str] = []
            while index < len(lines) and not lines[index].startswith(fence):
                code.append(lines[index])
                index += 1
            if index < len(lines):
                index += 1
            class_attr = f' class="language-{language}"' if language else ""
            output.append(f"<pre class=\"source-code\"><code{class_attr}>{html.escape(chr(10).join(code))}</code></pre>")
            continue

        if line.startswith(">"):
            quote: list[str] = []
            while index < len(lines) and (lines[index].startswith(">") or not lines[index].strip()):
                if lines[index].startswith(">"):
                    quote.append(lines[index][1:].lstrip())
                index += 1
            output.append(f"<blockquote>{inline(' '.join(quote))}</blockquote>")
            continue

        if re.match(r"^\s*[-*+]\s+", line) or re.match(r"^\s*\d+[.)]\s+", line):
            ordered = bool(re.match(r"^\s*\d+[.)]\s+", line))
            tag = "ol" if ordered else "ul"
            items: list[str] = []
            while index < len(lines):
                match = re.match(r"^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$", lines[index])
                if not match:
                    break
                items.append(f"<li>{inline(match.group(1))}</li>")
                index += 1
            output.append(f"<{tag}>{''.join(items)}</{tag}>")
            continue

        if line.startswith("|"):
            table: list[str] = []
            while index < len(lines) and (lines[index].startswith("|") or not lines[index].strip()):
                if lines[index].strip():
                    table.append(lines[index])
                index += 1
            output.append(f"<pre class=\"source-table\">{html.escape(chr(10).join(table))}</pre>")
            continue

        paragraph: list[str] = []
        while index < len(lines):
            candidate = lines[index]
            if not candidate.strip() or candidate.startswith((">", "```", "~~~", "|")):
                break
            if re.match(r"^\s*[-*+]\s+", candidate) or re.match(r"^\s*\d+[.)]\s+", candidate):
                break
            paragraph.append(candidate.strip())
            index += 1
        output.append(f"<p>{inline(' '.join(paragraph))}</p>")

    return "\n".join(output)


def render_entry(lines: list[str]) -> str:
    """Render an entry while giving the four canonical fields stable hooks."""

    output: list[str] = []
    ordinary: list[str] = []
    index = 0

    def flush_ordinary() -> None:
        if ordinary:
            output.append(render_blocks(ordinary))
            ordinary.clear()

    while index < len(lines):
        match = FIELD_RE.match(lines[index])
        if not match:
            ordinary.append(lines[index])
            index += 1
            continue

        flush_ordinary()
        field_name, first_line = match.groups()
        field_lines = [first_line]
        index += 1
        while index < len(lines) and not FIELD_RE.match(lines[index]):
            field_lines.append(lines[index])
            index += 1
        field_html = render_blocks(field_lines)
        output.append(
            f'<section class="troubleshooting-field" data-field="{field_name.lower()}">'
            f"<h4>{field_name}</h4>{field_html}</section>"
        )

    flush_ordinary()
    return "\n".join(output)


def render_document(source: str) -> str:
    lines = source.splitlines()
    part_matches = [
        (index, line)
        for index, line in enumerate(lines)
        if re.match(r"^## Part \d+\b", line)
    ]
    entry_matches = [index for index, line in enumerate(lines) if line.startswith("### ")]
    part_count = len(part_matches)
    entry_count = len(entry_matches)
    field_counts = {
        name: len(re.findall(rf"^\*\*{name}\*\*\s*(?:—|--|:)", source, re.MULTILINE))
        for name in ("Symptom", "Cause", "Cost", "Check")
    }

    def section_html(start: int, end: int) -> str:
        section_lines = lines[start:end]
        heading = section_lines[0]
        part_body = section_lines[1:]
        local_entries = [
            index for index, line in enumerate(part_body) if line.startswith("### ")
        ]
        chunks: list[str] = [f'<section class="troubleshooting-part"><h2>{inline(heading[3:])}</h2>']
        if local_entries:
            if local_entries[0] > 0:
                chunks.append(f'<div class="part-intro">{render_blocks(part_body[:local_entries[0]])}</div>')
            for position, entry_start in enumerate(local_entries):
                entry_end = local_entries[position + 1] if position + 1 < len(local_entries) else len(part_body)
                entry_heading = part_body[entry_start]
                entry_body = part_body[entry_start + 1 : entry_end]
                chunks.append(
                    '<article class="troubleshooting-entry">'
                    f"<h3>{inline(entry_heading[4:])}</h3>"
                    f"{render_entry(entry_body)}"
                    "</article>"
                )
        else:
            chunks.append(f'<div class="part-intro">{render_blocks(part_body)}</div>')
        chunks.append("</section>")
        return "\n".join(chunks)

    chunks: list[str] = []
    if part_matches:
        first_part = part_matches[0][0]
        chunks.append(f'<div class="record-intro">{render_blocks(lines[:first_part])}</div>')
        for position, (start, _heading) in enumerate(part_matches):
            end = part_matches[position + 1][0] if position + 1 < len(part_matches) else len(lines)
            chunks.append(section_html(start, end))
    else:
        chunks.append(render_blocks(lines))

    body = "\n".join(chunks)
    counts = " ".join(f'data-{name.lower()}-count="{value}"' for name, value in field_counts.items())
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Ivan's complete troubleshooting record: Symptom, Cause, Cost and Check, published as an AI-d kit field guide.">
  <title>AI-d kit · Troubleshooting record</title>
  <link rel="icon" href="/web/shared/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/web/shared/forest-design.css?v=20260807a">
  <link rel="stylesheet" href="/web/shared/forest-shell.css?v=20260807a">
  <style>
    :root {{ --bg:#07070b; --surface:#0f0f15; --border:rgba(255,255,255,.08); --text-primary:#f3f4f6; --text-muted:#9ca3af; --accent:#4f46e5; --accent-green:#22c55e; --radius:8px; }}
    .ai-kit-subpage {{ max-width:1100px; margin:0 auto; padding:7rem 1.25rem 5rem; color:var(--text-primary); }}
    .ai-kit-subpage h1 {{ font-size:clamp(2.5rem,8vw,5.5rem); margin:0 0 1rem; }}
    .lede {{ max-width:56rem; color:var(--text-muted); font-size:1.15rem; line-height:1.65; }}
    .subpage-nav {{ display:flex; flex-wrap:wrap; gap:.75rem; margin:1.5rem 0 2rem; }}
    .subpage-nav a {{ border:1px solid var(--border); border-radius:999px; padding:.55rem .85rem; }}
    .record-boundary {{ border:1px solid var(--border); border-left:4px solid var(--accent-green); border-radius:var(--radius); padding:1rem 1.1rem; background:var(--surface); color:var(--text-muted); line-height:1.6; }}
    .record-boundary strong {{ color:var(--text-primary); }}
    .record-counts {{ display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.75rem; }}
    .record-counts span {{ border:1px solid var(--border); border-radius:999px; padding:.25rem .6rem; color:var(--text-primary); font-size:.9rem; }}
    .record-intro {{ margin:2rem 0 3rem; color:var(--text-muted); line-height:1.7; }}
    .record-intro > p:first-child {{ color:var(--text-primary); font-size:1.08rem; }}
    .troubleshooting-part {{ margin:3rem 0; }}
    .troubleshooting-part > h2 {{ border-bottom:1px solid var(--border); padding-bottom:.75rem; font-size:clamp(1.6rem,4vw,2.5rem); }}
    .part-intro {{ color:var(--text-muted); line-height:1.7; }}
    .troubleshooting-entry {{ margin:1.25rem 0; padding:1.25rem; border:1px solid var(--border); border-radius:var(--radius); background:color-mix(in srgb,var(--surface) 92%,white 8%); }}
    .troubleshooting-entry h3 {{ margin-top:0; color:var(--text-primary); font-size:1.2rem; line-height:1.35; }}
    .troubleshooting-entry p, .troubleshooting-entry li {{ color:var(--text-muted); line-height:1.65; }}
    .troubleshooting-field {{ margin:1rem 0; padding:.8rem 1rem; border-left:3px solid var(--accent); background:rgba(79,70,229,.08); border-radius:0 var(--radius) var(--radius) 0; }}
    .troubleshooting-field h4 {{ margin:0 0 .35rem; color:var(--text-primary); text-transform:uppercase; letter-spacing:.08em; font-size:.78rem; }}
    .troubleshooting-field p {{ margin:.35rem 0; }}
    blockquote {{ margin:1rem 0; padding:.75rem 1rem; border-left:3px solid var(--accent-green); color:var(--text-muted); background:rgba(34,197,94,.06); }}
    code {{ font-size:.9em; }}
    .source-code, .source-table {{ overflow:auto; padding:1rem; border:1px solid var(--border); border-radius:var(--radius); background:#08080d; color:#d1d5db; line-height:1.5; }}
    @media (max-width:600px) {{ .ai-kit-subpage {{ padding:5.5rem .9rem 3rem; }} .troubleshooting-entry {{ padding:.95rem; }} }}
  </style>
</head>
<body class="forest-skin">
  <a class="forest-back" href="/web/pools/ai-d-kit/">← AI-d kit</a>
  <main class="ai-kit-subpage" data-source-repository="{SOURCE_REPO}" data-source-branch="{SOURCE_BRANCH}" data-source-snapshot="{SOURCE_SNAPSHOT}" data-source-formatting-repair="{SOURCE_REPAIR}" data-source-blob="{SOURCE_BLOB}" data-part-count="{part_count}" data-entry-count="{entry_count}" {counts}>
    <p class="forest-kicker">AI-d kit · field notes</p>
    <h1>Troubleshooting</h1>
    <p class="lede">The complete record of failures that reported success, and failures that reported absence. Every source entry is preserved; where the source uses the canonical labels, the four fields are rendered as stable Symptom, Cause, Cost and Check blocks.</p>
    <nav class="subpage-nav" aria-label="AI-d kit subpages">
      <a href="/web/pools/ai-d-kit/">Pool overview</a>
      <a href="/web/pools/ai-d-kit/free-stuff-in-promotions/">Free stuff in promotions</a>
      <a href="/web/open-dashboard/">Open Dashboard</a>
      <a href="/web/explore/">Explore Repos</a>
    </nav>
    <section class="record-boundary" aria-label="Source provenance">
      <strong>Authoritative source.</strong> Published in full from <code>{SOURCE_REPO}</code>, ref <code>{SOURCE_BRANCH}</code>. Snapshot <code>{SOURCE_SNAPSHOT[:12]}</code> and spacing repair <code>{SOURCE_REPAIR[:12]}</code> are recorded so a future update can be traced. Extended in place since: {SOURCE_EXTENSIONS}. The source contains {part_count} numbered parts, an inserted Part 4b, and {entry_count} <code>###</code> sections.
      <div class="record-counts"><span>Four fields: Symptom · Cause · Cost · Check</span><span>The six-month stranger test is retained</span><span>Source blob {SOURCE_BLOB[:12]}</span></div>
    </section>
    {body}
  </main>
</body>
</html>
'''


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    OUTPUT.write_text(render_document(source), encoding="utf-8", newline="\n")
    print(f"rendered {OUTPUT} from {SOURCE}")


if __name__ == "__main__":
    main()
