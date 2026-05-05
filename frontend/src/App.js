import { useState, useRef, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import JiraPanel from "./components/jira/JiraPanel";
import DevPanel from "./components/devtools/DevPanel";
import { useConfig } from "./hooks/useConfig";
import { useChat } from "./hooks/useChat";
import { useChatHistory } from "./hooks/useChatHistory";

export default function App() {
  const { config, updateConfig, apiKey, setApiKey } = useConfig();
  const [activeMode, setActiveMode] = useState("text_generation");
  const [activeView, setActiveView] = useState("chat"); // "chat" | "jira" | "devtools"

  const effectiveConfig = { ...config, apiKey };

  const { messages, isLoading, error, send, newChat, loadMessages } = useChat(effectiveConfig);
  const { history, upsertConversation, deleteConversation, clearHistory } = useChatHistory();

  // Tracks the id of the conversation currently being shown, so auto-save updates it in-place
  const currentConvIdRef = useRef(null);
  // Stable ref to avoid stale closures in the effect below
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

    // Generate a stable id for this session if we don't have one yet
    if (!currentConvIdRef.current) {
      currentConvIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    upsertConversation(currentConvIdRef.current, messages, meta);
  }, [messages, isLoading]); // upsertConversation is stable (useCallback); config values read via closure are intentional

  const handleSetView = (view) => {
    setActiveView(view);
    if (view === "jira") setActiveMode("jira_bug");
    if (view === "chat") setActiveMode("text_generation");
    if (view === "devtools") setActiveMode("explain");
  };

  // Start a fresh conversation — reset the id so the next save creates a new entry
  const handleNewChat = () => {
    currentConvIdRef.current = null;
    newChat();
  };

  // Load a saved conversation — point the auto-save ref at it so updates go to the same entry
  const handleLoadConversation = (conversation) => {
    currentConvIdRef.current = conversation.id;
    loadMessages(conversation.messages);
    setActiveMode(conversation.mode || "text_generation");
    handleSetView("chat");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0d1a]">
      <Sidebar
        config={config}
        updateConfig={updateConfig}
        apiKey={apiKey}
        setApiKey={setApiKey}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        activeView={activeView}
        setActiveView={handleSetView}
        onNewChat={handleNewChat}
        history={history}
        onLoadConversation={handleLoadConversation}
        onDeleteConversation={deleteConversation}
        onClearHistory={clearHistory}
      />

      {activeView === "chat" ? (
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSend={(text) => send(text, activeMode)}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          onNewChat={handleNewChat}
        />
      ) : activeView === "devtools" ? (
        <div className="flex-1 overflow-hidden">
          <DevPanel config={effectiveConfig} activeMode={activeMode} setActiveMode={setActiveMode} />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <JiraPanel config={effectiveConfig} />
        </div>
      )}
    </div>
  );
}
