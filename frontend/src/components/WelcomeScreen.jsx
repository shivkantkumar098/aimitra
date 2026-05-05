import { CAPABILITIES } from "../utils/capabilities";

export default function WelcomeScreen({ activeMode, setActiveMode, onExampleClick }) {
  const activeCapability = CAPABILITIES.find((c) => c.id === activeMode);

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-10">
      {/* Hero */}
      <div className="relative mb-8 text-center animate-fade-up" style={{ animationDelay: "0ms" }}>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-2xl mx-auto mb-4 shadow-xl shadow-violet-900/40 animate-glow-pulse">
          ⚡
        </div>
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
          Ai<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Mitra</span>
        </h2>
        <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
          Your intelligent QA companion. Pick a capability below or type to start.
        </p>
      </div>

      {/* Active capability card */}
      {activeCapability && (
        <div className="w-full max-w-xl bg-gradient-to-br from-[#1a1f2e] to-[#141921] border border-violet-600/20 rounded-2xl p-5 mb-6 shadow-lg animate-scale-in" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center text-xl flex-shrink-0">
              {activeCapability.icon}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{activeCapability.label}</h3>
              <p className="text-gray-400 text-xs mt-0.5">{activeCapability.description}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-2.5">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {activeCapability.examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => onExampleClick(ex)}
                className="text-xs bg-[#0d1117] hover:bg-violet-600/15 hover:text-violet-300 text-gray-400 px-3 py-1.5 rounded-lg border border-gray-700/60 hover:border-violet-600/40 transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Capability grid */}
      <div className="w-full max-w-xl animate-fade-up" style={{ animationDelay: "120ms" }}>
        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-3 text-center">All capabilities</p>
        <div className="grid grid-cols-3 gap-2">
          {CAPABILITIES.map((cap, i) => (
            <button
              key={cap.id}
              onClick={() => setActiveMode(cap.id)}
              style={{ animationDelay: `${160 + i * 35}ms` }}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all animate-fade-up ${
                activeMode === cap.id
                  ? "bg-violet-600/20 border-violet-600/40 text-violet-300 shadow-sm shadow-violet-900/20"
                  : "bg-[#141921] border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300 hover:bg-[#1a1f2e]"
              }`}
            >
              <span className="text-xl">{cap.icon}</span>
              <span className="text-xs font-medium leading-tight">{cap.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
