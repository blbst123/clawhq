"use client";

export default function MockupsPage() {
  return (
    <div className="min-h-screen p-8 space-y-12">
      <h1 className="text-2xl font-bold text-white mb-2">Activity View Mockups</h1>
      <p className="text-sm text-white/40 mb-8">Comparing two approaches for the second activity view</p>

      {/* ═══ OPTION A: Task Cards ═══ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-lg font-bold text-orange-400">Option A:</span>
          <span className="text-lg font-semibold text-white">Task Cards</span>
          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/40">Same Activity page, second tab</span>
        </div>
        <p className="text-sm text-white/40 mb-4">Focus: &quot;What got accomplished?&quot; — Groups steps into deliverables. Filters out noise.</p>
        
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden max-w-4xl">
          {/* Mock header */}
          <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
              <div className="px-3 py-1 rounded-md text-xs text-white/40">Timeline</div>
              <div className="px-3 py-1 rounded-md text-xs bg-orange-500/20 text-orange-300 font-medium">Tasks</div>
            </div>
            <span className="text-xs text-white/30 ml-auto">8 tasks completed today</span>
          </div>

          {/* Task cards */}
          <div className="p-4 space-y-3">
            {/* Completed task card - expanded */}
            <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                      <h3 className="text-sm font-semibold text-white">Dashboard Redesign Deployed</h3>
                    </div>
                    <p className="text-xs text-white/40 ml-4">Updated 3-column layout with backlog, task tracker, and chat. Pushed to Vercel.</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-white/30">6:51am</p>
                    <p className="text-[10px] text-white/20">45m</p>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="flex items-center gap-4 ml-4 mt-3">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">💬 #claw-hq · Bill</span>
                  <span className="text-[10px] text-white/20">ClawHQ</span>
                  <span className="text-[10px] text-white/20">Opus</span>
                  <span className="text-[10px] text-white/20">$0.92</span>
                  <span className="text-[10px] text-white/20">14.7K tokens</span>
                </div>

                {/* Collapsed steps */}
                <div className="ml-4 mt-3 pt-2 border-t border-white/5">
                  <button className="text-[10px] text-white/25 hover:text-white/40 flex items-center gap-1">
                    ▶ 12 steps · 45m total
                  </button>
                </div>
              </div>
            </div>

            {/* Completed task card - simple */}
            <div className="rounded-xl border border-white/5 bg-white/[0.015] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <h3 className="text-sm font-medium text-white">Morning Brief Sent</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">🔄 Cron</span>
                  <span className="text-[10px] text-white/20">General</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/25">
                  <span>Sonnet</span>
                  <span>$0.24</span>
                  <span>2m 05s</span>
                  <span>8:32am</span>
                </div>
              </div>
            </div>

            {/* Completed task card - simple */}
            <div className="rounded-xl border border-white/5 bg-white/[0.015] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <h3 className="text-sm font-medium text-white">Lit Analysis Complete</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">🔄 Cron</span>
                  <span className="text-[10px] text-white/20">Lit.trade</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/25">
                  <span>Sonnet</span>
                  <span>$0.18</span>
                  <span>1m 12s</span>
                  <span>7:45am</span>
                </div>
              </div>
            </div>

            {/* Running task */}
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.03] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                  <h3 className="text-sm font-medium text-orange-200">Content Research: AI Jobs</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">🔄 Cron</span>
                  <span className="text-[10px] text-white/20">Content</span>
                </div>
                <span className="text-xs text-orange-300/50">Running since 3:58am</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div className="flex-1 h-1.5 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 w-[65%]" />
                </div>
                <span className="text-[10px] text-white/30">65%</span>
              </div>
            </div>

            {/* Background noise - collapsed */}
            <div className="rounded-lg border border-white/5 bg-white/[0.01] px-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/20">+ 3 background events (heartbeat, webhook, system)</span>
                <button className="text-[10px] text-white/20 hover:text-white/30">Show</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ OPTION B: Project Lanes ═══ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-lg font-bold text-orange-400">Option B:</span>
          <span className="text-lg font-semibold text-white">Project Lanes</span>
          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/40">Could be separate page or tab</span>
        </div>
        <p className="text-sm text-white/40 mb-4">Focus: &quot;What&apos;s happening across all my businesses?&quot; — Vertical lanes per project.</p>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden max-w-6xl">
          {/* Mock header */}
          <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Today&apos;s Activity by Project</span>
            <span className="text-xs text-white/30">Feb 7, 2026</span>
          </div>

          {/* Lanes */}
          <div className="flex divide-x divide-white/5">
            {/* Lit.trade lane */}
            <div className="flex-1 p-3">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <span className="text-xs font-semibold text-white">Lit.trade</span>
                <span className="text-[10px] text-white/20 ml-auto">3 tasks · $0.48</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <span className="text-[11px] font-medium text-white/80">Lit Analysis</span>
                  </div>
                  <p className="text-[10px] text-white/30 ml-3">Volume up 12%, $1.2K fees</p>
                  <div className="flex items-center gap-2 ml-3 mt-1 text-[9px] text-white/15">
                    <span>🔄 Cron</span><span>7:45am</span><span>$0.18</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <span className="text-[11px] font-medium text-white/80">Revenue Check</span>
                  </div>
                  <div className="flex items-center gap-2 ml-3 mt-1 text-[9px] text-white/15">
                    <span>🔄 Cron</span><span>2:00am</span><span>$0.12</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <span className="text-[11px] font-medium text-white/80">Investor Update Draft</span>
                  </div>
                  <div className="flex items-center gap-2 ml-3 mt-1 text-[9px] text-white/15">
                    <span>💬 Telegram</span><span>11:30pm</span><span>$0.32</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ClawHQ lane */}
            <div className="flex-1 p-3">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-2 w-2 rounded-full bg-orange-400" />
                <span className="text-xs font-semibold text-white">ClawHQ</span>
                <span className="text-[10px] text-white/20 ml-auto">2 tasks · $0.92</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <span className="text-[11px] font-medium text-white/80">Dashboard Redesign</span>
                  </div>
                  <p className="text-[10px] text-white/30 ml-3">3-col layout deployed to Vercel</p>
                  <div className="flex items-center gap-2 ml-3 mt-1 text-[9px] text-white/15">
                    <span>💬 #claw-hq</span><span>6:51am</span><span>$0.92</span><span>45m</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    <span className="text-[11px] text-white/40">PR #42 merged</span>
                  </div>
                  <div className="flex items-center gap-2 ml-3 mt-1 text-[9px] text-white/15">
                    <span>🌐 GitHub</span><span>5:45am</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content lane */}
            <div className="flex-1 p-3">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-xs font-semibold text-white">Content</span>
                <span className="text-[10px] text-white/20 ml-auto">1 running</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-orange-500/[0.05] border border-orange-500/15">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-[11px] font-medium text-orange-200">AI Jobs Research</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-orange-400 w-[65%]" />
                    </div>
                    <span className="text-[9px] text-white/20">65%</span>
                  </div>
                  <div className="flex items-center gap-2 ml-0 mt-1 text-[9px] text-white/15">
                    <span>🔄 Cron</span><span>Since 3:58am</span>
                  </div>
                </div>
              </div>
            </div>

            {/* General lane */}
            <div className="flex-1 p-3">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-2 w-2 rounded-full bg-white/30" />
                <span className="text-xs font-semibold text-white">General</span>
                <span className="text-[10px] text-white/20 ml-auto">1 task · $0.24</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <span className="text-[11px] font-medium text-white/80">Morning Brief</span>
                  </div>
                  <div className="flex items-center gap-2 ml-3 mt-1 text-[9px] text-white/15">
                    <span>🔄 Cron</span><span>8:32am</span><span>$0.24</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="max-w-4xl rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-sm font-semibold text-white mb-3">💭 Comparison</h2>
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div>
            <h3 className="text-orange-300 font-medium mb-2">Option A: Task Cards</h3>
            <ul className="space-y-1 text-white/40">
              <li>✅ Natural fit as 2nd tab on Activity page</li>
              <li>✅ Same data, different grouping</li>
              <li>✅ Collapses noise automatically</li>
              <li>✅ Shows running tasks with progress</li>
              <li>⚠️ Still a vertical list — less spatial info</li>
            </ul>
          </div>
          <div>
            <h3 className="text-orange-300 font-medium mb-2">Option B: Project Lanes</h3>
            <ul className="space-y-1 text-white/40">
              <li>✅ Instant cross-business visibility</li>
              <li>✅ See which projects are active/idle</li>
              <li>✅ Unique — no other tool does this for agents</li>
              <li>⚠️ Might work better as its own page/dashboard widget</li>
              <li>⚠️ Needs enough projects to justify lanes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
