"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function InlineDropdown({
  show,
  onClose,
  children,
  className,
}: {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full left-0 mt-1 z-50 bg-[#1a1614] border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]",
        className
      )}
    >
      {children}
    </div>
  );
}
