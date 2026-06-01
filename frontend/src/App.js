import { useState, useRef, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import JiraPanel from "./components/jira/JiraPanel";
import DevPanel from "./components/devtools/DevPanel";
import BAPanel from "./components/ba/BAPanel";
import { useConfig } from "./hooks/useConfig";
import { useChat } from "./hooks/useChat";
import { useChatHistory } from "./hooks/useChatHistory";
import { detectBetterMode } from "./utils/modeDetector";

export default function App() {
  const { config, updateConfig, apiKey, setApiKey } = useConfig();
  const [activeMode, setActiveMode] = useState("text_generation");
  const [activeView, setActiveView] = useState("chat"); // "chat" | "jira" | "devtools" | "ba"
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = config.theme || "dark";
  }, [config.theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      switch (e.key) {
        case "k": e.preventDefault(); handleNewChat(); break;
        case "/": e.preventDefault(); setSidebarOpen(o => !o); setSidebarCollapsed(false); break;
        case "1": e.preventDefault(); handleSetView("chat"); break;
        case "2": e.preventDefault(); handleSetView("devtools"); break;
        case "3": e.preventDefault(); handleSetView("jira"); break;
        case "4": e.preventDefault(); handleSetView("ba"); break;
        default: break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line

  const effectiveConfig = { ...config, apiKey };

  const { messages, isLoading, error, send, newChat, loadMessages } = useChat(effectiveConfig);
  const { history, upsertConversation, deleteConversation, clearHistory } = useChatHistory();

  const currentConvIdRef = useRef(null);
  const activeModeRef = useRef(activeMode);
  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);

  // Auto-save after every completed exchange (user msg + assistant response)
  useEffect(() => {
    if (isLoading) return;
    if (messages.length < 2) return;
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant" || last?.isError) return;

    const meta = {
      mode: activeModeRef.current,
      model: config.model,
      provider: config.provider,
    };

    if (!currentConvIdRef.current) {
      currentConvIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    upsertConversation(currentConvIdRef.current, messages, meta);
  }, [messages, isLoading]); // upsertConversation is stable (useCallback); config values read via closure are intentional

  // Save current conversation then start fresh — called on capability/view change
  const saveAndReset = (modeLabel) => {
    const saveableMessages = messages.filter(m => m.role !== "suggestion");
    const hasRealContent = saveableMessages.some(m => m.role === "user");
    if (hasRealContent) {
      if (!currentConvIdRef.current) {
        currentConvIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      upsertConversation(currentConvIdRef.current, saveableMessages, {
        mode: modeLabel ?? activeModeRef.current,
        model: config.model,
        provider: config.provider,
      });
      currentConvIdRef.current = null;
      newChat();
    }
  };

  const handleSetMode = (newMode) => {
    if (newMode !== activeMode) saveAndReset(activeMode);
    setActiveMode(newMode);
  };

  const handleSetView = (view) => {
    setActiveView(view);
    if (view === "jira") handleSetMode("jira_bug");
    else if (view === "chat") handleSetMode("text_generation");
    else if (view === "devtools") handleSetMode("tool_helper");
    else if (view === "ba") handleSetMode("ba_user_story");
  };

  const handleSend = (text) => {
    const suggestion = detectBetterMode(text, activeMode, activeView);
    send(text, activeMode, suggestion);
  };

  const handleNewChat = () => {
    currentConvIdRef.current = null;
    newChat();
  };

  const handleLoadConversation = (conversation) => {
    currentConvIdRef.current = conversation.id;
    loadMessages(conversation.messages);
    setActiveMode(conversation.mode || "text_generation");
    handleSetView("chat");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        config={config}
        updateConfig={updateConfig}
        apiKey={apiKey}
        setApiKey={setApiKey}
        activeMode={activeMode}
        setActiveMode={handleSetMode}
        activeView={activeView}
        setActiveView={handleSetView}
        onNewChat={handleNewChat}
        history={history}
        onLoadConversation={handleLoadConversation}
        onDeleteConversation={deleteConversation}
        onClearHistory={clearHistory}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(true)}
      />

      {/* Desktop sidebar edge toggle tab */}
      <button
        onClick={() => setSidebarCollapsed(c => !c)}
        title={sidebarCollapsed ? "Show sidebar (Ctrl+/)" : "Hide sidebar (Ctrl+/)"}
        className={`hidden md:flex fixed top-1/2 -translate-y-1/2 z-50 items-center justify-center w-5 h-12 bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] text-[var(--text-faint)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-ui)] transition-all duration-300 shadow-md ${sidebarCollapsed ? "left-0 border-l-0 rounded-r-lg" : "left-72 border-r-0 rounded-l-none rounded-r-lg"}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
          {sidebarCollapsed
            ? <path d="M9 18l6-6-6-6" />
            : <path d="M15 18l-6-6 6-6" />}
        </svg>
      </button>

      {activeView === "chat" ? (
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSend={handleSend}
          activeMode={activeMode}
          setActiveMode={handleSetMode}
          setActiveView={handleSetView}
          onNewChat={handleNewChat}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
        />
      ) : activeView === "devtools" ? (
        <div className="flex-1 min-w-0 overflow-hidden">
          <DevPanel
            config={effectiveConfig}
            activeMode={activeMode}
            setActiveMode={setActiveMode}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
          />
        </div>
      ) : activeView === "ba" ? (
        <div className="flex-1 min-w-0 overflow-hidden">
          <BAPanel
            config={effectiveConfig}
            activeMode={activeMode}
            setActiveMode={setActiveMode}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
          />
        </div>
      ) : (
        <div className="flex-1 min-w-0 overflow-hidden">
          <JiraPanel
            config={effectiveConfig}
            activeMode={activeMode}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
          />
        </div>
      )}
    </div>
  );
}
