from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .sync import run

EPILOG = """\
exit codes:
  0  documentation is in sync (after --write: every outdated block was rewritten and nothing else is wrong)
  1  drift: outdated or missing marker blocks, or docs reference backend files that do not exist
  2  error: missing/empty source folder, unparsable source, or missing doc file (nothing is modified)

A missing or empty source folder is a clear error (exit 2), never a crash and never a guessed table.
Fields that cannot be determined from code (e.g. a handler with no docstring) render as 'Not Found'.
--write rewrites only the text between <!-- doc-sync:NAME:start --> and <!-- doc-sync:NAME:end --> markers;
it cannot add markers and does not edit prose, so stale file references must be fixed by hand.
Only backend/routes, backend/services and frontend/src/utils/capabilities.js are read; .env files never are.
"""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m scripts.doc_sync",
        description="Keep README/ARCHITECTURE tables in sync with the backend routes, services and chat modes.",
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]), help="repository root (default: this repository)")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="report drift without writing (default)")
    mode.add_argument("--write", action="store_true", help="rewrite out-of-date marked blocks")
    args = parser.parse_args(argv)

    result = run(Path(args.root), write=args.write)
    stream = sys.stderr if result.exit_code == 2 else sys.stdout
    for message in result.messages:
        print(message, file=stream)
    return result.exit_code


if __name__ == "__main__":
    raise SystemExit(main())
