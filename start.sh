#!/bin/bash
# ============================================================
# FMCG AI Platform — One-command startup
# Usage: ./start.sh [your-anthropic-api-key]
# ============================================================
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 1. API Key ───────────────────────────────────────────────
if [ -n "$1" ]; then
  ANTHROPIC_API_KEY="$1"
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  # Try to read from .env
  if [ -f "$APP_DIR/.env" ]; then
    export $(grep -v '^#' "$APP_DIR/.env" | xargs) 2>/dev/null || true
  fi
fi

if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "your_key_here" ]; then
  echo ""
  echo "⚠️   ANTHROPIC_API_KEY not set — AI features will be disabled."
  echo "    To enable AI: ./start.sh sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx"
  echo "    Or:           export ANTHROPIC_API_KEY=sk-ant-xxx && ./start.sh"
  echo ""
  ANTHROPIC_API_KEY="your_key_here"
fi

# Write key into .env for the Node process
echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" > "$APP_DIR/.env"
echo "PORT=3001" >> "$APP_DIR/.env"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       FMCG Agentic AI Platform — Starting up        ║"
echo "╚══════════════════════════════════════════════════════╝"

# ── 2. Check deps ────────────────────────────────────────────
if [ ! -d "$APP_DIR/server/node_modules" ]; then
  echo "📦 Installing server dependencies..."
  (cd "$APP_DIR/server" && npm install --silent)
fi

if [ ! -d "$APP_DIR/client/node_modules" ]; then
  echo "📦 Installing client dependencies..."
  (cd "$APP_DIR/client" && npm install --silent)
fi

# ── 3. Launch ────────────────────────────────────────────────
if command -v tmux &>/dev/null; then
  # ── tmux mode: two panes side by side ──────────────────────
  SESSION="fmcg-ai"
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  tmux new-session  -d -s "$SESSION" -x 220 -y 50

  tmux rename-window -t "$SESSION:0" "FMCG-AI"

  # Left pane: server
  tmux send-keys -t "$SESSION:0" \
    "echo '🖥  SERVER' && cd $APP_DIR/server && NODE_NO_WARNINGS=1 npx tsx watch src/index.ts" Enter

  # Right pane: client (after 2s so server has time to bind)
  tmux split-window -t "$SESSION:0" -h
  tmux send-keys -t "$SESSION:0.1" \
    "sleep 2 && echo '🌐 CLIENT' && cd $APP_DIR/client && npx vite --open" Enter

  echo ""
  echo "✅  Launched in tmux session '$SESSION'"
  echo ""
  echo "    Attach now:    tmux attach -t $SESSION"
  echo "    Kill later:    tmux kill-session -t $SESSION"
  echo ""
  echo "    Server → http://localhost:3001"
  echo "    App    → http://localhost:5173"
  echo ""
  tmux attach -t "$SESSION"

else
  # ── fallback: two background processes + wait ───────────────
  echo "⚠️  tmux not found — running both processes in background"
  echo ""

  (cd "$APP_DIR/server" && NODE_NO_WARNINGS=1 npx tsx watch src/index.ts) &
  SERVER_PID=$!
  sleep 2

  (cd "$APP_DIR/client" && npx vite --open) &
  CLIENT_PID=$!

  echo "✅  Server PID: $SERVER_PID  |  Client PID: $CLIENT_PID"
  echo ""
  echo "    Server → http://localhost:3001"
  echo "    App    → http://localhost:5173"
  echo ""
  echo "    Press Ctrl+C to stop both."
  echo ""

  trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; echo 'Stopped.'" INT TERM
  wait
fi
