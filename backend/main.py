"""QA Assistant — FastAPI entry point."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routes.analyzer import router as analyzer_router
from routes.chat import router as chat_router
from routes.download import router as download_router
from routes.health import router as health_router
from routes.jira_api import router as jira_router
from routes.report import router as report_router

load_dotenv()

app = FastAPI(
    title="QA Assistant API",
    description="AI-powered QA Assistant with Gemini integration",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(analyzer_router)
app.include_router(download_router)
app.include_router(chat_router)
app.include_router(jira_router)
app.include_router(report_router)

# Serve React frontend (built into backend/static by build.sh)
_STATIC = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(_STATIC):
    app.mount("/static", StaticFiles(directory=os.path.join(_STATIC, "static")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        file_path = os.path.join(_STATIC, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_STATIC, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
