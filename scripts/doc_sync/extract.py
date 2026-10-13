"""Read-only extraction of facts from source code. Only fixed, allow-listed source paths are ever opened."""
from __future__ import annotations

import ast
import re
from dataclasses import dataclass
from pathlib import Path

NOT_FOUND = "Not Found"
HTTP_METHODS = {"get", "post", "put", "delete", "patch"}


class SourceError(Exception):
    """A required source folder/file is missing, empty or unparsable."""


@dataclass(frozen=True)
class Route:
    method: str
    path: str
    handler: str
    summary: str
    source: str


@dataclass(frozen=True)
class Service:
    module: str
    purpose: str
    symbols: tuple[str, ...]


@dataclass(frozen=True)
class Mode:
    id: str
    label: str
    description: str


def _read(path: Path) -> str:
    if path.name.startswith(".env"):
        raise SourceError(f"Refusing to read secret file: {path.name}")
    return path.read_text(encoding="utf-8")


def _py_files(folder: Path, label: str) -> list[Path]:
    if not folder.is_dir():
        raise SourceError(f"Source folder not found: {label}")
    files = sorted(p for p in folder.glob("*.py") if p.name != "__init__.py" and not p.name.startswith(".env"))
    if not files:
        raise SourceError(f"Source folder is empty (no .py modules): {label}")
    return files


def _first_line(doc: str | None) -> str:
    if doc:
        for line in doc.strip().splitlines():
            if line.strip():
                return line.strip()
    return NOT_FOUND


def _parse(path: Path, label: str) -> ast.Module:
    try:
        return ast.parse(_read(path), filename=label)
    except SyntaxError as exc:
        raise SourceError(f"Cannot parse {label}: {exc.msg} (line {exc.lineno})") from exc


def _const_str(node: ast.AST | None) -> str | None:
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None


def _router_prefixes(tree: ast.Module) -> dict[str, str]:
    routers: dict[str, str] = {}
    for node in tree.body:
        if not (isinstance(node, ast.Assign) and isinstance(node.value, ast.Call)):
            continue
        func = node.value.func
        name = func.id if isinstance(func, ast.Name) else func.attr if isinstance(func, ast.Attribute) else ""
        if name != "APIRouter":
            continue
        prefix = ""
        for kw in node.value.keywords:
            if kw.arg == "prefix":
                prefix = _const_str(kw.value) or ""
        for target in node.targets:
            if isinstance(target, ast.Name):
                routers[target.id] = prefix
    return routers


def _join(prefix: str, path: str) -> str:
    full = f"{prefix}{path}"
    if not full.startswith("/"):
        full = f"/{full}"
    return full


def extract_routes(root: Path) -> list[Route]:
    routes: list[Route] = []
    for file in _py_files(root / "backend" / "routes", "backend/routes"):
        label = f"backend/routes/{file.name}"
        tree = _parse(file, label)
        routers = _router_prefixes(tree)
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for dec in node.decorator_list:
                if not (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute)):
                    continue
                owner = dec.func.value
                if not (isinstance(owner, ast.Name) and owner.id in routers and dec.func.attr in HTTP_METHODS):
                    continue
                path = _const_str(dec.args[0]) if dec.args else None
                if path is None:
                    path = next((_const_str(kw.value) for kw in dec.keywords if kw.arg == "path"), None)
                routes.append(Route(
                    method=dec.func.attr.upper(),
                    path=_join(routers[owner.id], path) if path is not None else NOT_FOUND,
                    handler=node.name,
                    summary=_first_line(ast.get_docstring(node)),
                    source=label,
                ))
    return sorted(routes, key=lambda r: (r.path, r.method, r.source, r.handler))


def extract_services(root: Path) -> list[Service]:
    services: list[Service] = []
    for file in _py_files(root / "backend" / "services", "backend/services"):
        tree = _parse(file, f"backend/services/{file.name}")
        symbols = sorted(
            n.name for n in tree.body
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and not n.name.startswith("_")
        )
        services.append(Service(file.name, _first_line(ast.get_docstring(tree)), tuple(symbols)))
    return sorted(services, key=lambda s: s.module)


_FIELD = r"""{name}\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([^`]*)`)"""


def _field(block: str, name: str) -> str:
    m = re.search(_FIELD.format(name=rf"\b{name}"), block)
    if not m:
        return NOT_FOUND
    value = next(g for g in m.groups() if g is not None)
    return value.replace('\\"', '"').replace("\\'", "'") or NOT_FOUND


def extract_modes(root: Path) -> list[Mode]:
    path = root / "frontend" / "src" / "utils" / "capabilities.js"
    if not path.is_file():
        raise SourceError("Source file not found: frontend/src/utils/capabilities.js")
    text = _read(path)
    start = re.search(r"export\s+const\s+CAPABILITIES\s*=\s*\[", text)
    if not start:
        raise SourceError("CAPABILITIES array not found in frontend/src/utils/capabilities.js")
    depth, i = 1, start.end()
    while i < len(text) and depth:
        depth += {"[": 1, "]": -1}.get(text[i], 0)
        i += 1
    body = text[start.end():i - 1]
    modes = [Mode(_field(b, "id"), _field(b, "label"), _field(b, "description")) for b in re.findall(r"\{[^{}]*\}", body)]
    if not modes:
        raise SourceError("CAPABILITIES array is empty in frontend/src/utils/capabilities.js")
    return modes
