# TASK_DATA_STORAGE_AND_HISTORY.md
# 数据存储 + 历史感知
# 创建时间：2026-05-10

---

## 背景

当前数据存储方式：
- ProbeOutput → `{prefix}_probe.json`
- AnalystOutput → `{prefix}_analyst.json`

问题：
- 没有统一数据库
- 无法查询历史数据
- Analyst不知道上次诊断结果

目标：
- ProbeOutput + AnalystOutput → SQLite
- build_context查数据库，注入历史数据

---

## 第一步：数据存储

### 数据库设计

```sql
-- 运行记录表
CREATE TABLE runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    industry TEXT,
    run_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    probe_output JSON,
    analyst_output JSON
);

-- 关键指标表（便于查询）
CREATE TABLE metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER REFERENCES runs(id),
    metric_name TEXT NOT NULL,
    metric_value REAL,
    metric_unit TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 数据库位置

```
/Users/fogn/Desktop/CiteFlow/data/citeflow.db
```

### 存储函数

```python
# langgraph_app/tools/data_store.py

import sqlite3
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                       "data", "citeflow.db")

def init_db():
    """初始化数据库"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_name TEXT NOT NULL,
            domain TEXT NOT NULL,
            industry TEXT,
            run_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            probe_output JSON,
            analyst_output JSON
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER REFERENCES runs(id),
            metric_name TEXT NOT NULL,
            metric_value REAL,
            metric_unit TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def save_run(brand_name: str, domain: str, industry: str,
             probe_output: dict, analyst_output: dict) -> int:
    """保存一次运行记录"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO runs (brand_name, domain, industry, probe_output, analyst_output)
        VALUES (?, ?, ?, ?, ?)
    """, (brand_name, domain, industry,
          json.dumps(probe_output, ensure_ascii=False),
          json.dumps(analyst_output, ensure_ascii=False)))
    
    run_id = cursor.lastrowid
    
    # 提取关键指标
    cm = probe_output.get("citation_metrics", {})
    metrics = [
        ("citation_rate", cm.get("rate", 0), "%"),
        ("industry_rate", cm.get("industry_rate", 0), "%"),
        ("brand_rate", cm.get("brand_rate", 0), "%"),
        ("recommendation_rate", cm.get("recommendation_rate", 0), "%"),
    ]
    
    for name, value, unit in metrics:
        cursor.execute("""
            INSERT INTO metrics (run_id, metric_name, metric_value, metric_unit)
            VALUES (?, ?, ?, ?)
        """, (run_id, name, value, unit))
    
    conn.commit()
    conn.close()
    
    return run_id

def get_last_run(brand_name: str) -> dict | None:
    """获取品牌上一次运行记录"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, run_time, probe_output, analyst_output
        FROM runs
        WHERE brand_name = ?
        ORDER BY run_time DESC
        LIMIT 1
    """, (brand_name,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    
    return {
        "run_id": row[0],
        "run_time": row[1],
        "probe_output": json.loads(row[2]),
        "analyst_output": json.loads(row[3]),
    }

def get_metric_history(brand_name: str, metric_name: str, limit: int = 5) -> list:
    """获取品牌某指标的历史数据"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT m.metric_value, m.created_at
        FROM metrics m
        JOIN runs r ON m.run_id = r.id
        WHERE r.brand_name = ? AND m.metric_name = ?
        ORDER BY m.created_at DESC
        LIMIT ?
    """, (brand_name, metric_name, limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [{"value": row[0], "time": row[1]} for row in rows]
```

### 修改 run.py

在run.py中调用save_run()：

```python
from langgraph_app.tools.data_store import init_db, save_run

def main():
    # ... 现有代码 ...
    
    # 初始化数据库
    init_db()
    
    # ... 运行 Probe 和 Analyst ...
    
    # 保存到数据库
    run_id = save_run(
        brand_name=brand_name,
        domain=ui["domain"],
        industry=ui["industry"],
        probe_output=probe,
        analyst_output=analyst
    )
    print(f"  数据库: run_id={run_id}")
    
    # ... 现有代码 ...
```

---

## 第二步：历史感知

### 修改 analyst_context.py

在build_context()中查询历史数据：

```python
from langgraph_app.tools.data_store import get_last_run

def build_context(probe_output: dict, analyst_rules: str, 
                  triggered_rules: list, brand_name: str, ...) -> str:
    parts = []
    
    # ... 现有代码 ...
    
    # 查询历史数据
    last_run = get_last_run(brand_name)
    if last_run:
        history_text = _build_history_section(last_run, probe_output)
        parts.append(history_text)
    
    # ... 现有代码 ...
    
    return "\n".join(parts)

def _build_history_section(last_run: dict, current_probe: dict) -> str:
    """构建历史数据对比 section"""
    last_probe = last_run.get("probe_output", {})
    last_analyst = last_run.get("analyst_output", {})
    last_time = last_run.get("run_time", "未知")
    
    # 提取关键指标
    last_cm = last_probe.get("citation_metrics", {})
    curr_cm = current_probe.get("citation_metrics", {})
    
    last_rate = last_cm.get("rate", 0)
    curr_rate = curr_cm.get("rate", 0)
    delta = curr_rate - last_rate
    
    # 提取上次处方
    last_actions = last_analyst.get("actions", [])
    action_summary = []
    for a in last_actions[:3]:  # 只取前3条
        action_summary.append(f"- {a.get('priority', '?')}: {a.get('action', 'N/A')}")
    
    return f"""
## 历史数据（上次运行：{last_time}）

### 上次指标
- 引用率: {last_rate}%
- 行业引用率: {last_cm.get('industry_rate', 0)}%
- 推荐率: {last_cm.get('recommendation_rate', 0)}%

### 上次处方
{chr(10).join(action_summary) if action_summary else "- 无处方记录"}

### 本次对比
- 上次引用率: {last_rate}%
- 本次引用率: {curr_rate}%
- 变化: {delta:+.1f}%（{'提升' if delta > 0 else '下降' if delta < 0 else '无变化'}）
"""
```

---

## 文件清单

| 文件 | 动作 | 内容 |
|------|------|------|
| langgraph_app/tools/data_store.py | 新建 | SQLite存储函数 |
| run.py | 修改 | 调用save_run() |
| langgraph_app/tools/analyst_context.py | 修改 | 查询历史数据，注入context |

---

## 测试验证

```bash
# 1. 第一次运行
python run.py input_flowerknows.json
# 输出：run_id=1

# 2. 第二次运行
python run.py input_flowerknows.json
# 输出：run_id=2，历史数据注入

# 3. 检查数据库
sqlite3 data/citeflow.db "SELECT * FROM runs;"
sqlite3 data/citeflow.db "SELECT * FROM metrics;"
```

---

## 预期效果

### 当前
```
Analyst: "引用率10%，建议优化"
用户: "上次是多少？"
Analyst: "我不知道"
```

### 升级后
```
Analyst: "引用率10%，上次是8%，提升了2%"
用户: "上次给了什么建议？"
Analyst: "上次P0建议是在G2积累评价"
```

---

## 参考资料

- 当前输出：run.py保存到JSON文件
- 数据库：SQLite（轻量、无需额外服务）
- 历史感知：analyst_context.py的build_context()
