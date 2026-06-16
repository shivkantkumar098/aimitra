"""
QA Assistant — FastAPI application entry point.

This file:
  1. Loads environment variables from backend/.env via python-dotenv
  2. Creates the FastAPI app instance
  3. Configures CORS (allow all origins — tighten for production)
  4. Registers all API routers
  5. Mounts the React SPA static files (built by build.sh → backend/static/)
  6. Provides a spa_fallback route so React Router handles deep links correctly

Running in development:
  cd backend && uvicorn main:app --reload --port 8000

Running in production (after build.sh):
  cd backend && python main.py
  The FastAPI server serves both the API and the React frontend on port 8000.

Router summary:
  health_router   — GET /health, GET /api/models (legacy), GET /api/capabilities
  analyzer_router — POST /api/analyze-url
  download_router — GET /api/download/extension
  chat_router     — POST /api/chat, POST /api/chat/stream
  jira_router     — /api/jira/*
  models_router   — GET /api/models (live provider fetch)
  report_router   — POST /api/report-issue, GET /api/issues, GET /api/issues/download
"""

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
from routes.models import router as models_router
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
app.include_router(models_router)
app.include_router(report_router)

# Serve React frontend (built into backend/static by build.sh)
_STATIC = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(_STATIC):
    app.mount("/static", StaticFiles(directory=os.path.join(_STATIC, "static")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        """
        Catch-all GET route for SPA (React Router) support.
        If the path matches a real static file (e.g. /favicon.ico), serve it.
        Otherwise serve index.html so React Router handles the route client-side.
        Must be registered AFTER all API routers to avoid shadowing them.
        """
        file_path = os.path.join(_STATIC, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_STATIC, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
