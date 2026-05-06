"""
AiMitra — Application Documentation PDF Generator
Run: python generate_docs.py
Output: AiMitra_Documentation.pdf
"""

from fpdf import FPDF
from fpdf.enums import XPos, YPos
import os

def clean(text):
    """Sanitize text to latin-1 safe characters."""
    replacements = {
        '\u2014': '--', '\u2013': '-', '\u2022': '*', '\u2018': "'", '\u2019': "'",
        '\u201c': '"', '\u201d': '"', '\u2605': '*', '\u25c6': '<>', '\u2190': '<-',
        '\u2192': '->', '\u2191': '^', '\u2193': 'v', '\u00b7': '.', '\u2026': '...',
        '\u00a0': ' ', '\u00ae': '(R)', '\u00a9': '(C)', '\u2122': '(TM)',
        '\u00e9': 'e', '\u00e8': 'e', '\u00ea': 'e', '\u00e0': 'a', '\u00e2': 'a',
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    return text.encode('latin-1', errors='replace').decode('latin-1')

# ── Colours ─────────────────────────────────────────────────────────────────
PURPLE      = (124, 58, 237)
PURPLE_LIGHT= (167, 139, 250)
AMBER       = (217, 119, 6)
AMBER_LIGHT = (251, 191, 36)
BLUE        = (37, 99, 235)
EMERALD     = (5, 150, 105)
DARK_BG     = (13, 13, 26)
CARD_BG     = (26, 31, 46)
GRAY_TEXT   = (107, 114, 128)
WHITE       = (255, 255, 255)
LIGHT_TEXT  = (209, 213, 219)
RED         = (220, 38, 38)

class PDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(18, 18, 18)

    def cell(self, w=0, h=0, text="", *args, **kwargs):
        return super().cell(w, h, clean(str(text)), *args, **kwargs)

    def multi_cell(self, w, h, text="", *args, **kwargs):
        return super().multi_cell(w, h, clean(str(text)), *args, **kwargs)

    # ── Header / Footer ──────────────────────────────────────────────────────
    def header(self):
        # Fill full-page background on EVERY page (including auto-generated ones)
        self.set_fill_color(*DARK_BG)
        self.rect(0, 0, 210, 297, 'F')
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*PURPLE_LIGHT)
        self.set_y(3)
        self.cell(0, 4, "AiMitra — Complete Application Documentation", align="C")
        self.set_y(10)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-12)
        self.set_fill_color(*DARK_BG)
        self.rect(0, 297 - 12, 210, 12, 'F')
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*GRAY_TEXT)
        self.cell(0, 6, f"Page {self.page_no()}  |  Developed by Shiv Kant Kumar  |  linkedin.com/in/shivkantkumar/", align="C")

    # ── Helpers ───────────────────────────────────────────────────────────────
    def h1(self, text, color=PURPLE):
        self.ln(4)
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(*color)
        self.cell(0, 10, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        # underline
        self.set_draw_color(*color)
        self.set_line_width(0.6)
        self.line(self.get_x(), self.get_y(), self.get_x() + 174, self.get_y())
        self.ln(3)

    def h2(self, text, color=PURPLE_LIGHT):
        self.ln(3)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*color)
        self.cell(0, 8, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(1)

    def h3(self, text, color=AMBER_LIGHT):
        self.ln(2)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*color)
        self.cell(0, 6, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def body(self, text, color=LIGHT_TEXT):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*color)
        self.multi_cell(0, 5, text)
        self.ln(1)

    def bullet(self, text, color=LIGHT_TEXT):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*color)
        self.set_x(22)
        self.multi_cell(0, 5, f"\u2022  {text}")

    def badge(self, label, bg=PURPLE, fg=WHITE):
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(*bg)
        self.set_text_color(*fg)
        w = self.get_string_width(label) + 6
        self.cell(w, 6, label, fill=True, new_x=XPos.RIGHT, new_y=YPos.LAST)
        self.set_x(self.get_x() + 2)

    def card_start(self, color=CARD_BG):
        self.set_fill_color(*color)
        self.set_draw_color(*PURPLE)
        self.set_line_width(0.3)
        # we use a rect drawn after content — store y
        return self.get_y()

    def section_divider(self):
        self.ln(3)
        self.set_draw_color(*PURPLE)
        self.set_line_width(0.2)
        self.line(18, self.get_y(), 192, self.get_y())
        self.ln(3)

    def demo_box(self, label, text):
        self.ln(2)
        self.set_fill_color(15, 20, 35)
        self.set_draw_color(*EMERALD)
        self.set_line_width(0.4)
        y0 = self.get_y()
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*EMERALD)
        self.cell(0, 5, f"  {label}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, fill=True, border="TLR")
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*LIGHT_TEXT)
        self.set_x(18)
        self.multi_cell(0, 4.5, f"  {text}", border="BLR", fill=True)
        self.ln(1)

    def _entry_rows(self, rows, label_color, val_color=None):
        val_color = val_color or LIGHT_TEXT
        for label, val in rows:
            self.set_x(self.l_margin)
            self.set_font("Helvetica", "B", 8)
            self.set_text_color(*label_color)
            lw = 22
            self.cell(lw, 5, label, new_x=XPos.RIGHT, new_y=YPos.LAST)
            self.set_font("Helvetica", "", 8)
            self.set_text_color(*val_color)
            val_w = self.w - self.r_margin - self.x
            self.multi_cell(val_w, 5, val)

    def tool_entry(self, icon, name, when, why, how, demo_input, demo_note):
        self.ln(2)
        self.set_fill_color(30, 20, 50)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*PURPLE_LIGHT)
        self.cell(0, 7, f"  {icon}  {name}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self._entry_rows([("When:", when), ("Why:", why), ("How:", how)], AMBER_LIGHT)
        self.demo_box("  Demo Input -- paste this to test:", demo_input)
        if demo_note:
            self.set_x(self.l_margin)
            self.set_font("Helvetica", "I", 7.5)
            self.set_text_color(*GRAY_TEXT)
            self.multi_cell(174, 4, f"  Expected: {demo_note}")
        self.ln(1)

    def ba_tool_entry(self, icon, name, when, why, how, demo_input, demo_note):
        self.ln(2)
        self.set_fill_color(35, 25, 10)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*AMBER_LIGHT)
        self.cell(0, 7, f"  {icon}  {name}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self._entry_rows([("When:", when), ("Why:", why), ("How:", how)], PURPLE_LIGHT)
        self.demo_box("  Demo Input -- paste this to test:", demo_input)
        if demo_note:
            self.set_x(self.l_margin)
            self.set_font("Helvetica", "I", 7.5)
            self.set_text_color(*GRAY_TEXT)
            self.multi_cell(174, 4, f"  Expected: {demo_note}")
        self.ln(1)

    def jira_tool_entry(self, icon, name, when, why, how, demo_input, demo_note):
        self.ln(2)
        self.set_fill_color(10, 20, 40)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(147, 197, 253)
        self.cell(0, 7, f"  {icon}  {name}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self._entry_rows([("When:", when), ("Why:", why), ("How:", how)], AMBER_LIGHT)
        self.demo_box("  Demo Input -- paste this to test:", demo_input)
        if demo_note:
            self.set_x(self.l_margin)
            self.set_font("Helvetica", "I", 7.5)
            self.set_text_color(*GRAY_TEXT)
            self.multi_cell(174, 4, f"  Expected: {demo_note}")
        self.ln(1)


# ═══════════════════════════════════════════════════════════════════════════════
# BUILD PDF
# ═══════════════════════════════════════════════════════════════════════════════
pdf = PDF()
pdf.set_title("AiMitra — Complete Application Documentation")
pdf.set_author("Shiv Kant Kumar")

# ─────────────────────────────────────────────────────────────────────────────
# PAGE 1 — COVER
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

# Big gradient-style headline
pdf.set_y(55)
pdf.set_font("Helvetica", "B", 48)
pdf.set_text_color(*PURPLE_LIGHT)
pdf.cell(0, 20, "AiMitra", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.set_font("Helvetica", "", 16)
pdf.set_text_color(*AMBER_LIGHT)
pdf.cell(0, 8, "Your Intelligent AI Assistant", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.ln(4)
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(*GRAY_TEXT)
pdf.cell(0, 6, "Empowering QA Engineers, Business Analysts & Developers", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "to build better software, faster.", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.ln(14)
# decorative line
pdf.set_draw_color(*PURPLE)
pdf.set_line_width(1)
pdf.line(40, pdf.get_y(), 170, pdf.get_y())
pdf.ln(14)

# Stats
stats = [("13", "AI Providers"), ("50+", "AI Models"), ("30+", "Specialised Tools"), ("4", "Workspaces")]
col_w = 174 / len(stats)
pdf.set_x(18)
for val, lbl in stats:
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*PURPLE_LIGHT)
    pdf.cell(col_w, 12, val, align="C")
pdf.ln(12)
pdf.set_x(18)
for val, lbl in stats:
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*GRAY_TEXT)
    pdf.cell(col_w, 5, lbl, align="C")
pdf.ln(14)

pdf.set_draw_color(*AMBER)
pdf.set_line_width(0.5)
pdf.line(40, pdf.get_y(), 170, pdf.get_y())
pdf.ln(12)

# Workspace badges
for label, color in [("Chat & Code", PURPLE), ("Dev Tools", EMERALD), ("JIRA Tools", BLUE), ("BA Tools", AMBER)]:
    pdf.set_fill_color(*color)
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 9)
    w = pdf.get_string_width(label) + 10
    cur_x = pdf.get_x()
    if cur_x + w > 192:
        pdf.ln(10)
        pdf.set_x(18)
    pdf.cell(w, 7, label, fill=True, align="C")
    pdf.set_x(pdf.get_x() + 4)
pdf.ln(18)

# Tagline
pdf.set_font("Helvetica", "I", 10)
pdf.set_text_color(*GRAY_TEXT)
pdf.cell(0, 6, "Complete Application Documentation  |  All Tools  |  Demo Data  |  Getting Started", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.set_y(255)
pdf.set_draw_color(*PURPLE)
pdf.set_line_width(0.3)
pdf.line(18, pdf.get_y(), 192, pdf.get_y())
pdf.ln(5)
pdf.set_font("Helvetica", "B", 9)
pdf.set_text_color(*PURPLE_LIGHT)
pdf.cell(0, 5, "Developed by Shiv Kant Kumar", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 8)
pdf.set_text_color(*GRAY_TEXT)
pdf.cell(0, 5, "linkedin.com/in/shivkantkumar/", align="C")

# ─────────────────────────────────────────────────────────────────────────────
# PAGE 2 — TABLE OF CONTENTS
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

pdf.h1("Table of Contents", PURPLE_LIGHT)
pdf.ln(2)

toc = [
    ("1.", "About AiMitra", "Overview, vision, and what makes it unique"),
    ("2.", "Tech Stack", "Frontend, backend, AI integration, and infrastructure"),
    ("3.", "Unique Selling Points (USP)", "Why AiMitra stands out from other tools"),
    ("4.", "Getting Started", "Installation, setup, and first use"),
    ("5.", "Chat & Code Workspace", "7 AI-powered chat modes with demo data"),
    ("  5.1", "Text / Code Generation", ""),
    ("  5.2", "Code Debugging", ""),
    ("  5.3", "Test Case Generator", ""),
    ("  5.4", "Test Plan Generator", ""),
    ("  5.5", "DOM Locator Generator", ""),
    ("  5.6", "Web Search", ""),
    ("  5.7", "Image Generation", ""),
    ("6.", "Dev Tools Workspace", "14 specialised developer tools"),
    ("  6.1–6.14", "All Dev Tools with demo data", ""),
    ("7.", "JIRA Tools Workspace", "7 JIRA-integrated tools"),
    ("  7.1–7.7", "All JIRA Tools with demo data", ""),
    ("8.", "BA Tools Workspace", "10 Business Analyst tools"),
    ("  8.1–8.10", "All BA Tools with demo data", ""),
    ("9.", "Chrome Extension", "Direct DOM analysis & test generation in browser"),
    ("10.", "AI Providers & Models", "All 13 providers and 50+ models"),
    ("11.", "Architecture & Data Flow", "How the app works end-to-end"),
    ("12.", "About the Developer", "Shiv Kant Kumar — contact & LinkedIn"),
]

for num, title, desc in toc:
    pdf.set_font("Helvetica", "B" if not num.startswith("  ") else "", 9)
    pdf.set_text_color(*PURPLE_LIGHT if not num.startswith("  ") else LIGHT_TEXT)
    indent = 18 if not num.startswith("  ") else 26
    pdf.set_x(indent)
    pdf.cell(12, 6, num)
    pdf.cell(80, 6, title)
    if desc:
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(*GRAY_TEXT)
        pdf.multi_cell(0, 6, desc)
    else:
        pdf.ln(6)

# ─────────────────────────────────────────────────────────────────────────────
# PAGE 3 — ABOUT + TECH STACK
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

pdf.h1("1. About AiMitra")
pdf.body(
    "AiMitra (\"AI Friend\" in Sanskrit) is a fully-featured, open-architecture AI assistant designed specifically "
    "for the three pillars of software delivery: Quality Assurance (QA), Business Analysis (BA), and Software "
    "Development. It consolidates more than 30 purpose-built AI tools into a single, beautifully designed "
    "application, eliminating the need to juggle multiple AI services."
)
pdf.body(
    "Unlike generic AI chat tools, every workspace and every tool inside AiMitra has a carefully crafted system "
    "prompt that turns the AI into a domain expert — a senior QA lead, a seasoned BA, or a code reviewer — "
    "depending on what you need. The smart mode detector even suggests the right tool automatically when it "
    "detects keywords in your message."
)

pdf.h1("2. Tech Stack")
pdf.h2("Frontend")
stack_fe = [
    ("React 18.3", "UI framework with hooks, context, and automatic batching"),
    ("Tailwind CSS", "Utility-first styling with custom dark theme (no CSS files)"),
    ("React Markdown + remark-gfm", "Renders AI responses as rich markdown with tables, code blocks"),
    ("React Syntax Highlighter", "VS Code Dark+ themed code blocks with copy button"),
    ("Axios + Fetch API", "Axios for non-streaming calls; native Fetch for SSE streaming"),
    ("localStorage", "Persists API keys, config, conversation history — no account needed"),
]
for name, desc in stack_fe:
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*AMBER_LIGHT)
    pdf.set_x(22)
    pdf.cell(52, 5, name)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.multi_cell(0, 5, desc)

pdf.h2("Backend")
stack_be = [
    ("FastAPI 0.115", "High-performance async Python web framework; OpenAPI docs auto-generated"),
    ("Uvicorn", "Lightning-fast ASGI server; serves both API and built React app"),
    ("httpx", "Fully async HTTP client for all AI provider API calls"),
    ("Pydantic v2", "Request/response validation with strict typing"),
    ("SSE-Starlette", "Server-Sent Events for real-time token streaming"),
    ("BeautifulSoup4 + lxml", "HTML parsing for the web page DOM analyser"),
    ("Supabase", "Optional auth/database integration"),
]
for name, desc in stack_be:
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PURPLE_LIGHT)
    pdf.set_x(22)
    pdf.cell(52, 5, name)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.multi_cell(0, 5, desc)

pdf.h2("AI Integration")
pdf.body(
    "AiMitra supports 13 AI providers (OpenAI, Anthropic, Google Gemini, Groq, Mistral, DeepSeek, xAI/Grok, "
    "Together AI, Perplexity, Cerebras, OpenRouter, Fireworks AI, Cohere) and 50+ individual models. "
    "The backend acts as a thin proxy: API keys are entered by the user, stored in localStorage, and forwarded "
    "per-request — they are never stored on the server. Provider routing is automatic based on the selected "
    "model/provider. All providers support both streaming (SSE) and non-streaming modes."
)

# ─────────────────────────────────────────────────────────────────────────────
# PAGE — USP
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

pdf.h1("3. Unique Selling Points (USP)")

usps = [
    ("All-in-One Platform",
     "30+ specialised tools across 4 workspaces (Chat, Dev Tools, JIRA, BA). No context switching between "
     "multiple AI services. Everything a QA, BA, and Dev needs in one interface."),
    ("No Vendor Lock-in — 13 Providers",
     "Switch between OpenAI, Gemini, Groq (free), Anthropic, DeepSeek and 9 more at any time. Free-tier "
     "providers (Groq, Gemini, Cerebras, OpenRouter) mean you can use the full feature set at zero cost."),
    ("Domain-Expert AI (Specialised Prompts)",
     "Each tool has a meticulously crafted system prompt that transforms the AI into a domain expert: senior "
     "QA lead for test plans, seasoned BA for BRDs, expert debugger for code issues. Generic AI gives generic "
     "results — AiMitra gives expert results."),
    ("Smart Mode Detector",
     "Paste a stack trace in the wrong mode? AiMitra detects it and suggests Code Debugging. Ask for test cases "
     "in chat? It suggests Test Case Generator. The smart detector uses keyword analysis with no extra API calls."),
    ("Real-time Streaming",
     "Every AI response streams token-by-token to the UI. No waiting for the full response — you start reading "
     "as the AI thinks. Switchable off for providers that don't support it."),
    ("Chrome Extension",
     "The built-in Chrome extension reads the live DOM of any webpage, captures real CSS selectors, XPaths, "
     "form structures, and feeds them directly to AI — generating test code grounded in the actual page, not "
     "generic placeholders."),
    ("Conversation History",
     "Every chat and tool output is auto-saved to local history with timestamp, model, and title. Resume any "
     "previous conversation with a single click. History is private — stored in your browser only."),
    ("Zero Infrastructure Cost",
     "No database required. No user accounts. No monthly subscription. Deploy on any free hosting "
     "(Render, Railway, Vercel) — or run locally with two terminal commands."),
    ("BA Tools — Often Overlooked",
     "Most AI tools focus on developers. AiMitra's dedicated BA workspace with User Story Generator, "
     "Gap Analysis, BRD Generator, Impact Analysis, and 6 more tools makes it the only QA/dev AI tool "
     "that also fully serves business analysts."),
    ("Comparison with alternatives",
     "vs. ChatGPT/Claude.ai: no specialised QA/BA prompts, no JIRA integration, no Chrome extension.\n"
     "vs. GitHub Copilot: code only, no QA, no BA, no test planning.\n"
     "vs. Testim/Mabl: expensive, no BA tools, no multi-provider AI.\n"
     "AiMitra: free-tier capable, multi-role, multi-provider, all-in-one."),
]

for title, desc in usps:
    pdf.h3(f"★  {title}", AMBER_LIGHT)
    pdf.body(desc)
    pdf.ln(1)

# ─────────────────────────────────────────────────────────────────────────────
# PAGE — GETTING STARTED
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

pdf.h1("4. Getting Started")

pdf.h2("Prerequisites")
for item in ["Node.js 18+", "Python 3.11+", "Git", "A free API key from Groq (console.groq.com) or Google AI Studio"]:
    pdf.bullet(item)

pdf.h2("Installation — Local Development")
pdf.demo_box("Step 1 — Clone the repository", "git clone https://github.com/shivkantkumar/aimitra.git\ncd aimitra")
pdf.demo_box("Step 2 — Backend setup", "cd backend\npip install -r requirements.txt\ncp .env.example .env   # add your keys if needed\nuvicorn main:app --reload --port 8000")
pdf.demo_box("Step 3 — Frontend setup (new terminal)", "cd frontend\nnpm install\nnpm start             # opens http://localhost:3000")
pdf.demo_box("Step 4 — Add your API key", "Open the app in browser → Sidebar → Provider: Groq → API Key: paste key → Save")

pdf.h2("First Use Walkthrough")
steps = [
    "Select a Provider in the left sidebar (Groq is free — no credit card required).",
    "Paste your API key and press Enter. A green checkmark confirms it is saved.",
    "The default workspace is Chat. Type any message and press Enter or click Send.",
    "Try: \"Write test cases for a login page\" — the smart detector will suggest switching to Test Case Generator.",
    "Switch to Dev Tools (top nav) to access Code Review, BDD Generator, API Test Generator, and more.",
    "Switch to BA Tools to access User Story Generator, BRD Generator, Gap Analysis, and more.",
    "Switch to JIRA to create tickets, validate stories, or generate JQL queries.",
    "Install the Chrome Extension from the chrome-extension/ folder to generate tests from any webpage.",
]
for i, s in enumerate(steps, 1):
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PURPLE_LIGHT)
    pdf.set_x(22)
    pdf.cell(8, 5, f"{i}.")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.multi_cell(0, 5, s)

pdf.h2("Configuration Options")
configs = [
    ("Provider", "Choose from 13 AI providers. Switch at any time — conversation continues."),
    ("Model", "Select any model from the chosen provider's list."),
    ("Temperature", "0.0 = precise/deterministic. 1.0 = creative/varied. Default: 0.7."),
    ("Streaming", "Toggle real-time token streaming. Disable for providers with latency issues."),
    ("API Key", "Stored in browser localStorage. Never sent to any server except the chosen AI provider."),
]
for name, desc in configs:
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*AMBER_LIGHT)
    pdf.set_x(22)
    pdf.cell(30, 5, name)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.multi_cell(0, 5, desc)

# ─────────────────────────────────────────────────────────────────────────────
# PAGE — CHAT WORKSPACE
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

pdf.h1("5. Chat & Code Workspace")
pdf.body(
    "The Chat workspace is the heart of AiMitra. It provides 7 specialised modes, each with a tailored AI "
    "system prompt. The Smart Mode Detector automatically suggests the best mode based on your message. "
    "All conversations are auto-saved to Activity History."
)

chat_tools = [
    ("💬", "Text / Code Generation",
     "Everyday use — answering questions, generating code, writing documentation, explaining concepts.",
     "General-purpose mode with a senior engineer persona. Provides structured, well-explained answers.",
     "Select 'Text/Code Generation' from sidebar → type your question → press Enter.",
     "Write a Python function to validate email addresses using regex. Add type hints and docstring.",
     "Returns a clean Python function with type hints, docstring, regex pattern, and usage example."),

    ("🐛", "Code Debugging",
     "When you have an error, stack trace, or broken code that needs fixing.",
     "The AI acts as an expert debugger — identifies root cause, explains the bug, and provides a corrected fix.",
     "Paste your code + the error message → select Code Debugging mode → submit.",
     "TypeError: unsupported operand type(s) for +: 'int' and 'str'\nLine 15: result = count + \" items\"\nFix this.",
     "Identifies type mismatch, explains the root cause, provides fixed code with str(count) + \" items\"."),

    ("🧪", "Test Case Generator",
     "When you need Selenium/Playwright test cases for a feature, user story, or API endpoint.",
     "Generates production-quality tests with proper assertions, waits, POM structure, and edge cases.",
     "Describe the feature or paste the user story → select Test Case Generator → submit.",
     "Generate Playwright Python test cases for a login page with username, password fields and a submit button. Include happy path, wrong password, empty fields, and SQL injection tests.",
     "Returns complete Playwright test file with fixtures, parametrize decorators, and 4 test functions."),

    ("📋", "Test Plan Generator",
     "At the start of a sprint or feature cycle when you need a formal QA test plan.",
     "Creates IEEE 829-compliant test plans with scope, risks, entry/exit criteria, and resource planning.",
     "Select Test Plan Generator → describe the feature/project → submit.",
     "Create a test plan for an e-commerce checkout flow: cart, address, payment (Stripe), and order confirmation. API + UI testing required.",
     "Returns a structured test plan with objectives, scope, test types, risks, schedule, and sign-off section."),

    ("🎯", "DOM Locator Generator",
     "When writing automation scripts and you need reliable XPath/CSS selectors for a web element.",
     "Generates robust, stable locators using ID, data-testid, aria-label — not fragile nth-child paths.",
     "Describe the element or paste the HTML snippet → select DOM Locator Generator → submit.",
     "Generate locators for: <button class=\"btn-primary\" id=\"submit-order\" aria-label=\"Place Order\">Place Order</button>",
     "Returns CSS selector, XPath, and Playwright/Selenium code snippets using the most stable attribute."),

    ("🔍", "Web Search",
     "When you need current information — latest library versions, recent CVEs, today's news.",
     "Uses the AI's broad knowledge base to answer time-sensitive questions with references.",
     "Select Web Search mode → type your query → submit.",
     "What are the latest breaking changes in Playwright 1.44 and how do they affect existing tests?",
     "Returns a summary of breaking changes, migration guide, and links to the official changelog."),

    ("🎨", "Image Generation",
     "When you need to describe or prompt an image for design, wireframing, or documentation.",
     "Since direct generation is not always available, returns detailed image prompts for DALL-E/Midjourney.",
     "Select Image Generation mode → describe what you want → submit.",
     "Create a logo for a software testing tool called 'AiMitra'. Modern, dark theme, violet and blue gradient, robot icon.",
     "Returns a detailed prompt for DALL-E/Stable Diffusion plus design specifications."),
]

for icon, name, when, why, how, demo, note in chat_tools:
    pdf.tool_entry(icon, name, when, why, how, demo, note)

# ─────────────────────────────────────────────────────────────────────────────
# PAGE — DEV TOOLS
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

pdf.h1("6. Dev Tools Workspace", EMERALD)
pdf.body(
    "The Dev Tools workspace contains 14 specialised one-shot tools for developers. Each tool has a dedicated UI "
    "with options (language, framework, pattern), a focused system prompt, and a copy/download button for the output."
)

dev_tools = [
    ("🧩", "Chrome Extension",
     "When you need to generate test code for a live webpage directly from your browser.",
     "Reads the actual DOM — real CSS selectors, XPaths, form structures — and feeds them to AI. No guessing.",
     "Install from chrome-extension/ folder → open any webpage → click extension icon → select framework & language → Generate.",
     "Open https://automationpractice.pl/ in Chrome, click the extension, pick Playwright + Python + POM, click Generate.",
     "Returns a complete POM class + test file using real selectors from the live page."),

    ("🧭", "Tool Helper",
     "When you are not sure which AiMitra tool to use for your task.",
     "Guides you to the right tool by asking about your goal and matching it to the best workspace/tool.",
     "Select Tool Helper → describe what you want to achieve → get directed to the right tool.",
     "I want to test a REST API that returns user profiles. What tool should I use and how?",
     "Recommends API Test Generator, explains how to use it, and shows a sample cURL input format."),

    ("🔍", "Code Explainer",
     "When you receive unfamiliar code and need to understand it quickly.",
     "Breaks down complex code into plain English with line-by-line or block-by-block explanations.",
     "Paste the code snippet → click Explain → choose detail level (summary/detailed/beginner).",
     "def memoize(func):\n    cache = {}\n    def wrapper(*args):\n        if args not in cache:\n            cache[args] = func(*args)\n        return cache[args]\n    return wrapper",
     "Explains the memoization decorator pattern, closure, and cache dictionary with a real usage example."),

    ("🕵️", "Code Review",
     "Before submitting a pull request or reviewing a colleague's code.",
     "Reviews for bugs, security issues, performance, readability, and SOLID principles. Gives a score.",
     "Paste the code → select language → click Review. Choose focus area (security/performance/style).",
     "def get_user(id):\n    query = f\"SELECT * FROM users WHERE id={id}\"\n    return db.execute(query)",
     "Flags SQL injection vulnerability, suggests parameterized queries, gives security score 2/10."),

    ("🐛", "Debug & Fix",
     "When you have broken code and want the AI to identify and fix the bug automatically.",
     "Combines root cause analysis with a working fix. Explains what changed and why.",
     "Paste the broken code + the error → click Fix. The AI returns corrected code + explanation.",
     "async function fetchData() {\n  const data = await fetch('/api/users')\n  return data.json  // missing parentheses\n}",
     "Identifies missing () on .json, returns corrected code, explains the difference between property and method call."),

    ("🔄", "Code Converter",
     "When migrating code between languages, frameworks, or syntax versions.",
     "Accurately converts logic while adapting idioms — e.g. Python list comprehensions to Java streams.",
     "Paste source code → select source language → select target language → convert.",
     "Convert this Python to JavaScript:\nusers = [u for u in all_users if u['active'] and u['age'] >= 18]",
     "Returns: const users = allUsers.filter(u => u.active && u.age >= 18); with explanation of differences."),

    ("📝", "Regex Builder",
     "When you need to write or understand a regular expression for validation or parsing.",
     "Generates regex with explanation, test cases, and code snippet for your chosen language.",
     "Describe the pattern in plain English → select language → build.",
     "Regex to validate an Indian mobile number: starts with 6, 7, 8, or 9, exactly 10 digits total.",
     "Returns: /^[6-9]\\d{9}$/ with explanation, Python/JS usage code, and 5 test cases (pass/fail)."),

    ("🗄️", "SQL Helper",
     "When writing complex SQL queries, optimising slow queries, or designing schema.",
     "Writes optimised SQL with proper JOINs, indexes, window functions, and CTEs. Explains execution plan.",
     "Describe what data you need in plain English → select SQL dialect → generate.",
     "Get the top 5 customers by total order value in the last 90 days, include their email and order count. MySQL.",
     "Returns a CTE-based query with JOIN, GROUP BY, ORDER BY, LIMIT, and an explanation of each clause."),

    ("📦", "Git Assistant",
     "When you need help with git commands, commit messages, branching strategy, or resolving conflicts.",
     "Provides exact git commands, explains the effect, and warns about destructive operations.",
     "Describe your git situation → get commands and explanation.",
     "I accidentally committed my .env file with API keys to main. How do I remove it from git history completely?",
     "Returns: git filter-branch or BFG Repo Cleaner steps + force push + .gitignore fix + GitHub secret scanning note."),

    ("🐳", "DevOps Generator",
     "When setting up CI/CD pipelines, Dockerfiles, GitHub Actions, or Kubernetes manifests.",
     "Generates production-ready DevOps configs tailored to your stack and environment.",
     "Select the DevOps artefact type → describe your stack → generate.",
     "Generate a GitHub Actions CI/CD pipeline for a React + FastAPI app: lint, test, build Docker image, push to DockerHub, deploy to Render.",
     "Returns a complete .github/workflows/deploy.yml with jobs, secrets usage, and Docker build/push steps."),

    ("🎲", "JSON & Mock Data",
     "When you need sample data for testing, prototyping, or API mocking.",
     "Generates realistic, schema-consistent JSON mock data with proper data types and relationships.",
     "Describe the data structure or paste a schema → specify count → generate.",
     "Generate 5 mock user records with: id (UUID), name, email, role (admin/user/viewer), createdAt (ISO date), isActive.",
     "Returns a JSON array of 5 realistic records with proper UUIDs, plausible names, and varied roles."),

    ("🥒", "BDD Generator",
     "When writing Gherkin feature files for Cucumber, SpecFlow, Behave, or Pytest-BDD.",
     "Creates complete .feature files with Background, Scenario Outlines, Examples tables, and step definition stubs.",
     "Paste the user story → select framework (Cucumber/Behave/SpecFlow) → select scenario coverage → generate.",
     "As a registered user, I want to reset my password via email link, so that I can regain account access. Include edge cases: expired link, already used link, invalid email.",
     "Returns a .feature file with 5 scenarios + Scenario Outline + step definition stubs in the chosen language."),

    ("🔌", "API Test Generator",
     "When writing automated tests for REST APIs using Postman, pytest, or RestAssured.",
     "Generates complete API test suites with setup, authentication, status code checks, schema validation, and edge cases.",
     "Paste the API endpoint details (URL, method, headers, body) → select framework → generate.",
     "POST /api/auth/login — body: {email, password} — returns JWT token. Generate pytest tests for success, wrong password, missing fields, rate limiting.",
     "Returns a complete pytest file with requests library, fixtures, parametrize, and 4 test functions."),

    ("♿", "A11y Checker",
     "When reviewing a UI for accessibility compliance (WCAG 2.1 AA) before release.",
     "Analyses HTML/component code for missing ARIA labels, contrast issues, keyboard navigation, and screen reader support.",
     "Paste your HTML or React component → click Check → get a prioritised list of issues with fixes.",
     "<button onclick='submit()' style='color:#aaa; background:#bbb'>Submit</button>",
     "Flags: missing type attribute, insufficient colour contrast (3.1:1 vs required 4.5:1), no aria-label, no keyboard focus style."),
]

for icon, name, when, why, how, demo, note in dev_tools:
    pdf.tool_entry(icon, name, when, why, how, demo, note)

# ─────────────────────────────────────────────────────────────────────────────
# PAGE — JIRA TOOLS
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

pdf.h1("7. JIRA Tools Workspace", (147, 197, 253))
pdf.body(
    "The JIRA workspace contains 7 AI-powered tools designed to make Jira work faster and more consistent. "
    "From writing well-structured tickets to generating JQL queries, every tool follows Agile best practices "
    "and outputs content ready to copy-paste into Jira."
)

jira_tools = [
    ("🤖", "Ask Rovo",
     "When you have a general Jira/Agile question and want expert guidance.",
     "Acts as a Jira expert — explains workflows, best practices, configuration options, and Agile ceremonies.",
     "Switch to JIRA workspace → Ask Rovo → type your question.",
     "What is the difference between a Story, Task, and Sub-task in Jira? When should I use each?",
     "Returns a clear comparison table with use cases and examples for each issue type."),

    ("🎫", "Ticket Creator",
     "When you need to create a well-structured Jira Story or Epic from a rough idea.",
     "Produces a complete ticket with Summary, Description, Acceptance Criteria, Story Points estimate, Labels, and Components.",
     "Describe the feature in a few sentences → click Create Ticket → copy the output into Jira.",
     "We need to add a 'Remember Me' checkbox to the login page. It should keep the user logged in for 30 days using a secure HTTP-only cookie.",
     "Returns a complete Jira ticket with summary, description, 3 acceptance criteria, 3 story points, and labels."),

    ("🐛", "Bug Creator",
     "When logging a bug found during testing and you need a thorough, reproducible bug report.",
     "Creates a professional bug report with Environment, Steps to Reproduce, Expected vs Actual, Severity, and Attachments note.",
     "Describe the bug → click Create Bug → copy to Jira.",
     "On Safari iOS 17, the checkout button becomes unresponsive after selecting a delivery address. The page does not show any error. Affects 100% of iOS Safari users.",
     "Returns a bug ticket with severity Critical, browser/OS details, 4 reproduction steps, and suggested fix area."),

    ("🔍", "JQL Search",
     "When you need to find specific issues in Jira using complex criteria.",
     "Generates optimised JQL queries with explanations. Returns alternative queries for edge cases.",
     "Describe what issues you want to find → click Generate JQL → paste into Jira board filter.",
     "Find all critical bugs assigned to me that were created in the last 2 weeks and are still open, sorted by creation date.",
     "Returns: assignee = currentUser() AND priority = Critical AND issuetype = Bug AND created >= -14d AND status != Done ORDER BY created DESC"),

    ("📋", "Test Plan Review",
     "When you have a test plan in Jira and want an AI review for completeness and quality.",
     "Reviews test plans for missing coverage areas, unclear acceptance criteria, risk gaps, and non-functional requirements.",
     "Paste the test plan content → click Review → get a structured feedback report.",
     "Test Plan: Login feature. Scope: UI testing only. Tests: valid login, invalid login. Exit criteria: all tests pass.",
     "Flags: missing API test scope, no performance/security testing, vague exit criteria, no negative test for SQL injection."),

    ("✅", "Ticket Validator",
     "Before a ticket enters a sprint — to check if it is ready (Definition of Ready).",
     "Validates against Agile best practices: clear acceptance criteria, estimated, no ambiguous language, dependencies noted.",
     "Paste the ticket content → click Validate → get a readiness score and list of issues.",
     "Story: As a user I want a better dashboard. AC: Dashboard should be improved. SP: TBD. Priority: High.",
     "Score 3/10. Issues: too vague (no specific improvements listed), no story points, acceptance criteria not testable, no wireframe linked."),

    ("💬", "Comment Generator",
     "When you need to add a professional update comment to a Jira ticket.",
     "Generates clear, professional comments for status updates, blockers, QA sign-offs, and deployment notes.",
     "Describe the update situation → select comment type (status update/blocker/QA pass/deployment) → generate.",
     "QA has completed testing of the login feature. Found 1 minor bug (misaligned button on mobile — logged as PROJ-456). All critical and major tests passed. Recommending for release.",
     "Returns a formatted QA sign-off comment with test summary, linked bug, and recommendation."),
]

for icon, name, when, why, how, demo, note in jira_tools:
    pdf.jira_tool_entry(icon, name, when, why, how, demo, note)

# ─────────────────────────────────────────────────────────────────────────────
# PAGE — BA TOOLS
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

pdf.h1("8. BA Tools Workspace", AMBER_LIGHT)
pdf.body(
    "The BA (Business Analyst) workspace is AiMitra's most unique differentiator — no other QA/dev AI tool "
    "offers a dedicated BA toolkit. It contains 10 tools covering the full BA lifecycle from requirements "
    "gathering to stakeholder communication."
)

ba_tools = [
    ("📖", "User Story Generator",
     "At the start of a sprint when converting stakeholder requirements into development-ready user stories.",
     "Produces stories in standard 'As a... I want... So that...' format with acceptance criteria, story points, and DoD.",
     "Select User Story Generator → choose the user role → select story type (standard/epic/spike) → describe the feature.",
     "Feature: Users should be able to export their dashboard data as a CSV file. Role: Data Analyst.",
     "Returns a complete user story with title, narrative, 4 acceptance criteria, 5 story points, and DoD checklist."),

    ("✅", "Acceptance Criteria",
     "After writing a user story when you need detailed, testable acceptance criteria.",
     "Generates criteria in Gherkin (Given/When/Then), checklist, or both formats — ready for QA handoff.",
     "Paste the user story → select format (Gherkin/checklist/both) → generate.",
     "As a user, I want to receive an email notification when my order ships, so I can track my delivery.",
     "Returns 5 Gherkin scenarios covering: order ships, email content, multiple items, cancelled order, unsubscribe."),

    ("🎭", "Use Case Generator",
     "During requirements analysis when you need formal use case documentation for complex features.",
     "Creates complete use cases with Actors, Preconditions, Main Success Scenario, Alternative Flows, and Exception Flows.",
     "Describe the feature → list the actors → select complexity (simple/standard/detailed) → generate.",
     "Feature: Online appointment booking system. Actors: Patient, Doctor, Receptionist, Notification Service. Complexity: detailed.",
     "Returns UC-001 with 8-step main flow, 3 alternative flows (reschedule, cancel, no availability), and exception handling."),

    ("🔎", "Requirements Analyzer",
     "When reviewing a requirements document before development begins — to catch issues early.",
     "Identifies gaps, ambiguities, conflicts, and testability issues. Each finding cites the original text and suggests a fix.",
     "Paste the requirements text → select analysis types (gaps/ambiguities/conflicts/testability) → analyze.",
     "REQ-01: The system shall be fast. REQ-02: Users can upload files. REQ-03: The dashboard should show relevant data.",
     "Flags: REQ-01 has no measurable metric (suggest: <2s response), REQ-02 has no size/format constraint, REQ-03 is ambiguous."),

    ("🔄", "Process Flow Generator",
     "When documenting a business process for sign-off, training material, or system design.",
     "Creates numbered process flows with decision points (◆), swim lanes by role, and clear Start/End markers.",
     "Describe the process → select AS-IS/TO-BE/Both → toggle swim lanes → generate.",
     "Document the employee expense reimbursement process: employee submits receipt, manager approves/rejects, finance processes payment, employee receives funds.",
     "Returns a 4-lane swim-lane flow (Employee/Manager/Finance/System) with 12 numbered steps and 2 decision points."),

    ("📄", "BRD Generator",
     "When preparing formal project documentation for executive sign-off or vendor procurement.",
     "Generates professional BRD sections with numbered requirements (REQ-001 format), MoSCoW priority, and rationale.",
     "Describe the project/feature → select section (full/scope/functional/non-functional/constraints) → generate.",
     "Project: Customer Self-Service Portal. Customers can view invoices, raise support tickets, and track order status. Section: Full BRD.",
     "Returns a complete BRD with 15+ numbered requirements, priority levels, constraints, and assumptions section."),

    ("📊", "Gap Analysis",
     "When planning a system migration, process improvement, or digital transformation initiative.",
     "Creates a structured gap table (Gap | Category | Impact | Priority | Recommendation) and a phased roadmap.",
     "Describe current state in first box → describe desired state in second box → select category → analyze.",
     "Current: Manual invoice processing via email, 3-day turnaround, 15% error rate.\nDesired: Automated invoice portal, same-day processing, <1% error rate.",
     "Returns 6 identified gaps across Process/Technology/People categories with High/Medium/Low impact and a 3-phase roadmap."),

    ("📧", "Stakeholder Update",
     "After a milestone, incident, or scope change when stakeholders need to be informed professionally.",
     "Generates tailored communications — executive brevity for C-suite, technical detail for dev teams, simple language for end users.",
     "Describe the update → select audience (executive/technical/end-users/project-team) → select tone → generate.",
     "The mobile app launch has been delayed by 2 weeks due to a critical payment gateway integration issue discovered in UAT. New launch date: March 15.",
     "Returns an executive email with subject line, 3-bullet summary, business impact, and next steps. No technical jargon."),

    ("📝", "Meeting Summarizer",
     "After any meeting — requirements workshop, sprint review, stakeholder call — to capture outcomes.",
     "Extracts Key Decisions, Action Items (with owner/due date), Discussion Points, and Parking Lot items.",
     "Paste raw meeting notes (even messy/bullet points) → select meeting type → summarize.",
     "Discussed login redesign, John said we need SSO, Sarah mentioned deadline is Q2, Mike will check with security team by Friday, old design needs to be archived, budget not confirmed yet.",
     "Returns structured summary: 1 decision (SSO required), 2 action items (Mike: security review by Friday, Sarah: Q2 deadline confirmed), 1 parking lot (budget)."),

    ("💥", "Impact Analysis",
     "Before approving a change request or architectural decision that affects multiple teams or systems.",
     "Assesses impact across People, Process, Technology, and Data — with impact level (High/Medium/Low) and mitigation strategies.",
     "Describe the proposed change → select impact areas (people/process/technology/data) → analyze.",
     "We are replacing our MySQL database with MongoDB for the product catalogue service. All existing SQL queries will need rewriting. 3 teams affected.",
     "Returns impact table: Technology HIGH (query rewrite, ORM change), People MEDIUM (training 3 teams), Process LOW, Data HIGH (schema migration). Risk score: 7/10."),
]

for icon, name, when, why, how, demo, note in ba_tools:
    pdf.ba_tool_entry(icon, name, when, why, how, demo, note)

# ─────────────────────────────────────────────────────────────────────────────
# PAGE — CHROME EXTENSION + PROVIDERS + ARCHITECTURE
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

pdf.h1("9. Chrome Extension")
pdf.body(
    "The AiMitra Chrome Extension brings AI-powered test generation directly into the browser. It reads the live "
    "DOM of any webpage and generates complete, runnable test scripts using the actual CSS selectors, XPaths, "
    "and form structures found on the page — no generic placeholders."
)

pdf.h2("Features")
for f in [
    "DOM analysis: captures forms, inputs, buttons, links, ARIA roles, data-testid attributes",
    "Element Picker: click any element on the page to add it to the test target list",
    "4 frameworks: Playwright, Selenium, Cypress, WebdriverIO",
    "4 languages: Python, JavaScript, TypeScript, Java",
    "3 patterns: POM (Page Object Model), BDD/Gherkin, Simple function-based",
    "13 AI providers configurable — same providers as the main app",
    "Auto-injects content script into pages opened before extension was loaded",
]:
    pdf.bullet(f)

pdf.h2("Installation")
for step in [
    "Open Chrome and navigate to chrome://extensions/",
    "Enable 'Developer Mode' (toggle, top right)",
    "Click 'Load Unpacked'",
    "Select the chrome-extension/ folder from the AiMitra project",
    "The AiMitra icon appears in the Chrome toolbar",
    "Click the icon on any webpage to open the generator",
]:
    pdf.bullet(step)

pdf.h2("Demo — Test it now")
pdf.demo_box("Step 1: Open any website", "Navigate to: https://automationpractice.pl/index.php?controller=authentication")
pdf.demo_box("Step 2: Click extension icon", "The popup shows: Forms: 1, Buttons: 2, Inputs: 2, Links: 8")
pdf.demo_box("Step 3: Configure and generate", "Framework: Playwright | Pattern: POM | Language: Python → Click Generate Test Code")
pdf.body("Expected: A complete Python POM class with EmailInput, PasswordInput, SignInButton locators, plus a test file with login happy path and negative test cases.")

pdf.section_divider()
pdf.h1("10. AI Providers & Models")
providers = [
    ("Google Gemini", "Free", "gemini-2.0-flash, gemini-1.5-flash, gemma-3-27b", "Best free option for vision and large context"),
    ("Groq", "Free", "llama-3.3-70b, llama-3.1-8b, mixtral-8x7b", "Fastest inference — ideal for quick answers"),
    ("Cerebras", "Free", "llama-3.3-70b, qwen-3-32b", "Ultra-fast alternative to Groq"),
    ("OpenRouter", "Free*", "llama-3.3-70b-free, many others", "Aggregator — 200+ models, free tier available"),
    ("OpenAI", "Paid", "gpt-4o, gpt-4o-mini, o3-mini, o1", "Best overall quality, strong at code"),
    ("Anthropic", "Paid", "claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5", "Best for long documents, precise reasoning"),
    ("Mistral AI", "Paid", "mistral-large, codestral, mistral-small", "Strong European alternative, good at code"),
    ("DeepSeek", "Paid", "deepseek-v3, deepseek-r1 (thinking)", "Excellent reasoning, very cost-effective"),
    ("xAI (Grok)", "Paid", "grok-3, grok-3-mini, grok-2", "Real-time web access in some modes"),
    ("Together AI", "Paid", "llama-3.3-70b, qwen, deepseek-r1", "Wide model selection, good batch pricing"),
    ("Perplexity", "Paid", "sonar-pro, sonar, r1-1776", "Best for web-search-augmented answers"),
    ("Fireworks AI", "Paid", "llama-3.3-70b, deepseek-r1, qwen", "Low latency, good for production use"),
    ("Cohere", "Paid", "command-r+, command-r", "Best for RAG and enterprise search workflows"),
]
pdf.set_font("Helvetica", "B", 8)
pdf.set_fill_color(30, 20, 50)
pdf.set_text_color(*PURPLE_LIGHT)
pdf.cell(38, 6, "Provider", fill=True)
pdf.cell(16, 6, "Tier", fill=True)
pdf.cell(68, 6, "Key Models", fill=True)
pdf.cell(0, 6, "Best For", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
for i, (name, tier, models, best) in enumerate(providers):
    bg = (13, 13, 26) if i % 2 == 0 else (20, 25, 40)
    pdf.set_fill_color(*bg)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(*LIGHT_TEXT)
    y0 = pdf.get_y()
    pdf.cell(38, 5, name, fill=True)
    tc = (134, 239, 172) if "Free" in tier else (251, 191, 36)
    pdf.set_text_color(*tc)
    pdf.cell(16, 5, tier, fill=True)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.cell(68, 5, models, fill=True)
    pdf.multi_cell(52, 5, best, fill=True)

# ─────────────────────────────────────────────────────────────────────────────
# PAGE — ARCHITECTURE + DEVELOPER
# ─────────────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*DARK_BG)
pdf.rect(0, 0, 210, 297, 'F')

pdf.h1("11. Architecture & Data Flow")
pdf.body(
    "AiMitra uses a clean client-server architecture where the React frontend handles all UI state and the "
    "FastAPI backend acts as a secure proxy between the user and AI provider APIs."
)

pdf.h2("Request Flow — Non-Streaming")
steps_arch = [
    "User types a message and clicks Send",
    "React sends POST /api/chat with: message, mode, api_key, model, provider, temperature, history",
    "FastAPI validates the request (Pydantic ChatRequest model)",
    "prompt_router.py maps the mode to a (system_prompt, user_message) pair",
    "_pick_service() selects the correct backend service based on provider/model",
    "The service calls the AI provider's API (httpx async call)",
    "Response text is returned to FastAPI → JSON response to React → rendered as markdown",
]
for i, s in enumerate(steps_arch, 1):
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PURPLE_LIGHT)
    pdf.set_x(22)
    pdf.cell(8, 5, f"{i}.")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.multi_cell(0, 5, s)

pdf.h2("Request Flow — Streaming (SSE)")
pdf.body(
    "When streaming is enabled (default), the same request goes to POST /api/chat/stream. FastAPI returns a "
    "StreamingResponse wrapping an async generator. Each AI token is wrapped as 'data: {\"chunk\": \"...\"}\\n\\n' "
    "and sent via SSE. React's native Fetch API reads the ReadableStream line-by-line and appends each chunk to "
    "the message in real time. The UI shows the message growing token by token."
)

pdf.h2("Security Design")
for item in [
    "API keys are stored in browser localStorage — never on the server or in any database",
    "Keys are forwarded per-request in memory only — not logged, not cached server-side",
    "API key patterns are scrubbed from all error messages before returning to the frontend",
    "CORS is open (*) for development — lock down origin in production deployment",
    "No user accounts required — zero PII collected",
]:
    pdf.bullet(item)

pdf.h2("Deployment")
for item in [
    "Single-service deploy: FastAPI serves the built React app from backend/static/ (npm run build → copy to static/)",
    "Free hosting: Render.com, Railway.app (backend + static), Vercel (frontend only)",
    "Docker: Dockerfile included — docker build -t aimitra . && docker run -p 8000:8000 aimitra",
    "Environment: Set REACT_APP_API_URL for production backend URL in frontend .env",
]:
    pdf.bullet(item)

pdf.section_divider()

# ─────────────────────────────────────────────────────────────────────────────
# DEVELOPER SECTION
# ─────────────────────────────────────────────────────────────────────────────
pdf.h1("12. About the Developer", AMBER_LIGHT)

# decorative card
pdf.set_fill_color(30, 20, 50)
pdf.set_draw_color(*PURPLE)
pdf.set_line_width(0.5)
pdf.rect(18, pdf.get_y(), 174, 72, 'FD')
y_card = pdf.get_y() + 6
pdf.set_y(y_card)

pdf.set_font("Helvetica", "B", 16)
pdf.set_text_color(*PURPLE_LIGHT)
pdf.cell(0, 9, "Shiv Kant Kumar", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.set_font("Helvetica", "", 10)
pdf.set_text_color(*AMBER_LIGHT)
pdf.cell(0, 6, "Software Engineer | QA Enthusiast | AI Tools Builder", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(4)

pdf.set_font("Helvetica", "B", 9)
pdf.set_text_color(*LIGHT_TEXT)
pdf.cell(0, 5, "Connect on LinkedIn:", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "B", 11)
pdf.set_text_color(*PURPLE_LIGHT)
pdf.cell(0, 7, "https://www.linkedin.com/in/shivkantkumar/", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(4)

pdf.set_font("Helvetica", "I", 8)
pdf.set_text_color(*GRAY_TEXT)
pdf.cell(0, 5, "AiMitra was built to solve a real problem: QA engineers, BAs, and developers need", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 5, "domain-expert AI tools, not generic chatbots. Every tool was designed from daily work experience.", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.ln(16)
pdf.set_font("Helvetica", "B", 9)
pdf.set_text_color(*GRAY_TEXT)
pdf.cell(0, 5, "AiMitra is open-source and free to use. Star it, fork it, build on it.", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(4)
pdf.set_font("Helvetica", "", 8)
pdf.set_text_color(*GRAY_TEXT)
pdf.cell(0, 4, f"Document generated automatically from source code.  Version 1.0  |  2025", align="C")

# ─────────────────────────────────────────────────────────────────────────────
# SAVE
# ─────────────────────────────────────────────────────────────────────────────
out_path = os.path.join(os.path.dirname(__file__), "AiMitra_Documentation.pdf")
pdf.output(out_path)
print(f"PDF generated: {out_path}")
print(f"Pages: {pdf.page}")
