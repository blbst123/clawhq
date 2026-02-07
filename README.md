# 🦞 ClawHQ

Owner-centric dashboard for managing AI agents. Built for [OpenClaw](https://github.com/openclaw/openclaw).

## Vision

ClawHQ is the missing tool for humans who delegate work to AI agents. Not developer observability — **owner productivity**.

## Features

### Core (MVP)
- **📊 Cost Dashboard** — Track daily/weekly/monthly spend, per-model breakdown
- **⏰ Cron Manager** — Visual editor for scheduled jobs, run history, quick actions
- **📋 Task Board** — Kanban view of delegated work: backlog → in progress → done

### Coming Soon
- 💬 Built-in chat with threading
- 🔌 Connected apps visibility
- 🤖 Multi-agent switching
- 📈 Productivity metrics

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Connects to OpenClaw via HTTP API
- **Real-time:** OpenClaw hooks for live updates

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## OpenClaw Integration

ClawHQ connects to your OpenClaw gateway to fetch:
- Session data and history
- Cron job configuration
- Usage statistics
- Agent status

Configure the gateway URL in Settings.

## License

MIT

---

Built with 🦞 by Bill & Lolo
