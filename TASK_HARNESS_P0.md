# TASK_HARNESS_P0.md — Harness P0 改进任务

> 药老出品 · 2026-05-05
> 目标：解决4个会导致上线出事的问题
> 预计工时：7小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | Wall-clock Timeout | probe_node.py | 1h |
| 2 | 幂等性 | probe_node.py | 3h |
| 3 | 输出Schema验证升级 | validators/validator.py + analyst_node.py | 2h |
| 4 | 搜索结果恢复类型安全 | probe_node.py | 1h |

**完成标准**：4项全部实现 + 对应test通过 + CHECKLIST.md自检通过

---

## 任务1：Wall-clock Timeout

### 问题
某个模块卡住（API无响应/网络断开），整个pipeline无限等待。
用户等10分钟没结果，体验极差。

### 需要改的文件
`langgraph_app/nodes/probe_node.py`

### 实现要求

1. 定义每个流的超时时间：
```python
TIMEOUT_BRAND = 30       # 品牌流：30秒
TIMEOUT_SEARCH_P1 = 120  # 搜索流Phase1：120秒（30个查询）
TIMEOUT_MM_GAP = 60      # 市场镜像+差距分析：60秒
TIMEOUT_CITE = 90        # 引用率分析：90秒（30个分析）
TIMEOUT_SCORER = 30      # 评分+话术：30秒
TIMEOUT_COMPETITOR = 60  # 竞品流：60秒
```

2. 每个 `await task` 改为 `await asyncio.wait_for(task, timeout=xxx)`

3. 超时时的处理：
   - 捕获 `asyncio.TimeoutError`
   - 记录到 `errors["probe_xxx_timeout"]`
   - 该模块的checkpoint不保存（下次重试会重新执行）
   - Pipeline继续执行其他模块（不因一个模块超时而整体失败）

4. 恢复时也要检查：如果checkpoint里的数据本身就有问题（比如上次超时后手动保存了空数据），恢复逻辑要能识别

### 验证方法
- 写一个test，模拟某个模块sleep 10秒，设置timeout=2秒
- 验证超时后其他模块正常完成
- 验证超时的模块在checkpoint中没有保存

---

## 任务2：幂等性（Idempotency）

### 问题
checkpoint恢复后，如果某个模块的save失败但API已调用，
重试会重复调用API（浪费钱+可能产生重复数据）。

场景：
1. brand_profiler调用成功，返回BrandProfile
2. _save("probe_brand", bp.model_dump()) 执行前进程崩溃
3. 重启后checkpoint里没有probe_brand
4. 重试时brand_profiler再次调用API → 浪费钱

### 需要改的文件
- `langgraph_app/nodes/probe_node.py`
- `langgraph_app/state.py`（不加executed_keys，改用磁盘缓存）

### 实现要求

1. **存储位置：磁盘文件，不是state**
   ```
   .checkpoint_cache/
     {task_id}.json    ← 一个任务一个文件，tool call结果缓存
   ```
   
   为什么不放state？LangGraph的state持久化是节点级的。
   Probe内部是单节点，中途崩溃state全丢。
   写磁盘才能真正防重复计费。

2. 每个tool call生成唯一key：
```python
import hashlib, json, os

CACHE_DIR = ".checkpoint_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

def _cache_path(task_id: str) -> str:
    return os.path.join(CACHE_DIR, f"{task_id}.json")

def _make_key(module: str, *args) -> str:
    """基于模块名+参数生成唯一key"""
    raw = f"{module}:{':'.join(str(a) for a in args)}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]

def _cache_get(task_id: str, key: str):
    """从磁盘缓存读取，不存在返回None"""
    path = _cache_path(task_id)
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        cache = json.load(f)
    return cache.get(key)

def _cache_set(task_id: str, key: str, value):
    """写入磁盘缓存（原子写）"""
    path = _cache_path(task_id)
    cache = {}
    if os.path.exists(path):
        with open(path, "r") as f:
            cache = json.load(f)
    cache[key] = value
    # 写临时文件再rename，防止写一半崩溃导致文件损坏
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(cache, f, ensure_ascii=False)
    os.replace(tmp, path)
```

3. 在调用tool之前检查缓存：
```python
task_id = ui.get("task_id", "default")  # 需要user_input传入
key = _make_key("brand_profiler", ui["domain"])
cached = _cache_get(task_id, key)
if cached is not None:
    bp_data = cached
    logger.log(f"brand_profiler → 从磁盘缓存恢复")
else:
    bp_data = brand_profile(ui)
    _cache_set(task_id, key, bp_data)
```

4. 任务完成后清理缓存：
```python
# 在probe_node最后
try:
    os.remove(_cache_path(task_id))
except FileNotFoundError:
    pass
```

5. task_id来源：
   - 优先从state["user_input"]["task_id"]获取
   - 如果没有，用state["user_input"]["domain"] + 时间戳生成

### 验证方法
- 写一个test，模拟：第一次调用成功但checkpoint保存失败
- 第二次重试时验证：brand_profiler没有被再次调用（用mock验证）
- 验证executed_keys在state中正确传递

---

## 任务3：输出Schema验证升级

### 问题
当前validator.py只检查status字段，不检查实际数据。
LLM返回的JSON如果缺字段或类型错，Pydantic会报异常，
但异常信息不友好，且没有自动重试。

### 需要改的文件
- `langgraph_app/validators/validator.py` — 升级验证逻辑
- `langgraph_app/nodes/analyst_node.py` — 加验证失败重试

### 实现要求

**validator.py 升级：**

1. 新增 `validate_llm_output` 函数：
```python
def validate_llm_output(raw_json: dict, expected_model: BaseModel, node_name: str) -> dict:
    """
    验证LLM返回的JSON是否符合Pydantic Model。
    返回: {"valid": bool, "errors": list[str], "parsed": BaseModel|None}
    """
    try:
        parsed = expected_model(**raw_json)
        return {"valid": True, "errors": [], "parsed": parsed}
    except ValidationError as e:
        errors = []
        for err in e.errors():
            field = " → ".join(str(loc) for loc in err["loc"])
            errors.append(f"{field}: {err['msg']} (got: {err.get('input', 'N/A')})")
        return {"valid": False, "errors": errors, "parsed": None}
```

2. 保留原有的 `validate_node_output` 做基础检查

**analyst_node.py 加重试：**

1. LLM返回JSON后，先用validate_llm_output验证
2. 如果验证失败：
   - 构建retry prompt：原始system prompt + 上一次的错误信息
   - 重试LLM调用（最多2次）
   - retry prompt示例：
     ```
     你上次返回的JSON有以下错误：
     - diagnosis.core_problem: field required (got: missing)
     - actions.0.priority: expected 'P0|P1|P2' (got: 'urgent')
     
     请修正后重新返回完整JSON。
     ```
3. 2次重试都失败 → 返回status="error" + 包含验证错误的error字段

### 验证方法
- 测试1：正确JSON → 验证通过
- 测试2：缺少required字段 → 验证失败 + 错误信息包含字段名
- 测试3：类型错误 → 验证失败 + 错误信息包含期望类型
- 测试4：模拟LLM返回错误JSON → 验证触发重试 → 重试成功
- 测试5：2次重试都失败 → 返回error状态

---

## 任务4：搜索结果恢复类型安全

### 问题
checkpoint保存时，Exception转为 `{"_error": str(e)}`。
恢复后，search_results里既有正常dict也有 `{"_error": ...}` dict。
下游代码（_stream_mm_gap, _stream_cite）用 `isinstance(r, Exception)` 检查，
但恢复后的错误项是dict不是Exception，检查会失效，导致脏数据混入流程。

### 需要改的文件
`langgraph_app/nodes/probe_node.py`

### 实现要求

1. 新增辅助函数：
```python
def _is_error_result(r) -> bool:
    """检查一个search_result是否是错误项（包括恢复后的dict形式）"""
    if isinstance(r, Exception):
        return True
    if isinstance(r, dict) and r.get("_error"):
        return True
    if r is None:
        return True
    return False
```

2. 恢复search_results时，过滤掉错误项：
```python
# 恢复时
sd = ck["probe_search_p1"]["data"]
search_results = sd["search_results"]
# 过滤掉错误项
valid_results = [r for r in search_results if not _is_error_result(r)]
```

3. 下游代码（_stream_mm_gap, _stream_cite, _batch_fc_search等）统一用 `_is_error_result()` 替代 `isinstance(r, Exception)`

4. 同样处理竞品流的恢复：
```python
# 恢复竞品结果时
comp_results_raw = cd["comp_results"]
# 如果某个结果是{"_error": ...}，跳过或转为None
```

### 验证方法
- 测试1：正常save → 恢复 → 数据完整
- 测试2：save时包含一个Exception → 恢复 → 错误项被过滤
- 测试3：恢复后的search_results传给下游 → 下游不因脏数据崩溃
- 测试4：混合情况（20个正常+10个错误）→ 恢复后只有20个正常项

---

## state.py 改动汇总

以上4个任务中，state.py **不需要改动**。

原方案的executed_keys放state里已被否决（LangGraph state是节点级持久化，中途崩溃丢失）。
改为磁盘缓存方案（.checkpoint_cache/），不依赖state。

唯一可能的改动：UserInput加task_id字段（可选，不加也能用fallback逻辑）。

---

## CHECKLIST 自检

完成后逐项打勾：

**任务1 Timeout：**
- [ ] 每个asyncio.create_task都有对应的wait_for(timeout=)
- [ ] 超时捕获TimeoutError，记录到errors
- [ ] 超时的模块checkpoint不保存
- [ ] 其他模块不受影响，pipeline继续执行

**任务2 幂等性：**
- [ ] .checkpoint_cache/目录创建逻辑
- [ ] _make_key / _cache_get / _cache_set 函数实现
- [ ] 原子写（tmp + os.replace）防写一半崩溃
- [ ] 调用tool前检查磁盘缓存
- [ ] 已缓存的结果跳过API调用
- [ ] 任务完成后清理缓存文件
- [ ] task_id生成逻辑（优先user_input，fallback domain+时间戳）

**任务3 Schema验证：**
- [ ] validate_llm_output函数实现
- [ ] analyst_node集成验证
- [ ] 验证失败触发重试（最多2次）
- [ ] retry prompt包含错误信息
- [ ] 2次重试失败返回error状态

**任务4 类型安全：**
- [ ] _is_error_result辅助函数实现
- [ ] 恢复时过滤错误项
- [ ] 下游代码统一用_is_error_result替代isinstance
- [ ] 竞品流恢复也处理了错误项

---

## 交付格式

```
自检结果: X/4 Timeout + X/7 幂等性 + X/5 Schema验证 + X/4 类型安全 = XX/20
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改DAG拓扑** — 这4个任务都是模块内部改动，不影响节点间关系
2. **不要改ProbeOutput/AnalystOutput的字段** — 只改内部实现，不改对外接口
3. **保持向后兼容** — 没有task_id时用fallback逻辑，没有缓存文件时正常调API
4. **test文件放在项目根目录** — 命名 test_harness_p0.py
5. **磁盘缓存目录** — `.checkpoint_cache/` 加到 `.gitignore`
6. **幂等性缓存是磁盘级的** — 不是state级的（LangGraph state节点级持久化，中途崩溃丢失）
7. **原子写** — 缓存文件用 tmp + os.replace，防写一半崩溃导致文件损坏
