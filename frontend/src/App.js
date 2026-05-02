import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { useConfig } from "./hooks/useConfig";
import { useChat } from "./hooks/useChat";

export default function App() {
  const { config, updateConfig } = useConfig();
  const [activeMode, setActiveMode] = useState("text_generation");
  const { messages, isLoading, error, send, newChat } = useChat(config);

  const handleSend = (text) => {
    send(text, activeMode);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0d1a]">
      <Sidebar
        config={config}
        updateConfig={updateConfig}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
      />
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSend={handleSend}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        onNewChat={newChat}
      />
    </div>
  );
}
