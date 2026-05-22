# render_contract.py — Probe 报告渲染契约
# 每个展示区块声明它消费的数据字段、是否必填、fallback 值。
# generate_html() 之前跑 PreRenderValidator 校验此契约。
# 改了 state.py 的 Model 字段 → 同步更新此文件。

from typing import Optional, Any

class FieldSpec:
    """单个字段的渲染规格"""
    def __init__(self, model_path: str, required: bool = True,
                 fallback: Any = None, display_name: str = "",
                 conditional_on: Optional[str] = None):
        self.model_path = model_path        # 如 "citation_metrics.industry_rate"
        self.required = required
        self.fallback = fallback
        self.display_name = display_name
        self.conditional_on = conditional_on  # 依赖的父字段路径

class SectionContract:
    """一个展示区块的完整契约"""
    def __init__(self, section_id: str, display_name: str,
                 display_order: int, nav_abbr: str,
                 data_source: str,  # ProbeOutput 中的顶层字段名
                 fields: list[FieldSpec],
                 conditional: Optional[str] = None,  # 条件显示表达式
                 list_source: Optional[str] = None):  # 如果是列表，来源字段
        self.section_id = section_id
        self.display_name = display_name
        self.display_order = display_order
        self.nav_abbr = nav_abbr          # 导航栏缩写（≤4字）
        self.data_source = data_source
        self.fields = fields
        self.conditional = conditional
        self.list_source = list_source


# ─── 9 个展示区块的渲染契约 ──────────────────────────────

SECTIONS = [
    SectionContract(
        section_id="brand_profile",
        display_name="品牌画像",
        display_order=1,
        nav_abbr="品牌",
        data_source="brand_profile",
        fields=[
            FieldSpec("brand_profile.brand_name", required=True, display_name="品牌名称"),
            FieldSpec("brand_profile.one_liner", required=True, display_name="一句话定位"),
            FieldSpec("brand_profile.value_props", required=False, fallback=[], display_name="价值主张"),
            FieldSpec("brand_profile.differentiators", required=False, fallback=[], display_name="差异化"),
            FieldSpec("brand_profile.target_personas", required=False, fallback=[], display_name="目标客户"),
            FieldSpec("brand_profile.tone_keywords", required=False, fallback=[], display_name="品牌调性"),
            FieldSpec("brand_profile.full_description", required=False, fallback="", display_name="完整描述"),
            FieldSpec("brand_profile.inferred_industry", required=False, fallback="", display_name="推断行业"),
            FieldSpec("brand_profile.inferred_target_market", required=False, fallback="", display_name="推断市场"),
            FieldSpec("brand_profile.inferred_core_product", required=False, fallback="", display_name="推断核心产品"),
        ],
    ),
    SectionContract(
        section_id="citation_dashboard",
        display_name="引用率仪表盘",
        display_order=2,
        nav_abbr="引用率",
        data_source="citation_metrics",
        fields=[
            FieldSpec("citation_metrics.rate", required=True, display_name="综合引用率"),
            FieldSpec("citation_metrics.total_queries", required=True, display_name="总查询数"),
            FieldSpec("citation_metrics.mentioned_count", required=True, display_name="被提及数"),
            FieldSpec("citation_metrics.industry_rate", required=True, display_name="A类引用率"),
            FieldSpec("citation_metrics.brand_rate", required=True, display_name="B类引用率"),
            FieldSpec("citation_metrics.competitor_scenario_rate", required=True, display_name="C类引用率"),
            FieldSpec("citation_metrics.industry_count", required=True, display_name="行业查询数"),
            FieldSpec("citation_metrics.brand_count", required=True, display_name="品牌查询数"),
            FieldSpec("citation_metrics.competitor_count", required=True, display_name="竞品查询数"),
            FieldSpec("citation_metrics.recommendation_rate", required=True, display_name="推荐率"),
            FieldSpec("citation_metrics.top_rate", required=True, display_name="TOP1率"),
            FieldSpec("citation_metrics.source_distribution", required=False, fallback={}, display_name="引用源分布"),
            FieldSpec("citation_metrics.official_site_ratio", required=False, fallback=0.0, display_name="官网引用占比"),
            FieldSpec("citation_metrics.third_party_ratio", required=False, fallback=0.0, display_name="第三方引用占比"),
            FieldSpec("citation_metrics.details", required=False, fallback=[], display_name="查询明细"),
        ],
    ),
    SectionContract(
        section_id="market_perception",
        display_name="市场镜像",
        display_order=3,
        nav_abbr="镜像",
        data_source="market_perception",
        fields=[
            FieldSpec("market_perception.perceived_identity", required=True, display_name="AI认知身份"),
            FieldSpec("market_perception.perceived_strengths", required=False, fallback=[], display_name="感知优势"),
            FieldSpec("market_perception.perceived_weaknesses", required=False, fallback=[], display_name="感知劣势"),
            FieldSpec("market_perception.perceived_positioning", required=False, fallback="", display_name="感知定位"),
            FieldSpec("market_perception.perceived_products", required=False, fallback=[], display_name="感知产品"),
            FieldSpec("market_perception.perceived_market", required=False, fallback="", display_name="感知市场"),
            FieldSpec("market_perception.perception_sources", required=False, fallback=[], display_name="认知来源"),
        ],
    ),
    SectionContract(
        section_id="gap_analysis",
        display_name="差距分析",
        display_order=4,
        nav_abbr="差距",
        data_source="gap_report",
        fields=[
            FieldSpec("gap_report.alignment_score", required=True, display_name="对齐分"),
            FieldSpec("gap_report.aligned", required=False, fallback=[], display_name="对齐点"),
            FieldSpec("gap_report.misaligned", required=False, fallback=[], display_name="错位点"),
            FieldSpec("gap_report.blind_spots", required=False, fallback=[], display_name="盲区"),
            FieldSpec("gap_report.opportunities", required=False, fallback=[], display_name="机会"),
            FieldSpec("gap_report.one_line_summary", required=True, display_name="一句话总结"),
            FieldSpec("gap_report.target_alignment_score", required=False, fallback=0, display_name="期望对齐分"),
            FieldSpec("gap_report.target_aligned", required=False, fallback=[], display_name="期望对齐点"),
            FieldSpec("gap_report.target_misaligned", required=False, fallback=[], display_name="期望错位点"),
            FieldSpec("gap_report.target_gap_summary", required=False, fallback="", display_name="期望差距总结"),
        ],
    ),
    SectionContract(
        section_id="company_score",
        display_name="量化评分",
        display_order=5,
        nav_abbr="评分",
        data_source="company_score",
        fields=[
            FieldSpec("company_score.overall", required=True, display_name="综合评分"),
            FieldSpec("company_score.industry", required=False, fallback="", display_name="行业"),
            FieldSpec("company_score.weights_used", required=False, fallback={}, display_name="权重配置"),
            FieldSpec("company_score.dimensions", required=False, fallback=[], display_name="维度打分"),
        ],
    ),
    SectionContract(
        section_id="competitor_matrix",
        display_name="竞品矩阵",
        display_order=6,
        nav_abbr="竞品",
        data_source="competitor_analysis",
        list_source="competitor_analysis",
        fields=[
            FieldSpec("competitor_analysis.[].query", required=True, display_name="查询词"),
            FieldSpec("competitor_analysis.[].winner", required=False, fallback="", display_name="胜者"),
            FieldSpec("competitor_analysis.[].reason", required=False, fallback="", display_name="理由"),
            FieldSpec("competitor_analysis.[].competitor_refs", required=False, fallback=[], display_name="竞品列表"),
            FieldSpec("competitor_analysis.[].dimension_scores", required=False, fallback=[], display_name="维度打分"),
            FieldSpec("competitor_analysis.[].dimension_win_count", required=False, fallback={}, display_name="维度胜出计数"),
        ],
    ),
    SectionContract(
        section_id="ai_narrative",
        display_name="AI 推荐话术",
        display_order=7,
        nav_abbr="话术",
        data_source="ai_narrative",
        fields=[
            FieldSpec("ai_narrative.ideal_description", required=True, display_name="理想推荐描述"),
            FieldSpec("ai_narrative.keywords", required=False, fallback=[], display_name="关键词"),
            FieldSpec("ai_narrative.value_props", required=False, fallback=[], display_name="价值主张"),
            FieldSpec("ai_narrative.avoid", required=False, fallback=[], display_name="禁忌话术"),
            FieldSpec("ai_narrative.tone", required=False, fallback="", display_name="推荐语气"),
        ],
    ),
    SectionContract(
        section_id="source_authority",
        display_name="引用源权威性",
        display_order=8,
        nav_abbr="来源",
        data_source="source_authority",
        fields=[
            FieldSpec("source_authority.total_sources", required=True, display_name="总来源数"),
            FieldSpec("source_authority.source_diversity", required=True, display_name="来源多样性"),
            FieldSpec("source_authority.top_sources", required=False, fallback=[], display_name="Top来源列表"),
        ],
    ),
    SectionContract(
        section_id="engine_comparison",
        display_name="三引擎对比",
        display_order=9,
        nav_abbr="引擎",
        data_source="engine_results",
        fields=[
            FieldSpec("engine_results.gpt.citation_rate", required=False, fallback=0.0, display_name="GPT引用率"),
            FieldSpec("engine_results.gemini.citation_rate", required=False, fallback=0.0, display_name="Gemini引用率"),
            FieldSpec("engine_results.haiku.citation_rate", required=False, fallback=0.0, display_name="Haiku引用率"),
            FieldSpec("engine_results.gpt.recommendation_rate", required=False, fallback=0.0, display_name="GPT推荐率"),
            FieldSpec("engine_results.gemini.recommendation_rate", required=False, fallback=0.0, display_name="Gemini推荐率"),
            FieldSpec("engine_results.haiku.recommendation_rate", required=False, fallback=0.0, display_name="Haiku推荐率"),
        ],
    ),
    SectionContract(
        section_id="company_evaluation",
        display_name="公司评估",
        display_order=10,
        nav_abbr="评估",
        data_source="company_evaluation",
        fields=[
            FieldSpec("company_evaluation.overall", required=True, display_name="整体评价"),
            FieldSpec("company_evaluation.strengths", required=False, fallback=[], display_name="优势"),
            FieldSpec("company_evaluation.weaknesses", required=False, fallback=[], display_name="劣势"),
            FieldSpec("company_evaluation.positioning", required=False, fallback="", display_name="市场定位"),
        ],
    ),
]

# 索引
SECTION_BY_ID = {s.section_id: s for s in SECTIONS}
SECTION_ORDER = sorted(SECTIONS, key=lambda s: s.display_order)
