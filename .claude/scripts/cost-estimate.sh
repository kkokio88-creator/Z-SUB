#!/bin/bash
# cost-estimate.sh — 멀티 에이전트 비용 추정
# Usage: bash .claude/scripts/cost-estimate.sh <num-subagents> <estimated-minutes>

set -euo pipefail

NUM_SUBS="${1:?Usage: cost-estimate.sh <num-subagents> <estimated-minutes>}"
EST_MINUTES="${2:?Usage: cost-estimate.sh <num-subagents> <estimated-minutes>}"

# ─── 비용 추정 (대략적 토큰 기반) ───
# Opus: ~$15/M input, ~$75/M output (rough)
# Sonnet: ~$3/M input, ~$15/M output (rough)
# 분당 ~2k 토큰 가정

TOKENS_PER_MIN=2000
LEADER_INPUT_TOKENS=$((EST_MINUTES * TOKENS_PER_MIN))
LEADER_OUTPUT_TOKENS=$((LEADER_INPUT_TOKENS / 2))
SUB_INPUT_TOKENS=$((EST_MINUTES * TOKENS_PER_MIN))
SUB_OUTPUT_TOKENS=$((SUB_INPUT_TOKENS / 2))

# Cost in cents
LEADER_COST=$(( (LEADER_INPUT_TOKENS * 15 / 1000 + LEADER_OUTPUT_TOKENS * 75 / 1000) / 100 ))
SUB_COST_EACH=$(( (SUB_INPUT_TOKENS * 3 / 1000 + SUB_OUTPUT_TOKENS * 15 / 1000) / 100 ))
SUB_COST_TOTAL=$((SUB_COST_EACH * NUM_SUBS))
TOTAL_COST=$((LEADER_COST + SUB_COST_TOTAL))

# Single Sonnet baseline
SINGLE_COST=$((SUB_COST_EACH))
if [[ "$SINGLE_COST" -eq 0 ]]; then SINGLE_COST=1; fi
RATIO=$((TOTAL_COST * 10 / SINGLE_COST))
RATIO_INT=$((RATIO / 10))
RATIO_DEC=$((RATIO % 10))

echo "=== 비용 추정 ==="
echo "에이전트: Leader(Opus) + ${NUM_SUBS} Sub(Sonnet)"
echo "예상 시간: ${EST_MINUTES}분"
echo ""
echo "예상 비용:"
printf "  Leader:       ~\$%d.%02d\n" $((LEADER_COST / 100)) $((LEADER_COST % 100))
printf "  Sub x%d:      ~\$%d.%02d\n" "$NUM_SUBS" $((SUB_COST_TOTAL / 100)) $((SUB_COST_TOTAL % 100))
printf "  총:           ~\$%d.%02d\n" $((TOTAL_COST / 100)) $((TOTAL_COST % 100))
echo ""
echo "비교:"
printf "  단일 Sonnet:  ~\$%d.%02d\n" $((SINGLE_COST / 100)) $((SINGLE_COST % 100))
echo "  증가율:       ${RATIO_INT}.${RATIO_DEC}배"
echo ""
read -p "계속 진행하시겠습니까? (y/n): " choice
if [[ "$choice" != "y" ]]; then
  echo "취소됨."
  exit 1
fi
echo "승인됨. 에이전트 팀을 시작합니다."
