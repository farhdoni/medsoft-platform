#!/usr/bin/env python3
"""Append ?v=<git-sha> to same-origin /assets/ references before deploy.

/assets/ is served with `expires 1y; Cache-Control: public, immutable`
(see /etc/nginx/sites-enabled/aivita.uz on the VPS). A same-filename
update to an asset is otherwise invisible to anyone who already has it
cached. Appending a commit-scoped query string makes each deploy a new
URL for the browser, without touching the nginx cache policy itself.

Matches both reference forms actually used in apps/landing:
  - root-relative:      /assets/logo.png
  - same-origin absolute: https://aivita.uz/assets/og-image.png
Deliberately does NOT touch /downloads/ links or any other domain's
/assets/ path — the regex only fires on a bare path or one prefixed
with exactly https://aivita.uz.

Only .html and .webmanifest files reference /assets/ in this tree today
(verified by grepping the whole apps/landing tree before writing this);
those are the two extensions processed below.
"""
import re
import sys
from pathlib import Path

ASSET_RE = re.compile(
    r'(?:https://aivita\.uz)?/assets/[A-Za-z0-9_./-]+\.(?:png|ico|css|js|mjs|svg|webp|jpe?g|gif|woff2?|ttf)'
)


def main() -> None:
    stage_dir, sha = sys.argv[1], sys.argv[2]
    targets = sorted(
        list(Path(stage_dir).rglob("*.html")) + list(Path(stage_dir).rglob("*.webmanifest"))
    )

    total_replacements = 0
    touched_files = 0

    for path in targets:
        # newline='' disables Python's universal-newline translation on both
        # read and write — Path.read_text/write_text don't accept `newline`
        # before Python 3.13, so this uses plain open(). Without it, a write
        # on a host where os.linesep != '\n' would silently turn LF into
        # CRLF, reintroducing the exact byte-mismatch bug the Linux runner
        # is otherwise supposed to fix (see apps/landing/DEPLOY.md).
        with open(path, "r", encoding="utf-8", newline="") as f:
            text = f.read()

        def repl(m: re.Match) -> str:
            return f"{m.group(0)}?v={sha}"

        new_text, count = ASSET_RE.subn(repl, text)
        if count:
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(new_text)
            touched_files += 1
            total_replacements += count

    print(f"cache-bust: rewrote {total_replacements} asset reference(s) across {touched_files} file(s) (v={sha})")


if __name__ == "__main__":
    main()
