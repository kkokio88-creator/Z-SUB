#!/bin/bash
# init-agent-team.sh — 멀티 에이전트 팀 초기화
# Usage: bash .claude/scripts/init-agent-team.sh [session-name]

set -euo pipefail

SESSION_NAME="${1:-z-sub-dev}"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLAUDE_DIR="$PROJECT_ROOT/.claude"

# ─── 기존 세션 확인 ───
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Warning: tmux session '$SESSION_NAME' already exists."
  read -p "Attach to existing session? (y/n): " choice
  if [[ "$choice" == "y" ]]; then
    tmux attach-session -t "$SESSION_NAME"
    exit 0
  fi
  echo "Use a different session name or kill the existing one first."
  exit 1
fi

# ─── 디렉토리 구조 생성 ───
mkdir -p "$CLAUDE_DIR"/{context,handoffs,results,locks}

# ─── CLAUDE.md 스냅샷 생성 ───
SNAPSHOT_ID="$(date +%Y%m%d-%H%M%S)"
GIT_HASH="$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo 'no-git')"

cat > "$CLAUDE_DIR/context/project-snapshot.md" << EOF
# Project Snapshot
- ID: $SNAPSHOT_ID
- Git: $GIT_HASH
- Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Project: $PROJECT_ROOT

## CLAUDE.md Content (frozen)
$(cat "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null || echo '(no CLAUDE.md found)')
EOF

echo "SNAPSHOT_ID=$SNAPSHOT_ID" > "$CLAUDE_DIR/context/.env"
echo "GIT_HASH=$GIT_HASH" >> "$CLAUDE_DIR/context/.env"

# ─── tmux 세션 생성 ───
tmux new-session -d -s "$SESSION_NAME" -n "leader" -c "$PROJECT_ROOT"

echo "=== Agent Team Initialized ==="
echo "Session: $SESSION_NAME"
echo "Snapshot: $SNAPSHOT_ID (git: $GIT_HASH)"
echo "Project: $PROJECT_ROOT"
echo ""
echo "Attach: tmux attach -t $SESSION_NAME"
echo "Spawn sub: bash .claude/scripts/spawn-subagent.sh <name> <task>"
