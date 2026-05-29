#!/usr/bin/env zsh
# check.sh — 检查目标网站的 robots.txt 是否放行了全部 AI 爬虫
# 用法:
#   ./check.sh https://example.com          # 检查单个域名
#   ./check.sh https://example.com --json   # JSON 输出

set -euo pipefail

TARGET="${1:-}"
FORMAT="${2:-text}"

if [[ -z "$TARGET" ]]; then
  echo "用法: ./check.sh <url> [--json]"
  echo "示例: ./check.sh https://example.com"
  echo "      ./check.sh https://example.com --json"
  exit 1
fi

# 去掉末尾斜杠
TARGET="${TARGET%/}"
ROBOTS_URL="${TARGET}/robots.txt"

# 获取 robots.txt
ROBOTS_CONTENT=$(curl -sL --max-time 10 "$ROBOTS_URL" 2>/dev/null || echo "")

if [[ -z "$ROBOTS_CONTENT" ]]; then
  if [[ "$FORMAT" == "--json" ]]; then
    echo "{\"error\":\"无法获取 robots.txt\",\"url\":\"$ROBOTS_URL\"}"
  else
    echo "❌ 无法获取 $ROBOTS_URL"
  fi
  exit 1
fi

PASS=0
FAIL=0
TOTAL=0

check_crawler() {
  local ua="$1"
  local engine="$2"
  TOTAL=$((TOTAL + 1))

  # 提取该 User-agent 段的内容
  local section
  section=$(echo "$ROBOTS_CONTENT" | awk -v ua="$ua" '
    BEGIN { found=0; print_sec=0 }
    tolower($0) ~ "^[[:space:]]*user-agent:[[:space:]]*" tolower(ua) "[[:space:]]*$" { found=1; print_sec=1; next }
    found && /^[[:space:]]*[Uu]ser-[Aa]gent:/ { print_sec=0 }
    print_sec { print }
  ')

  if echo "$section" | grep -qi "Disallow:.*/"; then
    if echo "$section" | grep -qi "Allow:.*/"; then
      # 有 Disallow 也有 Allow = 部分放行
      if [[ "$FORMAT" == "--json" ]]; then
        echo "  {\"ua\":\"$ua\",\"engine\":\"$engine\",\"status\":\"partial\",\"message\":\"部分放行\"},"
      else
        echo "⚠️  $ua ($engine) — 部分放行"
      fi
      PASS=$((PASS + 1))
    else
      # 有 Disallow 无 Allow = 被屏蔽
      if [[ "$FORMAT" == "--json" ]]; then
        echo "  {\"ua\":\"$ua\",\"engine\":\"$engine\",\"status\":\"blocked\",\"message\":\"被屏蔽\"},"
      else
        echo "❌ $ua ($engine) — 被屏蔽"
      fi
      FAIL=$((FAIL + 1))
    fi
  elif [[ -n "$section" ]]; then
    # UA 段存在且没有 Disallow
    if [[ "$FORMAT" == "--json" ]]; then
      echo "  {\"ua\":\"$ua\",\"engine\":\"$engine\",\"status\":\"allowed\"},"
    else
      echo "✅ $ua ($engine)"
    fi
    PASS=$((PASS + 1))
  else
    # UA 段不存在 = 默认放行
    if [[ "$FORMAT" == "--json" ]]; then
      echo "  {\"ua\":\"$ua\",\"engine\":\"$engine\",\"status\":\"not_mentioned\",\"message\":\"未提及（默认放行）\"},"
    else
      echo "✅ $ua ($engine) — 未提及（默认放行）"
    fi
    PASS=$((PASS + 1))
  fi
}

if [[ "$FORMAT" == "--json" ]]; then
  echo "{"
  echo "  \"url\": \"$ROBOTS_URL\","
  echo "  \"results\": ["
else
  echo ""
  echo "🔍 检查: $ROBOTS_URL"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "AI 搜索爬虫:"
  echo "────────────"
fi

# AI 爬虫
check_crawler "GPTBot"             "OpenAI"
check_crawler "ChatGPT-User"       "OpenAI"
check_crawler "oai-searchbot"      "OpenAI"
check_crawler "ClaudeBot"          "Anthropic"
check_crawler "Claude-Web"         "Anthropic"
check_crawler "anthropic-ai"       "Anthropic"
check_crawler "PerplexityBot"      "Perplexity"
check_crawler "Perplexity-Chat"    "Perplexity"
check_crawler "Google-Extended"    "Google"
check_crawler "CCBot"              "CommonCrawl"
check_crawler "meta-externalagent" "Meta"
check_crawler "meta-externalfetcher" "Meta"
check_crawler "cohere-ai"          "Cohere"
check_crawler "Bytespider"         "ByteDance"

if [[ "$FORMAT" != "--json" ]]; then
  echo ""
  echo "传统搜索引擎:"
  echo "────────────"
fi

check_crawler "Googlebot"    "Google"
check_crawler "Bingbot"      "Bing"
check_crawler "DuckDuckBot"  "DuckDuckGo"

if [[ "$FORMAT" == "--json" ]]; then
  echo "  ]"
  echo "}"
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "结果: $PASS 放行 / $FAIL 屏蔽 / $TOTAL 总计"
  if [[ "$FAIL" -gt 0 ]]; then
    echo ""
    echo "⚠️  有 $FAIL 个 AI 爬虫被屏蔽。你的品牌在这些引擎的搜索结果中可能不存在。"
    echo "👉 修复方案: https://github.com/fong-foo/ai-crawlers"
  else
    echo "✅ 全部 AI 爬虫已放行。"
  fi
fi
