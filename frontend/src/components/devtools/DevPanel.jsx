import { useState } from "react";
import CodeExplainer from "./CodeExplainer";
import CodeReview from "./CodeReview";
import DebugFix from "./DebugFix";
import CodeConverter from "./CodeConverter";
import RegexBuilder from "./RegexBuilder";
import SqlHelper from "./SqlHelper";
import GitAssistant from "./GitAssistant";
import DevOpsGenerator from "./DevOpsGenerator";
import JsonMockData from "./JsonMockData";

const TOOLS = [
  { id: "explain",  icon: "🔍", label: "Code Explainer",    component: CodeExplainer },
  { id: "review",   icon: "🕵️", label: "Code Review",       component: CodeReview },
  { id: "debug",    icon: "🐛", label: "Debug & Fix",        component: DebugFix },
  { id: "convert",  icon: "🔄", label: "Code Converter",     component: CodeConverter },
  { id: "regex",    icon: "📝", label: "Regex Builder",      component: RegexBuilder },
  { id: "sql",      icon: "🗄️", label: "SQL Helper",         component: SqlHelper },
  { id: "git",      icon: "📦", label: "Git Assistant",      component: GitAssistant },
  { id: "devops",   icon: "🐳", label: "DevOps Generator",   component: DevOpsGenerator },
  { id: "json",     icon: "🎲", label: "JSON & Mock Data",   component: JsonMockData },
];

export default function DevPanel({ config, activeMode, setActiveMode }) {
  const activeTool = TOOLS.find((t) => t.id === activeMode) || TOOLS[0];
  const ActiveComponent = activeTool.component;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d0d1a]">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800/80 flex items-center gap-3 flex-shrink-0 animate-fade-in">
          <span className="text-2xl animate-scale-in">{activeTool.icon}</span>
          <div>
            <h2 className="text-base font-bold text-white">{activeTool.label}</h2>
            <p className="text-xs text-gray-500">AI-powered developer tool</p>
          </div>
        </div>

        {/* Tool content — key forces remount on tool switch, triggering entrance animation */}
        <div key={activeTool.id} className="flex-1 overflow-y-auto px-6 py-5 animate-scale-in">
          <ActiveComponent config={config} />
        </div>
      </div>
    </div>
  );
}
