# state.py — CiteFlow 走廊黑板定义
# State 用 TypedDict（LangGraph 要求），值都是 dict
# 每个节点内部用对应的 Pydantic Model 解析

from typing import Optional, TypedDict
from pydantic import BaseModel, model_validator


# ─── 输入 ───────────────────────────────────────────────
class UserInput(BaseModel):
    domain: str                    # 品牌官网域名
    brand_name: str                # 品牌名称
    industry: str = ""             # 行业：B2B SaaS / 跨境支付 / DTC品牌（爬取失败时兜底）
    target_market: str = ""        # 目标市场/地区（爬取失败时兜底）
    core_product: str = ""         # 核心产品/服务描述（爬取失败时兜底）
    target_positioning: str = ""   # 品牌想让AI看到什么（可选，用于gap维度2）
    seed_queries: list[str] = []   # 种子查询词
    competitors: list[str] = []    # 主要竞品域名


# ─── Probe 输出 ─────────────────────────────────────────
class BrandProfile(BaseModel):
    brand_name: str
    one_liner: str              # 一句话定位
    value_props: list[str]      # 3-5 个核心价值主张
    differentiators: list[str]  # 2-3 个差异化卖点
    target_personas: list[str]  # 目标客户画像
    tone_keywords: list[str]    # 品牌调性关键词
    full_description: str       # 200-300 字完整描述
    inferred_industry: str = ""         # 从官网推断的行业
    inferred_target_market: str = ""    # 从官网推断的目标市场
    inferred_core_product: str = ""     # 从官网推断的核心产品
    target_positioning: str = ""        # 品牌想让AI看到什么（用户填）


class CompanyEvaluation(BaseModel):
    overall: str
    strengths: list[str]
    weaknesses: list[str]
    positioning: str


class DimensionScore(BaseModel):
    name: str
    score: int
    evidence: str
    suggestion: str


class CompanyScore(BaseModel):
    overall: int
    dimensions: list[DimensionScore]
    industry: str
    weights_used: dict[str, float]


class AINarrative(BaseModel):
    ideal_description: str
    keywords: list[str]
    value_props: list[str]
    avoid: list[str]
    tone: str


class CitationDetail(BaseModel):
    query: str
    mentioned: bool
    position: str  # top / middle / bottom / mention / none
    mention_context: str
    reference_source: str
    query_category: str = "industry"  # industry / brand / competitor
    competitor_mentions: dict = {}  # {competitor_name: {is_mentioned, position}}


class CitationMetrics(BaseModel):
    rate: float  # 0-100  （旧，保留兼容：A类引用率 = industry_rate）
    mention_rate: float = 0.0  # 全局提及率 (A+B+C中is_mentioned=true的比例)
    total_queries: int
    mentioned_count: int
    details: list[CitationDetail]
    # 按查询类别分组的引用率
    industry_rate: float = 0.0           # A类：行业通用查询引用率（最有意义的指标）
    brand_rate: float = 0.0              # B类：品牌直接查询引用率
    competitor_scenario_rate: float = 0.0  # C类：竞品主导查询引用率
    # 按类别的计数
    industry_count: int = 0
    brand_count: int = 0
    competitor_count: int = 0
    industry_mentioned: int = 0
    brand_mentioned: int = 0
    competitor_mentioned: int = 0
    # 推荐率（仅 position 为 top/middle/bottom 算推荐，mention 不算）
    recommendation_rate: float = 0.0       # 被AI真正推荐的查询占比（全局，向后兼容）
    a_recommendation_rate: float = 0.0     # A类(行业)查询中的推荐率
    c_recommendation_rate: float = 0.0     # C类(竞品)查询中的推荐率（B类不算推荐率）
    recommended_count: int = 0             # 被推荐的查询数
    top_rate: float = 0.0                  # 排第一的占比
    top_count: int = 0                     # 排第一的查询数
    # 引用源分布
    source_distribution: dict[str, float] = {}  # 域名→占比
    official_site_ratio: float = 0.0            # 官网引用占比
    third_party_ratio: float = 0.0              # 第三方引用占比
    # 竞品引用详情（从搜索结果中提取，不额外搜索）
    competitor_citation_detail: dict = {}
    # 竞品per-dimension指标（用于仪表盘竞品对比折线图）
    competitor_metrics: dict[str, dict] = {}


class SourceItem(BaseModel):
    domain: str
    source_type: str
    mention_count: int
    avg_position: float
    authority_score: int
    queries: list[str]


class SourceAuthorityReport(BaseModel):
    top_sources: list[SourceItem]
    total_sources: int
    source_diversity: float


class RankingItem(BaseModel):
    brand: str
    rank: int
    score: Optional[int] = None
    summary: str
    source_quote: str = ""        # 原文引用，来自搜索结果的精确句子
    verified: str = "unverified"  # "verified" | "partial" | "unverified"


class DimensionComparison(BaseModel):
    dimension: str          # 维度名称（如"环保可持续"、"跌落保护"）
    rankings: list[RankingItem] = []
    importance: str = ""    # 该维度在此次对比中的重要性: high / medium / low

class CompetitorResult(BaseModel):
    query: str
    winner: str             # 综合胜者（保留向后兼容）
    reason: str             # 综合理由
    competitor_refs: list[str]
    # 新增：维度级评分
    dimension_scores: list[DimensionComparison] = []
    dimension_win_count: dict[str, int] = {}  # 各品牌在维度上的胜出次数 {"Pela Case": 5, "Casetify": 3}


class MarketPerception(BaseModel):
    perceived_identity: str
    perceived_strengths: list[str]
    perceived_weaknesses: list[str]
    perceived_positioning: str
    perceived_products: list[str]
    perceived_market: str
    perception_sources: list[str]


class GapReport(BaseModel):
    alignment_score: int  # 0-100，维度1：品牌自述 vs AI认知
    aligned: list[str]
    misaligned: list[str]
    blind_spots: list[str]
    opportunities: list[str]
    one_line_summary: str
    # 维度2：品牌期望 vs AI认知（用户填了 target_positioning 时才有值）
    target_alignment_score: int = 0
    target_aligned: list[str] = []
    target_misaligned: list[str] = []
    target_gap_summary: str = ""
    has_target_gap: bool = False


class ProbeMeta(BaseModel):
    total_tokens: int = 0
    total_cost: float = 0.0
    total_duration_ms: int = 0
    query_statuses: dict = {}


class EngineResult(BaseModel):
    """单个引擎的搜索结果"""
    engine: str  # "gpt" | "gemini" | "haiku"
    queries: list[str] = []  # 该引擎跑的查询词
    citation_rate: float = 0.0  # A类查询的引用率
    recommendation_rate: float = 0.0  # A类查询的推荐率
    sources: dict = {}  # {domain: count}
    competitor_analysis: list = []
    raw_data: dict = {}  # 原始数据，方便验证


class ProbeOutput(BaseModel):
    company_evaluation: Optional[CompanyEvaluation] = None
    market_perception: Optional[MarketPerception] = None
    gap_report: Optional[GapReport] = None
    citation_metrics: Optional[CitationMetrics] = None
    competitor_analysis: list[CompetitorResult] = []
    engines_queried: list[str] = []
    query_terms: list[str] = []
    meta: Optional[ProbeMeta] = None
    status: str = "success"
    error: Optional[str] = None
    data_completeness: str = "complete"  # complete | search_timeout | circuit_open | cost_guardrail
    brand_profile: Optional[BrandProfile] = None
    company_score: Optional[CompanyScore] = None
    ai_narrative: Optional[AINarrative] = None
    source_authority: Optional[SourceAuthorityReport] = None
    engine_results: dict[str, EngineResult] = {}  # {"gpt": EngineResult, ...}


# ─── Analyst 输出 ───────────────────────────────────────
class Diagnosis(BaseModel):
    core_problem: str           # 一句话核心问题
    problem_detail: str         # 2-3 句详细诊断
    severity: str               # critical | warning | healthy


class ActionItem(BaseModel):
    priority: str               # P0 | P1 | P2
    action: str                 # 具体行动（一句话概括）
    rationale: str              # 为什么要做这个（洞察，不是复述数据）
    expected_impact: str        # 做完后预期变化，含预估依据
    target_metric: str          # 指标名称
    current_value: str          # 当前值（可以是数字或描述）
    expected_value: str         # 预期值（可以是数字或描述）
    action_steps: list[str] = []    # 3-5 步具体操作，精确到平台和操作
    estimated_time: str = ""        # 预计见效时间（如"2-4周"）
    estimated_cost: str = ""        # 预估成本（如"免费"、"$$"、"$$$"）
    evidence_source: str = ""       # 证据来源（论文X，Section Y.Z 或 "推断"）


class CompetitorGap(BaseModel):
    losing_dimensions: list[dict] = []
    winning_dimensions: list[dict] = []
    root_cause: str = ""
    counter_strategy: str = ""

    @model_validator(mode="after")
    def validate_semantics(self):
        """语义验证：losing_dimensions 里不应有正差距，winning_dimensions 里不应有负差距。
        自动修正符号 + direction，不阻塞数据流。
        """
        for i, dim in enumerate(self.losing_dimensions):
            gap = dim.get("gap")
            direction = dim.get("direction", "")
            # gap 为正且方向为 positive → LLM 搞混了，修正
            if gap is not None and gap > 0:
                dim["gap"] = -abs(gap)
            if direction == "positive":
                dim["direction"] = "negative"

        for i, dim in enumerate(self.winning_dimensions):
            gap = dim.get("gap")
            direction = dim.get("direction", "")
            if gap is not None and gap < 0:
                dim["gap"] = abs(gap)
            if direction == "negative":
                dim["direction"] = "positive"

        return self


class ThreeLayerChain(BaseModel):
    observation: str = ""    # 第一层：数据里看到了什么异常
    explanation: str = ""    # 第二层：为什么会出现这个数据
    implication: str = ""    # 第三层：这对品牌意味着什么，不修的后果


class AnalystOutput(BaseModel):
    three_layer_chain: Optional[ThreeLayerChain] = None
    diagnosis: Optional[Diagnosis] = None
    actions: list[ActionItem] = []
    competitor_gap: Optional[CompetitorGap] = None
    one_line_verdict: str = ""
    engine_comparison: Optional[dict] = None
    engine_insights: list[str] = []
    engine_recommendations: list[str] = []
    b_class_perception: Optional[dict] = None  # B类 AI 认知画像
    c_class_matrix: Optional[dict] = None       # C类 竞品胜负矩阵
    content_templates: Optional[dict] = None    # Layer 6: 内容改造指南（可直接复制的英文模板）
    status: str = "success"
    error: Optional[str] = None


# ─── Doctor 医师输出 ─────────────────────────────────────
class PrescriptionItem(BaseModel):
    priority: str                           # P0 | P1 | P2
    category: str                           # 技术优化 | 内容优化 | 权威建设 | 社区运营
    target_page: str                        # 精确到页面，如 "/products 页面每个产品卡片下方"
    action: str                             # 一句话概括
    what_to_add: list[str]                  # 具体要添加的内容模板（可直接复制使用）
    evidence: str                           # 知识来源（论文X，Section Y）
    expected_impact: str                    # 量化预期（"A类引用率从10%提升至18-22%"）
    timeline: str                           # 预计时间（"1-2周"）
    how_to_verify: str                      # 复查时怎么验证效果
    difficulty: str = "中"                  # 低 | 中 | 高


class DoctorOutput(BaseModel):
    prescription: list[PrescriptionItem] = []
    summary: str = ""                       # 一段话总结整体策略（给用户"大图"）
    knowledge_sources: list[str] = []       # 引用的论文列表
    content_templates: Optional[dict] = None  # 可直接复制的英文内容模版（8个子字段）
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
    doctor_output: dict
    commander_plan: dict
    entity_result: dict
    architect_result: dict
    outreach_result: dict
    content_result: dict
    community_result: dict
    coordinator_report: dict
    pipeline_status: dict
    probe_meta: dict
    errors: dict
    retry_count: int
    checkpoint: dict
