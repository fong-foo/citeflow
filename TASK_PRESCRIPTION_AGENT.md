# TASK_PRESCRIPTION_AGENT.md
# 处方Agent设计讨论
# 创建时间：2026-05-10

---

## 背景

CiteFlow当前有两个Agent：
- **Probe（侦察兵）**：体检，让客户知道"是什么"
- **Analyst（军师）**：诊断，让客户知道"为什么"

现在需要新增两个Agent：
- **处方Agent（医生）**：开处方，让客户知道"怎么做"
- **验证Agent（裁判）**：效果验证，让客户知道"做了之后效果如何"

本文档聚焦**处方Agent**的设计讨论。

---

## 产品闭环

```
Probe（体检）→ Analyst（诊断）→ 处方Agent（开处方）→ 用户执行 → 验证Agent（效果验证）
    ↑                                                                    ↓
    └──────────────────────────── 再次体检 ────────────────────────────────┘
```

---

## 处方Agent定位

```
功能：开处方
输入：诊断结果（来自Analyst）+ 引擎知识库
输出：具体优化方案
价值：让客户知道"怎么做"
```

---

## 输入

### 诊断结果（来自Analyst）

```json
{
  "problem": "GPT在回答'best budget welder'时，引用了Lincoln但没引用YesWelder",
  "reason": "YesWelder官网缺少FAQ格式的对比内容",
  "priority": "high",
  "engine": "GPT",
  "query": "best budget welder",
  "competitor": "Lincoln"
}
```

### 引擎知识库

文件：`GEO_ENGINE_KNOWLEDGE_BASE.md`

关键内容：
- 各引擎引用偏好（GPT、Gemini、Perplexity、Claude）
- 通用GEO策略（结构优化、内容优化、技术优化）
- 行业案例（Pinterest、旅游网站、电商、iGaming等）
- 处方生成框架（诊断→处方→预期效果）

---

## 输出

### 处方格式（待讨论）

```json
{
  "prescription": {
    "target_page": "/products",
    "action": "add_faq_section",
    "content": "YesWelder vs Lincoln: Which is Better? YesWelder offers...",
    "keywords": ["budget welder", "affordable", "4.8/5 rating"],
    "expected_effect": "30天内GPT引用率从10%提升到20%",
    "difficulty": "medium",
    "time_required": "2-3 days",
    "priority": 1
  }
}
```

---

## 关键问题（需要讨论）

### 1. 处方粒度

**问题**：
- 改一个页面 vs 改十个页面？
- 一次给所有处方 vs 分批给？
- 处方是否分优先级？

**选项**：
- A. 一次给所有处方（用户可能 overwhelmed）
- B. 分批给，每次给3-5个（推荐）
- C. 按优先级给，先给最重要的

### 2. 处方格式

**问题**：
- 纯文本 vs 结构化数据？
- 是否包含代码片段？
- 是否包含内容模板？

**选项**：
- A. 纯文本建议（简单但不具体）
- B. 结构化JSON（可程序化处理）
- C. 包含内容模板和代码片段（最具体）

### 3. 处方逻辑

**问题**：
- 基于规则 vs 基于LLM？
- 如何查询引擎知识库？
- 如何生成具体建议？

**选项**：
- A. 基于规则（确定性，但不够灵活）
- B. 基于LLM（灵活，但可能幻觉）
- C. 规则+LLM混合（推荐）

### 4. 处方验证

**问题**：
- 处方是否包含预期效果？
- 如何计算预期效果？
- 预期效果是否可信？

**选项**：
- A. 不包含预期效果（简单但用户不知道期望）
- B. 包含基于论文的预期效果（如"提升17.3%"）
- C. 包含基于历史数据的预期效果（需要数据积累）

### 5. 处方执行支持

**问题**：
- 是否提供内容模板？
- 是否提供关键词建议？
- 是否提供发布渠道建议？

**选项**：
- A. 不提供执行支持（用户自己想办法）
- B. 提供内容模板和关键词建议
- C. 提供完整执行方案（包括发布渠道、时间安排等）

---

## 技术实现（待讨论）

### 方案A：基于规则

```python
def generate_prescription(diagnosis, knowledge_base):
    # 1. 查询引擎知识库
    engine = diagnosis["engine"]
    engine_preferences = knowledge_base[engine]
    
    # 2. 匹配问题类型
    problem_type = diagnosis["reason"]
    
    # 3. 生成处方
    prescription = rules[problem_type]
    
    return prescription
```

**优点**：确定性、可解释、无幻觉
**缺点**：不够灵活、需要维护规则

### 方案B：基于LLM

```python
def generate_prescription(diagnosis, knowledge_base):
    # 1. 构建prompt
    prompt = f"""
    诊断结果：{diagnosis}
    引擎知识库：{knowledge_base}
    
    请生成具体优化方案。
    """
    
    # 2. 调用LLM
    prescription = llm.generate(prompt)
    
    return prescription
```

**优点**：灵活、可处理复杂情况
**缺点**：可能幻觉、不可解释

### 方案C：规则+LLM混合（推荐）

```python
def generate_prescription(diagnosis, knowledge_base):
    # 1. 基于规则生成框架
    framework = generate_framework(diagnosis, knowledge_base)
    
    # 2. 基于LLM填充细节
    details = llm.generate_details(framework)
    
    # 3. 组合
    prescription = combine(framework, details)
    
    return prescription
```

**优点**：确定性框架 + 灵活细节
**缺点**：实现复杂

---

## 与现有Agent的关系

### 与Analyst的关系

```
Analyst输出 → 处方Agent输入
```

Analyst需要输出结构化的诊断结果，供处方Agent使用。

### 与Probe的关系

```
Probe输出 → Analyst输入 → 处方Agent输入
处方Agent输出 → 用户执行 → 验证Agent输入 → Probe再次测量
```

### 与验证Agent的关系

```
处方Agent输出 → 用户执行 → 验证Agent输入
验证Agent输出 → 反馈到知识库 → 优化处方
```

---

## 下一步

1. **讨论处方粒度、格式、逻辑、验证、执行支持**
2. **确定技术实现方案**
3. **设计处方Agent的输入输出格式**
4. **实现处方Agent原型**
5. **用Flower Knows测试**

---

## 参考资料

- 引擎知识库：`GEO_ENGINE_KNOWLEDGE_BASE.md`
- 产品定义：`CiteFlow_Product_Definition.html`
- 闭环分析：`CiteFlow_Loop_Analysis.html`
- CONTEXT.md：项目状态和待执行任务
