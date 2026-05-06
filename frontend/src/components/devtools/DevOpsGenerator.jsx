import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";

const TOOLS = [
  { id: "dockerfile",   label: "🐳 Dockerfile",          desc: "Multi-stage Dockerfile for your app" },
  { id: "compose",      label: "🔧 docker-compose",       desc: "docker-compose.yml with services" },
  { id: "github",       label: "⚙️ GitHub Actions",       desc: "CI/CD workflow pipeline" },
  { id: "gitlab",       label: "🦊 GitLab CI",            desc: ".gitlab-ci.yml pipeline" },
  { id: "kubernetes",   label: "☸️ Kubernetes",           desc: "Deployment, Service, Ingress manifests" },
  { id: "terraform",    label: "🏗️ Terraform",            desc: "Infrastructure as Code modules" },
  { id: "nginx",        label: "🌐 Nginx Config",         desc: "Reverse proxy / server block" },
  { id: "envtemplate",  label: "🔑 .env Template",        desc: "Environment variable template with docs" },
  { id: "makefile",     label: "📋 Makefile",             desc: "Developer task automation" },
];

export default function DevOpsGenerator({ config }) {
  const [tool, setTool] = useState("dockerfile");
  const [description, setDescription] = useState("");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "DevOps Generator", mode: "devops", view: "devtools" });

  const selected = TOOLS.find(t => t.id === tool);

  const prompts = {
    dockerfile:  `Create a production-ready, multi-stage Dockerfile for:\n${description}\n\nRequirements:\n- Multi-stage build to minimize final image size\n- Non-root user for security\n- Proper COPY ordering for layer caching\n- Health check\n- Environment variable documentation via comments\n- .dockerignore suggestions`,
    compose:     `Create a docker-compose.yml for:\n${description}\n\nInclude:\n- All required services with proper networking\n- Volume mounts for persistence\n- Environment variable references (.env)\n- Health checks and depends_on\n- Production and development variants if applicable`,
    github:      `Create a GitHub Actions CI/CD workflow for:\n${description}\n\nInclude:\n- Trigger conditions (push, PR, manual)\n- Build and test jobs\n- Security scanning (if applicable)\n- Deployment stages (dev/staging/prod)\n- Caching for dependencies\n- Branch protection rules recommendation`,
    gitlab:      `Create a GitLab CI/CD pipeline (.gitlab-ci.yml) for:\n${description}\n\nInclude:\n- Stages: build, test, security scan, deploy\n- Caching and artifacts\n- Environment-specific deployments\n- Merge request pipelines`,
    kubernetes:  `Create Kubernetes manifests for:\n${description}\n\nInclude:\n- Deployment with resource limits and health probes\n- Service (ClusterIP/LoadBalancer)\n- Ingress with TLS\n- ConfigMap and Secret templates\n- HorizontalPodAutoscaler\n- Namespace`,
    terraform:   `Create Terraform configuration for:\n${description}\n\nInclude:\n- Provider configuration\n- Resource definitions with best practices\n- Variables and outputs\n- README with usage instructions`,
    nginx:       `Create an Nginx configuration for:\n${description}\n\nInclude:\n- Server block(s) with proper location rules\n- SSL/TLS configuration (Let's Encrypt compatible)\n- Gzip compression\n- Security headers\n- Rate limiting\n- Proxy settings if needed`,
    envtemplate: `Create a .env.template / .env.example file for:\n${description}\n\nFor each variable include:\n- Clear comments explaining what it's for\n- Type/format indication\n- Example values (safe, non-real)\n- Mark required vs optional\n- Group related variables with section headers`,
    makefile:    `Create a Makefile with developer automation tasks for:\n${description}\n\nInclude targets for: setup/install, dev server, build, test, lint, format, docker operations, deployment, clean. Add a default 'help' target that lists all commands.`,
  };

  const handle = async () => {
    if (!description.trim()) return;
    await query(
      `You are a DevOps engineer and infrastructure expert. Generate production-ready configuration files with security best practices, clear comments, and explanations. Always explain key decisions.`,
      prompts[tool]
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tool grid */}
      <div className="grid grid-cols-3 gap-2">
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => { setTool(t.id); clear(); }}
            title={t.desc}
            className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs transition-all ${
              tool === t.id
                ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                : "bg-[#1a1f2e] border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200"
            }`}>
            <span className="text-base">{t.label.split(" ")[0]}</span>
            <span className="text-center leading-tight">{t.label.split(" ").slice(1).join(" ")}</span>
          </button>
        ))}
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <label className="block text-sm font-semibold text-white mb-1">
          📝 Describe Your App / Requirements
        </label>
        <p className="text-xs text-gray-500 mb-2">{selected?.desc}</p>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
          placeholder={`e.g. Node.js Express API with PostgreSQL database and Redis cache. Runs on port 3000. Needs to be deployed to AWS ECS...`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600" />
      </div>

      <div className="flex gap-3">
        <button onClick={handle} disabled={isLoading || !description.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
          {isLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Generating...</> : `⚡ Generate ${selected?.label.split(" ").slice(1).join(" ")}`}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}
      <ResultPanel result={result} title="🐳 Generated Config" titleColor="text-white" toolName="devops-generator" onClear={clear} maxHeight="600px" />
    </div>
  );
}
