import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MODELS } from "../../utils/capabilities";
import { sendMessageStream, sendMessage } from "../../services/chatService";

const PROVIDERS = [...new Set(MODELS.map(m => m.provider))];

function PaneHeader({ side, provider, setProvider, model, setModel, config }) {
  const models = MODELS.filter(m => m.provider === provider);
  const colors = side === "A" ? "border-violet-600/40 text-violet-300" : "border-emerald-600/40 text-emerald-300";
  return (
    <div className={`px-4 py-3 border-b border-gray-700 flex items-center gap-2 flex-wrap bg-[#111827]`}>
      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${colors}`}>{side}</span>
      <select value={provider} onChange={e => { setProvider(e.target.value); setModel(MODELS.find(m => m.provider === e.target.value)?.id || ""); }}
        className="bg-[#0d1117] text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-violet-500 flex-1 min-w-[100px]">
        {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <select value={model} onChange={e => setModel(e.target.value)}
        className="bg-[#0d1117] text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-violet-500 flex-1 min-w-[120px]">
        {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>
  );
}

function ResultPane({ result, isLoading, error, color = "text-gray-100" }) {
  return (
    <div className="flex-1 min-w-0 bg-[#0d1117] overflow-y-auto p-4 text-sm" style={{ minHeight: 200, maxHeight: 420 }}>
      {isLoading && (
        <div className="flex items-center gap-2 text-gray-500 text-xs animate-pulse">
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Generating...
        </div>
      )}
      {error && <p className="text-red-400 text-xs">⚠ {error}</p>}
      {result && (
        <div className={`markdown-content ${color}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
        </div>
      )}
      {!isLoading && !result && !error && (
        <p className="text-gray-600 text-xs italic">Response will appear here…</p>
      )}
    </div>
  );
}

export default function ModelCompare({ config }) {
  const defaultA = MODELS.find(m => m.provider === "groq") || MODELS[0];
  const defaultB = MODELS.find(m => m.provider === "openai") || MODELS[1];

  const [providerA, setProviderA] = useState(defaultA.provider);
  const [modelA, setModelA] = useState(defaultA.id);
  const [providerB, setProviderB] = useState(defaultB.provider);
  const [modelB, setModelB] = useState(defaultB.id);
  const [prompt, setPrompt] = useState("");
  const [resultA, setResultA] = useState("");
  const [resultB, setResultB] = useState("");
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [errorA, setErrorA] = useState(null);
  const [errorB, setErrorB] = useState(null);

  const apiKeyA = config.apiKeys?.[providerA] || (config.provider === providerA ? config.apiKey : "");
  const apiKeyB = config.apiKeys?.[providerB] || (config.provider === providerB ? config.apiKey : "");

  const runModel = useCallback(async (provider, model, apiKey, setResult, setLoading, setError) => {
    if (!apiKey) { setError(`No API key for ${provider}. Add it in the sidebar.`); return; }
    setLoading(true);
    setResult("");
    setError(null);
    const payload = { message: prompt, mode: "text_generation", history: [], provider, model, apiKey, temperature: config.temperature, streaming: config.streaming };
    if (config.streaming) {
      try {
        await sendMessageStream(payload, (chunk) => setResult(p => p + chunk), (err) => { setError(err); setLoading(false); });
      } finally { setLoading(false); }
    } else {
      try {
        const res = await sendMessage(payload);
        setResult(res.response);
      } catch (e) {
        setError(e.response?.data?.detail || e.message);
      } finally { setLoading(false); }
    }
  }, [prompt, config]);

  const compare = () => {
    if (!prompt.trim()) return;
    runModel(providerA, modelA, apiKeyA, setResultA, setLoadingA, setErrorA);
    runModel(providerB, modelB, apiKeyB, setResultB, setLoadingB, setErrorB);
  };

  const clear = () => { setResultA(""); setResultB(""); setErrorA(null); setErrorB(null); };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gradient-to-r from-violet-900/30 to-emerald-900/20 border border-violet-700/40 rounded-xl px-4 py-3">
        <p className="text-sm text-violet-200 font-medium mb-0.5">⚡ Model Comparison</p>
        <p className="text-xs text-gray-400">Run the same prompt on two different models side-by-side. Both need saved API keys.</p>
      </div>

      {/* Prompt input */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">📝 Prompt</span>
        </div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
          placeholder="Enter your prompt here — e.g. 'Explain how React useEffect works with a practical example'"
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) compare(); }}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600" />
      </div>

      <div className="flex gap-3">
        <button onClick={compare} disabled={!prompt.trim() || loadingA || loadingB}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
          {(loadingA || loadingB) ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Comparing...</> : "⚡ Compare Models"}
        </button>
        {(resultA || resultB) && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
        <span className="ml-auto text-xs text-gray-600 self-center">Ctrl+Enter to run</span>
      </div>

      {/* Side-by-side results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1a1f2e] border border-violet-700/30 rounded-xl overflow-hidden">
          <PaneHeader side="A" provider={providerA} setProvider={setProviderA} model={modelA} setModel={setModelA} config={config} />
          <ResultPane result={resultA} isLoading={loadingA} error={errorA} color="text-violet-100" />
          {resultA && (
            <div className="px-4 py-2 border-t border-gray-800 flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(resultA)} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">Copy A</button>
              <span className="text-xs text-gray-700 self-center">~{Math.round(resultA.length / 4).toLocaleString()} tokens</span>
            </div>
          )}
        </div>
        <div className="bg-[#1a1f2e] border border-emerald-700/30 rounded-xl overflow-hidden">
          <PaneHeader side="B" provider={providerB} setProvider={setProviderB} model={modelB} setModel={setModelB} config={config} />
          <ResultPane result={resultB} isLoading={loadingB} error={errorB} color="text-emerald-100" />
          {resultB && (
            <div className="px-4 py-2 border-t border-gray-800 flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(resultB)} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">Copy B</button>
              <span className="text-xs text-gray-700 self-center">~{Math.round(resultB.length / 4).toLocaleString()} tokens</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
