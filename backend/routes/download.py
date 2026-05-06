"""Serves the AiMitra Chrome Extension as a downloadable ZIP."""

import io
import os
import zipfile

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(tags=["download"])

EXT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "chrome-extension")


@router.get("/api/download/extension")
def download_extension():
    """Stream the chrome-extension folder as a ZIP file."""
    ext_path = os.path.realpath(EXT_DIR)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _dirs, files in os.walk(ext_path):
            for fname in files:
                full = os.path.join(root, fname)
                arcname = os.path.join(
                    "aimitra-extension",
                    os.path.relpath(full, ext_path),
                )
                zf.write(full, arcname)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="aimitra-extension.zip"'},
    )
