"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, WifiOff, Calendar, Folder, Pencil, Save, X, Check } from "lucide-react";
import { useGateway } from "@/lib/gateway-context";
import { ConnectGate } from "@/components/ui/connect-gate";

interface MemoryFile {
  path: string;
  name: string;
  category: "core" | "daily" | "project" | "other";
}

export default function FilesPage() {
  const { rpc, status: connStatus } = useGateway();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    if (connStatus !== "connected") return;
    loadFiles();
  }, [connStatus]);

  async function loadFiles() {
    setLoading(true);
    try {
      const [rootResult, memoryResult, projectsResult] = await Promise.all([
        rpc.request<{ files?: Array<{ name: string; path: string; isDir: boolean }> }>("clawhq.files.list", { path: "" }),
        rpc.request<{ files?: Array<{ name: string; path: string; isDir: boolean }> }>("clawhq.files.list", { path: "memory" }).catch(() => ({ files: [] })),
        rpc.request<{ files?: Array<{ name: string; path: string; isDir: boolean }> }>("clawhq.files.list", { path: "memory/projects" }).catch(() => ({ files: [] })),
      ]);

      const allFiles = [
        ...(rootResult?.files || []).filter(f => !f.isDir),
        ...(memoryResult?.files || []).filter(f => !f.isDir),
        ...(projectsResult?.files || []).filter(f => !f.isDir),
      ];

      const mdFiles: MemoryFile[] = allFiles
        .filter(f => f.name.endsWith(".md"))
        .map(f => ({
          path: f.path,
          name: f.name || f.path.split("/").pop() || f.path,
          category: categorizeFile(f.path),
        }));

      setFiles(mdFiles);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }

  function categorizeFile(path: string): "core" | "daily" | "project" | "other" {
    if (["MEMORY.md", "WORKING.md", "AGENTS.md", "USER.md", "SOUL.md", "TOOLS.md", "IDENTITY.md", "HEARTBEAT.md", "BOOTSTRAP.md"].some(f => path === f || path === `memory/${f}`)) {
      return "core";
    }
    if (path.match(/memory\/\d{4}-\d{2}-\d{2}\.md/)) return "daily";
    if (path.startsWith("memory/projects/")) return "project";
    return "other";
  }

  async function loadFileContent(filePath: string) {
    if (editing) return; // Don't switch files while editing
    setLoadingContent(true);
    setSaveStatus("idle");
    try {
      const result = await rpc.request<{ content?: string }>("clawhq.files.read", { path: filePath });
      setFileContent(result?.content || "");
      setSelectedFile(filePath);
      setEditing(false);
    } catch (err) {
      console.error("Failed to load file:", err);
      setFileContent("Error loading file");
    } finally {
      setLoadingContent(false);
    }
  }

  function startEditing() {
    setEditContent(fileContent);
    setEditing(true);
    setSaveStatus("idle");
  }

  function cancelEditing() {
    setEditing(false);
    setEditContent("");
    setSaveStatus("idle");
  }

  async function saveFile() {
    if (!selectedFile) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      await rpc.request("clawhq.files.write", { path: selectedFile, content: editContent });
      setFileContent(editContent);
      setEditing(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to save file:", err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  // Ctrl+S to save while editing
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editing && (e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      saveFile();
    }
    if (editing && e.key === "Escape") {
      cancelEditing();
    }
  }, [editing, editContent, selectedFile]);

  if (connStatus !== "connected") {
    return <ConnectGate>{null}</ConnectGate>;
  }

  const coreFiles = files.filter(f => f.category === "core");
  const dailyFiles = files.filter(f => f.category === "daily").sort((a, b) => b.path.localeCompare(a.path));
  const projectFiles = files.filter(f => f.category === "project");
  const otherFiles = files.filter(f => f.category === "other");

  return (
    <div className="h-screen flex flex-col" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Files</h1>
              <p className="text-sm text-white/40">Workspace markdown files</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] text-white/30">
              {files.length} files
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* File List */}
        <div className="w-80 border-r border-white/5 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {coreFiles.length > 0 && (
                <FileSection icon={FileText} title="Core Files" files={coreFiles} selectedFile={selectedFile} onSelect={loadFileContent} />
              )}
              {dailyFiles.length > 0 && (
                <FileSection icon={Calendar} title="Daily Notes" files={dailyFiles} selectedFile={selectedFile} onSelect={loadFileContent} scrollable />
              )}
              {projectFiles.length > 0 && (
                <FileSection icon={Folder} title="Projects" files={projectFiles} selectedFile={selectedFile} onSelect={loadFileContent} />
              )}
              {otherFiles.length > 0 && (
                <FileSection icon={FileText} title="Other" files={otherFiles} selectedFile={selectedFile} onSelect={loadFileContent} />
              )}
            </div>
          )}
        </div>

        {/* File Content */}
        <div className="flex-1 overflow-y-auto">
          {loadingContent ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
            </div>
          ) : selectedFile ? (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-white mb-1">{selectedFile}</h2>
                  <p className="text-[12px] text-white/30">
                    {editing ? "Editing — Ctrl+S to save, Esc to cancel" : "Click edit to modify"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {saveStatus === "saved" && (
                    <span className="flex items-center gap-1 text-xs text-green-400/70">
                      <Check className="h-3 w-3" /> Saved
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="text-xs text-red-400/70">Save failed</span>
                  )}
                  {editing ? (
                    <>
                      <button
                        onClick={cancelEditing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/70 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                      <button
                        onClick={saveFile}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white bg-blue-500/80 hover:bg-blue-500 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startEditing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/70 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                </div>
              </div>
              {editing ? (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full min-h-[calc(100vh-220px)] bg-white/[0.02] border border-blue-500/20 rounded-lg p-4 font-mono text-[13px] text-white/80 leading-relaxed resize-none focus:outline-none focus:border-blue-500/40"
                  autoFocus
                  spellCheck={false}
                />
              ) : (
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 font-mono text-[13px] text-white/70 whitespace-pre-wrap leading-relaxed">
                  {fileContent}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-white/30">Select a file to view its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileSection({ icon: Icon, title, files, selectedFile, onSelect, scrollable }: {
  icon: any;
  title: string;
  files: MemoryFile[];
  selectedFile: string | null;
  onSelect: (path: string) => void;
  scrollable?: boolean;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-blue-400/60" />
        <h2 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{title}</h2>
      </div>
      <div className={`space-y-0.5 ${scrollable ? "max-h-96 overflow-y-auto" : ""}`}>
        {files.map(file => (
          <button
            key={file.path}
            onClick={() => onSelect(file.path)}
            className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-all ${
              selectedFile === file.path
                ? "bg-blue-500/15 text-blue-300"
                : "text-white/60 hover:bg-white/[0.03] hover:text-white/80"
            }`}
          >
            {file.name}
          </button>
        ))}
      </div>
    </section>
  );
}
