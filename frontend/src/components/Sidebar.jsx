import React, { useState } from "react";
import { CAPABILITIES, MODELS } from "../utils/capabilities";

export default function Sidebar({ config, updateConfig, activeMode, setActiveMode }) {
  const [showKey, setShowKey] = useState(false);

  return (
    <aside className="w-72 min-w-[288px] h-screen bg-[#111827] border-r border-gray-800 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-sm font-bold">QA</div>
          <div>
            <h1 className="text-sm font-semibold text-white">QA Assistant</h1>
            <p className="text-xs text-gray-500">AI-Powered Testing</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Configuration */}
        <div className="px-4 py-4 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Configuration</p>

          {/* Provider */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Provider</label>
            <select
              value={config.provider}
              onChange={(e) => updateConfig({ provider: e.target.value })}
              className="w-full bg-[#1f2937] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          {/* Model */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Model</label>
            <select
              value={config.model}
              onChange={(e) => updateConfig({ model: e.target.value })}
              className="w-full bg-[#1f2937] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => updateConfig({ apiKey: e.target.value })}
                placeholder="Enter Gemini API key..."
                className="w-full bg-[#1f2937] text-gray-200 text-sm rounded-lg px-3 py-2 pr-9 border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
              >
                {showKey ? "🙈" : "👁️"}
              </button>
            </div>
            {!config.apiKey && (
              <p className="text-xs text-amber-500 mt-1">⚠ API key required</p>
            )}
          </div>

          {/* Temperature */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">
              Temperature: <span className="text-indigo-400 font-medium">{config.temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature}
              onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-0.5">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Streaming */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Streaming</label>
            <button
              onClick={() => updateConfig({ streaming: !config.streaming })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                config.streaming ? "bg-indigo-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  config.streaming ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Capabilities */}
        <div className="px-4 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Capabilities</p>
          <div className="space-y-1">
            {CAPABILITIES.map((cap) => (
              <button
                key={cap.id}
                onClick={() => setActiveMode(cap.id)}
                title={cap.description}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeMode === cap.id
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-600/40"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                }`}
              >
                <span className="text-base w-5 text-center">{cap.icon}</span>
                <span className="text-left leading-tight">{cap.label}</span>
                {activeMode === cap.id && (
                  <span className="ml-auto w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">
          Powered by Google Gemini
        </p>
      </div>
    </aside>
  );
}
