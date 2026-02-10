"use client";

export function StatusIcon({ status, className }: { status: string; className?: string }) {
  const size = 18;
  switch (status) {
    case "in_progress":
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="7" stroke="rgb(249,115,22)" strokeWidth="2" fill="none" />
          <path d="M9 2a7 7 0 0 1 0 14" fill="rgb(249,115,22)" />
        </svg>
      );
    case "done":
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="7" fill="rgb(34,197,94)" stroke="rgb(34,197,94)" strokeWidth="2" />
          <path d="M6 9l2.5 2.5L12.5 7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className={className} width={size} height={size} viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" />
        </svg>
      );
  }
}
