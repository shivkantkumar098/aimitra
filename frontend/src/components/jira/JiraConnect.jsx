/**
 * JiraConnect — authentication screen shown when JIRA is not connected.
 *
 * Collects:
 *   - JIRA domain (e.g. mycompany.atlassian.net)
 *   - Atlassian account email
 *   - API token (from id.atlassian.com/manage-profile/security/api-tokens)
 *
 * On submit: calls backend /api/jira/connect to verify credentials.
 * On success: parent receives authenticated state and hides this screen.
 */

import { useState } from "react";

export default function JiraConnect({ onConnect, isConnecting, authError }) {
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!domain.trim() || !email.trim() || !token.trim()) return;
    onConnect({ domain: domain.trim(), email: email.trim(), token: token.trim() });
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">J</div>
          <h2 className="text-xl font-bold text-white">Connect to JIRA</h2>
          <p className="text-gray-400 text-sm mt-1">Authenticate to fetch, create, and comment on tickets</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1a1f2e] border border-gray-700 rounded-2xl p-6 space-y-4">
          {/* Domain */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">JIRA Domain</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="yourcompany.atlassian.net"
              className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2.5 border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-600"
              required
            />
            <p className="text-xs text-gray-600 mt-1">Find this in your JIRA URL: https://<span className="text-blue-400">yourcompany.atlassian.net</span>/jira</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Atlassian Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2.5 border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-600"
              required
            />
          </div>

          {/* API Token */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-400">API Token</label>
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Get token ↗
              </a>
            </div>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your API token..."
                className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2.5 pr-10 border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
              >
                {showToken ? "🙈" : "👁️"}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Go to Atlassian Account → Security → API tokens → Create token
            </p>
          </div>

          {/* Error */}
          {authError && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
              ⚠ {authError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isConnecting || !domain || !email || !token}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Connecting...</>
            ) : "🔗 Connect to JIRA"}
          </button>
        </form>

        {/* Info */}
        <div className="mt-4 bg-[#1a1f2e] border border-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">What you can do after connecting</p>
          <ul className="space-y-1.5">
            {[
              "🐛 Create bug tickets directly in JIRA",
              "📥 Load any ticket by ID for AI analysis",
              "✅ Validate tickets and post results as comments",
              "💬 Post AI-generated comments to any ticket",
              "🔍 Search tickets using JQL",
            ].map((item) => (
              <li key={item} className="text-xs text-gray-400">{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
