"""Compare generated blocks with the docs (--check) or rewrite only the marked blocks (--write)."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from .extract import SourceError, extract_modes, extract_routes, extract_services
from .render import render_modes, render_routes, render_services

# block name -> (target doc, renderer inputs)
TARGETS = {"routes": "ARCHITECTURE.md", "services": "ARCHITECTURE.md", "modes": "README.md"}
DOCS = ("README.md", "ARCHITECTURE.md")
# Tutorial placeholders in the docs (e.g. "Create backend/services/myprovider_service.py") are not real files.
PLACEHOLDER_STEMS = {"myprovider", "my_provider", "newprovider", "example"}

EXIT_OK, EXIT_DRIFT, EXIT_ERROR = 0, 1, 2

_SERVICE_REF = re.compile(r"\b([A-Za-z0-9_]+_service\.py)\b")
_ROUTE_REF = re.compile(r"\broutes/([A-Za-z0-9_]+\.py)\b")
_SERVICE_PATH_REF = re.compile(r"\bservices/([A-Za-z0-9_]+\.py)\b")


@dataclass
class Result:
    exit_code: int = EXIT_OK
    messages: list[str] = field(default_factory=list)

    def drift(self, message: str) -> None:
        self.messages.append(message)
        if self.exit_code == EXIT_OK:
            self.exit_code = EXIT_DRIFT


def generate(root: Path) -> dict[str, str]:
    return {
        "routes": render_routes(extract_routes(root)),
        "services": render_services(extract_services(root)),
        "modes": render_modes(extract_modes(root)),
    }


def _marker_re(name: str) -> re.Pattern[str]:
    return re.compile(rf"(<!-- doc-sync:{name}:start -->)(.*?)(<!-- doc-sync:{name}:end -->)", re.DOTALL)


def replace_block(text: str, name: str, content: str) -> tuple[str, bool]:
    """Return (new_text, markers_found). Only the text between the markers changes; line endings are preserved."""
    pattern = _marker_re(name)
    if not pattern.search(text):
        return text, False
    newline = "\r\n" if "\r\n" in text else "\n"
    body = content.replace("\r\n", "\n").replace("\n", newline)
    return pattern.sub(lambda m: m.group(1) + body + m.group(3), text, count=1), True


def stale_references(root: Path, doc_texts: dict[str, str]) -> list[str]:
    """Docs that name backend service/route modules that do not exist on disk."""
    problems = []
    for doc, text in sorted(doc_texts.items()):
        seen: set[tuple[str, str]] = set()
        for lineno, line in enumerate(text.splitlines(), 1):
            refs = [(m.group(1), root / "backend" / "services") for m in _SERVICE_REF.finditer(line)]
            refs += [(m.group(1), root / "backend" / "services") for m in _SERVICE_PATH_REF.finditer(line)]
            refs += [(m.group(1), root / "backend" / "routes") for m in _ROUTE_REF.finditer(line)]
            for name, folder in refs:
                stem = name[:-3].removesuffix("_service")
                if stem in PLACEHOLDER_STEMS or (name, str(folder)) in seen:
                    continue
                seen.add((name, str(folder)))
                if not (folder / name).is_file():
                    problems.append(f"{doc}:{lineno}: stale reference to {folder.name}/{name} (file does not exist)")
    return problems


def _read_doc(path: Path) -> str:
    with open(path, encoding="utf-8", newline="") as fh:
        return fh.read()


def run(root: Path, write: bool = False) -> Result:
    result = Result()
    root = Path(root)
    if not root.is_dir():
        result.exit_code = EXIT_ERROR
        result.messages.append(f"ERROR: root folder not found: {root}")
        return result
    try:
        blocks = generate(root)
    except SourceError as exc:
        result.exit_code = EXIT_ERROR
        result.messages.append(f"ERROR: {exc}")
        return result

    texts: dict[str, str] = {}
    for doc in DOCS:
        path = root / doc
        if not path.is_file():
            result.exit_code = EXIT_ERROR
            result.messages.append(f"ERROR: documentation file not found: {doc}")
            return result
        texts[doc] = _read_doc(path)

    updated = dict(texts)
    for name, doc in TARGETS.items():
        new_text, found = replace_block(updated[doc], name, blocks[name])
        if not found:
            result.drift(f"{doc}: markers <!-- doc-sync:{name}:start/end --> not found; add them where the {name} table belongs")
        elif new_text != updated[doc]:
            result.drift(f"{doc}: '{name}' block is out of date" + (" (rewritten)" if write else ""))
            updated[doc] = new_text

    if write:
        for doc in DOCS:
            if updated[doc] != texts[doc]:
                with open(root / doc, "w", encoding="utf-8", newline="") as fh:
                    fh.write(updated[doc])

    for problem in stale_references(root, updated):
        result.drift(problem)

    if write and result.exit_code == EXIT_DRIFT:
        remaining = [m for m in result.messages if "(rewritten)" not in m]
        result.exit_code = EXIT_DRIFT if remaining else EXIT_OK
    if not result.messages:
        result.messages.append("Documentation is in sync with the source code.")
    return result
