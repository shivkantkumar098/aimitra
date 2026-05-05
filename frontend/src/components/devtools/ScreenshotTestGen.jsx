import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const FRAMEWORKS = ["Playwright", "Selenium", "Cypress"];
const LANGUAGES = ["Python", "JavaScript", "TypeScript", "Java"];
const VISION_PROVIDERS = ["gemini", "anthropic", "openai", "openrouter", "together", "fireworks"];

const SYSTEM_PROMPT = `You are an expert QA automation engineer specializing in UI test automation.
When given a screenshot of a UI, you will:
1. Identify all interactive elements (buttons, inputs, links, dropdowns, etc.)
2. Generate precise CSS selectors and XPath locators for each element
3. Write comprehensive automated test cases covering the visible user flows
4. Include both happy path and edge case scenarios
Be specific, practical, and use the exact framework/language requested.`;

export default function ScreenshotTestGen({ config }) {
  const [image, setImage] = useState(null); // { base64, mimeType, preview }
  const [framework, setFramework] = useState("Playwright");
  const [language, setLanguage] = useState("Python");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Screenshot → Tests", mode: "screenshot_test", view: "devtools" });

  const isVisionProvider = VISION_PROVIDERS.includes(config.provider);

  const loadFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const [prefix, base64] = dataUrl.split(",");
      const mimeType = prefix.match(/:(.*?);/)[1];
      setImage({ base64, mimeType, preview: dataUrl });
      clear();
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    loadFile(e.dataTransfer.files[0]);
  };

  const handle = async () => {
    if (!image) return;
    const userMessage = `Analyze this UI screenshot and generate:

1. **Element Locators Table** — list every interactive element with its CSS selector and XPath
2. **Test Cases** — write complete automated test code in ${language} using ${framework}
3. **Test Scenarios** — include happy path, edge cases, and error states visible in the screenshot

Framework: ${framework}
Language: ${language}

Generate production-ready test code with proper imports, setup, teardown, and assertions.`;
    await query(SYSTEM_PROMPT, userMessage, { base64: image.base64, mimeType: image.mimeType });
  };

  return (
    <div className="flex flex-col gap-4">
      {!isVisionProvider && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-xl px-4 py-3 text-amber-300 text-sm">
          ⚠ Your current model may not support vision. For best results, switch to <strong>Gemini</strong>, <strong>Anthropic</strong>, or <strong>OpenAI</strong> in the sidebar.
        </div>
      )}

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer min-h-[160px] flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? "border-violet-400 bg-violet-600/10"
            : image
            ? "border-gray-700 bg-[#1a1f2e]"
            : "border-gray-700 hover:border-violet-500/60 bg-[#1a1f2e]"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => loadFile(e.target.files[0])}
        />
        {image ? (
          <>
            <img
              src={image.preview}
              alt="Uploaded screenshot"
              className="max-h-64 max-w-full rounded-lg object-contain"
            />
            <p className="text-xs text-gray-500">Click or drag to replace</p>
          </>
        ) : (
          <>
            <div className="text-4xl">📸</div>
            <div className="text-center">
              <p className="text-sm text-gray-300 font-medium">Drop a screenshot here</p>
              <p className="text-xs text-gray-500 mt-1">or click to browse — PNG, JPG, WebP</p>
            </div>
          </>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Framework</label>
          <div className="flex flex-wrap gap-1.5">
            {FRAMEWORKS.map((f) => (
              <button
                key={f}
                onClick={() => setFramework(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  framework === f
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Language</label>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  language === l
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !image}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Analyzing...
            </>
          ) : "📸 Generate Tests"}
        </button>
        {result && (
          <button onClick={() => { clear(); setImage(null); }} className="text-xs text-gray-500 hover:text-gray-300 px-2">
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">🧪 Generated Tests</span>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg"
            >
              Copy
            </button>
          </div>
          <div className="p-4 markdown-content text-sm max-h-[600px] overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
