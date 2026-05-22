# TASK_CONCURRENCY.md — 100并发上线修复

> 海老出品 · 2026-05-23
> 目标: 让 CiteFlow 承受 100 人同时在线不崩
> 预计工时: 第一层 2h / 第二层 1-2天 / 第三层 上线后

---

## 审计摘要（6 个瓶颈）

| # | 严重度 | 瓶颈 | 当前 | 100并发后果 |
|---|--------|------|------|------------|
| 1 | P0 | Uvicorn 单 worker + --reload | 1 进程 dev 模式 | 请求排队，reload 额外吃 CPU |
| 2 | P0 | SQLite 无连接池无 WAL | 每次操作 connect/close | database is locked 雪崩 |
| 3 | P0 | 无限线程创建 | asyncio.to_thread 每请求一个线程 | 100+ 线程，GIL 颠簸，TPE 队列超时 |
| 4 | P1 | 无准入控制 | create_task 来者不拒 | 200 万 tokens 同时打 ofox |
| 5 | P1 | LLM API 无流控 | 同一 Key 无 rate limiter | ofox 限流/封 Key |
| 6 | P1 | ScanTaskStore 内存泄漏 | cleanup 仅在 /api/scan 触发 | dict 无限增长 OOM |

---

## 修复计划

### 第一层（今天能上，无需新依赖）

**1. 准入控制信号量**
- 文件: `api.py`
- 改动: 全局 `asyncio.Semaphore(5)`，`_run_scan_task` 入口 acquire，finally release
- 效果: 最多 5 个扫描同时跑，第 6 个请求返回 503 "系统繁忙"

**2. SQLite WAL 模式 + 连接复用**
- 文件: `auth_db.py`
- 改动: 
  - `PRAGMA journal_mode=WAL` 在 `get_db()` 首次调用时执行
  - 模块级 `_conn` 单例复用（或至少用 `check_same_thread=False` + 线程锁）
- 效果: 读并发，写串行但快，不再 database is locked

**3. 生产服务器配置**
- 文件: 新增 `gunicorn.conf.py` 或改启动命令
- 改动: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker api:app --bind 0.0.0.0:8000`
- 效果: 4 个 worker 进程，真并发处理 HTTP 请求

**4. ScanTaskStore 自动 TTL**
- 文件: `api.py`
- 改动: `ScanTaskStore.__init__` 中启动后台 `asyncio.create_task` 每 5 分钟调 `cleanup()`
- 效果: 过期任务自动清理，不 OOM

### 第二层（需要 1-2 天）

**5. LLM API 令牌桶**
- 文件: `config.py` 或新增 `rate_limiter.py`
- 改动: 跨扫描共享的 `asyncio.Semaphore` 限制并发 LLM 调用数（建议 8-10）
- 效果: 不压爆 ofox API Key

**6. Light 模式优化**
- 文件: `probe_node.py`
- 改动: 让 light 真正跑到 30s（当前 186s），减少搜索引擎调用或缓存
- 效果: 直接降低 80% 资源占用

**7. 请求队列**
- 文件: `api.py`
- 改动: 超过并发上限的请求排队（`asyncio.Queue`），前端显示排队序号
- 效果: 不直接拒绝，用户知道在排队

### 第三层（上线后）

**8. SQLite → PostgreSQL**
**9. Redis 缓存 + 任务队列**
**10. K8s 水平扩展**

---

## 完成标准
- [ ] 100 并发注册/登录不报错
- [ ] 5 个扫描同时跑，第 6 个返回友好提示
- [ ] SQLite 不再 database is locked
- [ ] `gunicorn` 启动，不再是 `--reload`
- [ ] 过期扫描任务自动清理

---

## 不改的
- 不改造 LangGraph 内部逻辑
- 不换 LLM 引擎
- 不改造前端
