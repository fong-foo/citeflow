# data_store.py — SQLite 存储层
# 每次管线运行结果存入 runs 表（宽表设计，核心指标作为列）
# 支持历史查询：同品牌上次指标、指标趋势、行业聚合

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone

_DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
_DB_PATH = os.path.join(_DB_DIR, "citeflow.db")


def _ensure_dir():
    os.makedirs(_DB_DIR, exist_ok=True)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """初始化数据库（幂等）。"""
    _ensure_dir()
    conn = _connect()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY,
            brand_name TEXT NOT NULL,
            domain TEXT NOT NULL,
            industry TEXT DEFAULT '',
            target_market TEXT DEFAULT '',
            core_product TEXT DEFAULT '',
            status TEXT DEFAULT 'success',
            -- 核心指标（高频查询直接走列，不用解 JSON）
            citation_rate REAL DEFAULT 0,
            industry_rate REAL DEFAULT 0,
            brand_rate REAL DEFAULT 0,
            competitor_scenario_rate REAL DEFAULT 0,
            recommendation_rate REAL DEFAULT 0,
            alignment_score REAL DEFAULT 0,
            overall_score REAL DEFAULT 0,
            -- 三引擎 A 类引用率
            engine_gpt_rate REAL DEFAULT 0,
            engine_gemini_rate REAL DEFAULT 0,
            engine_haiku_rate REAL DEFAULT 0,
            -- 完整输出
            probe_json TEXT DEFAULT '{}',
            analyst_json TEXT DEFAULT '{}',
            -- 处方摘要（方便查询，不依赖 analyst_json）
            actions_json TEXT DEFAULT '[]',
            -- 耗时 / token
            probe_duration_ms INTEGER DEFAULT 0,
            analyst_duration_ms INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            total_cost REAL DEFAULT 0,
            -- 元数据
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_runs_brand ON runs(brand_name, created_at);
        CREATE INDEX IF NOT EXISTS idx_runs_industry ON runs(industry);
        CREATE INDEX IF NOT EXISTS idx_runs_domain ON runs(domain);
    """)
    conn.commit()
    conn.close()


def save_run(
    brand_name: str,
    domain: str,
    industry: str = "",
    target_market: str = "",
    core_product: str = "",
    probe_output: dict | None = None,
    analyst_output: dict | None = None,
    probe_duration_ms: int = 0,
    analyst_duration_ms: int = 0,
    status: str = "success",
) -> str:
    """保存一次完整的管线运行。

    Returns:
        run_id: UUID 字符串
    """
    _ensure_dir()
    probe = probe_output or {}
    analyst = analyst_output or {}
    cm = probe.get("citation_metrics") or {}
    cs = probe.get("company_score") or {}
    gr = probe.get("gap_report") or {}
    meta = probe.get("meta") or {}
    er = probe.get("engine_results") or {}

    def _eng_rate(engine_name: str) -> float:
        eng = er.get(engine_name, {})
        return eng.get("citation_rate", 0) if isinstance(eng, dict) else 0

    actions = analyst.get("actions", [])

    run_id = uuid.uuid4().hex[:12]
    now = datetime.now(timezone.utc).isoformat()

    conn = _connect()
    try:
        with conn:
            conn.execute("""
                INSERT INTO runs (
                    id, brand_name, domain, industry, target_market, core_product,
                    status, citation_rate, industry_rate, brand_rate,
                    competitor_scenario_rate, recommendation_rate,
                    alignment_score, overall_score,
                    engine_gpt_rate, engine_gemini_rate, engine_haiku_rate,
                    probe_json, analyst_json, actions_json,
                    probe_duration_ms, analyst_duration_ms,
                    total_tokens, total_cost, created_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            """, (
                run_id, brand_name, domain, industry, target_market, core_product,
                status,
                cm.get("rate", 0),
                cm.get("industry_rate", 0),
                cm.get("brand_rate", 0),
                cm.get("competitor_scenario_rate", 0),
                cm.get("recommendation_rate", 0),
                gr.get("alignment_score", 0),
                cs.get("overall", 0),
                _eng_rate("gpt"),
                _eng_rate("gemini"),
                _eng_rate("haiku"),
                json.dumps(probe, ensure_ascii=False),
                json.dumps(analyst, ensure_ascii=False),
                json.dumps(actions, ensure_ascii=False),
                probe_duration_ms,
                analyst_duration_ms,
                meta.get("total_tokens", 0),
                meta.get("total_cost", 0),
                now,
            ))
        conn.close()
        return run_id
    except Exception:
        conn.close()
        raise


def get_last_run(brand_name: str) -> dict | None:
    """获取同一品牌最近一次运行（不含本次）。"""
    conn = _connect()
    row = conn.execute(
        "SELECT * FROM runs WHERE brand_name = ? ORDER BY created_at DESC LIMIT 1",
        (brand_name,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)


def get_brand_history(brand_name: str, limit: int = 10) -> list[dict]:
    """获取同一品牌历次运行记录（最新在前）。"""
    conn = _connect()
    rows = conn.execute(
        "SELECT id, brand_name, industry, status, created_at, "
        "citation_rate, industry_rate, brand_rate, competitor_scenario_rate, "
        "recommendation_rate, alignment_score, overall_score, "
        "engine_gpt_rate, engine_gemini_rate, engine_haiku_rate, "
        "probe_duration_ms, total_tokens, total_cost "
        "FROM runs WHERE brand_name = ? ORDER BY created_at DESC LIMIT ?",
        (brand_name, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_industry_runs(industry: str, limit: int = 20) -> list[dict]:
    """获取同行业的所有运行记录。"""
    conn = _connect()
    rows = conn.execute(
        "SELECT id, brand_name, domain, industry, created_at, "
        "citation_rate, industry_rate, brand_rate, recommendation_rate, "
        "alignment_score, overall_score "
        "FROM runs WHERE industry = ? ORDER BY created_at DESC LIMIT ?",
        (industry, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
