#!/usr/bin/env zsh
# check.sh — 检查目标网站是否有 llms.txt 并验证内容
# 用法:
#   ./check.sh https://example.com
#   curl -sL raw.../check.sh | zsh -s https://example.com

set -euo pipefail

TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
  echo "用法: ./check.sh <url>"
  echo "示例: ./check.sh https://example.com"
  exit 1
fi

TARGET="${TARGET%/}"
LLMS_URL="${TARGET}/llms.txt"

HTTP_CODE=$(curl -sL --max-time 10 -o /tmp/llms_txt_check -w "%{http_code}" "$LLMS_URL" 2>/dev/null || echo "000")

echo ""
echo "🔍 检查: $LLMS_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$HTTP_CODE" == "200" ]]; then
  CONTENT=$(cat /tmp/llms_txt_check)
  echo "✅ llms.txt 存在 (200 OK)"
  echo ""

  # 检查关键内容
  CHECKS_PASS=0
  CHECKS_TOTAL=5

  echo "内容检查:"
  echo "─────────"

  if echo "$CONTENT" | grep -qi "## About"; then
    echo "✅ 包含 About 品牌描述"
    CHECKS_PASS=$((CHECKS_PASS + 1))
  else
    echo "❌ 缺少 About 品牌描述"
  fi

  if echo "$CONTENT" | grep -qi "## Key Pages\|## Product"; then
    echo "✅ 包含页面/产品分类"
    CHECKS_PASS=$((CHECKS_PASS + 1))
  else
    echo "❌ 缺少页面/产品分类"
  fi

  LINK_COUNT=$(echo "$CONTENT" | grep -cE '^-\s+\[.+\]\(.+\)|^-\s+/' 2>/dev/null || echo "0")
  LINK_COUNT=${LINK_COUNT:-0}
  if [[ "$LINK_COUNT" -ge 5 ]]; then
    echo "✅ 包含 $LINK_COUNT 个链接 (≥5)"
    CHECKS_PASS=$((CHECKS_PASS + 1))
  else
    echo "⚠️  只有 $LINK_COUNT 个链接 (建议 ≥10)"
  fi

  if echo "$CONTENT" | grep -qE "^# Domain:"; then
    echo "✅ 包含 Domain 元数据"
    CHECKS_PASS=$((CHECKS_PASS + 1))
  else
    echo "⚠️  建议添加 Domain 元数据行"
  fi

  if echo "$CONTENT" | grep -qE "^# Last Updated:"; then
    echo "✅ 包含更新日期"
    CHECKS_PASS=$((CHECKS_PASS + 1))
  else
    echo "⚠️  建议添加更新日期"
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "结果: ${CHECKS_PASS}/${CHECKS_TOTAL} 项通过"

  if [[ "$CHECKS_PASS" -ge 4 ]]; then
    echo "✅ llms.txt 内容完整。"
  else
    echo "⚠️  llms.txt 内容不完整。"
    echo "👉 模板: https://github.com/fong-foo/llms-txt"
  fi

elif [[ "$HTTP_CODE" == "404" ]]; then
  echo "❌ 没有 llms.txt (404)"
  echo ""
  echo "👉 创建指南: https://github.com/fong-foo/llms-txt"
  echo "👉 下载模板: wget https://raw.githubusercontent.com/fong-foo/llms-txt/main/llms.txt"
else
  echo "❌ HTTP $HTTP_CODE"
fi

rm -f /tmp/llms_txt_check
