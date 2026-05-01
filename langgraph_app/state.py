# state.py — CiteFlow 走廊黑板定义
# State 用 TypedDict（LangGraph 要求），值都是 dict
# 每个节点内部用对应的 Pydantic Model 解析

from typing import Optional, TypedDict
from pydantic import BaseModel


# ─── 输入 ───────────────────────────────────────────────
class UserInput(BaseModel):
    domain: str                    # 品牌官网域名
    brand_name: str                # 品牌名称
    industry: str                  # 行业：B2B SaaS / 跨境支付 / DTC品牌
    target_market: str             # 目标市场/地区
    core_product: str              # 核心产品/服务描述
    seed_queries: list[str]        # 种子查询词
    competitors: list[str] = []    # 主要竞品域名


# ─── Probe 输出 ─────────────────────────────────────────
class Citation(BaseModel):
    quote_text: str
    source_url: str
    ai_engine: str
    sentiment: str
    wilson_score: float = 0.0


class ProbeOutput(BaseModel):
    citations: list[Citation]
    engines_queried: list[str]
    query_terms: list[str]
    raw_serp: dict = {}
    status: str = "success"
    error: Optional[str] = None


# ─── Analyst 输出 ───────────────────────────────────────
class Issue(BaseModel):
    type: str
    severity: str
    description: str
    affected_queries: list[str] = []


class WilsonScoreResult(BaseModel):
    overall: float
    by_engine: dict[str, float] = {}
    by_query: dict[str, float] = {}
    rank: int


class AnalystOutput(BaseModel):
    wilson_scores: WilsonScoreResult
    issues: list[Issue]
    recommendations: list[str]
    competitor_comparison: dict = {}
    status: str = "success"
    error: Optional[str] = None


# ─── Commander 输出 ─────────────────────────────────────
class Task(BaseModel):
    agent: str
    priority: str
    payload: dict
    estimated_cost: float = 0.0


class CommanderPlan(BaseModel):
    tasks: list[Task]
    industry_weights: dict
    optimization_route: str
    status: str = "success"
    error: Optional[str] = None


# ─── Entity 输出 ────────────────────────────────────────
class WikidataChange(BaseModel):
    property: str
    old_value: str
    new_value: str


class EntityResult(BaseModel):
    wikidata_changes: list[WikidataChange]
    knowledge_graph_status: str = ""
    consistency_report: dict = {}
    status: str = "success"
    error: Optional[str] = None


# ─── Architect 输出 ─────────────────────────────────────
class SchemaInjection(BaseModel):
    model_config = {"protected_namespaces": ()}
    page_url: str
    schema_type: str
    schema_json: dict


class ArchitectResult(BaseModel):
    schema_injections: list[SchemaInjection]
    content_changes: list[dict] = []
    llms_txt_generated: bool = False
    crawlability_report: dict = {}
    status: str = "success"
    error: Optional[str] = None


# ─── Outreach 输出 ──────────────────────────────────────
class PlatformSubmission(BaseModel):
    platform: str
    url: str
    status: str


class OutreachResult(BaseModel):
    platform_submissions: list[PlatformSubmission]
    reviews_summary: dict = {}
    earned_media: list[dict] = []
    status: str = "success"
    error: Optional[str] = None


# ─── Content 输出 ───────────────────────────────────────
class ContentPiece(BaseModel):
    type: str
    title: str
    url: str = ""
    status: str


class ContentResult(BaseModel):
    videos_created: list[ContentPiece] = []
    articles_created: list[ContentPiece] = []
    faqs_created: list[ContentPiece] = []
    distribution_status: dict = {}
    status: str = "success"
    error: Optional[str] = None


# ─── Community 输出 ─────────────────────────────────────
class CommunityActivity(BaseModel):
    platform: str
    url: str
    action: str
    topic: str


class CommunityResult(BaseModel):
    reddit_activity: list[CommunityActivity] = []
    quora_answers: list[CommunityActivity] = []
    forum_posts: list[CommunityActivity] = []
    reputation_score: float = 0.0
    status: str = "success"
    error: Optional[str] = None


# ─── Coordinator 输出 ───────────────────────────────────
class Conflict(BaseModel):
    field: str
    values: dict[str, str]
    resolution: str


class CoordinatorReport(BaseModel):
    consistency_score: float
    conflicts: list[Conflict] = []
    actions_taken: list[str] = []
    recommendation: str
    status: str = "success"
    error: Optional[str] = None


# ─── 管线状态 ───────────────────────────────────────────
class PipelineStatus(BaseModel):
    current_node: str = ""
    step: int = 0
    message: str = ""


# ─── 走廊 State（LangGraph TypedDict）───────────────────
class State(TypedDict):
    user_input: dict
    probe_output: dict
    analyst_output: dict
    commander_plan: dict
    entity_result: dict
    architect_result: dict
    outreach_result: dict
    content_result: dict
    community_result: dict
    coordinator_report: dict
    pipeline_status: dict
    retry_count: int
