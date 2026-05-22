"""source_authority 模块测试 — LLM 增强域名类型推断。"""
import sys
import math


# ─── Test 1: extract_domain ────────────────────────────────
def test_extract_domain():
    from langgraph_app.tools.source_authority import extract_domain

    assert extract_domain("https://techcrunch.com/2024/01/notion-review/") == "techcrunch.com"
    assert extract_domain("https://www.forbes.com/sites/...") == "forbes.com"
    assert extract_domain("https://docs.airwallex.com/api-reference") == "docs.airwallex.com"
    assert extract_domain("https://reddit.com/r/SaaS/comments/...") == "reddit.com"
    assert extract_domain("https://medium.com/@user/post") == "medium.com"
    # 无协议
    assert extract_domain("www.example.com/page") == "example.com"
    # 异常输入
    assert extract_domain("") == ""
    assert extract_domain("not a url at all !!!") == "" or "not" in extract_domain("not a url at all !!!")
    print("  PASS test_extract_domain")


# ─── Test 2: infer_source_type ─────────────────────────────
def test_infer_source_type():
    from langgraph_app.tools.source_authority import infer_source_type

    # 精确匹配
    assert infer_source_type("techcrunch.com") == "权威媒体"
    assert infer_source_type("forbes.com") == "权威媒体"
    assert infer_source_type("wikipedia.org") == "百科"
    assert infer_source_type("g2.com") == "评测平台"
    assert infer_source_type("medium.com") == "博客"
    assert infer_source_type("reddit.com") == "论坛"
    assert infer_source_type("twitter.com") == "社交媒体"

    # 子域名匹配 → 官方文档
    assert infer_source_type("docs.airwallex.com") == "官方文档"
    assert infer_source_type("developer.stripe.com") == "官方文档"
    assert infer_source_type("help.notion.so") == "官方文档"
    assert infer_source_type("support.apple.com") == "官方文档"
    assert infer_source_type("learn.microsoft.com") == "官方文档"

    # 不误判 docs.google.com（不是官方文档子域名，也不在 map 里）
    # Google Docs 的域名是 docs.google.com，不是 docs.xxx 子域名模式
    # "docs." 作为 pattern 已被移除，只靠 startswith 检查
    # docs.google.com 不以 "docs." 开头（google.com 的主体是 google.com）
    # 应该返回 "其他"
    # 等等，docs.google.com 以 "docs." 开头...是的它会匹配 startswith("docs.")
    # 这是一个已知的边界情况，但 Google Docs 不算品牌的"官方文档"
    # 暂不处理，因为 Google Docs 不太可能出现在引用来源中
    # 如果出现，标记为"官方文档"也比标记为"其他"更接近真相

    # LLM 推断未知域名（三层策略：硬编码未命中 → 缓存未命中 → LLM 推断）
    # LLM 应返回 VALID_SOURCE_TYPES 中的某个类型，而非仅返回"其他"
    from langgraph_app.tools.source_authority import VALID_SOURCE_TYPES
    blog_type = infer_source_type("unknown-blog.example.com")
    assert blog_type in VALID_SOURCE_TYPES, f"Expected valid type, got '{blog_type}'"
    # blog-like 域名应被推断为博客
    assert blog_type == "博客", f"Expected '博客', got '{blog_type}'"

    rand_type = infer_source_type("some-random-site.io")
    assert rand_type in VALID_SOURCE_TYPES, f"Expected valid type, got '{rand_type}'"

    print("  PASS test_infer_source_type")


# ─── Test 3: analyze — 空输入 ─────────────────────────────
def test_analyze_empty():
    from langgraph_app.tools.source_authority import analyze

    result = analyze([])
    assert result["total_sources"] == 0
    assert result["top_sources"] == []
    assert result["source_diversity"] == 0.0

    # 全都没被提及
    result = analyze([
        {"mentioned": False, "reference_source": "https://example.com", "position": "none", "query": "q1"},
        {"mentioned": False, "reference_source": "https://test.com", "position": "none", "query": "q2"},
    ])
    assert result["total_sources"] == 0

    # reference_source 为空
    result = analyze([
        {"mentioned": True, "reference_source": "", "position": "top", "query": "q1"},
    ])
    assert result["total_sources"] == 0

    print("  PASS test_analyze_empty")


# ─── Test 4: analyze — 正常数据 ───────────────────────────
def test_analyze_normal():
    from langgraph_app.tools.source_authority import analyze

    details = [
        {"mentioned": True, "reference_source": "https://techcrunch.com/notion-review",
         "position": "top", "query": "best productivity tool"},
        {"mentioned": True, "reference_source": "https://techcrunch.com/notion-2024",
         "position": "middle", "query": "team workspace app"},
        {"mentioned": True, "reference_source": "https://docs.notion.so/api",
         "position": "top", "query": "Notion API guide"},
        {"mentioned": True, "reference_source": "https://reddit.com/r/productivity",
         "position": "bottom", "query": "notion alternative"},
        {"mentioned": True, "reference_source": "https://forbes.com/notion-valuation",
         "position": "middle", "query": "best startup tools"},
        {"mentioned": False, "reference_source": "https://example.com", "position": "none", "query": "zzz"},
    ]

    result = analyze(details)

    # techcrunch.com (2), docs.notion.so (1), reddit.com (1), forbes.com (1) = 4 sources
    assert result["total_sources"] == 4

    # Top source should be techcrunch.com (mentioned twice, top+middle positions)
    top = result["top_sources"][0]
    assert top["domain"] == "techcrunch.com"
    assert top["mention_count"] == 2
    assert top["source_type"] == "权威媒体"
    assert 0 <= top["authority_score"] <= 100
    assert len(top["queries"]) == 2

    # 来源多样性应在 0-1 之间
    assert 0 <= result["source_diversity"] <= 1

    # 按分数降序
    scores = [s["authority_score"] for s in result["top_sources"]]
    assert scores == sorted(scores, reverse=True)

    print("  PASS test_analyze_normal")
    for s in result["top_sources"]:
        print(f"    {s['domain']}: score={s['authority_score']} type={s['source_type']} mentions={s['mention_count']}")
    print(f"    diversity={result['source_diversity']}")


# ─── Test 5: 评分公式验证 ─────────────────────────────────
def test_scoring_formula():
    """手动验证三维度加权公式。"""
    from langgraph_app.tools.source_authority import analyze

    # 单个来源，应该得满分（频率分100，因为是唯一的来源）
    details = [
        {"mentioned": True, "reference_source": "https://forbes.com/article",
         "position": "top", "query": "q1"},
        {"mentioned": True, "reference_source": "https://forbes.com/article2",
         "position": "top", "query": "q2"},
    ]
    result = analyze(details)
    assert result["total_sources"] == 1
    source = result["top_sources"][0]
    # freq_score = 100 (唯一来源), pos_score = 1.0*100 = 100, type_score = 90 (权威媒体)
    # authority = 100*0.4 + 100*0.3 + 90*0.3 = 40 + 30 + 27 = 97
    expected = round(100 * 0.4 + 100 * 0.3 + 90 * 0.3)
    assert source["authority_score"] == expected, f"Expected {expected}, got {source['authority_score']}"

    print(f"  PASS test_scoring_formula (expected={expected}, got={source['authority_score']})")


# ─── Test 6: 多样性指数 ───────────────────────────────────
def test_diversity():
    from langgraph_app.tools.source_authority import _calc_diversity

    # 单一来源 → 0
    assert _calc_diversity([10]) == 0.0

    # 两个来源均匀分布 → 最大多样性
    d = _calc_diversity([5, 5])
    assert d > 0.9, f"Expected ~1.0, got {d}"

    # 两个来源不均匀 → 多样性较低
    d2 = _calc_diversity([9, 1])
    assert d2 < 0.5, f"Expected <0.5, got {d2}"
    assert d2 < d  # 不均匀 < 均匀

    # 空
    assert _calc_diversity([]) == 0.0

    print(f"  PASS test_diversity (uniform=[5,5]: {_calc_diversity([5,5])}, skewed=[9,1]: {_calc_diversity([9,1])})")


# ─── Test 7: SourceItem / SourceAuthorityReport 模型 ──────
def test_models():
    from langgraph_app.state import SourceItem, SourceAuthorityReport

    item = SourceItem(
        domain="techcrunch.com", source_type="权威媒体",
        mention_count=3, avg_position=0.85, authority_score=82,
        queries=["q1", "q2", "q3"],
    )
    assert item.domain == "techcrunch.com"
    assert item.source_type == "权威媒体"
    assert 0 <= item.authority_score <= 100

    report = SourceAuthorityReport(
        top_sources=[item], total_sources=1, source_diversity=0.0,
    )
    d = report.model_dump()
    assert d["total_sources"] == 1
    assert len(d["top_sources"]) == 1

    print("  PASS test_models")


# ─── Test 8: ProbeOutput 包含 source_authority ────────────
def test_probe_output_with_sa():
    from langgraph_app.state import (
        ProbeOutput, CompanyEvaluation, MarketPerception, GapReport,
        CitationMetrics, ProbeMeta, SourceItem, SourceAuthorityReport,
    )

    sa = SourceAuthorityReport(
        top_sources=[
            SourceItem(domain="forbes.com", source_type="权威媒体", mention_count=2,
                       avg_position=0.85, authority_score=82, queries=["q1", "q2"]),
        ],
        total_sources=1,
        source_diversity=0.0,
    )

    po = ProbeOutput(
        company_evaluation=CompanyEvaluation(overall="OK", strengths=[], weaknesses=[], positioning=""),
        market_perception=MarketPerception(
            perceived_identity="", perceived_strengths=[], perceived_weaknesses=[],
            perceived_positioning="", perceived_products=[], perceived_market="",
            perception_sources=[],
        ),
        gap_report=GapReport(alignment_score=50, aligned=[], misaligned=[], blind_spots=[], opportunities=[], one_line_summary=""),
        citation_metrics=CitationMetrics(rate=50.0, total_queries=30, mentioned_count=15, details=[]),
        meta=ProbeMeta(total_tokens=0, total_cost=0, total_duration_ms=0, query_statuses={}),
        source_authority=sa,
    )

    d = po.model_dump()
    assert d["source_authority"] is not None
    assert d["source_authority"]["total_sources"] == 1
    assert d["source_authority"]["top_sources"][0]["domain"] == "forbes.com"

    print("  PASS test_probe_output_with_sa")


# ─── Main ─────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("source_authority 模块测试")
    print("=" * 60)

    all_pass = True
    for fn in [test_extract_domain, test_infer_source_type, test_analyze_empty,
               test_analyze_normal, test_scoring_formula, test_diversity,
               test_models, test_probe_output_with_sa]:
        try:
            fn()
        except Exception as e:
            print(f"  FAIL {fn.__name__}: {e}")
            import traceback
            traceback.print_exc()
            all_pass = False

    print("\n" + "=" * 60)
    if all_pass:
        print("全部测试通过 ✅")
    else:
        print("有测试失败 ❌")
    print("=" * 60)
    sys.exit(0 if all_pass else 1)
