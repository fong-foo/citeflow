# config.py — CiteFlow API 配置统一管理
# 两个 API 都是 OpenAI 兼容格式，区别仅在 base_url + model + api_key

import os
from dotenv import load_dotenv
load_dotenv()

# ─── 共享 API Key（所有引擎走同一個 ofox.ai 代理）────────
_OFOX_API_KEY = os.environ.get("OPENAI_API_KEY", "") or "sk-of-OVfNmVYNgxPuJSZtdyGjCqvMwCJfhNjJNMzZfUknFJQEogbcJdIYMuTyTPJGarSq"

# ─── GPT 中转站（联网搜索）────────────────────────────────
GPT_CONFIG = {
    "base_url": "https://api.ofox.io/v1/chat/completions",
    "model": "openai/gpt-4o",
    "api_key": _OFOX_API_KEY,
    "timeout": 120,
    "max_retries": 3,
}

# ─── Serper Google 搜索 ─────────────────────────────────
SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "") or "695eb85c5407168a40e6e533855399573716e820"

# ─── 行业基准数据（先用竞品分析结果估算，后续从数据飞轮更新）─────
# 注意：这些是估算值，在诊断中说明"基于有限数据估算，仅供参考"
# 分位数：P25=落后, P50=中位, P75=领先
INDUSTRY_BENCHMARKS = {
    "B2B SaaS": {
        "citation_rate": {"p25": 30, "p50": 45, "p75": 70},
        "industry_rate": {"p25": 15, "p50": 30, "p75": 50},
        "alignment_score": {"p25": 50, "p50": 65, "p75": 80},
        "overall_score": {"p25": 45, "p50": 60, "p75": 75},
        "recommendation_rate": {"p25": 10, "p50": 25, "p75": 45},
    },
    "跨境支付": {
        "citation_rate": {"p25": 25, "p50": 40, "p75": 65},
        "industry_rate": {"p25": 10, "p50": 25, "p75": 45},
        "alignment_score": {"p25": 45, "p50": 60, "p75": 75},
        "overall_score": {"p25": 40, "p50": 55, "p75": 70},
        "recommendation_rate": {"p25": 8, "p50": 20, "p75": 40},
    },
    "DTC品牌": {
        "citation_rate": {"p25": 35, "p50": 50, "p75": 75},
        "industry_rate": {"p25": 20, "p50": 35, "p75": 55},
        "alignment_score": {"p25": 55, "p50": 70, "p75": 85},
        "overall_score": {"p25": 50, "p50": 65, "p75": 80},
        "recommendation_rate": {"p25": 15, "p50": 30, "p75": 50},
    },
    # 默认基准（行业未知时使用）
    "_default": {
        "citation_rate": {"p25": 30, "p50": 45, "p75": 70},
        "industry_rate": {"p25": 15, "p50": 30, "p75": 50},
        "alignment_score": {"p25": 50, "p50": 65, "p75": 80},
        "overall_score": {"p25": 45, "p50": 60, "p75": 75},
        "recommendation_rate": {"p25": 10, "p50": 25, "p75": 45},
    },
}

# ─── Gemini（引擎对比）─────────────────────────────────
GEMINI_CONFIG = {
    "base_url": "https://api.ofox.io/v1/chat/completions",
    "model": "gemini-3.1-flash-lite-preview",
    "api_key": _OFOX_API_KEY,
    "timeout": 120,
    "max_retries": 3,
}

# ─── Claude Haiku（引擎对比）────────────────────────────
CLAUDE_HAIKU_CONFIG = {
    "base_url": "https://api.ofox.io/v1/chat/completions",
    "model": "anthropic/claude-haiku-4.5",
    "api_key": _OFOX_API_KEY,
    "timeout": 120,
    "max_retries": 3,
}

# ─── 多引擎开关 ──────────────────────────────────────
ENABLE_MULTI_ENGINE = True

# ─── DeepSeek（文本生成／分析）───────────────────────────
DEEPSEEK_CONFIG = {
    "base_url": "https://api.deepseek.com/v1/chat/completions",
    "model": "deepseek-chat",
    "api_key": os.environ.get("DEEPSEEK_API_KEY", "") or "sk-9a5ae063b83144cead80966081e82030",
    "timeout": 60,
    "max_retries": 3,
}
