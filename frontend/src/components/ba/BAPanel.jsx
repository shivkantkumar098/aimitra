import { useState } from "react";
import UserStoryGen from "./UserStoryGen";
import AcceptanceCriteria from "./AcceptanceCriteria";
import UseCaseGen from "./UseCaseGen";
import RequirementsAnalyzer from "./RequirementsAnalyzer";
import ProcessFlowGen from "./ProcessFlowGen";
import BrdGenerator from "./BrdGenerator";
import GapAnalysis from "./GapAnalysis";
import StakeholderUpdate from "./StakeholderUpdate";
import MeetingSummarizer from "./MeetingSummarizer";
import ImpactAnalysis from "./ImpactAnalysis";

const TOOLS = [
  { id: "ba_user_story",   icon: "📖", label: "User Story Generator",   component: UserStoryGen },
  { id: "ba_acceptance",   icon: "✅", label: "Acceptance Criteria",     component: AcceptanceCriteria },
  { id: "ba_use_case",     icon: "🎭", label: "Use Case Generator",      component: UseCaseGen },
  { id: "ba_requirements", icon: "🔎", label: "Requirements Analyzer",   component: RequirementsAnalyzer },
  { id: "ba_process_flow", icon: "🔄", label: "Process Flow Generator",  component: ProcessFlowGen },
  { id: "ba_brd",          icon: "📄", label: "BRD Generator",           component: BrdGenerator },
  { id: "ba_gap",          icon: "📊", label: "Gap Analysis",            component: GapAnalysis },
  { id: "ba_stakeholder",  icon: "📧", label: "Stakeholder Update",      component: StakeholderUpdate },
  { id: "ba_meeting",      icon: "📝", label: "Meeting Summarizer",      component: MeetingSummarizer },
  { id: "ba_impact",       icon: "💥", label: "Impact Analysis",         component: ImpactAnalysis },
];

export default function BAPanel({ config, activeMode, setActiveMode, onToggleSidebar }) {
  const activeTool = TOOLS.find((t) => t.id === activeMode) || TOOLS[0];
  const ActiveComponent = activeTool.component;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d0d1a]">
      <div className="flex-1 flex flex-col overflow-hidden">
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
            <p className="text-xs text-gray-500">Business Analyst toolkit</p>
          </div>
        </div>
        <div key={activeTool.id} className="flex-1 overflow-y-auto px-6 py-5 animate-scale-in">
          <ActiveComponent config={config} />
        </div>
      </div>
    </div>
  );
}
