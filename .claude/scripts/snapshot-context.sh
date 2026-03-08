#!/bin/bash
# snapshot-context.sh — 컨텍스트 스냅샷 생성
# Usage: bash .claude/scripts/snapshot-context.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLAUDE_DIR="$PROJECT_ROOT/.claude"
SNAPSHOT_ID="$(date +%Y%m%d-%H%M%S)"
GIT_HASH="$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo 'no-git')"

mkdir -p "$CLAUDE_DIR/context"

cat > "$CLAUDE_DIR/context/project-snapshot.md" << EOF
# Project Snapshot
- ID: $SNAPSHOT_ID
- Git: $GIT_HASH
- Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Project: $PROJECT_ROOT

## Package Versions
$(cd "$PROJECT_ROOT" && node -e "const p=require('./package.json'); console.log('- '+p.name+'@'+p.version); Object.entries(p.dependencies||{}).slice(0,10).forEach(([k,v])=>console.log('- '+k+': '+v))" 2>/dev/null || echo '(no package.json)')

## CLAUDE.md Content (frozen)
$(cat "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null || echo '(no CLAUDE.md found)')
EOF

echo "SNAPSHOT_ID=$SNAPSHOT_ID" > "$CLAUDE_DIR/context/.env"
echo "GIT_HASH=$GIT_HASH" >> "$CLAUDE_DIR/context/.env"

echo "Snapshot created: $SNAPSHOT_ID (git: $GIT_HASH)"
echo "File: .claude/context/project-snapshot.md"
