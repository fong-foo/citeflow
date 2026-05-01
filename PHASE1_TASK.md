# Phase 1 任务指令 — 海老执行

## 目标

搭建 CiteFlow 后端骨架：定义数据契约 → 搭 LangGraph DAG → 插 mock 节点 → 端到端跑通假数据。

**完成标准：运行 test_pipeline.py，所有断言通过，整条管线从输入到输出跑通。**

## 前置条件

```bash
cd ~/Desktop/CiteFlow
source .venv/bin/activate
```

虚拟环境已建好，langgraph/fastapi/pydantic 已安装。

## 任务清单

### 任务 1：创建目录结构

```
langgraph_app/
├── __init__.py
├── state.py
├── dag.py
├── nodes/
│   ├── __init__.py
│   ├── probe_node.py
│   ├── analyst_node.py
│   ├── commander_node.py
│   ├── entity_node.py
│   ├── architect_node.py
│   ├── outreach_node.py
│   ├── content_node.py
│   ├── community_node.py
│   └── coordinator_node.py
└── tools/
    └── __init__.py

tests/
├── __init__.py
└── test_pipeline.py
```

### 任务 2：实现 state.py

定义所有 Pydantic Model。以下是完整清单：

```python
# 输入
class UserInput(BaseModel):
    domain: str
    query_terms: list[str]
    industry: str
    competitors: list[str] = []

# Probe 输出
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

# Analyst 输出
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

# Commander 输出
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

# Entity 输出
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

# Architect 输出
class SchemaInjection(BaseModel):
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

# Outreach 输出
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

# Content 输出
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

# Community 输出
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

# Coordinator 输出
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

# 管线状态
class PipelineStatus(BaseModel):
    current_node: str = ""
    step: int = 0
    message: str = ""

# 走廊 State
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
```

**注意：State 用 TypedDict，值都是 dict（LangGraph 要求）。每个节点内部用对应的 Pydantic Model 解析。**

### 任务 3：实现 dag.py

```python
from langgraph.graph import StateGraph, START, END
from langgraph_app.state import State
from langgraph_app.nodes.probe_node import probe_node
from langgraph_app.nodes.analyst_node import analyst_node
from langgraph_app.nodes.commander_node import commander_node
from langgraph_app.nodes.entity_node import entity_node
from langgraph_app.nodes.architect_node import architect_node
from langgraph_app.nodes.outreach_node import outreach_node
from langgraph_app.nodes.content_node import content_node
from langgraph_app.nodes.community_node import community_node
from langgraph_app.nodes.coordinator_node import coordinator_node

def build_graph():
    graph = StateGraph(State)

    # 注册 9 个节点
    graph.add_node("probe", probe_node)
    graph.add_node("analyst", analyst_node)
    graph.add_node("commander", commander_node)
    graph.add_node("entity", entity_node)
    graph.add_node("architect", architect_node)
    graph.add_node("outreach", outreach_node)
    graph.add_node("content", content_node)
    graph.add_node("community", community_node)
    graph.add_node("coordinator", coordinator_node)

    # 指挥链：串行
    graph.add_edge(START, "probe")
    graph.add_edge("probe", "analyst")
    graph.add_edge("analyst", "commander")

    # Commander → 5 个执行 Agent：并行
    graph.add_edge("commander", "entity")
    graph.add_edge("commander", "architect")
    graph.add_edge("commander", "outreach")
    graph.add_edge("commander", "content")
    graph.add_edge("commander", "community")

    # 5 个执行 Agent → Coordinator：汇聚
    graph.add_edge("entity", "coordinator")
    graph.add_edge("architect", "coordinator")
    graph.add_edge("outreach", "coordinator")
    graph.add_edge("content", "coordinator")
    graph.add_edge("community", "coordinator")

    # Coordinator → END
    graph.add_edge("coordinator", END)

    return graph.compile()
```

### 任务 4：实现 9 个 mock 节点

每个节点文件结构相同（12 层 harness 骨架），只有第 1 层（身份）和第 12 层（mock 输出）不同。

**probe_node.py / analyst_node.py / commander_node.py / entity_node.py / architect_node.py / outreach_node.py / content_node.py / community_node.py：**

每个文件包含：
- 第 1 层：NODE_NAME, NODE_ROLE, NODE_MODE
- 第 2 层：SYSTEM_PROMPT = ""（空，Phase 2 填）
- 第 3 层：build_context() 返回空字符串
- 第 4 层：TOOLS = {}（空）
- 第 5 层：react_loop() 返回空 dict
- 第 7 层：validate_output() 直接返回 valid=True
- 第 8 层：build_retry_prompt() 返回空字符串
- 第 9 层：CircuitBreaker 类
- 第 10 层：NodeLogger 类
- 第 11 层：TokenTracker 类
- 第 12 层：MOCK_OUTPUT（固定数据）
- 主函数：mock 模式直接返回 MOCK_OUTPUT

**coordinator_node.py：**
- 不用 LLM，纯规则引擎
- 读 5 个执行 Agent 的结果
- 比对一致性（mock 模式直接返回无冲突）
- 写 coordinator_report

**Mock 数据要求：**
- Probe：至少 2 条引用，包含 quote_text/source_url/ai_engine/sentiment/wilson_score
- Analyst：引用率 23%，行业排名第 7，3 个问题
- Commander：5 个任务（entity/architect/outreach/content/community 各一个）
- Entity：2 条 Wikidata 修改记录
- Architect：2 个 Schema 注入记录
- Outreach：2 个平台提交记录
- Content：1 个视频 + 1 篇文章
- Community：1 个 Reddit 回答 + 1 个 Quora 回答
- Coordinator：一致性 95 分，0 冲突，recommendation = "pass"

### 任务 5：实现端到端测试

```python
# tests/test_pipeline.py

from langgraph_app.dag import build_graph
from langgraph_app.state import UserInput

def test_pipeline():
    graph = build_graph()

    initial_state = {
        "user_input": UserInput(
            domain="nike.com",
            query_terms=["best running shoes"],
            industry="DTC",
            competitors=["adidas.com"]
        ).model_dump(),
        "pipeline_status": {"current_node": "", "step": 0, "message": ""}
    }

    result = graph.invoke(initial_state)

    # 验证每个格子都有数据
    assert result["probe_output"] is not None
    assert result["analyst_output"] is not None
    assert result["commander_plan"] is not None
    assert result["entity_result"] is not None
    assert result["architect_result"] is not None
    assert result["outreach_result"] is not None
    assert result["content_result"] is not None
    assert result["community_result"] is not None
    assert result["coordinator_report"] is not None

    # 验证数据合理性
    assert len(result["probe_output"]["citations"]) >= 2
    assert result["analyst_output"]["wilson_scores"]["overall"] == 23.0
    assert len(result["commander_plan"]["tasks"]) == 5
    assert result["coordinator_report"]["recommendation"] == "pass"

    print("✓ 管线端到端测试通过")

if __name__ == "__main__":
    test_pipeline()
```

### 任务 6：运行验证

```bash
cd ~/Desktop/CiteFlow
source .venv/bin/activate
python -m tests.test_pipeline
```

**预期输出：**
```
✓ 管线端到端测试通过
```

## 交付格式

完成任务后，按 CHECKLIST.md 自检，然后报告：

```
自检结果: X/6 通过
完成文件: (列出所有创建/修改的文件)
测试结果: (test_pipeline.py 输出)
失败项: (列出或"无")
```

## 注意事项

1. **不要改 CONTEXT.md / CLAUDE.md / PROMPTS.md / CHECKLIST.md** — 这些是药老管的
2. **不要加任何真实 API 调用** — Phase 1 全是 mock
3. **不要加 LLM 调用** — Phase 1 不用 DeepSeek
4. **每个节点文件必须包含 12 层 harness 骨架**（即使大部分是空的）
5. **State 用 TypedDict，值用 dict** — LangGraph 要求
6. **遇到架构问题不确定 → 停下，标记等药老确认**
