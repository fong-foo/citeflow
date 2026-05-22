# TASK_FULL_TEST.md
# Flower Knows 完整测试
# 创建时间：2026-05-10

---

## 目标

用Flower Knows跑一遍完整闭环，验证：
1. Probe正常工作
2. Analyst正常工作
3. 知识注入正常工作
4. 历史感知正常工作
5. evidence_source正常输出

---

## 测试输入

文件：`input_flowerknows.json`

```json
{
  "domain": "flowerknows.co",
  "brand_name": "Flower Knows",
  "industry": "Color Cosmetics / 彩妆",
  "target_market": "Global (US, EU, Japan, SEA)",
  "core_product": "Eyeshadow palettes, lip cream, lipstick, highlighter, blush, foundation",
  "target_positioning": "Affordable luxury fairy-tale cosmetics with anime/二次元 aesthetic, targeting Gen-Z women who love kawaii/romantic packaging",
  "seed_queries": [
    "best affordable eyeshadow palette 2025",
    "kawaii makeup brand",
    "fairy tale cosmetics",
    "anime aesthetic makeup",
    "cute makeup brand for young women"
  ],
  "competitors": [
    "colourpop.com",
    "romand.us",
    "canmake.com",
    "etudehouse.com",
    "peripera.com"
  ]
}
```

---

## 测试步骤

### 步骤1：运行Probe

```bash
cd ~/Desktop/CiteFlow
source .venv/bin/activate
python run.py input_flowerknows.json --skip-analyst
```

**验证**：
- [ ] Probe完成，无崩溃
- [ ] 输出文件：flower_knows_probe.json
- [ ] 关键指标有值：citation_rate, industry_rate, brand_rate

### 步骤2：运行Analyst（第一次）

```bash
python run.py input_flowerknows.json
```

**验证**：
- [ ] Analyst完成，无崩溃
- [ ] 输出文件：flower_knows_analyst.json
- [ ] knowledge_loader.py加载60个知识节
- [ ] 知识注入到briefing中
- [ ] actions中有evidence_source字段
- [ ] 数据库中有记录（run_id=1）

### 步骤3：运行Analyst（第二次，测试历史感知）

```bash
python run.py input_flowerknows.json
```

**验证**：
- [ ] Analyst完成，无崩溃
- [ ] 历史对比区块注入到briefing中
- [ ] 显示上次指标和本次指标对比
- [ ] 显示上次处方
- [ ] 数据库中有记录（run_id=2）

---

## 验证清单

### Probe验证
```
□ Probe完成，无崩溃
□ brand_profile有值
□ citation_metrics有值
□ company_score有值
□ gap_report有值
□ 输出文件正确
```

### Analyst验证
```
□ Analyst完成，无崩溃
□ diagnosis有值
□ actions有值
□ actions中每个action都有evidence_source
□ content_templates有值（如果brand_profile可用）
```

### 知识注入验证
```
□ knowledge_loader.py加载60个知识节
□ 规则映射正确（9条规则）
□ 触发规则后注入相关知识
□ 知识内容包含论文引用
```

### 历史感知验证
```
□ 第一次运行：无历史数据
□ 第二次运行：有历史对比区块
□ 显示上次指标和本次指标对比
□ 显示上次处方
□ 变化值正确计算
```

### 数据库验证
```
□ data/citeflow.db文件存在
□ runs表有记录
□ 每次运行都有对应记录
□ 关键指标正确存储
```

---

## 预期输出示例

### Probe输出摘要
```
品牌画像: ✅ Flower Knows is a...
对齐度: 45/100
引用率: 12% (A=8% B=95% C=15%)
推荐率: 5% (2/40)
综合评分: 35/100
```

### Analyst输出摘要
```
核心问题: AI把你当'小众品牌'而非'行业玩家'
严重程度: warning
一句话: 好看但没人知道——先去G2让企业用户替你说话
行动建议: 3条 (P0, P1, P2)
evidence_source: 论文6，Section 4.4：宏观结构贡献44.9%
```

### 历史对比示例（第二次运行）
```
=== 历史对比（上次运行：2026-05-10 12:00:00） ===
指标 | 上次 | 本次 | 变化
引用率 | 12% | 12% | →0
A类引用率 | 8% | 8% | →0
...

=== 上次处方（是否已执行？效果如何？） ===
1. [P0] 在G2积累评价 → 目标指标: A类引用率 (8% → 20%)
...
```

---

## 问题排查

### 问题1：knowledge_loader.py加载失败
```
检查：GEO_ENGINE_KNOWLEDGE_BASE.md文件是否存在
检查：文件格式是否正确（###标题）
检查：编码是否正确（UTF-8）
```

### 问题2：知识注入为空
```
检查：规则是否触发（detect_rules）
检查：RULE_KNOWLEDGE_MAP是否正确
检查：知识节标题是否匹配
```

### 问题3：历史对比为空
```
检查：data/citeflow.db是否存在
检查：runs表是否有记录
检查：get_last_run()是否正常工作
```

### 问题4：evidence_source为空
```
检查：SYSTEM_PROMPT是否要求evidence_source
检查：Few-Shot是否展示正确格式
检查：知识是否注入到briefing中
```

---

## 参考资料

- 测试输入：input_flowerknows.json
- Probe输出：flower_knows_probe.json
- Analyst输出：flower_knows_analyst.json
- 数据库：data/citeflow.db
- 知识库：GEO_ENGINE_KNOWLEDGE_BASE.md
