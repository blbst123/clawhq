"use client";

import { useState } from "react";

interface ConfirmDeleteModalProps {
  open: boolean;
  title?: string;
  message?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({ open, title = "Delete task", message = "This can't be undone.", onConfirm, onCancel }: ConfirmDeleteModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1614] shadow-2xl shadow-black/40 p-5">
        <h3 className="text-[15px] font-semibold text-white/90 mb-1">{title}</h3>
        <p className="text-[13px] text-white/50 mb-4">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => { setDeleting(true); onConfirm(); }}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[13px] font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
