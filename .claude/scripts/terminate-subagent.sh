#!/bin/bash
# terminate-subagent.sh — 서브 에이전트 종료 + 아카이브
# Usage: bash .claude/scripts/terminate-subagent.sh <agent-name> [--force]

set -euo pipefail

AGENT_NAME="${1:?Usage: terminate-subagent.sh <agent-name> [--force]}"
FORCE="${2:-}"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLAUDE_DIR="$PROJECT_ROOT/.claude"
SESSION_NAME="${TMUX_SESSION:-z-sub-dev}"

# ─── 완료 확인 ───
if [[ ! -f "$CLAUDE_DIR/results/$AGENT_NAME/DONE" ]] && [[ "$FORCE" != "--force" ]]; then
  echo "Warning: Agent '$AGENT_NAME' has not completed (no DONE marker)."
  read -p "Force terminate? (y/n): " choice
  if [[ "$choice" != "y" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# ─── 결과 아카이브 ───
ARCHIVE_DIR="$CLAUDE_DIR/results/archive/$(date +%Y%m%d-%H%M%S)-$AGENT_NAME"
mkdir -p "$ARCHIVE_DIR"

if [[ -d "$CLAUDE_DIR/handoffs/$AGENT_NAME" ]]; then
  cp -r "$CLAUDE_DIR/handoffs/$AGENT_NAME" "$ARCHIVE_DIR/handoffs"
fi
if [[ -d "$CLAUDE_DIR/results/$AGENT_NAME" ]]; then
  cp -r "$CLAUDE_DIR/results/$AGENT_NAME" "$ARCHIVE_DIR/results"
fi

# ─── 파일 락 해제 ───
find "$CLAUDE_DIR/locks" -name "*.$AGENT_NAME.lock" -delete 2>/dev/null || true

# ─── 작업 디렉토리 정리 ───
rm -rf "$CLAUDE_DIR/handoffs/$AGENT_NAME"
rm -rf "$CLAUDE_DIR/results/$AGENT_NAME"

# ─── tmux 윈도우 종료 ───
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  tmux kill-window -t "$SESSION_NAME:$AGENT_NAME" 2>/dev/null || true
fi

echo "=== Agent '$AGENT_NAME' terminated ==="
echo "Archive: $ARCHIVE_DIR"
