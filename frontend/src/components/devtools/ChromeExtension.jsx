const API_BASE =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

export default function ChromeExtension() {
  const steps = [
    { n: "1", title: "Download & unzip", body: 'Click the download button above. Extract the ZIP — you\'ll get an "aimitra-extension" folder.' },
    { n: "2", title: "Open Chrome Extensions", body: 'Go to chrome://extensions in your browser.' },
    { n: "3", title: "Enable Developer Mode", body: 'Toggle "Developer mode" in the top-right corner.' },
    { n: "4", title: "Load unpacked", body: 'Click "Load unpacked" and select the extracted "aimitra-extension" folder.' },
    { n: "5", title: "Pin it", body: 'Click the puzzle icon in the toolbar and pin AiMitra for quick access on any site.' },
  ];

  const features = [
    { icon: "🧩", label: "Works on any website", desc: "Inspect any webpage and generate tests from live DOM elements" },
    { icon: "🎯", label: "Element Picker", desc: "Click elements on the page to add them to your test scope" },
    { icon: "📐", label: "POM Framework", desc: "Full Page Object Model with locators, actions, and test suite" },
    { icon: "🥒", label: "BDD / Gherkin", desc: "Feature files + step definitions for Cucumber-style tests" },
    { icon: "⚡", label: "4 Frameworks", desc: "Playwright · Selenium · Cypress · WebdriverIO" },
    { icon: "🌐", label: "4 Languages", desc: "Python · JavaScript · TypeScript · Java" },
    { icon: "💾", label: "Download code", desc: "One-click download of generated test files" },
    { icon: "🔑", label: "Your own API key", desc: "Gemini (free), OpenAI, or Anthropic — stored locally" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">

      {/* Download CTA */}
      <a
        href={`${API_BASE}/api/download/extension`}
        download="aimitra-extension.zip"
        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-base transition-all shadow-xl shadow-violet-900/40 group"
      >
        <svg className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 3v13M7 11l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 20h18" strokeLinecap="round"/>
        </svg>
        Download Chrome Extension (.zip)
      </a>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-900/20 via-fuchsia-900/10 to-transparent p-6">
        <div className="absolute top-4 right-4">
          <span className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg shadow-amber-500/30">
            ★ STAR FEATURE
          </span>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-2xl shadow-xl shadow-violet-900/40 flex-shrink-0">
            🧩
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Ai<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Mitra</span> Chrome Extension
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Open on <strong className="text-white">any webpage</strong> and instantly generate production-ready test code —
              POM classes, BDD feature files, or simple test suites — for Playwright, Selenium, Cypress, or WebdriverIO.
            </p>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What it does</p>
        <div className="grid grid-cols-2 gap-3">
          {features.map(f => (
            <div key={f.label} className="flex items-start gap-3 bg-gray-800/40 border border-gray-700/50 rounded-xl p-3">
              <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Install steps */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">How to install</p>
        <div className="space-y-2">
          {steps.map(s => (
            <div key={s.n} className="flex items-start gap-4 bg-gray-800/30 border border-gray-700/40 rounded-xl px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-violet-300 text-xs font-bold flex-shrink-0 mt-0.5">
                {s.n}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to use */}
      <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">How to use</p>
        <div className="space-y-2 text-sm text-gray-300">
          <p>1. Navigate to any web app you want to test</p>
          <p>2. Click the <span className="bg-violet-600/20 text-violet-300 px-1.5 py-0.5 rounded font-medium text-xs">⚡ AiMitra</span> icon in your Chrome toolbar</p>
          <p>3. Choose <strong className="text-white">Framework</strong>, <strong className="text-white">Pattern</strong>, and <strong className="text-white">Language</strong></p>
          <p>4. Optionally use <strong className="text-white">🎯 Pick Elements</strong> to target specific UI elements</p>
          <p>5. Hit <strong className="text-white">⚡ Generate Test Code</strong> — copy or download the result</p>
        </div>
      </div>


    </div>
  );
}
