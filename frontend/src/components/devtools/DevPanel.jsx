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
import BddGenerator from "./BddGenerator";
import ApiTestGenerator from "./ApiTestGenerator";
import A11yChecker from "./A11yChecker";
import ToolHelper from "./ToolHelper";
import ChromeExtension from "./ChromeExtension";

const TOOLS = [
  { id: "chrome_ext",      icon: "🧩", label: "Chrome Extension ★",   component: ChromeExtension },
  { id: "tool_helper",     icon: "🧭", label: "Tool Helper",          component: ToolHelper },
  { id: "explain",         icon: "🔍", label: "Code Explainer",      component: CodeExplainer },
  { id: "review",          icon: "🕵️", label: "Code Review",         component: CodeReview },
  { id: "debug",           icon: "🐛", label: "Debug & Fix",          component: DebugFix },
  { id: "convert",         icon: "🔄", label: "Code Converter",       component: CodeConverter },
  { id: "regex",           icon: "📝", label: "Regex Builder",        component: RegexBuilder },
  { id: "sql",             icon: "🗄️", label: "SQL Helper",           component: SqlHelper },
  { id: "git",             icon: "📦", label: "Git Assistant",        component: GitAssistant },
  { id: "devops",          icon: "🐳", label: "DevOps Generator",     component: DevOpsGenerator },
  { id: "json",            icon: "🎲", label: "JSON & Mock Data",     component: JsonMockData },
  { id: "bdd",             icon: "🥒", label: "BDD Generator",        component: BddGenerator },
  { id: "api_test",        icon: "🔌", label: "API Test Generator",   component: ApiTestGenerator },
  { id: "a11y",            icon: "♿", label: "A11y Checker",          component: A11yChecker },
];

export default function DevPanel({ config, activeMode, setActiveMode, onToggleSidebar }) {
  const activeTool = TOOLS.find((t) => t.id === activeMode) || TOOLS[0];
  const ActiveComponent = activeTool.component;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d0d1a]">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-800/80 flex items-center gap-3 flex-shrink-0 animate-fade-in">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="text-2xl animate-scale-in">{activeTool.icon}</span>
          <div>
            <h2 className="text-base font-bold text-white">{activeTool.label}</h2>
            <p className="text-xs text-gray-500">AI-powered tools</p>
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
