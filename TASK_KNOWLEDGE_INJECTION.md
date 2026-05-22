# 知识注入方案
# Analyst从"凭经验开处方"升级到"凭证据开处方"
# 创建时间：2026-05-10

---

## 一、问题

### 当前状态
- Analyst prompt中没有注入引擎知识库
- Analyst凭LLM训练数据开处方
- 处方没有证据锚点
- 知识库（GEO_ENGINE_KNOWLEDGE_BASE.md）有600+行内容，但Analyst完全没用到

### 目标状态
- Analyst运行时动态查询知识库
- 根据当前问题提取相关知识
- 注入到prompt中
- 处方有据可查，能追溯到具体论文

---

## 二、架构设计

### 整体流程

```
Probe输出 → Analyst输入 → 知识注入 → Analyst处理 → Analyst输出（带证据的处方）
                              ↓
                        知识库查询
                              ↓
                        GEO_ENGINE_KNOWLEDGE_BASE.md
```

### 知识注入位置

```
analyst_context.py 的 build_context() 函数
  ↓
在构建context时，动态查询知识库
  ↓
注入相关知识到context中
  ↓
Analyst prompt中包含相关知识
```

---

## 三、知识库格式优化

### 当前格式（Markdown）

```markdown
### GPT引用偏好
- 引用更少但影响力更高（论文3，Section 4.1）
- 偏好可提取证据：定义、数值事实、比较、程序步骤
```

### 问题
- 不方便程序化查询
- 没有结构化标签
- 提取困难

### 优化方案：保持Markdown，加标签

```markdown
### GPT引用偏好 [engine:GPT]
- 引用更少但影响力更高 [paper:3,section:4.1]
- 偏好可提取证据：定义、数值事实、比较、程序步骤 [paper:3,section:4.3]

### 结构优化 [strategy:structure]
- 宏观结构贡献44.9% [paper:6,section:4.4]
- 中观结构贡献39.7% [paper:6,section:4.4]
- 微观结构贡献15.4% [paper:6,section:4.4]
```

### 标签规范

```
[engine:GPT] - 引擎类型
[strategy:structure] - 策略类型
[paper:3,section:4.1] - 论文来源
[case:Pinterest] - 行业案例
[metric:0.2713] - 具体指标
```

---

## 四、知识提取逻辑

### 提取函数

```python
def load_relevant_knowledge(diagnosis: dict) -> dict:
    """
    根据诊断结果，从知识库中提取相关知识
    
    输入：
        diagnosis: {
            "engine": "GPT",
            "problem_type": "structure",
            "query_type": "A类",
            "industry": "DTC"
        }
    
    输出：
        {
            "engine_preferences": "...",
            "relevant_strategies": "...",
            "relevant_cases": "...",
            "evidence_sources": [...]
        }
    """
    # 1. 读取知识库
    knowledge_base = read_file("GEO_ENGINE_KNOWLEDGE_BASE.md")
    
    # 2. 提取引擎偏好
    engine = diagnosis.get("engine", "GPT")
    engine_preferences = extract_by_tag(knowledge_base, f"[engine:{engine}]")
    
    # 3. 提取相关策略
    problem_type = diagnosis.get("problem_type", "")
    relevant_strategies = extract_by_tag(knowledge_base, f"[strategy:{problem_type}]")
    
    # 4. 提取相关案例
    industry = diagnosis.get("industry", "")
    relevant_cases = extract_by_tag(knowledge_base, f"[case:{industry}]")
    
    # 5. 收集证据来源
    evidence_sources = collect_evidence_sources(
        engine_preferences, 
        relevant_strategies, 
        relevant_cases
    )
    
    return {
        "engine_preferences": engine_preferences,
        "relevant_strategies": relevant_strategies,
        "relevant_cases": relevant_cases,
        "evidence_sources": evidence_sources
    }
```

### 提取辅助函数

```python
def extract_by_tag(content: str, tag: str) -> str:
    """
    从内容中提取包含指定标签的段落
    
    示例：
        extract_by_tag(knowledge_base, "[engine:GPT]")
        → 返回所有包含[engine:GPT]标签的段落
    """
    lines = content.split('\n')
    result = []
    capture = False
    
    for line in lines:
        # 检测到标签，开始捕获
        if tag in line:
            capture = True
            result.append(line)
        # 捕获后续内容，直到下一个标题
        elif capture:
            if line.startswith('###') or line.startswith('##'):
                capture = False
            else:
                result.append(line)
    
    return '\n'.join(result)


def collect_evidence_sources(*sections) -> list:
    """
    从多个section中收集所有证据来源
    """
    sources = []
    for section in sections:
        # 提取 [paper:X,section:Y.Z] 格式的来源
        matches = re.findall(r'\[paper:(\d+),section:([\d.]+)\]', section)
        for paper, section_num in matches:
            sources.append(f"论文{paper}，Section {section_num}")
    
    return list(set(sources))  # 去重
```

---

## 五、Prompt注入方式

### 当前prompt结构

```python
def build_context(probe_output, analyst_rules, ...):
    context = f"""
    ## 品牌信息
    {brand_info}
    
    ## Probe数据
    {probe_output}
    
    ## Analyst规则
    {analyst_rules}
    
    请分析问题并给出行动建议。
    """
    return context
```

### 升级后prompt结构

```python
def build_context(probe_output, analyst_rules, diagnosis, ...):
    # 1. 动态查询知识库
    knowledge = load_relevant_knowledge(diagnosis)
    
    context = f"""
    ## 品牌信息
    {brand_info}
    
    ## Probe数据
    {probe_output}
    
    ## 引擎知识库（相关部分）
    
    ### {diagnosis['engine']}引用偏好
    {knowledge['engine_preferences']}
    
    ### 相关策略
    {knowledge['relevant_strategies']}
    
    ### 相关案例
    {knowledge['relevant_cases']}
    
    ## Analyst规则
    {analyst_rules}
    
    请基于以上知识，分析问题并给出行动建议。
    每条建议请标注证据来源（格式：论文X，Section Y.Z）。
    """
    return context
```

---

## 六、ActionItem证据追溯

### 当前ActionItem

```python
class ActionItem(BaseModel):
    priority: str
    action: str
    rationale: str
    expected_impact: str
    target_metric: str
    current_value: str
    expected_value: str
    action_steps: list[str]
    estimated_time: str
    estimated_cost: str
```

### 升级后ActionItem

```python
class ActionItem(BaseModel):
    priority: str
    action: str
    rationale: str
    expected_impact: str
    target_metric: str
    current_value: str
    expected_value: str
    action_steps: list[str]
    estimated_time: str
    estimated_cost: str
    evidence_source: str = ""  # 新增：证据来源
```

### Prompt要求

```
请为每条行动建议提供证据来源：
- 如果基于引擎知识库，请引用具体论文和Section（格式：论文X，Section Y.Z）
- 如果基于行业最佳实践，请说明来源
- 如果基于推断，请标注"推断"

示例：
{
  "action": "在官网加入FAQ版块",
  "evidence_source": "论文6，Section 4.4：宏观结构贡献44.9%"
}
```

---

## 七、实现步骤

### 第一步：知识库加标签（1小时）

在GEO_ENGINE_KNOWLEDGE_BASE.md中加标签：

```markdown
### GPT引用偏好 [engine:GPT]
- 引用更少但影响力更高 [paper:3,section:4.1]
...

### 结构优化 [strategy:structure]
- 宏观结构贡献44.9% [paper:6,section:4.4]
...

### Pinterest案例 [case:Pinterest]
- 20%有机流量增长 [paper:13]
...
```

### 第二步：新建knowledge_loader.py（2小时）

实现知识提取函数：
- `load_relevant_knowledge(diagnosis)`
- `extract_by_tag(content, tag)`
- `collect_evidence_sources(*sections)`

### 第三步：修改analyst_context.py（2小时）

在build_context()中：
- 调用load_relevant_knowledge()
- 注入相关知识到context中

### 第四步：修改state.py（30分钟）

在ActionItem中加evidence_source字段。

### 第五步：修改analyst_prompt.py（1小时）

在prompt中要求LLM为每条action提供evidence_source。

### 第六步：测试（2小时）

用Flower Knows测试：
- 验证知识注入是否工作
- 验证证据追溯是否工作
- 验证处方质量是否提升

---

## 八、预期效果

### 当前
```
Analyst: "在官网加入FAQ版块"
用户: "为什么？"
Analyst: "因为这是最佳实践"
用户: "..."
```

### 升级后
```
Analyst: "在官网加入FAQ版块"
用户: "为什么？"
Analyst: "论文6，Section 4.4：宏观结构贡献44.9%，FAQ是典型的宏观结构优化"
用户: "明白了"
```

---

## 九、后续优化

### 优化1：知识库结构化
- 把Markdown转为JSON
- 更方便程序化查询

### 优化2：相关性排序
- 根据诊断结果，对知识进行相关性排序
- 只注入最相关的知识

### 优化3：知识库更新机制
- 新论文发表时自动更新知识库
- 引擎逻辑变化时自动更新

---

## 十、参考资料

- 知识库：`GEO_ENGINE_KNOWLEDGE_BASE.md`
- Analyst模块：`langgraph_app/nodes/analyst_node.py`
- Analyst上下文：`langgraph_app/tools/analyst_context.py`
- Analyst提示词：`langgraph_app/tools/analyst_prompt.py`
- 数据模型：`langgraph_app/state.py`
