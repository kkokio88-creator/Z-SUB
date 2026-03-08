#!/bin/bash
# spawn-subagent.sh — 서브 에이전트 생성
# Usage: bash .claude/scripts/spawn-subagent.sh <agent-name> <task-description>

set -euo pipefail

AGENT_NAME="${1:?Usage: spawn-subagent.sh <agent-name> <task-description>}"
TASK_DESC="${2:?Usage: spawn-subagent.sh <agent-name> <task-description>}"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLAUDE_DIR="$PROJECT_ROOT/.claude"
SESSION_NAME="${TMUX_SESSION:-z-sub-dev}"

# ─── 동시 에이전트 수 확인 (최대 4) ───
ACTIVE_COUNT=$(find "$CLAUDE_DIR/handoffs" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l)
if [[ "$ACTIVE_COUNT" -ge 4 ]]; then
  echo "Error: Maximum 4 concurrent sub-agents. Active: $ACTIVE_COUNT"
  echo "Terminate one first: bash .claude/scripts/terminate-subagent.sh <name>"
  exit 1
fi

# ─── 이미 존재하는 에이전트 확인 ───
if [[ -d "$CLAUDE_DIR/handoffs/$AGENT_NAME" ]]; then
  echo "Error: Agent '$AGENT_NAME' already exists."
  echo "Terminate first: bash .claude/scripts/terminate-subagent.sh $AGENT_NAME"
  exit 1
fi

# ─── 작업 지시서 생성 ───
mkdir -p "$CLAUDE_DIR/handoffs/$AGENT_NAME"
mkdir -p "$CLAUDE_DIR/results/$AGENT_NAME"

cat > "$CLAUDE_DIR/handoffs/$AGENT_NAME/assignment.md" << EOF
# Assignment: $AGENT_NAME

## Task
$TASK_DESC

## Success Criteria
\`\`\`bash
npx vite build && npx vitest run
\`\`\`

## Constraints
- Time limit: 30 minutes
- Modify only files specified in the task
- Do NOT modify types.ts unless explicitly instructed

## On Completion
1. Write summary to: .claude/results/$AGENT_NAME/summary.md
2. Create completion marker: touch .claude/results/$AGENT_NAME/DONE
3. Wait for termination
EOF

# ─── tmux 윈도우 생성 ───
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  tmux new-window -t "$SESSION_NAME" -n "$AGENT_NAME" -c "$PROJECT_ROOT"
  echo "=== Sub-agent '$AGENT_NAME' spawned ==="
  echo "Window: $SESSION_NAME:$AGENT_NAME"
  echo "Assignment: .claude/handoffs/$AGENT_NAME/assignment.md"
  echo "Results: .claude/results/$AGENT_NAME/"
else
  echo "=== Sub-agent '$AGENT_NAME' ready (no tmux session) ==="
  echo "Assignment: .claude/handoffs/$AGENT_NAME/assignment.md"
fi
