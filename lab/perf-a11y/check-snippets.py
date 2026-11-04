#!/usr/bin/env python3
"""Extract every ```js block from fixes.md and syntax-check it with node --check.

Stdlib only. Does not execute anything, does not start a server.
Usage: python3 check-snippets.py
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "fixes.md"


def js_blocks(text):
    return re.findall(r"^```js\n(.*?)^```$", text, re.S | re.M)


def main():
    if not SRC.exists():
        print(f"missing {SRC}")
        return 1
    blocks = js_blocks(SRC.read_text(encoding="utf-8"))
    if not blocks:
        print("no js blocks found")
        return 1
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        for i, body in enumerate(blocks, 1):
            # every snippet must at least be a syntactically valid script
            script = body if not body.lstrip().startswith(("const ", "let ")) else body
            path = Path(tmp) / f"block{i:02d}.js"
            path.write_text(script, encoding="utf-8")
            r = subprocess.run(
                ["node", "--check", str(path)],
                capture_output=True, text=True
            )
            first = body.strip().splitlines()[0][:58]
            if r.returncode == 0:
                print(f"  ok   block {i:02d}  {first}")
            else:
                failures += 1
                print(f"  FAIL block {i:02d}  {first}")
                print("       " + r.stderr.strip().splitlines()[0])
    print(f"\n{len(blocks) - failures}/{len(blocks)} js blocks parse clean")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
