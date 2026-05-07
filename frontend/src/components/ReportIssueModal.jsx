import { useState, useRef } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "";

export default function ReportIssueModal({ onClose }) {
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setScreenshot(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const submit = async () => {
    if (!description.trim()) return;
    setStatus("loading");
    const form = new FormData();
    form.append("description", description.trim());
    form.append("page", window.location.href);
    if (screenshot) form.append("screenshot", screenshot);
    try {
      const res = await axios.post(`${API_BASE}/api/report-issue`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("success");
      setMessage(res.data.message);
    } catch (e) {
      setStatus("error");
      setMessage(e.response?.data?.message || "Failed to submit. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111827] border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐛</span>
            <h2 className="text-sm font-bold text-white">Report an Issue</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
            <span className="text-5xl">✅</span>
            <p className="text-sm font-semibold text-emerald-300 mt-1">Issue Reported!</p>
            <p className="text-xs text-gray-400 max-w-xs">{message}</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors">
              Close
            </button>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "80vh" }}>

            {/* Tip banner */}
            <div className="bg-violet-900/20 border border-violet-700/30 rounded-xl px-3 py-2.5">
              <p className="text-xs text-violet-300">
                Describe what you observed, what you expected, and any steps to reproduce. A screenshot helps a lot!
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                What went wrong? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                placeholder="e.g. Clicking 'Compare Models' with Groq selected shows no output. Expected to see model response in Pane A..."
                className="w-full bg-[#0d1117] text-gray-200 text-sm px-3 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600"
              />
            </div>

            {/* Screenshot */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Screenshot <span className="text-gray-600">(optional)</span>
              </label>
              {preview ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-700">
                  <img src={preview} alt="screenshot" className="w-full max-h-44 object-cover" />
                  <button
                    onClick={() => { setScreenshot(null); setPreview(null); }}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white text-xs px-2 py-1 rounded-lg"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${
                    dragging ? "border-violet-500 bg-violet-900/10" : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/30"
                  }`}
                >
                  <p className="text-xs text-gray-500">
                    Drop screenshot here or <span className="text-violet-400 underline">click to upload</span>
                  </p>
                  <p className="text-xs text-gray-700 mt-1">PNG · JPG · WEBP</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>

            {/* Error */}
            {status === "error" && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
                ⚠ {message}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={submit}
                disabled={!description.trim() || status === "loading"}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Sending…
                  </>
                ) : "Send Report"}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
