# AiMitra — Your Intelligent AI Assistant

> **"AI Friend"** — An all-in-one AI-powered platform for QA Engineers, Business Analysts & Developers.

AiMitra consolidates **30+ purpose-built AI tools** across 4 specialised workspaces into a single, beautifully designed application — eliminating the need to juggle multiple AI services. Every tool has a carefully crafted system prompt that transforms the AI into a domain expert.

---

## ✨ Key Highlights

| | |
|---|---|
| 🤖 **13 AI Providers** | OpenAI, Anthropic, Gemini, Groq, Mistral, DeepSeek, xAI, Together, Perplexity, Cerebras, OpenRouter, Fireworks, Cohere |
| 🧠 **50+ AI Models** | GPT-4o, Claude Sonnet, Gemini Flash, Llama 3.3, DeepSeek R1, and more — fetched **live** from each provider's API |
| 🛠️ **30+ Specialised Tools** | Purpose-built for QA, BA, and Development workflows |
| 💸 **Free to Use** | Works with free-tier providers (Groq, Gemini, Cerebras, OpenRouter) |
| 🔐 **Privacy First** | API keys stored locally in browser — never sent to any server |
| ⚡ **Real-time Streaming** | Token-by-token SSE streaming for all providers |
| 🕓 **Conversation History** | Auto-saves every session with title, timestamp, and model info |
| 📁 **File & Folder Upload** | Attach any text/code file or entire folder — no size limit |
| ⚡ **Live Model List** | Model dropdown auto-fetches from provider API — always up to date |
| 🧭 **Model Capability Warnings** | Warns when selected model may not support the active mode |
| 💬 **Zero-token Local Replies** | Greetings and common messages answered instantly — no API call |
| 🗜️ **Collapsible Sidebar** | Hamburger button in every panel header toggles sidebar on desktop & mobile |
| 🎨 **Image Generation** | DALL-E 3 mode with smart popup warning for unsupported models |

---

## 🗂️ Workspaces

### 💬 Chat & Code
6 AI-powered modes with smart mode detection:

| Mode | Purpose |
|------|---------|
| Text / Code Generation | General coding, explanations, documentation |
| Code Debugging | Root cause analysis + fix for errors and stack traces |
| Test Case Generator | Selenium / Playwright / pytest test cases |
| Test Plan Generator | IEEE 829-compliant test plans |
| DOM Locator Generator | XPath & CSS selectors for web automation |
| Web Search | Current events, latest docs, live data queries *(real-time with Perplexity only)* |
| Image Generation | Generate images from text prompts *(requires DALL-E 3 via OpenAI)* |

### ⚡ More Tools
13 one-shot developer tools:

| Tool | Purpose |
|------|---------|
| 🧭 Tool Helper | Guides you to the right AiMitra tool |
| 🔍 Code Explainer | Plain-English breakdown of any code |
| 🕵️ Code Review | Bugs, security, performance, SOLID analysis |
| 🐛 Debug & Fix | Identifies and fixes broken code |
| 🔄 Code Converter | Translate code between languages/frameworks |
| 📝 Regex Builder | Regex from plain English + test cases |
| 🗄️ SQL Helper | Write, optimise, and explain SQL queries |
| 📦 Git Assistant | Commit messages, PR descriptions, git commands |
| 🐳 DevOps Generator | Dockerfiles, GitHub Actions, Kubernetes configs |
| 🎲 JSON & Mock Data | Realistic fake data for testing/prototyping |
| 🥒 BDD Generator | Gherkin .feature files for Cucumber/Behave/SpecFlow |
| 🔌 API Test Generator | pytest / Postman / RestAssured test suites |
| ♿ A11y Checker | WCAG 2.1 AA accessibility violations + fixes |

### 🔵 JIRA Tools
7 tools for Jira-integrated workflows:

| Tool | Purpose |
|------|---------|
| 🤖 Ask Rovo | Jira/Agile expert Q&A |
| 🎫 Ticket Creator | Well-structured Stories/Epics from a rough idea |
| 🐛 Bug Creator | Detailed, reproducible bug report tickets |
| 🔍 JQL Search | Generate and explain JQL queries |
| 📋 Test Plan Review | AI review of test plan tickets |
| ✅ Ticket Validator | Definition of Ready check |
| 💬 Comment Generator | Professional Jira status update comments |

### 📋 BA Tools
10 tools for Business Analysts — the only QA/dev AI tool with a dedicated BA workspace:

| Tool | Purpose |
|------|---------|
| 📖 User Story Generator | "As a... I want... So that..." with AC and DoD |
| ✅ Acceptance Criteria | Gherkin / checklist format — QA-ready |
| 🎭 Use Case Generator | Actors, flows, exceptions — formal UC docs |
| 🔎 Requirements Analyzer | Gaps, ambiguities, conflicts, testability |
| 🔄 Process Flow Generator | AS-IS/TO-BE swim-lane process flows |
| 📄 BRD Generator | Formal Business Requirements Documents |
| 📊 Gap Analysis | Structured gap table + phased roadmap |
| 📧 Stakeholder Update | Tailored comms for exec / tech / end-users |
| 📝 Meeting Summarizer | Decisions, action items, parking lot from notes |
| 💥 Impact Analysis | People / Process / Technology / Data impact |

---

## 🧠 Smart Features

### Auto Mode Detector
AiMitra automatically detects when you're in the wrong mode and suggests the best tool — no extra API calls, just keyword analysis:

- Paste a stack trace in Chat → suggests **Code Debugging**
- Ask "write test cases" → suggests **Test Case Generator**
- Mention "xpath" or "css selector" → suggests **DOM Locator Generator**
- Ask about "gherkin" or "BDD" → suggests **BDD Generator**
- Mention "latest" or "today" → suggests **Web Search**

### Live Model Auto-fetch
When you enter an API key, the model dropdown is populated **live from the provider's API** — not a hardcoded list:

- Calls each provider's native model listing endpoint (`GET /v1/models`, Anthropic `/v1/models`, Gemini `/v1beta/models`)
- Results cached in localStorage for **1 hour** — no repeated calls
- A green **`⚡ live`** badge confirms the list came from the provider
- Refresh button (↺) forces an immediate update
- Falls back to built-in static list if the provider is unreachable

### File & Folder Upload
Attach any text or code file — or an entire project folder — directly in the chat input:

- **No file size limit** and **no file count limit**
- Folder upload reads all text/code files recursively (`webkitdirectory`)
- 40+ supported extensions: `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.java`, `.go`, `.rs`, `.sql`, `.yaml`, `.md`, `.feature`, and more
- Binary files are automatically skipped with a count shown
- Soft warning shown if total content may exceed the model's context window
- File count + total size displayed; individual files removable

### Model Capability Warnings
A yellow warning banner appears in the sidebar when the selected model may not handle the active mode well:

| Scenario | Warning |
|----------|---------|
| Image Generation + non-DALL-E model | **Blocking popup** — must switch to DALL-E 3 (OpenAI) |
| Web Search + non-Perplexity model | No real-time search — training data only |
| Reasoning model (o1, DeepSeek R1…) + JIRA/BDD/BA modes | May not follow structured output formats |
| Small/lightweight model + complex structured tasks | May produce incomplete output |
| Codestral + non-coding modes | Code-specialist model, poor for JIRA/BA |

### Zero-token Local Replies
Common messages are answered instantly by the frontend — **no API call, no tokens used**:

- Greetings: *hi, hello, hey, good morning…*
- Meta questions: *who are you, what can you do, how are you…*
- Acknowledgements: *thanks, ok, got it, bye…*

Each local reply is labelled **`⚡ local · 0 tokens`** so savings are visible.

### Web Search — Model Compatibility
A blue info banner appears at the top of the chat when Web Search mode is active:

| Model type | Capability |
|-----------|-----------|
| **Perplexity** (Sonar Pro, Sonar) | Real-time web search via live index |
| All other models | Training data only — knowledge cutoff applies |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- A free API key from [Groq](https://console.groq.com) or [Google AI Studio](https://aistudio.google.com/api-keys)

### Backend (Python FastAPI)

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API running at http://localhost:8000
```

### Frontend (React)

```bash
cd frontend
npm install
npm start
# Opens http://localhost:3000
```

### Add Your API Key

1. Open the app in browser
2. Sidebar → **Provider**: select `Groq` (free, no credit card)
3. Paste your API key → green ✓ confirms it's saved
4. Model list fetches automatically — look for the **`⚡ live`** badge
5. Start chatting!

---

## 🏗️ Tech Stack

### Frontend
| Technology | Role |
|---|---|
| React 18.3 | UI framework with hooks and context |
| Tailwind CSS | Utility-first dark theme styling |
| React Markdown + remark-gfm | Rich markdown rendering (tables, code blocks) |
| React Syntax Highlighter | VS Code Dark+ themed code blocks |
| Axios + Fetch API | Axios for non-streaming; Fetch for SSE streaming |
| localStorage | Persists config, API keys, chat history, model cache |

### Backend
| Technology | Role |
|---|---|
| FastAPI 0.115 | High-performance async Python framework |
| Uvicorn | ASGI server — serves both API and React static build |
| httpx | Fully async HTTP client for AI provider calls |
| Pydantic v2 | Request/response validation with strict typing |
| SSE-Starlette | Server-Sent Events for real-time token streaming |
| BeautifulSoup4 + lxml | HTML parsing for DOM analysis |
| Supabase | Optional auth/database integration |

---

## 📁 Project Structure

```
aimitra/
├── backend/
│   ├── main.py                     # FastAPI entry point + static serving
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── chat.py                 # /api/chat + /api/chat/stream endpoints
│   │   ├── models.py               # /api/models — live model list from provider APIs
│   │   ├── health.py               # /api/health + /api/capabilities
│   │   ├── analyzer.py             # DOM / page analyzer endpoint
│   │   ├── jira_api.py             # JIRA integration endpoints
│   │   ├── report.py               # Bug report submission
│   │   └── download.py             # File download endpoint
│   ├── services/
│   │   ├── openai_compat_service.py  # OpenAI + all compatible providers
│   │   ├── anthropic_service.py      # Anthropic Claude
│   │   ├── gemini_service.py         # Google Gemini
│   │   └── groq_service.py           # Groq
│   └── utils/
│       └── prompt_router.py          # Mode → system prompt mapping
│
├── frontend/
│   └── src/
│       ├── App.js                  # Root: 4-view layout + sidebar collapse state
│       ├── hooks/
│       │   ├── useConfig.js        # Config + API key state
│       │   ├── useChat.js          # Chat state + send/stream + local reply intercept
│       │   ├── useChatHistory.js   # Conversation history (localStorage)
│       │   ├── useModels.js        # Live model fetch + 1-hr localStorage cache
│       │   └── useAiQuery.js       # One-shot query hook for tool components
│       ├── services/
│       │   └── chatService.js      # API calls (streaming + non-streaming)
│       ├── utils/
│       │   ├── capabilities.js     # Mode + model definitions + getCapabilityWarning()
│       │   └── modeDetector.js     # Smart mode suggestion engine
│       └── components/
│           ├── Sidebar.jsx         # Config + nav + history + live model badge
│           ├── ChatWindow.jsx      # Chat layout + web search info banner
│           ├── ChatInput.jsx       # Message input + file/folder upload
│           ├── Message.jsx         # Markdown bubble + local reply badge
│           ├── devtools/           # 13 More Tools components
│           │   ├── DevPanel.jsx
│           │   ├── BddGenerator.jsx
│           │   ├── ApiTestGenerator.jsx
│           │   └── ... (10 more)
│           ├── jira/               # 7 JIRA tool components
│           │   ├── JiraPanel.jsx
│           │   └── ... (7 tool components)
│           └── ba/                 # 10 BA tool components
│               ├── BAPanel.jsx
│               └── ... (10 tool components)
│
├── generate_docs.py                # PDF documentation generator
├── generate_docs_word.py           # Word documentation generator
└── README.md
```

---

## 🤖 AI Providers & Models

> Model lists are fetched **live** from each provider's API when an API key is entered. The table below shows representative models — your actual dropdown will reflect the provider's current offerings.

| Provider | Tier | Notable Models |
|----------|------|----------------|
| Google Gemini | **Free** | gemini-2.0-flash, gemini-1.5-flash, gemma-3-27b |
| Groq | **Free** | llama-3.3-70b, mixtral-8x7b, llama-3.1-8b |
| Cerebras | **Free** | llama-3.3-70b, qwen-3-32b |
| OpenRouter | **Free*** | llama-3.3-70b-free, 200+ models |
| OpenAI | Paid | gpt-4o, gpt-4o-mini, o3-mini, o1, **dall-e-3** *(image gen)* |
| Anthropic | Paid | claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5 |
| Mistral AI | Paid | mistral-large, codestral, mistral-small |
| DeepSeek | Paid | deepseek-v3, deepseek-r1 (thinking) |
| xAI (Grok) | Paid | grok-3, grok-3-mini, grok-2 |
| Together AI | Paid | llama-3.3-70b, qwen, deepseek-r1 |
| Perplexity | Paid | sonar-pro, sonar *(real-time web search)* |
| Fireworks AI | Paid | llama-3.3-70b, deepseek-r1 |
| Cohere | Paid | command-r+, command-r |

> **Tip:** Start with Groq (fastest free option) — get a key at [console.groq.com](https://console.groq.com) in under a minute.

---

## 🔒 Security

- API keys are stored **only in your browser's localStorage** — never sent to the AiMitra server
- Keys are forwarded per-request directly to the AI provider — not logged or cached server-side
- API key patterns are scrubbed from all error messages
- No user accounts, no PII collected

---

## ☁️ Deployment

### Single-Service (Recommended for Render/Railway)

```bash
# Build React and copy to backend static folder
cd frontend && npm run build
cp -r build/* ../backend/static/

# FastAPI serves the React app + API from port 8000
cd ../backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker

```bash
docker build -t aimitra .
docker run -p 8000:8000 aimitra
```

### Free Hosting Options
- **[Render.com](https://render.com)** — Free tier, auto-deploy from GitHub
- **[Railway.app](https://railway.app)** — Free tier with GitHub integration
- **[Vercel](https://vercel.com)** — Frontend only (pair with a separate backend)

---

## 📚 Documentation

Full application documentation (all tools, demo data, architecture) available as a Word document:

```bash
pip install python-docx
python generate_docs_word.py
# Output: AiMitra_Documentation.docx
```

---

## 🆚 Why AiMitra?

| Feature | AiMitra | ChatGPT / Claude.ai | GitHub Copilot | Testim / Mabl |
|---|:---:|:---:|:---:|:---:|
| QA-specialised prompts | ✅ | ❌ | ❌ | Partial |
| BA tools (BRD, Gap Analysis…) | ✅ | ❌ | ❌ | ❌ |
| JIRA integration | ✅ | ❌ | ❌ | ❌ |
| File & folder upload | ✅ | Partial | ❌ | ❌ |
| Live model auto-fetch | ✅ | ❌ | ❌ | ❌ |
| 13 AI providers | ✅ | ❌ (1) | ❌ (1) | ❌ |
| Free tier capable | ✅ | Partial | ❌ | ❌ |
| Conversation history | ✅ | ✅ | N/A | N/A |
| Self-hostable | ✅ | ❌ | ❌ | ❌ |
| No account required | ✅ | ❌ | ❌ | ❌ |

---

## 👨‍💻 Developer

**Shiv Kant Kumar**  
Software Engineer · QA Enthusiast · AI Tools Builder

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/shivkantkumar/)

> AiMitra was built to solve a real problem: QA engineers, BAs, and developers need domain-expert AI tools, not generic chatbots. Every tool was designed from daily work experience.

---

## 📄 License

MIT — free to use, fork, and build on.
