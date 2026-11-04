#!/usr/bin/env python3
"""Build the JS people file that site/data.js expects, from a CSV of crew.

Input columns: slug, name, dept, role, line, tag.
Output: a script that assigns window.XENITH_PEOPLE, one record per person plus
a default record for unknown links.

    python3 build_people.py people.sample.csv
    python3 build_people.py people.sample.csv --out people.js --fill-fallback

Python 3 standard library only. No network, no server, no dependencies.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import tempfile
from pathlib import Path

FIELDS = ("slug", "name", "dept", "role", "line", "tag")
SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")
RESERVED_SLUGS = {"default"}
LINE_MIN = 55
LINE_MAX = 120
FILE_LIMIT = 60 * 1024
EM_DASH = "\u2014"

# Department fallback lines. These name the labour, never the person, and are
# used only when a row arrives without a personal line.
DEPT_FALLBACKS = {
    "Events & Admin": (
        "Events is 40 minutes of stage and six weeks of chairs. You're on chairs."
    ),
    "Events": (
        "Events is 40 minutes of stage and six weeks of chairs. You're on chairs."
    ),
    "Tech": (
        "The projector has one job and a history of failure. You're the plan B."
    ),
    "Design": (
        "Every poster gets approved three times. You're the third time."
    ),
    "Marketing": (
        "Social is three posts a day and a group chat that never sleeps. "
        "You bring the snacks."
    ),
    "Sponsorship": (
        "Sponsorship is eleven emails for one yes. You write the twelfth."
    ),
    "Content": (
        "Somebody has to write the announcements nobody reads. "
        "You'll make them read it."
    ),
}
FALLBACK_BY_DEPT = {dept.casefold(): line for dept, line in DEPT_FALLBACKS.items()}

DEFAULT_PERSON = {
    "name": "Your Name",
    "dept": "Xenith Crew",
    "role": "Selected",
    "line": "You are in. Rusty has been told to behave.",
    "tag": "new crew member",
}

BANNED_WORDS = (
    "thrilled", "excited", "exciting", "proud", "honoured", "honored",
    "journey", "passion", "passionate", "amazing", "incredible",
    "rockstar", "superstar", "family", "blessed", "grateful", "can't wait",
)


def read_csv(path: Path):
    """Return (header, rows) or raise OSError."""
    with path.open(newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        header = list(reader.fieldnames or [])
        rows = list(reader)
    return header, rows


def copy_checks(loc: str, rec: dict, problems: list, warnings: list) -> None:
    """Style rules that apply to every line that reaches the page."""
    for field in ("name", "dept", "line", "tag"):
        if EM_DASH in rec[field]:
            problems.append(f"{loc}: {field} contains an em dash")
    if "!" in rec["line"]:
        problems.append(f"{loc}: line contains an exclamation mark")
    if "\n" in rec["line"] or "\r" in rec["line"]:
        problems.append(f"{loc}: line contains a line break")
    if rec["line"] and not rec["line"].endswith("."):
        warnings.append(f"{loc}: line does not end with a period")
    length = len(rec["line"])
    if not LINE_MIN <= length <= LINE_MAX:
        warnings.append(
            f"{loc}: line is {length} characters, target {LINE_MIN} to {LINE_MAX}"
        )
    lowered = rec["line"].casefold()
    for word in BANNED_WORDS:
        if re.search(rf"(?<![a-z]){re.escape(word)}(?![a-z])", lowered):
            warnings.append(f"{loc}: '{word}' is on the banned word list")


def build(path: Path, fill_fallback: bool):
    """Return (people, problems, warnings). People is a list of (slug, record)."""
    problems: list[str] = []
    warnings: list[str] = []

    try:
        header, rows = read_csv(path)
    except OSError as exc:
        reason = exc.strerror or str(exc)
        return [], [f"cannot read {path}: {reason}"], warnings

    if not rows:
        return [], [f"{path} has no data rows"], warnings

    missing = [name for name in FIELDS if name not in header]
    if missing:
        return [], [f"missing column(s): {', '.join(missing)}"], warnings
    extra = [name for name in header if name not in FIELDS]
    if extra:
        warnings.append(f"ignoring extra column(s): {', '.join(extra)}")

    people: list[tuple[str, dict]] = []
    seen: dict[str, int] = {}

    for number, row in enumerate(rows, start=2):
        raw = {key: (row.get(key) or "").strip() for key in FIELDS}
        if not any(raw.values()):
            warnings.append(f"line {number}: blank row skipped")
            continue

        slug = raw["slug"]
        loc = f"line {number}" + (f" ({slug})" if slug else "")
        row_problems: list[str] = []
        row_warnings: list[str] = []

        if not slug:
            row_problems.append(f"{loc}: slug is empty")
        elif slug in RESERVED_SLUGS:
            row_problems.append(
                f"{loc}: slug 'default' is reserved for the fallback record"
            )
        elif len(slug) > 40 or not SLUG_RE.match(slug):
            row_problems.append(
                f"{loc}: slug must be 1 to 40 characters of a-z, 0-9 and hyphens"
            )
        elif slug in seen:
            row_problems.append(
                f"{loc}: duplicate slug '{slug}', first used on line {seen[slug]}"
            )
        else:
            seen[slug] = number

        if not raw["name"]:
            row_problems.append(f"{loc}: name is empty")
        if not raw["dept"]:
            row_problems.append(f"{loc}: dept is empty")

        if row_problems:
            problems.extend(row_problems)
            warnings.extend(row_warnings)
            continue

        fallback = FALLBACK_BY_DEPT.get(raw["dept"].casefold())
        if fallback is None:
            row_warnings.append(
                f"{loc}: no fallback line for dept '{raw['dept']}'"
            )

        line = raw["line"]
        if not line:
            if fallback is None:
                row_problems.append(
                    f"{loc}: line is empty and dept '{raw['dept']}' has no fallback"
                )
            elif fill_fallback:
                line = fallback
                row_warnings.append(
                    f"{loc}: line filled from the {raw['dept']} fallback"
                )
            else:
                row_problems.append(
                    f"{loc}: line is empty, pass --fill-fallback to use the "
                    f"{raw['dept']} fallback"
                )

        role = raw["role"]
        if not role:
            role = raw["dept"]
            row_warnings.append(f"{loc}: role is empty, using the dept label")

        if not raw["tag"]:
            row_warnings.append(f"{loc}: tag is empty, share cards lose the caption")

        if row_problems:
            problems.extend(row_problems)
            warnings.extend(row_warnings)
            continue

        rec = {
            "name": raw["name"],
            "dept": raw["dept"],
            "role": role,
            "line": line,
            "tag": raw["tag"],
        }
        copy_checks(loc, rec, problems, warnings)
        warnings.extend(row_warnings)
        people.append((slug, rec))

    return people, problems, warnings


def render(people: list[tuple[str, dict]], source: str) -> str:
    blocks = []
    for slug, rec in people:
        body = ",\n".join(
            f"    {field}: {json.dumps(rec[field], ensure_ascii=False)}"
            for field in ("name", "dept", "role", "line", "tag")
        )
        blocks.append(f'  "{slug}": {{\n{body}\n  }}')
    return (
        f"// Generated by build_people.py from {source}. Do not edit by hand.\n"
        "window.XENITH_PEOPLE = {\n"
        + ",\n".join(blocks)
        + "\n};\n"
    )


def write_atomic(target: Path, text: str) -> None:
    target = target.resolve()
    if not target.parent.is_dir():
        raise OSError(f"output folder does not exist: {target.parent}")
    fd, tmp = tempfile.mkstemp(
        prefix=target.name + ".", suffix=".tmp", dir=str(target.parent)
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        os.replace(tmp, target)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Build window.XENITH_PEOPLE from a people CSV."
    )
    parser.add_argument(
        "csv_path",
        metavar="people.csv",
        nargs="?",
        default="people.sample.csv",
        help="input CSV (default: people.sample.csv)",
    )
    parser.add_argument(
        "--out",
        default="people.js",
        metavar="people.js",
        help="output JS file (default: people.js)",
    )
    parser.add_argument(
        "--fill-fallback",
        action="store_true",
        help="use the department fallback when a row has no line",
    )
    args = parser.parse_args(argv)

    people, problems, warnings = build(Path(args.csv_path), args.fill_fallback)
    for warning in warnings:
        print(f"warn: {warning}", file=sys.stderr)
    if problems:
        for problem in problems:
            print(f"error: {problem}", file=sys.stderr)
        print(
            f"build failed: {len(problems)} problem(s) in {args.csv_path}",
            file=sys.stderr,
        )
        return 1

    people.append(("default", dict(DEFAULT_PERSON)))
    source = Path(args.csv_path).name
    text = render(people, source)
    size = len(text.encode("utf-8"))
    if size > FILE_LIMIT:
        print(
            f"error: {args.out} would be {size} bytes, over the 60 KB file limit",
            file=sys.stderr,
        )
        return 1

    try:
        write_atomic(Path(args.out), text)
    except OSError as exc:
        print(f"error: cannot write {args.out}: {exc}", file=sys.stderr)
        return 1

    print(
        f"{args.out}: {len(people) - 1} people + default, "
        f"{size} bytes, {len(warnings)} warning(s)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
