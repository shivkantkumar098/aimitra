# QA Assistant AI

AI-powered QA assistant with a ChatGPT-like interface.

## Quick Start

### Backend (Python FastAPI)

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

### Frontend (React)

```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

### Get a Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Create a free API key
3. Paste it into the sidebar "API Key" field

## Features

- 9 AI capability modes (test generation, DOM locators, debugging, etc.)
- Streaming responses (SSE)
- Dark modern UI
- Config auto-saved to localStorage
- Markdown + syntax highlighting
- Copy code button

## Project Structure

```
backend/
  main.py                  # FastAPI app entry point
  routes/chat.py           # Chat API endpoints
  routes/health.py         # Health + metadata endpoints
  services/gemini_service.py  # Gemini API calls (streaming + non-streaming)
  utils/prompt_router.py   # Capability → system prompt mapping

frontend/
  src/
    App.js                 # Root component
    hooks/useConfig.js     # Config state + localStorage
    hooks/useChat.js       # Chat state + send logic
    services/chatService.js # API calls (fetch + axios)
    components/
      Sidebar.jsx          # Config panel + capability selector
      ChatWindow.jsx       # Main chat layout
      ChatInput.jsx        # Textarea + send button
      Message.jsx          # Markdown message bubble
      TypingIndicator.jsx  # Animated dots
      WelcomeScreen.jsx    # Empty state
    utils/capabilities.js  # Capability + model definitions
```
