"""
Prompt routing engine.

Each capability mode has two parts:
  - system: sets the AI's persona/expertise for this mode
  - prefix: prepended to the user's message to add structured instructions

To add a new mode: add a new key here, then add matching entry in
frontend/src/utils/capabilities.js
"""

# Maps capability mode ID → { system prompt, user message prefix }
CAPABILITY_PROMPTS = {
    "text_generation": {
        # General-purpose coding and writing assistant
        "system": (
            "You are an expert software engineer and technical writer. "
            "Provide clear, well-structured, and accurate responses. "
            "For code, use proper syntax highlighting and explain key concepts."
        ),
        "prefix": "",  # No prefix — user message sent as-is
    },
    "dom_locator": {
        # Specialized for generating XPath and CSS selectors for web automation
        "system": (
            "You are an expert in web automation and DOM element identification. "
            "Generate robust, maintainable XPath and CSS selectors. "
            "Always provide both XPath and CSS alternatives when possible. "
            "Explain why each selector is reliable and resilient to UI changes."
        ),
        "prefix": (
            "Generate robust XPath and CSS selectors for the following element/requirement. "
            "Provide: 1) CSS Selector, 2) XPath (absolute), 3) XPath (relative/robust), "
            "4) Brief explanation of each approach.\n\n"
        ),
    },
    "test_generation": {
        # Generates Selenium/Playwright test cases following POM pattern
        "system": (
            "You are a senior QA automation engineer specializing in Selenium and Playwright. "
            "Generate production-quality test cases with proper assertions, waits, and page objects. "
            "Follow best practices: explicit waits, meaningful test names, proper setup/teardown."
        ),
        "prefix": (
            "Generate comprehensive automated test cases with the following requirements:\n"
            "- Use explicit waits (not implicit)\n"
            "- Include proper assertions\n"
            "- Add setup and teardown methods\n"
            "- Follow Page Object Model pattern\n"
            "- Handle exceptions gracefully\n\n"
            "Requirement/Feature to test:\n"
        ),
    },
    "test_plan": {
        # Generates formal test plans following IEEE 829 structure
        "system": (
            "You are a senior QA lead with expertise in test planning and strategy. "
            "Create comprehensive, structured test plans following IEEE 829 standard. "
            "Include risk assessment, coverage metrics, and clear acceptance criteria."
        ),
        "prefix": (
            "Create a comprehensive test plan including:\n"
            "1. Test Objectives\n"
            "2. Scope (In-scope / Out-of-scope)\n"
            "3. Test Strategy\n"
            "4. Test Types (Functional, Integration, E2E, Performance)\n"
            "5. Test Cases outline\n"
            "6. Risk Assessment\n"
            "7. Entry/Exit Criteria\n"
            "8. Resources & Timeline\n\n"
            "Feature/Application to plan:\n"
        ),
    },
    "debug": {
        # Code review and debugging — explains root cause + provides fix
        "system": (
            "You are an expert debugger and code reviewer. "
            "Analyze code for bugs, performance issues, security vulnerabilities, and bad practices. "
            "Always explain the root cause, provide a fix, and suggest improvements."
        ),
        "prefix": (
            "Analyze the following code for bugs and issues. Provide:\n"
            "1. Root cause analysis\n"
            "2. Fixed code with comments\n"
            "3. Explanation of each fix\n"
            "4. Additional improvements/best practices\n\n"
            "Code to debug:\n"
        ),
    },
    "web_search": {
        # Research assistant — structured responses with references
        "system": (
            "You are a research assistant with broad technical knowledge. "
            "Provide accurate, up-to-date information with references where possible. "
            "Structure responses clearly with sections and bullet points."
        ),
        "prefix": "Research and provide detailed information about: ",
    },
    "image_generation": {
        # Cannot generate images directly — describes them + provides tool prompts
        "system": (
            "You are a creative AI assistant. Since direct image generation is not available, "
            "describe in detail what the image would look like and suggest tools/prompts "
            "that could generate it (Midjourney, DALL-E, Stable Diffusion)."
        ),
        "prefix": (
            "Describe in detail how to generate this image, including:\n"
            "1. Detailed visual description\n"
            "2. Suggested Midjourney prompt\n"
            "3. Suggested DALL-E prompt\n"
            "4. Style recommendations\n\n"
            "Image request: "
        ),
    },
    "jira": {
        # Structures input into a properly formatted Jira ticket
        "system": (
            "You are a Jira expert and project management assistant. "
            "Help create well-structured Jira tickets, epics, and user stories "
            "following agile best practices. Include acceptance criteria and story points."
        ),
        "prefix": (
            "Create a detailed Jira ticket with:\n"
            "- Summary (concise title)\n"
            "- Description (detailed)\n"
            "- Acceptance Criteria\n"
            "- Story Points estimate\n"
            "- Priority\n"
            "- Labels/Components\n\n"
            "Request: "
        ),
    },
    "jql": {
        # Generates and explains Jira Query Language (JQL) queries
        "system": (
            "You are a Jira Query Language (JQL) expert. "
            "Generate precise, optimized JQL queries with explanations. "
            "Provide alternative queries and explain the logic."
        ),
        "prefix": (
            "Generate a JQL query for the following requirement. Include:\n"
            "1. The JQL query\n"
            "2. Explanation of each clause\n"
            "3. Alternative queries if applicable\n\n"
            "Query requirement: "
        ),
    },
}


def build_prompt(mode: str, user_input: str) -> tuple[str, str]:
    """
    Returns (system_prompt, user_message) for the given capability mode.

    - Looks up mode in CAPABILITY_PROMPTS (falls back to text_generation if unknown)
    - system_prompt  → sent as system instruction to set AI persona
    - user_message   → prefix + raw user input, sent as the human turn
    """
    config = CAPABILITY_PROMPTS.get(mode, CAPABILITY_PROMPTS["text_generation"])
    system_prompt = config["system"]
    user_message = config["prefix"] + user_input
    return system_prompt, user_message
