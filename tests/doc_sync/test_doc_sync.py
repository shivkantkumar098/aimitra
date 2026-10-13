"""Tests for scripts.doc_sync. Pure local file-system fixtures in temp dirs: no network, no Jira/GitHub."""
from __future__ import annotations

import io
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

from scripts.doc_sync import extract, render, sync
from scripts.doc_sync.__main__ import main

REPO_ROOT = Path(__file__).resolve().parents[2]

CHAT_PY = '''"""Chat routes."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
async def chat():
    """Non-streaming chat endpoint.

    Longer text that must not be used.
    """


@router.post("/stream")
async def chat_stream():
    pass
'''
HEALTH_PY = '''from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    return {}
'''
SERVICE_PY = '''"""Groq provider service.

More detail.
"""


def generate_response():
    pass


async def stream_response():
    pass


def _private():
    pass


class Helper:
    pass
'''
CAPS_JS = '''export const CAPABILITIES = [
  {
    id: "text_generation",
    label: "Text / Code Generation",
    description: "Generate text",
    examples: ["a", "b"],
  },
  {
    id: "debug",
    label: "Code Debugging",
    examples: ["x"],
  },
];
export const OTHER = [{ id: "ignored" }];
'''
START = "<!-- doc-sync:{n}:start -->"
END = "<!-- doc-sync:{n}:end -->"


def markers(name: str) -> str:
    return f"{START.format(n=name)}\n{END.format(n=name)}"


def build_repo(base: Path, *, arch: str | None = None, readme: str | None = None, nl: str = "\n") -> Path:
    files = {
        "backend/routes/__init__.py": "",
        "backend/routes/chat.py": CHAT_PY,
        "backend/routes/health.py": HEALTH_PY,
        "backend/services/__init__.py": "",
        "backend/services/groq_service.py": SERVICE_PY,
        "backend/services/bare_service.py": "def run():\n    pass\n",
        "frontend/src/utils/capabilities.js": CAPS_JS,
    }
    for rel, text in files.items():
        p = base / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
    arch_text = arch if arch is not None else f"# Arch\n\n{markers('routes')}\n\n{markers('services')}\n"
    readme_text = readme if readme is not None else f"# Readme\n\n{markers('modes')}\n"
    (base / "ARCHITECTURE.md").write_bytes(arch_text.replace("\n", nl).encode("utf-8"))
    (base / "README.md").write_bytes(readme_text.replace("\n", nl).encode("utf-8"))
    return base


class Tmp(unittest.TestCase):
    def setUp(self):
        self._td = tempfile.TemporaryDirectory()
        self.addCleanup(self._td.cleanup)
        self.root = Path(self._td.name)


class ExtractTests(Tmp):
    def test_routes_with_prefix_methods_and_docstrings(self):
        build_repo(self.root)
        routes = {(r.method, r.path): r for r in extract.extract_routes(self.root)}
        self.assertEqual(set(routes), {("POST", "/api/chat"), ("POST", "/api/chat/stream"), ("GET", "/health")})
        self.assertEqual(routes[("POST", "/api/chat")].summary, "Non-streaming chat endpoint.")
        self.assertEqual(routes[("POST", "/api/chat")].handler, "chat")
        self.assertEqual(routes[("POST", "/api/chat")].source, "backend/routes/chat.py")

    def test_missing_docstring_is_not_found_not_guessed(self):
        build_repo(self.root)
        routes = {r.path: r for r in extract.extract_routes(self.root)}
        self.assertEqual(routes["/api/chat/stream"].summary, extract.NOT_FOUND)
        self.assertEqual(routes["/health"].summary, "Not Found")

    def test_routes_are_sorted_deterministically(self):
        build_repo(self.root)
        paths = [(r.path, r.method) for r in extract.extract_routes(self.root)]
        self.assertEqual(paths, sorted(paths))

    def test_services_public_symbols_and_purpose(self):
        build_repo(self.root)
        services = {s.module: s for s in extract.extract_services(self.root)}
        self.assertEqual(services["groq_service.py"].purpose, "Groq provider service.")
        self.assertEqual(services["groq_service.py"].symbols, ("Helper", "generate_response", "stream_response"))
        self.assertEqual(services["bare_service.py"].purpose, "Not Found")
        self.assertNotIn("__init__.py", services)

    def test_capabilities_missing_description_is_not_found(self):
        build_repo(self.root)
        modes = {m.id: m for m in extract.extract_modes(self.root)}
        self.assertEqual(set(modes), {"text_generation", "debug"})
        self.assertEqual(modes["text_generation"].description, "Generate text")
        self.assertEqual(modes["debug"].description, "Not Found")
        self.assertEqual(modes["debug"].label, "Code Debugging")

    def test_missing_source_folder_raises_clear_error(self):
        with self.assertRaisesRegex(extract.SourceError, "backend/routes"):
            extract.extract_routes(self.root)
        with self.assertRaisesRegex(extract.SourceError, "backend/services"):
            extract.extract_services(self.root)
        with self.assertRaisesRegex(extract.SourceError, "capabilities.js"):
            extract.extract_modes(self.root)

    def test_empty_source_folder_raises_clear_error(self):
        (self.root / "backend" / "routes").mkdir(parents=True)
        (self.root / "backend" / "routes" / "__init__.py").write_text("")
        with self.assertRaisesRegex(extract.SourceError, "empty"):
            extract.extract_routes(self.root)

    def test_unparsable_source_is_a_clear_error(self):
        build_repo(self.root)
        (self.root / "backend/routes/broken.py").write_text("def (:\n")
        with self.assertRaisesRegex(extract.SourceError, "Cannot parse backend/routes/broken.py"):
            extract.extract_routes(self.root)

    def test_env_files_are_never_read(self):
        build_repo(self.root)
        (self.root / "backend/routes/.env.py").write_text("SECRET_KEY=abc\n")
        self.assertEqual(len(extract.extract_routes(self.root)), 3)
        with self.assertRaises(extract.SourceError):
            extract._read(self.root / "backend" / ".env")


class RedactionTests(unittest.TestCase):
    def test_known_secret_shapes_are_redacted(self):
        samples = [
            "sk-abcdefghijklmnop1234", "gsk_abcdefghij123456", "AIzaSyA-abcdefghijklmnop",
            "ATATT" + "x" * 24, "Authorization: Bearer abc.def-ghi123456", "ghp_abcdefghijklmnop12",
        ]
        for s in samples:
            out = render.redact(f"value {s} end")
            self.assertIn("[REDACTED]", out, s)
            self.assertNotIn(s.split()[-1], out, s)

    def test_key_value_assignments_are_redacted(self):
        self.assertEqual(render.redact("GROQ_API_KEY=hunter2"), "GROQ_API_KEY=[REDACTED]")
        self.assertEqual(render.redact("JIRA_API_TOKEN: abcdef"), "JIRA_API_TOKEN=[REDACTED]")
        self.assertNotIn("hunter2", render.redact("password = hunter2"))

    def test_plain_text_is_untouched(self):
        self.assertEqual(render.redact("Fetches a JIRA ticket by key (e.g. QA-123)."), "Fetches a JIRA ticket by key (e.g. QA-123).")

    def test_rendered_table_redacts_and_escapes_pipes(self):
        route = extract.Route("GET", "/x", "h", "uses sk-abcdefghijklmnop12 | pipe", "backend/routes/a.py")
        out = render.render_routes([route])
        self.assertNotIn("sk-abcdefghijklmnop12", out)
        self.assertIn("[REDACTED]", out)
        self.assertIn("\\|", out)


class SecretInDocstring(Tmp):
    def test_docstring_secret_is_redacted_end_to_end(self):
        build_repo(self.root)
        (self.root / "backend/routes/leak.py").write_text(
            'from fastapi import APIRouter\nrouter = APIRouter()\n\n@router.get("/leak")\ndef leak():\n    """Uses sk-SECRETSECRETSECRET1234 here"""\n'
        )
        self.assertEqual(sync.run(self.root, write=True).exit_code, 0)
        text = (self.root / "ARCHITECTURE.md").read_text(encoding="utf-8")
        self.assertNotIn("SECRETSECRETSECRET1234", text)
        self.assertIn("[REDACTED]", text)


class SyncTests(Tmp):
    def test_check_detects_drift_and_does_not_write(self):
        build_repo(self.root)
        before = (self.root / "ARCHITECTURE.md").read_bytes()
        result = sync.run(self.root, write=False)
        self.assertEqual(result.exit_code, sync.EXIT_DRIFT)
        self.assertTrue(any("'routes' block is out of date" in m for m in result.messages))
        self.assertEqual((self.root / "ARCHITECTURE.md").read_bytes(), before)

    def test_write_fixes_drift_and_check_then_passes(self):
        build_repo(self.root)
        self.assertEqual(sync.run(self.root, write=True).exit_code, 0)
        self.assertEqual(sync.run(self.root, write=False).exit_code, 0)
        arch = (self.root / "ARCHITECTURE.md").read_text(encoding="utf-8")
        self.assertIn("`/api/chat/stream`", arch)
        self.assertIn("`groq_service.py`", arch)
        self.assertIn("`debug`", (self.root / "README.md").read_text(encoding="utf-8"))

    def test_write_is_idempotent(self):
        build_repo(self.root)
        sync.run(self.root, write=True)
        first = (self.root / "ARCHITECTURE.md").read_bytes(), (self.root / "README.md").read_bytes()
        again = sync.run(self.root, write=True)
        second = (self.root / "ARCHITECTURE.md").read_bytes(), (self.root / "README.md").read_bytes()
        self.assertEqual(first, second)
        self.assertEqual(again.messages, ["Documentation is in sync with the source code."])

    def test_write_changes_only_text_between_markers(self):
        arch = f"# Arch\nhand written A\n\n{markers('routes')}\n\nmiddle prose\n\n{markers('services')}\nhand written B\n"
        build_repo(self.root, arch=arch)
        sync.run(self.root, write=True)
        out = (self.root / "ARCHITECTURE.md").read_text(encoding="utf-8")
        self.assertTrue(out.startswith("# Arch\nhand written A\n\n<!-- doc-sync:routes:start -->"))
        self.assertIn("<!-- doc-sync:routes:end -->\n\nmiddle prose\n\n<!-- doc-sync:services:start -->", out)
        self.assertTrue(out.endswith("<!-- doc-sync:services:end -->\nhand written B\n"))

    def test_crlf_line_endings_are_preserved(self):
        build_repo(self.root, nl="\r\n")
        sync.run(self.root, write=True)
        data = (self.root / "ARCHITECTURE.md").read_bytes()
        self.assertIn(b"\r\n", data)
        self.assertNotIn(b"\n", data.replace(b"\r\n", b""))
        self.assertEqual(sync.run(self.root).exit_code, 0)

    def test_missing_markers_are_reported_not_crashed(self):
        build_repo(self.root, arch="# no markers here\n", readme="# no markers\n")
        for write in (False, True):
            result = sync.run(self.root, write=write)
            self.assertEqual(result.exit_code, sync.EXIT_DRIFT)
            self.assertTrue(any("markers" in m and "not found" in m for m in result.messages))
        self.assertEqual((self.root / "ARCHITECTURE.md").read_text(), "# no markers here\n")

    def test_missing_source_folder_is_exit_2_and_modifies_nothing(self):
        build_repo(self.root)
        for p in (self.root / "backend" / "routes").glob("*.py"):
            p.unlink()
        before = (self.root / "ARCHITECTURE.md").read_bytes()
        result = sync.run(self.root, write=True)
        self.assertEqual(result.exit_code, sync.EXIT_ERROR)
        self.assertIn("backend/routes", result.messages[0])
        self.assertEqual((self.root / "ARCHITECTURE.md").read_bytes(), before)

    def test_missing_root_and_missing_doc(self):
        self.assertEqual(sync.run(self.root / "nope").exit_code, sync.EXIT_ERROR)
        build_repo(self.root)
        (self.root / "README.md").unlink()
        self.assertEqual(sync.run(self.root).exit_code, sync.EXIT_ERROR)

    def test_stale_references_detected(self):
        arch = f"# Arch\n`services/dial_service.py` and dial_service.py and routes/ghost.py\n{markers('routes')}\n{markers('services')}\n"
        build_repo(self.root, arch=arch)
        sync.run(self.root, write=True)
        result = sync.run(self.root)
        self.assertEqual(result.exit_code, sync.EXIT_DRIFT)
        text = "\n".join(result.messages)
        self.assertIn("ARCHITECTURE.md:2: stale reference to services/dial_service.py", text)
        self.assertIn("stale reference to routes/ghost.py", text)
        self.assertEqual(text.count("dial_service.py"), 1)

    def test_existing_and_placeholder_references_are_not_stale(self):
        arch = f"# Arch\ngroq_service.py routes/chat.py myprovider_service.py\n{markers('routes')}\n{markers('services')}\n"
        build_repo(self.root, arch=arch)
        sync.run(self.root, write=True)
        self.assertEqual(sync.run(self.root).exit_code, 0)

    def test_write_cannot_fix_stale_reference_prose(self):
        arch = f"# Arch\n`ghost_service.py`\n{markers('routes')}\n{markers('services')}\n"
        build_repo(self.root, arch=arch)
        self.assertEqual(sync.run(self.root, write=True).exit_code, sync.EXIT_DRIFT)


class CliTests(Tmp):
    def run_cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = main(list(argv))
        return code, out.getvalue(), err.getvalue()

    def test_default_is_check(self):
        build_repo(self.root)
        code, out, _ = self.run_cli("--root", str(self.root))
        self.assertEqual(code, 1)
        self.assertIn("out of date", out)

    def test_write_then_check(self):
        build_repo(self.root)
        self.assertEqual(self.run_cli("--root", str(self.root), "--write")[0], 0)
        self.assertEqual(self.run_cli("--root", str(self.root), "--check")[0], 0)

    def test_error_goes_to_stderr_with_exit_2(self):
        code, out, err = self.run_cli("--root", str(self.root))
        self.assertEqual((code, out), (2, ""))
        self.assertIn("ERROR", err)

    def test_check_and_write_are_mutually_exclusive(self):
        with redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as cm:
            main(["--check", "--write"])
        self.assertEqual(cm.exception.code, 2)


class RealRepositoryIntegration(unittest.TestCase):
    def test_repository_docs_are_in_sync_with_source(self):
        result = sync.run(REPO_ROOT, write=False)
        self.assertEqual(result.exit_code, 0, "\n".join(result.messages))

    def test_generated_docs_contain_no_secret_shapes(self):
        for name in ("ARCHITECTURE.md", "README.md"):
            text = (REPO_ROOT / name).read_text(encoding="utf-8")
            block = text[text.find("<!-- doc-sync:"):]
            self.assertNotRegex(block, r"\bsk-[A-Za-z0-9_\-]{8,}|\bgsk_[A-Za-z0-9]{8,}|\bAIza[0-9A-Za-z_\-]{10,}|\bATATT")


if __name__ == "__main__":
    unittest.main()
