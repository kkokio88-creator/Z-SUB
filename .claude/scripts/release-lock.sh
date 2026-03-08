#!/bin/bash
# release-lock.sh — 파일 락 해제
# Usage: bash .claude/scripts/release-lock.sh <file-path> [agent-name]

set -euo pipefail

FILE_PATH="${1:?Usage: release-lock.sh <file-path> [agent-name]}"
AGENT_NAME="${2:-}"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK_DIR="$PROJECT_ROOT/.claude/locks"

if [[ -n "$AGENT_NAME" ]]; then
  LOCK_FILE="$LOCK_DIR/$(echo "$FILE_PATH" | tr '/' '_').$AGENT_NAME.lock"
  rm -f "$LOCK_FILE"
  echo "Lock released: $FILE_PATH (by $AGENT_NAME)"
else
  # 모든 에이전트의 해당 파일 락 해제
  LOCK_PATTERN="$LOCK_DIR/$(echo "$FILE_PATH" | tr '/' '_').*.lock"
  rm -f $LOCK_PATTERN 2>/dev/null
  echo "All locks released: $FILE_PATH"
fi
