import { useRef, useState } from "react";

const ACCEPT = ".txt,.py,.js,.jsx,.ts,.tsx,.json,.xml,.html,.htm,.css,.scss,.md,.yaml,.yml,.java,.cs,.cpp,.c,.go,.rb,.php,.sh,.sql,.toml,.ini,.feature";
const MAX_SIZE = 200 * 1024; // 200 KB

export default function FileDrop({ onLoad, label = "Drop a code file here, or click to browse" }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const readFile = (file) => {
    setError(null);
    if (file.size > MAX_SIZE) {
      setError(`File too large (max 200 KB). Got ${(file.size / 1024).toFixed(1)} KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileName(file.name);
      onLoad(e.target.result, file.name);
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsText(file, "UTF-8");
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const onChange = (e) => {
    const file = e.target.files[0];
    if (file) readFile(file);
    e.target.value = "";
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all text-center ${
          dragging
            ? "border-violet-500 bg-violet-600/10"
            : "border-gray-700 hover:border-violet-500/50 hover:bg-gray-800/30"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-5 h-5 ${dragging ? "text-violet-400" : "text-gray-500"}`}>
          <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="text-xs text-gray-400">
          {fileName ? (
            <span className="text-violet-300 font-medium">📄 {fileName} — click to replace</span>
          ) : label}
        </p>
      </div>
      {error && <p className="text-xs text-red-400 mt-1">⚠ {error}</p>}
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={onChange} className="hidden" />
    </div>
  );
}
