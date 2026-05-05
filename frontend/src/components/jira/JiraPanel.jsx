import { useState, useEffect, useRef } from "react";
import BugCreator from "./BugCreator";
import TestPlanReviewer from "./TestPlanReviewer";
import TicketValidator from "./TicketValidator";
import CommentGenerator from "./CommentGenerator";
import TicketCreator from "./TicketCreator";
import JqlSearch from "./JqlSearch";
import AskRovo from "./AskRovo";
import JiraConnect from "./JiraConnect";
import { useJiraTemplates } from "../../hooks/useJiraTemplates";
import { useJiraAuth } from "../../hooks/useJiraAuth";

const TABS = [
  { id: "rovo",    label: "Ask Rovo",         icon: "🤖", desc: "AI assistant for JIRA & agile questions" },
  { id: "create",  label: "Ticket Creator",   icon: "🎫", desc: "Create any ticket from a template or sample" },
  { id: "bug",     label: "Bug Creator",      icon: "🐛", desc: "Create bugs in your company format" },
  { id: "jql",     label: "JQL Search",       icon: "🔍", desc: "Generate and run JQL queries" },
  { id: "plan",    label: "Test Plan Review", icon: "📋", desc: "Review test plans for completeness" },
  { id: "validate",label: "Ticket Validator", icon: "✅", desc: "BVA, AC check, missing info analysis" },
  { id: "comment", label: "Comment Generator",icon: "💬", desc: "Post-validation comments in your format" },
];

const SIDEBAR_MODE_MAP = {
  jira_rovo:     "rovo",
  jira_create:   "create",
  jira_bug:      "bug",
  jira_jql:      "jql",
  jira_plan:     "plan",
  jira_validate: "validate",
  jira_comment:  "comment",
};

export default function JiraPanel({ config, activeMode }) {
  const [activeTab, setActiveTab] = useState("rovo");
  const prevMode = useRef(activeMode);

  // Sync sidebar clicks → JiraPanel tab
  useEffect(() => {
    if (activeMode !== prevMode.current) {
      prevMode.current = activeMode;
      const tab = SIDEBAR_MODE_MAP[activeMode];
      if (tab) setActiveTab(tab);
    }
  }, [activeMode]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { templates, saveTemplate } = useJiraTemplates();
  const { jiraAuth, connect, disconnect, isConnecting, authError, getHeaders } = useJiraAuth();

  // Auto-close modal once connected successfully
  useEffect(() => {
    if (jiraAuth.connected) setShowAuthModal(false);
  }, [jiraAuth.connected]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-800 bg-[#0d0d1a] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold text-white">J</div>
            <div>
              <h2 className="text-sm font-semibold text-white">JIRA Tools</h2>
              <p className="text-xs text-gray-500">AI-powered ticket management</p>
            </div>
          </div>

          {/* Connection status */}
          {jiraAuth.connected ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {jiraAuth.user?.avatarUrl && (
                  <img src={jiraAuth.user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                )}
                <div className="text-right">
                  <p className="text-xs text-white font-medium">{jiraAuth.user?.displayName}</p>
                  <p className="text-xs text-gray-500">{jiraAuth.domain?.replace("https://", "")}</p>
                </div>
                <span className="w-2 h-2 bg-emerald-400 rounded-full" title="Connected" />
              </div>
              <button
                onClick={disconnect}
                className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg border border-gray-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 rounded-lg transition-all"
            >
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Not connected — click to connect
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-3 border-b border-gray-800 bg-[#0d0d1a] flex-shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.desc}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-blue-600/20 text-blue-300 border border-blue-600/40"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === "bug"      && templates.bugFormat      && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
            {tab.id === "comment"  && templates.commentFormat  && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
            {tab.id === "plan"     && templates.testPlanFormat && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
            {tab.id === "validate" && templates.validatorFormat && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
            {tab.id === "create"   && templates.ticketFormat   && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
            {tab.id === "rovo"    && <span className="text-xs bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded-full font-medium">AI</span>}
          </button>
        ))}
      </div>

      {/* Tool content */}
      <div className={`flex-1 px-6 py-5 ${activeTab === "rovo" ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className="max-w-3xl mx-auto h-full">
          {activeTab === "rovo" && (
            <AskRovo config={config} />
          )}
          {activeTab === "create" && (
            <TicketCreator
              config={config}
              template={templates.ticketFormat}
              onSaveTemplate={saveTemplate}
              getHeaders={getHeaders}
              jiraDomain={jiraAuth.domain}
            />
          )}
          {activeTab === "bug" && (
            <BugCreator
              config={config}
              template={templates.bugFormat}
              onSaveTemplate={saveTemplate}
              getHeaders={getHeaders}
              jiraDomain={jiraAuth.domain}
            />
          )}
          {activeTab === "jql" && (
            <JqlSearch
              config={config}
              getHeaders={getHeaders}
            />
          )}
          {activeTab === "plan" && (
            <TestPlanReviewer
              config={config}
              template={templates.testPlanFormat}
              onSaveTemplate={saveTemplate}
            />
          )}
          {activeTab === "validate" && (
            <TicketValidator
              config={config}
              template={templates.validatorFormat}
              onSaveTemplate={saveTemplate}
              getHeaders={getHeaders}
            />
          )}
          {activeTab === "comment" && (
            <CommentGenerator
              config={config}
              template={templates.commentFormat}
              onSaveTemplate={saveTemplate}
              getHeaders={getHeaders}
            />
          )}
        </div>
      </div>

      {/* ── JIRA Auth Modal ── */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}
        >
          <div className="relative w-full max-w-lg mx-4 bg-[#0d0d1a] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors z-10"
              title="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Embed JiraConnect — strip its outer centering wrapper via overriding styles */}
            <div className="max-h-[90vh] overflow-y-auto">
              <JiraConnect
                onConnect={connect}
                isConnecting={isConnecting}
                authError={authError}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
