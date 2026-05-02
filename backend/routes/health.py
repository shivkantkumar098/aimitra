from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok", "service": "QA Assistant API"}


@router.get("/api/models")
async def list_models():
    return {
        "models": [
            {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash (Recommended)", "provider": "google"},
            {"id": "gemini-2.0-flash-lite", "name": "Gemini 2.0 Flash Lite", "provider": "google"},
            {"id": "gemini-1.5-flash-latest", "name": "Gemini 1.5 Flash", "provider": "google"},
            {"id": "gemini-1.5-pro-latest", "name": "Gemini 1.5 Pro", "provider": "google"},
        ]
    }


@router.get("/api/capabilities")
async def list_capabilities():
    return {
        "capabilities": [
            {"id": "text_generation", "label": "Text / Code Generation", "icon": "💬"},
            {"id": "dom_locator", "label": "DOM Locator Generator", "icon": "🔍"},
            {"id": "test_generation", "label": "Test Case Generator", "icon": "🧪"},
            {"id": "test_plan", "label": "Test Plan Generator", "icon": "📋"},
            {"id": "debug", "label": "Code Debugging Assistant", "icon": "🐛"},
            {"id": "web_search", "label": "Web Search", "icon": "🌐"},
            {"id": "image_generation", "label": "Image Generation", "icon": "🎨"},
            {"id": "jira", "label": "Jira Integration", "icon": "🔵"},
            {"id": "jql", "label": "JQL Search", "icon": "🤖"},
        ]
    }
