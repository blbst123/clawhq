"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square, X, Plus, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Attachment {
  id: string;
  file: File;
  dataUrl: string;
  mimeType: string;
}

export interface ChatInputHandle {
  addFiles: (files: FileList | File[]) => void;
  dragProps: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  dragOver: boolean;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop?: () => void;
  sending?: boolean;
  placeholder?: string;
  sendIcon?: "arrow" | "send";
  handleRef?: React.MutableRefObject<ChatInputHandle | null>;
  onDragOverChange?: (over: boolean) => void;
}

let attIdCounter = 0;
function makeAttId() { return `att-${Date.now()}-${++attIdCounter}`; }

export function ChatInput({ value, onChange, onSend, onStop, sending, placeholder, sendIcon = "arrow", handleRef, onDragOverChange }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [voiceToast, setVoiceToast] = useState(false);
  const voiceToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showVoiceUnsupported() {
    setVoiceToast(true);
    if (voiceToastTimer.current) clearTimeout(voiceToastTimer.current);
    voiceToastTimer.current = setTimeout(() => setVoiceToast(false), 3000);
  }

  // Auto-resize
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);
  useEffect(() => { autoResize(); }, [value, autoResize]);

  function addFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAttachments(prev => [...prev, { id: makeAttId(), file, dataUrl, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }

  function handleSend() {
    const text = value.trim();
    if (!text && attachments.length === 0) return;
    if (sending) return;
    onSend(text, attachments);
    setAttachments([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  }

  // Drag and drop
  const dragCounter = useRef(0);
  function setDragOverAndNotify(v: boolean) { setDragOver(v); onDragOverChange?.(v); }
  function handleDragEnter(e: React.DragEvent) { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (dragCounter.current === 1) setDragOverAndNotify(true); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); e.stopPropagation(); }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setDragOverAndNotify(false); } }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setDragOverAndNotify(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  // Expose handle for parent drag-and-drop
  useEffect(() => {
    if (handleRef) {
      handleRef.current = {
        addFiles,
        dragProps: { onDragEnter: handleDragEnter, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop },
        dragOver,
      };
    }
  });

  const canSend = value.trim() || attachments.length > 0;

  return (
    <div
      className="flex-shrink-0 px-5 py-3 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Voice unsupported toast */}
      {voiceToast && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-[13px] text-white/60 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 z-50">
          Voice input is not yet supported on self-hosted gateway
        </div>
      )}

      <div className="rounded-2xl border bg-white/[0.03] border-white/[0.08] focus-within:border-white/[0.15] transition-colors">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 px-4 pt-3 flex-wrap">
            {attachments.map(att => (
              <div key={att.id} className="relative group">
                {att.mimeType.startsWith("image/") ? (
                  <img src={att.dataUrl} alt={att.file.name}
                    className="h-14 w-14 object-cover rounded-lg border border-white/10" />
                ) : (
                  <div className="h-14 px-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03]">
                    <span className="text-[12px] text-white/50 max-w-[100px] truncate">{att.file.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#1a1614] border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white/60" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder ?? "Ask anything"}
          rows={1}
          className="w-full bg-transparent px-4 pt-3 pb-1 text-[14px] text-white placeholder-white/25 focus:outline-none resize-none overflow-y-auto"
          style={{ minHeight: "36px" }}
        />

        {/* Toolbar row */}
        <div className="flex items-center justify-between px-2.5 pb-2.5 pt-0.5">
          {/* Left side */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
              title="Attach file"
            >
              <Plus className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,.pdf,.txt,.md,.json,.csv,.py,.js,.ts,.tsx,.jsx,.html,.css"
              onChange={e => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ""; } }}
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-0.5">
            {sending ? (
              <button
                onClick={onStop}
                className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
                title="Stop"
              >
                <Square className="h-5 w-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={showVoiceUnsupported}
                  className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                  title="Voice message"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={cn(
                    "p-2 rounded-full border transition-all",
                    canSend
                      ? "bg-white text-[#1a1614] border-white hover:bg-white/90"
                      : "bg-transparent text-white/15 border-white/10 cursor-default",
                  )}
                  title="Send"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
