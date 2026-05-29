# config.py — CiteFlow OSS configuration (all keys via environment variables)
import os

# ── API Keys (environment variables only, no defaults) ──
_OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
_DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

# ── ChatGPT (GPT-4o via OpenAI-compatible endpoint) ──
CHATGPT_CONFIG = {
    "base_url": os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    "model": "openai/gpt-4o",
    "api_key": _OPENAI_API_KEY,
    "timeout": 120,
    "max_retries": 3,
}

# ── DeepSeek ──
DEEPSEEK_CONFIG = {
    "base_url": os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"),
    "model": "deepseek-chat",
    "api_key": _DEEPSEEK_API_KEY,
    "timeout": 120,
    "max_retries": 3,
}

# ── Claude Haiku (fast, cheap) ──
CLAUDE_HAIKU_CONFIG = {
    "base_url": os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    "model": "anthropic/claude-haiku-4.5",
    "api_key": _OPENAI_API_KEY,
    "timeout": 60,
    "max_retries": 2,
}

# ── Multi-engine toggle ──
ENABLE_MULTI_ENGINE = os.environ.get("CITEFLOW_ENABLE_MULTI_ENGINE", "1") == "1"

# ── Industry benchmarks (minimal defaults) ──
INDUSTRY_BENCHMARKS = {
    "_default": {"citation_rate": {"p25": 20, "p50": 40, "p75": 60}},
    "beauty": {"citation_rate": {"p25": 25, "p50": 50, "p75": 70}},
    "fashion": {"citation_rate": {"p25": 25, "p50": 50, "p75": 70}},
    "technology": {"citation_rate": {"p25": 15, "p50": 35, "p75": 55}},
    "consumer_goods": {"citation_rate": {"p25": 20, "p50": 45, "p75": 65}},
    "home": {"citation_rate": {"p25": 20, "p50": 45, "p75": 65}},
    "outdoor": {"citation_rate": {"p25": 20, "p50": 45, "p75": 65}},
}
