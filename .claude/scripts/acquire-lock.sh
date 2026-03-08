#!/bin/bash
# acquire-lock.sh — 파일 락 획득
# Usage: bash .claude/scripts/acquire-lock.sh <file-path> <agent-name>

set -euo pipefail

FILE_PATH="${1:?Usage: acquire-lock.sh <file-path> <agent-name>}"
AGENT_NAME="${2:?Usage: acquire-lock.sh <file-path> <agent-name>}"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK_DIR="$PROJECT_ROOT/.claude/locks"
LOCK_FILE="$LOCK_DIR/$(echo "$FILE_PATH" | tr '/' '_').$AGENT_NAME.lock"
TIMEOUT=30

mkdir -p "$LOCK_DIR"

# ─── 다른 에이전트의 락 확인 ───
LOCK_PATTERN="$LOCK_DIR/$(echo "$FILE_PATH" | tr '/' '_').*.lock"
ELAPSED=0

while ls $LOCK_PATTERN 2>/dev/null | grep -v "$AGENT_NAME" > /dev/null 2>&1; do
  if [[ "$ELAPSED" -ge "$TIMEOUT" ]]; then
    HOLDER=$(ls $LOCK_PATTERN 2>/dev/null | grep -v "$AGENT_NAME" | head -1 | sed 's/.*\.\(.*\)\.lock/\1/')
    echo "Error: Lock timeout on '$FILE_PATH'. Held by: $HOLDER"
    exit 1
  fi
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

# ─── 락 획득 ───
echo "$AGENT_NAME $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$LOCK_FILE"
echo "Lock acquired: $FILE_PATH (by $AGENT_NAME)"
