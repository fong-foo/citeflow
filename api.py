# api.py — CiteFlow API
# 开发: cd ~/Desktop/CiteFlow && source .venv/bin/activate && uvicorn api:app --reload --port 8000
# 生产: cd ~/Desktop/CiteFlow && source .venv/bin/activate && gunicorn api:app -c gunicorn.conf.py

from fastapi import FastAPI, HTTPException, Depends, Security, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import sys
import os
import json
import logging
import uuid
import time
import asyncio
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional

from auth import hash_password, verify_password, create_access_token, get_current_user
from auth import decode_access_token  # 用于可选鉴权
from auth_db import create_user, get_user_by_email, has_light_scan, set_has_light_scan, update_user_tier, get_db, DB_PATH, get_credits

logger = logging.getLogger(__name__)

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="CiteFlow API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _start_cleanup_loop():
    """每 5 分钟清理超过 30 分钟的过期扫描任务。"""
    async def _loop():
        while True:
            await asyncio.sleep(300)
            scan_tasks.cleanup(max_age_seconds=1800)
    asyncio.create_task(_loop())


# ─── Scan Task Store (in-memory, for polling) ─────────────

class ScanTaskStore:
    """In-memory store for async scan tasks. Frontend polls GET /api/scan/{id}."""

    def __init__(self):
        self._tasks: dict[str, dict] = {}
        self._lock = threading.Lock()

    def create(self) -> str:
        scan_id = uuid.uuid4().hex[:12]
        with self._lock:
            self._tasks[scan_id] = {
                "status": "running",
                "progress": "正在分析官网内容...",
                "stage": "profiling",
                "result": None,
                "error": None,
                "created_at": time.time(),
                "progress_log": [],
            }
        return scan_id

    def update(self, scan_id: str, **kwargs):
        with self._lock:
            if scan_id in self._tasks:
                self._tasks[scan_id].update(kwargs)

    def append_log(self, scan_id: str, message: str, msg_type: str = "info", elapsed: float | None = None):
        """Thread-safe append to progress_log for real-time SIGINT FEED.
        elapsed: seconds since scan start. If None, uses wall-clock time.time()."""
        ts = round(elapsed if elapsed is not None else time.time(), 1)
        with self._lock:
            if scan_id in self._tasks:
                self._tasks[scan_id]["progress_log"].append({
                    "time": ts,
                    "text": message,
                    "type": msg_type,
                })

    def get(self, scan_id: str, default: dict | None = None) -> dict | None:
        with self._lock:
            task = self._tasks.get(scan_id)
            if task is None:
                return default
            return dict(task)  # shallow copy

    def cleanup(self, max_age_seconds: int = 1800):
        """Remove tasks older than max_age_seconds (default 30min)."""
        now = time.time()
        with self._lock:
            stale = [
                sid for sid, t in self._tasks.items()
                if now - t["created_at"] > max_age_seconds
            ]
            for sid in stale:
                del self._tasks[sid]


scan_tasks = ScanTaskStore()

# ─── Concurrency control ─────────────────────────────────
_MAX_CONCURRENT_SCANS = 5
_scan_semaphore = asyncio.Semaphore(_MAX_CONCURRENT_SCANS)


# ─── Admin Auth ─────────────────────────────────────────────

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """检查当前用户是否为管理员。非管理员 → 403。"""
    if user["email"] != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="无权访问")
    return user


# ─── Database Init ────────────────────────────────────────

def _init_scan_db():
    conn = get_db()
    conn.execute(
        "CREATE TABLE IF NOT EXISTS scan_results ("
        "id TEXT PRIMARY KEY, "
        "user_id INTEGER NOT NULL, "
        "domain TEXT NOT NULL, "
        "brand_name TEXT NOT NULL, "
        "mode TEXT NOT NULL DEFAULT 'light', "
        "result_json TEXT NOT NULL, "
        "created_at TEXT NOT NULL DEFAULT (datetime('now')), "
        "FOREIGN KEY (user_id) REFERENCES users(id)"
        ")"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_scan_results_user "
        "ON scan_results(user_id, created_at DESC)"
    )
    conn.commit()

_init_scan_db()


# ─── Request Models ───────────────────────────────────────

class ProfileRequest(BaseModel):
    domain: str
    brand_name: str = ""


class ProbeRequest(BaseModel):
    domain: str
    brand_name: str
    industry: str
    target_market: str
    core_product: str
    target_positioning: str = ""  # 品牌想让AI看到什么（可选，用于gap_report对比）
    seed_queries: list[str]
    competitors: list[str] = []
    mode: str = "full"  # "light" | "full"，默认 full 向后兼容


class AnalystRequest(BaseModel):
    probe_output: dict  # 完整的 ProbeOutput JSON


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ─── 认证 ──────────────────────────────────────────────


@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    """注册新用户。"""
    email = req.email.lower().strip()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="邮箱格式不正确")
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="密码至少8位")
    existing = get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="该邮箱已注册")
    password_hash = hash_password(req.password)
    user = create_user(email, password_hash)
    user_tier = user.get("tier", "free")
    token = create_access_token(user["id"], user["email"], user_tier)
    return {"status": "success", "token": token, "user": {"id": user["id"], "email": user["email"], "tier": user_tier, "scan_credits": 0, "probe_credits": 0, "has_light_scan": False}}


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    """登录。"""
    user = get_user_by_email(req.email.lower().strip())
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    user_tier = user.get("tier", "free")
    token = create_access_token(user["id"], user["email"], user_tier)
    is_admin = user["email"] == ADMIN_EMAIL
    credits = get_credits(req.email.lower().strip())
    return {
        "status": "success",
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "tier": user_tier,
            "is_admin": is_admin,
            "scan_credits": credits["scan_credits"],
            "probe_credits": credits["probe_credits"],
            "has_light_scan": credits["has_light_scan"],
        },
    }


@app.get("/api/auth/me")
async def me(current_user: dict = Security(get_current_user)):
    """获取当前登录用户信息。"""
    from auth_db import get_user_full
    full = get_user_full(current_user["email"])
    if not full:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {
        "id": full["id"],
        "email": full["email"],
        "tier": full["tier"],
        "scan_credits": full["scan_credits"],
        "probe_credits": full["probe_credits"],
        "has_light_scan": full["has_light_scan"],
        "created_at": full["created_at"],
    }


class UpgradeRequest(BaseModel):
    tier: str  # "probe" | "full"


@app.post("/api/auth/upgrade")
async def upgrade_tier(req: UpgradeRequest, current_user: dict = Security(get_current_user)):
    """升级用户等级，返回新token（含新tier）。"""
    if req.tier not in ("free", "probe", "full"):
        raise HTTPException(status_code=400, detail="无效等级")
    email = current_user["email"]
    ok = update_user_tier(email, req.tier)
    if not ok:
        raise HTTPException(status_code=400, detail="升级失败")
    new_token = create_access_token(current_user["user_id"], email, req.tier)
    return {"status": "success", "token": new_token, "tier": req.tier}


@app.post("/api/auth/light-scan-done")
async def mark_light_scan_done(user: dict = Depends(get_current_user)):
    """标记用户已完成 Light 扫描。"""
    email = user["email"]
    set_has_light_scan(email)
    return {"ok": True}


# ─── Payment — Lemon Squeezy ────────────────────────────

class CheckoutRequest(BaseModel):
    product: str  # "full" | "probe"


class DeductRequest(BaseModel):
    product: str  # "full" | "probe"


@app.post("/api/pay/checkout")
async def create_checkout(body: CheckoutRequest, user: dict = Depends(get_current_user)):
    """创建 Lemon Squeezy checkout。product: 'full'（¥368）或 'probe'（¥68）。"""
    if body.product == "full":
        variant_id = os.environ.get("LEMON_SQUEEZY_VARIANT_ID_FULL", "")
    elif body.product == "probe":
        variant_id = os.environ.get("LEMON_SQUEEZY_VARIANT_ID_PROBE", "")
    else:
        raise HTTPException(status_code=400, detail="无效产品类型")

    api_key = os.environ.get("LEMON_SQUEEZY_API_KEY", "")
    store_id = os.environ.get("LEMON_SQUEEZY_STORE_ID", "")

    if not variant_id or not api_key or not store_id:
        raise HTTPException(status_code=500, detail="支付暂未配置")

    success_url = os.environ.get("FRONTEND_URL", "https://www.citeflow.cn") + f"/pay/success?product={body.product}"

    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.lemonsqueezy.com/v1/checkouts",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
                "Content-Type": "application/vnd.api+json",
            },
            json={
                "data": {
                    "type": "checkouts",
                    "attributes": {
                        "checkout_data": {
                            "custom": {
                                "user_id": str(user["user_id"]),
                                "email": user["email"],
                                "product": body.product,
                            }
                        },
                        "product_options": {
                            "redirect_url": success_url,
                        },
                    },
                    "relationships": {
                        "store": {"data": {"type": "stores", "id": store_id}},
                        "variant": {"data": {"type": "variants", "id": variant_id}},
                    },
                }
            },
            timeout=15,
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Lemon Squeezy checkout failed: {resp.status_code} {resp.text}")
            raise HTTPException(status_code=502, detail="支付暂不可用")
        data = resp.json()
        return {"url": data["data"]["attributes"]["url"]}


@app.post("/api/webhook/lemon-squeezy")
async def lemon_squeezy_webhook(request: Request):
    """支付成功 → 按产品类型加 credits。"""
    secret = os.environ.get("LEMON_SQUEEZY_WEBHOOK_SECRET", "")
    raw_body = await request.body()
    signature = request.headers.get("X-Signature", "")

    if secret:
        import hmac, hashlib
        expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=403, detail="签名验证失败")

    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="无效的请求体")

    event_name = payload.get("meta", {}).get("event_name", "")
    if event_name != "order_created":
        return {"status": "ignored", "event": event_name}

    custom = (
        payload.get("data", {})
        .get("attributes", {})
        .get("checkout_data", {})
        .get("custom", {})
    )
    email = custom.get("email", "")
    product = custom.get("product", "")

    if not email:
        return {"status": "no_email"}

    from auth_db import add_scan_credits, add_probe_credits

    if product == "full":
        add_scan_credits(email, 2)
        logger.info(f"Added 2 scan_credits to {email}")
    elif product == "probe":
        add_probe_credits(email, 1)
        logger.info(f"Added 1 probe_credit to {email}")
    else:
        logger.warning(f"Unknown product in webhook: {product}")

    return {"status": "ok", "product": product}


@app.post("/api/user/deduct")
async def deduct_credit(body: DeductRequest, user: dict = Depends(get_current_user)):
    """扫描完成后扣减 credits。product: 'full' 或 'probe'。"""
    from auth_db import use_scan_credit, use_probe_credit

    email = user["email"]
    if body.product == "full":
        ok, remaining = use_scan_credit(email)
    elif body.product == "probe":
        ok, remaining = use_probe_credit(email)
    else:
        raise HTTPException(status_code=400, detail="无效产品类型")

    if not ok:
        raise HTTPException(status_code=400, detail="次数不足")

    return {"ok": True, "remaining": remaining, "product": body.product}


# ─── Profile — 轻量品牌画像 ──────────────────────────────

@app.post("/api/profile")
async def run_profile(req: ProfileRequest):
    """轻量品牌画像：只爬官网，提取品牌信息，不跑搜索。"""
    from langgraph_app.tools.brand_profiler import profile as brand_profile

    ui = {
        "domain": req.domain,
        "brand_name": req.brand_name,
        "industry": "",
        "target_market": "",
        "core_product": "",
        "seed_queries": [],
        "competitors": [],
    }

    def _run_sync():
        return asyncio.run(brand_profile(ui))

    try:
        bp = await asyncio.wait_for(asyncio.to_thread(_run_sync), timeout=60)
        crawl_status = bp.get("_crawl_status", {})
        return {
            "status": "success",
            "brand_profile": {
                "brand_name": bp.get("brand_name", ""),
                "one_liner": bp.get("one_liner", ""),
                "inferred_industry": bp.get("inferred_industry", ""),
                "inferred_target_market": bp.get("inferred_target_market", ""),
                "inferred_core_product": bp.get("inferred_core_product", ""),
                "value_props": bp.get("value_props", []),
            },
            "crawl_diagnostic": {
                "data_source": bp.get("_data_source", "unknown"),
                "crawl_success": crawl_status.get("success", False),
                "pages_crawled": crawl_status.get("pages_ok", 0),
                "total_chars": crawl_status.get("total_chars", 0),
                "domain_used": crawl_status.get("domain_used", req.domain),
                "www_fallback": crawl_status.get("www_fallback", "not_attempted"),
                "errors": crawl_status.get("errors", []),
                "fallback": bp.get("_fallback", False),
            },
        }
    except asyncio.TimeoutError:
        return {"status": "error", "error": "官网扫描超时，请检查域名是否正确"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ─── Expand Queries — DeepSeek 生成 ABC 三类查询词 ──────

class ExpandQueriesRequest(BaseModel):
    industry: str
    brand_name: str
    competitors: list[str] = []
    seed_queries: list[str] = []


@app.post("/api/expand-queries")
async def expand_queries(req: ExpandQueriesRequest):
    """用 DeepSeek 统一生成 A/B/C 三类查询词（各10条），返回给前端供用户审阅调整。"""
    from langgraph_app.tools.query_expander import expand

    try:
        queries = await asyncio.wait_for(
            expand(
                seeds=req.seed_queries,
                industry=req.industry,
                brand_name=req.brand_name,
                competitors=req.competitors,
            ),
            timeout=15,
        )
        return {
            "status": "success",
            "queries": queries,  # [{"query": str, "category": "industry"|"brand"|"competitor"}, ...]
        }
    except asyncio.TimeoutError:
        return {"status": "error", "error": "查询词生成超时，请重试"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ─── Probe — 品牌体检 ────────────────────────────────────

@app.post("/api/probe")
async def run_probe(req: ProbeRequest):
    """运行 Probe：light 模式快速体检（5模块），full 模式完整扫描（10模块）。"""
    from langgraph_app.nodes.probe_node import probe_node

    state = {
        "user_input": {
            "domain": req.domain,
            "brand_name": req.brand_name,
            "industry": req.industry,
            "target_market": req.target_market,
            "core_product": req.core_product,
            "target_positioning": req.target_positioning,
            "seed_queries": req.seed_queries,
            "competitors": req.competitors,
            "mode": req.mode,
        }
    }

    try:
        result = probe_node(state)
        output = result.get("probe_output", {})
        meta = result.get("probe_meta", {})

        # light / full 均返回完整 ProbeOutput
        return {
            **output,
            "mode": req.mode,
            "meta": meta,
            "competitor_mentions": result.get("_competitor_mentions", []),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ─── Analyst — 诊断分析 ───────────────────────────────────

@app.post("/api/analyst")
async def run_analyst(req: AnalystRequest):
    """运行 Analyst 分析师：14条规则逐条检查，根因分析"""
    from langgraph_app.nodes.analyst_node import analyst_node

    probe_output = req.probe_output
    if not probe_output:
        raise HTTPException(status_code=400, detail="probe_output 不能为空")
    # 如果传入的是完整扫描结果（含嵌套 probe 字段），自动解包
    if "probe" in probe_output and isinstance(probe_output.get("probe"), dict):
        inner = probe_output["probe"]
        if "brand_profile" in inner or "citation_metrics" in inner:
            probe_output = inner

    try:
        state = {"probe_output": probe_output}
        result = analyst_node(state)
        analyst_output = result.get("analyst_output", {})

        return {
            "status": analyst_output.get("status", "success"),
            "diagnosis": analyst_output.get("diagnosis"),
            "three_layer_chain": analyst_output.get("three_layer_chain"),
            "actions": analyst_output.get("actions", []),
            "competitor_gap": analyst_output.get("competitor_gap"),
            "one_line_verdict": analyst_output.get("one_line_verdict", ""),
            "engine_comparison": analyst_output.get("engine_comparison"),
            "engine_insights": analyst_output.get("engine_insights", []),
            "engine_recommendations": analyst_output.get("engine_recommendations", []),
            "b_class_perception": analyst_output.get("b_class_perception"),
            "c_class_matrix": analyst_output.get("c_class_matrix"),
            "content_templates": analyst_output.get("content_templates"),
            "error": analyst_output.get("error"),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ─── 全流程 — Probe + Analyst 串联 (异步 + 轮询) ─────

async def _run_scan_task(scan_id: str, state: dict, mode: str, current_user: dict | None):
    """后台执行完整扫描流程，实时更新 ScanTaskStore。"""
    from langgraph_app.nodes.probe_node import probe_node

    acquired = False
    try:
        await _scan_semaphore.acquire()
        acquired = True
        # ── Stage 1: Probe ──
        scan_tasks.update(scan_id, progress="正在扫描搜索引擎，查询品牌引用数据...", stage="probe")
        scan_start = time.time()  # 统一时间基准，所有 progress_log 相对此时间偏移
        probe_start = scan_start

        # 长轮询期间每 12 秒更新一次进度（带耗时），让前端知道后端在真实运行
        probe_done = asyncio.Event()
        async def _probe_progress_pulse():
            while not probe_done.is_set():
                await asyncio.sleep(12)
                if not probe_done.is_set():
                    elapsed = int(time.time() - probe_start)
                    scan_tasks.update(scan_id,
                        progress=f"正在扫描搜索引擎，查询品牌引用数据...（已耗时 {elapsed} 秒）",
                        stage="probe")

        pulse_task = asyncio.create_task(_probe_progress_pulse())

        # 设置进度回调，将 probe_node 内部里程碑实时推送到 progress_log
        from langgraph_app.nodes.probe_node import set_progress_callback as set_probe_callback
        set_probe_callback(lambda msg, msg_type: scan_tasks.append_log(
            scan_id, msg, msg_type, time.time() - scan_start))

        probe_result = await asyncio.wait_for(
            asyncio.to_thread(probe_node, state),
            timeout=420,
        )

        # 清除回调
        set_probe_callback(None)

        probe_elapsed = time.time() - probe_start

        probe_done.set()
        try:
            await asyncio.wait_for(pulse_task, timeout=2)
        except asyncio.TimeoutError:
            pulse_task.cancel()
        probe_output = probe_result.get("probe_output", {})

        if probe_output.get("status") == "error":
            scan_tasks.update(scan_id,
                status="error",
                progress="侦察扫描失败",
                error=probe_output.get("error"),
                result={"status": "error", "stage": "probe", "error": probe_output.get("error"), "mode": mode},
            )
            return

        # ── light 模式：扫描完成 ──
        if mode == "light":
            if current_user:
                email = current_user.get("email", "")
                if email:
                    set_has_light_scan(email)
            result = {
                "status": "success", "mode": "light",
                "probe": {**probe_output, "elapsed": round(probe_elapsed, 1),
                          "competitor_mentions": probe_result.get("_competitor_mentions", [])},
                "total_elapsed": round(probe_elapsed, 1),
            }
            scan_tasks.update(scan_id,
                status="done",
                progress="初步体检完成",
                result=result,
            )
            if current_user:
                try:
                    conn = get_db()
                    conn.execute(
                        "INSERT INTO scan_results (id, user_id, domain, brand_name, mode, result_json) "
                        "VALUES (?, ?, ?, ?, ?, ?)",
                        (scan_id, current_user["user_id"],
                         state["user_input"]["domain"],
                         state["user_input"].get("brand_name", ""),
                         mode,
                         json.dumps(result, ensure_ascii=False))
                    )
                    conn.commit()
                except Exception as e:
                    logger.warning(f"scan_results write failed: {e}")
            return

        # ── 检查是否已取消 ──
        if scan_tasks.get(scan_id, {}).get("status") == "cancelled":
            scan_tasks.update(scan_id, progress="扫描已被用户取消")
            return

        # ── Stage 2: Analyst ──
        from langgraph_app.nodes.analyst_node import analyst_node
        scan_tasks.update(scan_id, progress="正在执行 AI 诊断分析（14条规则逐条审查）...", stage="analyst")
        analyst_start = time.time()

        analyst_done = asyncio.Event()
        async def _analyst_progress_pulse():
            while not analyst_done.is_set():
                await asyncio.sleep(10)
                if not analyst_done.is_set():
                    elapsed = int(time.time() - analyst_start)
                    scan_tasks.update(scan_id,
                        progress=f"正在执行 AI 诊断分析（14条规则逐条审查）...（已耗时 {elapsed} 秒）",
                        stage="analyst")

        analyst_pulse = asyncio.create_task(_analyst_progress_pulse())

        # 设置进度回调，将 analyst_node 内部里程碑实时推送到 progress_log
        from langgraph_app.nodes.analyst_node import set_progress_callback as set_analyst_callback
        set_analyst_callback(lambda msg, msg_type: scan_tasks.append_log(
            scan_id, msg, msg_type, time.time() - scan_start))

        analyst_result = await asyncio.wait_for(
            asyncio.to_thread(analyst_node, {"probe_output": probe_output}),
            timeout=180,
        )

        # 清除回调
        set_analyst_callback(None)

        analyst_elapsed = time.time() - analyst_start

        analyst_done.set()
        try:
            await asyncio.wait_for(analyst_pulse, timeout=2)
        except asyncio.TimeoutError:
            analyst_pulse.cancel()
        analyst_output = analyst_result.get("analyst_output", {})

        if analyst_output.get("status") != "success":
            scan_tasks.update(scan_id,
                status="error",
                progress="诊断分析失败",
                error=analyst_output.get("error"),
                result={"status": "error", "stage": "analyst", "error": analyst_output.get("error"), "mode": mode},
            )
            return

        # ── 检查是否已取消 ──
        if scan_tasks.get(scan_id, {}).get("status") == "cancelled":
            scan_tasks.update(scan_id, progress="扫描已被用户取消")
            return

        # ── Stage 3: Doctor ──
        from langgraph_app.nodes.doctor_node import doctor_node
        scan_tasks.update(scan_id, progress="正在生成优化处方（知识库匹配 + 分级任务）...", stage="doctor")
        doctor_start = time.time()
        doctor_result = await asyncio.wait_for(
            asyncio.to_thread(doctor_node, {
                "user_input": state["user_input"],
                "analyst_output": analyst_output,
                "probe_output": probe_output,
            }),
            timeout=120,
        )
        doctor_elapsed = time.time() - doctor_start
        doctor_output = doctor_result.get("doctor_output", {})

        full_result = {
            "status": doctor_output.get("status", "success"),
            "mode": "full",
            "probe": {**probe_output, "elapsed": round(probe_elapsed, 1),
                      "competitor_mentions": probe_result.get("_competitor_mentions", [])},
            "diagnosis": analyst_output.get("diagnosis"),
            "three_layer_chain": analyst_output.get("three_layer_chain"),
            "competitor_gap": analyst_output.get("competitor_gap"),
            "one_line_verdict": analyst_output.get("one_line_verdict", ""),
            "engine_comparison": analyst_output.get("engine_comparison"),
            "engine_insights": analyst_output.get("engine_insights", []),
            "engine_recommendations": analyst_output.get("engine_recommendations", []),
            "b_class_perception": analyst_output.get("b_class_perception"),
            "c_class_matrix": analyst_output.get("c_class_matrix"),
            "content_templates": analyst_output.get("content_templates"),
            "prescription": doctor_output.get("prescription", []),
            "prescription_summary": doctor_output.get("summary", ""),
            "knowledge_sources": doctor_output.get("knowledge_sources", []),
            "analyst_elapsed": round(analyst_elapsed, 1),
            "doctor_elapsed": round(doctor_elapsed, 1),
            "total_elapsed": round(probe_elapsed + analyst_elapsed + doctor_elapsed, 1),
            "error": analyst_output.get("error") or doctor_output.get("error"),
        }

        scan_tasks.update(scan_id,
            status="done",
            progress="扫描完成",
            result=full_result,
        )

        if current_user:
            try:
                conn = get_db()
                conn.execute(
                    "INSERT INTO scan_results (id, user_id, domain, brand_name, mode, result_json) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (scan_id, current_user["user_id"],
                     state["user_input"]["domain"],
                     state["user_input"].get("brand_name", ""),
                     mode,
                     json.dumps(full_result, ensure_ascii=False))
                )
                conn.commit()
            except Exception as e:
                logger.warning(f"scan_results write failed: {e}")

    except asyncio.TimeoutError:
        scan_tasks.update(scan_id, status="error", progress="扫描超时", error="扫描超时（超过7分钟），请重试")
    except Exception as e:
        scan_tasks.update(scan_id, status="error", progress="扫描失败", error=str(e))
    finally:
        if acquired:
            _scan_semaphore.release()


@app.post("/api/scan")
async def run_full_scan(
    req: ProbeRequest,
    credentials: HTTPAuthorizationCredentials = Security(HTTPBearer(auto_error=False)),
):
    """一键体检：Probe → Analyst → Doctor。异步执行，返回 scan_id 供前端轮询。"""
    current_user = None
    if credentials:
        try:
            current_user = decode_access_token(credentials.credentials)
        except HTTPException:
            pass

    # 免费用户限制
    if req.mode == "light" and current_user:
        email = current_user.get("email", "")
        if email and has_light_scan(email):
            return {
                "status": "error",
                "error": "每个账号仅限一次免费初步体检，请升级后使用完整版",
                "code": "LIGHT_SCAN_LIMIT",
            }

    # 并发控制：最多同时跑 _MAX_CONCURRENT_SCANS 个扫描
    if _scan_semaphore._value <= 0:
        raise HTTPException(
            status_code=503,
            detail=f"系统繁忙，当前 {_MAX_CONCURRENT_SCANS} 个扫描正在运行，请稍后重试",
        )

    # 清理过期任务
    scan_tasks.cleanup()

    scan_id = scan_tasks.create()
    state = {
        "user_input": {
            "domain": req.domain,
            "brand_name": req.brand_name,
            "industry": req.industry,
            "target_market": req.target_market,
            "core_product": req.core_product,
            "target_positioning": req.target_positioning,
            "seed_queries": req.seed_queries,
            "competitors": req.competitors,
            "mode": req.mode,
        }
    }
    asyncio.create_task(_run_scan_task(scan_id, state, req.mode, current_user))

    return {"status": "started", "scan_id": scan_id}


@app.get("/api/scan/{scan_id}")
async def get_scan_status(scan_id: str):
    """轮询扫描状态。返回 status + progress + (完成时) result。"""
    task = scan_tasks.get(scan_id)
    if task is None:
        raise HTTPException(status_code=404, detail="scan_id not found")

    return {
        "status": task["status"],
        "progress": task["progress"],
        "stage": task.get("stage", ""),
        "result": task.get("result"),
        "error": task.get("error"),
        "progress_log": task.get("progress_log", []),
    }


@app.post("/api/scan/{scan_id}/cancel")
async def cancel_scan(scan_id: str):
    """取消正在运行的扫描。"""
    task = scan_tasks.get(scan_id)
    if not task:
        raise HTTPException(status_code=404, detail="scan not found")
    if task["status"] == "running":
        scan_tasks.update(scan_id, status="cancelled", progress="扫描已取消")
    return {"status": "cancelled"}


# ─── Scan History — 持久化查询 ──────────────────────────

@app.get("/api/scans")
async def get_scans(current_user: dict = Depends(get_current_user)):
    """返回当前用户的扫描历史列表（最近20条）"""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, domain, brand_name, mode, created_at "
        "FROM scan_results WHERE user_id = ? "
        "ORDER BY created_at DESC LIMIT 20",
        (current_user["user_id"],)
    ).fetchall()
    return {"scans": [dict(r) for r in rows]}


@app.get("/api/scan/{scan_id}/result")
async def get_scan_result(scan_id: str):
    """返回某次扫描的完整结果 JSON"""
    conn = get_db()
    row = conn.execute(
        "SELECT result_json FROM scan_results WHERE id = ?",
        (scan_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="scan not found")
    return json.loads(row[0])


# ─── Doctor — 处方生成 ──────────────────────────────────

class DoctorRequest(BaseModel):
    user_input: dict = {}        # 用户输入（含 domain, brand_name 等）
    analyst_output: dict         # Analyst 的完整输出
    probe_output: dict           # Probe 的完整输出（用于提取品牌信息和关键数据）


@app.post("/api/doctor")
async def run_doctor(req: DoctorRequest):
    """Run Doctor agent with Analyst diagnosis and return prescription."""
    from langgraph_app.nodes.doctor_node import doctor_node

    state = {
        "user_input": req.user_input,
        "analyst_output": req.analyst_output,
        "probe_output": req.probe_output,
    }

    try:
        result = doctor_node(state)
        return result.get("doctor_output", {})
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ─── Admin ─────────────────────────────────────────────────

class AdminUpdateTierRequest(BaseModel):
    tier: str  # "free" | "probe" | "full"


@app.get("/api/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    """数据看板统计。"""
    conn = get_db()

    total = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    free_count = conn.execute("SELECT COUNT(*) FROM users WHERE tier='free'").fetchone()[0]
    probe_count = conn.execute("SELECT COUNT(*) FROM users WHERE tier='probe'").fetchone()[0]
    full_count = conn.execute("SELECT COUNT(*) FROM users WHERE tier='full'").fetchone()[0]

    scanned = conn.execute("SELECT COUNT(*) FROM users WHERE has_light_scan=1").fetchone()[0]
    not_scanned = total - scanned

    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    recent = conn.execute(
        "SELECT COUNT(*) FROM users WHERE created_at >= ?", (seven_days_ago,)
    ).fetchone()[0]

    daily_stats = []
    for i in range(13, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        count = conn.execute(
            "SELECT COUNT(*) FROM users WHERE date(created_at) = ?", (day,)
        ).fetchone()[0]
        daily_stats.append({"date": day, "count": count})

    return {
        "total_users": total,
        "tier_distribution": {"free": free_count, "probe": probe_count, "full": full_count},
        "scan_stats": {"scanned": scanned, "not_scanned": not_scanned},
        "recent_7d": recent,
        "daily_registrations": daily_stats,
    }


@app.get("/api/admin/users")
async def admin_users(
    search: str = "",
    user: dict = Depends(require_admin),
):
    """用户列表（支持邮箱搜索）。"""
    conn = get_db()

    if search:
        rows = conn.execute(
            "SELECT id, email, tier, has_light_scan, created_at FROM users WHERE email LIKE ? ORDER BY created_at DESC LIMIT 100",
            (f"%{search}%",)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, email, tier, has_light_scan, created_at FROM users ORDER BY created_at DESC LIMIT 100"
        ).fetchall()

    users = []
    for row in rows:
        users.append({
            "id": row["id"],
            "email": row["email"],
            "tier": row["tier"],
            "has_light_scan": bool(row["has_light_scan"]),
            "created_at": row["created_at"],
        })

    return {"users": users, "total": len(users)}


@app.patch("/api/admin/users/{email}/tier")
async def admin_update_tier(
    email: str,
    body: AdminUpdateTierRequest,
    user: dict = Depends(require_admin),
):
    """修改用户 tier。"""
    valid_tiers = ["free", "probe", "full"]
    if body.tier not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"无效tier，可选: {valid_tiers}")

    ok = update_user_tier(email, body.tier)
    if not ok:
        raise HTTPException(status_code=404, detail="用户不存在")

    return {"ok": True, "email": email, "tier": body.tier}


# ─── Health ──────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "CiteFlow API",
        "endpoints": ["/api/auth/register", "/api/auth/login", "/api/auth/me", "/api/profile", "/api/probe", "/api/analyst", "/api/scan", "/api/doctor"],
    }
