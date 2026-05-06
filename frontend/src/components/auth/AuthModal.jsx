import { useState, useEffect } from "react";

function InputField({ label, type, value, onChange, placeholder, autoComplete }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-[#1a1f2e] text-gray-100 text-sm rounded-xl px-4 py-3 border border-gray-700/80 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 placeholder-gray-600 transition-all"
      />
    </div>
  );
}

export default function AuthModal({ onLogin, onSignup, isLoading, error, onClearError }) {
  const [tab, setTab] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [localError, setLocalError] = useState(null);

  const displayError = error || localError;

  useEffect(() => {
    setLocalError(null);
    if (onClearError) onClearError();
    setConfirmationSent(false);
  }, [tab, onClearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (onClearError) onClearError();

    if (!email.trim() || !password) {
      setLocalError("Email and password are required.");
      return;
    }
    if (tab === "signup") {
      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match.");
        return;
      }
      const result = await onSignup(email.trim(), password);
      if (result?.confirmationRequired) {
        setConfirmationSent(true);
      }
    } else {
      await onLogin(email.trim(), password);
    }
  };

  if (confirmationSent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a15]">
        <div className="text-center px-8 max-w-sm">
          <div className="w-16 h-16 bg-violet-600/20 rounded-full flex items-center justify-center mx-auto mb-5 border border-violet-500/30">
            <span className="text-3xl">📧</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            We sent a confirmation link to <span className="text-violet-300 font-medium">{email}</span>.
            Click it to activate your account, then come back and log in.
          </p>
          <button
            onClick={() => { setConfirmationSent(false); setTab("login"); }}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a15] px-4">
      {/* Card */}
      <div className="w-full max-w-md bg-[#0f1117] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-800/60">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-violet-900/40 mx-auto mb-4 ring-2 ring-violet-500/30">
            <img src="/logo.png" alt="AiMitra" className="w-full h-full object-cover" style={{ objectPosition: "18% 45%" }} />
          </div>
          <h1 className="text-xl font-bold text-white">
            Ai<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Mitra</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">AI-powered QA Assistant</p>
        </div>

        {/* Tabs */}
        <div className="flex mx-8 mt-6 rounded-xl bg-gray-800/50 p-1">
          {["login", "signup"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <div className="relative">
            <InputField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder={tab === "signup" ? "Min. 6 characters" : "Your password"}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 bottom-3 text-gray-500 hover:text-gray-300 text-sm transition-colors"
              tabIndex={-1}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {tab === "signup" && (
            <InputField
              label="Confirm password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          )}

          {/* Error */}
          {displayError && (
            <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-sm text-red-300">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>{displayError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-violet-900/30 mt-2"
          >
            {isLoading
              ? (tab === "login" ? "Signing in…" : "Creating account…")
              : (tab === "login" ? "Sign in" : "Create account")}
          </button>

          <p className="text-center text-xs text-gray-600">
            {tab === "login" ? (
              <>Don't have an account?{" "}
                <button type="button" onClick={() => setTab("signup")} className="text-violet-400 hover:text-violet-300 transition-colors">
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button type="button" onClick={() => setTab("login")} className="text-violet-400 hover:text-violet-300 transition-colors">
                  Log in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
