import { CAPABILITIES } from "../utils/capabilities";

export default function WelcomeScreen({ activeMode, setActiveMode, onExampleClick }) {
  const activeCapability = CAPABILITIES.find((c) => c.id === activeMode);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 animate-fade-in">
      <div className="text-5xl mb-4">🤖</div>
      <h2 className="text-2xl font-bold text-white mb-2">QA Assistant AI</h2>
      <p className="text-gray-400 text-center max-w-md mb-8">
        Your intelligent testing companion. Select a capability and start chatting.
      </p>

      {activeCapability && (
        <div className="w-full max-w-lg bg-[#1f2937] border border-gray-700 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{activeCapability.icon}</span>
            <div>
              <h3 className="text-white font-semibold">{activeCapability.label}</h3>
              <p className="text-gray-400 text-sm">{activeCapability.description}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {activeCapability.examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => onExampleClick(ex)}
                className="text-sm bg-gray-800 hover:bg-indigo-600/20 hover:text-indigo-300 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-indigo-600/40 transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
        {CAPABILITIES.slice(0, 6).map((cap) => (
          <button
            key={cap.id}
            onClick={() => setActiveMode(cap.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center ${
              activeMode === cap.id
                ? "bg-indigo-600/20 border-indigo-600/40 text-indigo-300"
                : "bg-[#1f2937] border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
            }`}
          >
            <span className="text-xl">{cap.icon}</span>
            <span className="text-xs leading-tight">{cap.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
