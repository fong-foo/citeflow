# TASK_AUTH_API.md — 后端认证API（注册/登录 + SQLite + JWT）

> 药老出品 · 2026-05-13
> 目标: 实现用户注册/登录 API，SQLite 存储，JWT 鉴权
> 预计工时: 1-1.5h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 安装依赖 | requirements.txt | 5min |
| 2 | 数据库模型 | auth_db.py | 15min |
| 3 | 认证逻辑 | auth.py | 20min |
| 4 | API端点 | api.py | 15min |
| 5 | /scan 加鉴权 | api.py | 10min |

**完成标准**: POST /api/auth/register 注册用户 → POST /api/auth/login 返回JWT → /api/scan 需要JWT才能访问

---

## 任务1: 安装依赖

### 实现要求

```bash
cd ~/Desktop/CiteFlow && source .venv/bin/activate
pip install python-jose[cryptography] passlib[bcrypt]
```

更新 requirements.txt，追加：
```
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

---

## 任务2: 数据库模型

### 需要新建的文件
`auth_db.py`

### 实现要求

用 SQLite + 标准库 sqlite3（不引入 SQLAlchemy，保持轻量）。

```python
# auth_db.py — 用户数据库（SQLite）
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "citeflow.db")


def get_db() -> sqlite3.Connection:
    """获取数据库连接，自动建表。"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    return conn


def create_user(email: str, password_hash: str) -> dict:  # email 已在调用前 .lower().strip()
    """创建用户，返回用户信息。邮箱重复抛 ValueError。"""
    conn = get_db()
    try:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (email, password_hash),
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {"id": user_id, "email": email}
    except sqlite3.IntegrityError:
        raise ValueError("该邮箱已注册")
    finally:
        conn.close()


def get_user_by_email(email: str) -> dict | None:  # email 已在调用前 .lower().strip()
    """根据邮箱查询用户。"""
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone()
    conn.close()
    if row:
        return {"id": row["id"], "email": row["email"], "password_hash": row["password_hash"]}
    return None
```

---

## 任务3: 认证逻辑

### 需要新建的文件
`auth.py`

### 实现要求

JWT + 密码哈希：

```python
# auth.py — 认证工具（JWT + 密码哈希）
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ── 配置 ──────────────────────────────────────────────
SECRET_KEY = "citeflow-secret-key-change-in-production"  # 生产环境用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72  # 3天过期

# ── 密码哈希 ──────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────
def create_access_token(user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """解码JWT，失败抛 HTTPException 401。"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"user_id": int(payload["sub"]), "email": payload["email"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="无效或过期的Token")


# ── FastAPI 依赖 ──────────────────────────────────────
security = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """FastAPI 依赖：从 Authorization header 解析当前用户。"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="未登录")
    return decode_access_token(credentials.credentials)
```

---

## 任务4: API端点

### 需要改的文件
`api.py`

### 实现要求

在 api.py 顶部新增 import：

```python
from auth import hash_password, verify_password, create_access_token, get_current_user
from auth import decode_access_token  # 用于可选鉴权
from auth_db import create_user, get_user_by_email
```

新增 Request Models：

```python
class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str
```

新增端点（放在现有端点之前）：

```python
# ─── 认证 ──────────────────────────────────────────────

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    """注册新用户。"""
    email = req.email.lower().strip()
    # 验证邮箱格式
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="邮箱格式不正确")
    # 验证密码长度
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="密码至少8位")
    # 检查邮箱是否已注册
    existing = get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="该邮箱已注册")
    # 创建用户
    password_hash = hash_password(req.password)
    user = create_user(email, password_hash)
    # 返回 token
    token = create_access_token(user["id"], user["email"])
    return {"status": "success", "token": token, "user": {"id": user["id"], "email": user["email"]}}


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    """登录。"""
    user = get_user_by_email(req.email.lower().strip())
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    token = create_access_token(user["id"], user["email"])
    return {"status": "success", "token": token, "user": {"id": user["id"], "email": user["email"]}}


@app.get("/api/auth/me")
async def me(current_user: dict = Security(get_current_user)):
    """获取当前登录用户信息。"""
    return {"user_id": current_user["user_id"], "email": current_user["email"]}
```

---

## 任务5: /scan 加鉴权（可选，建议做）

### 实现要求

给 /api/scan 端点加可选鉴权：
- 有 token → 解析用户信息
- 没 token → 允许访问（第一版先放开，等前端接好后再强制）

```python
from fastapi import Depends

@app.post("/api/scan")
async def run_full_scan(req: ProbeRequest, current_user: dict = Depends(get_current_user)):
    """一键体检：Probe → Analyst → Doctor。需要登录。"""
    # ... 现有代码不变 ...
    # current_user 可用于日志记录、配额检查等
```

注意：加了 `Depends(get_current_user)` 后，没 token 的请求会返回 401。
如果第一版想允许匿名访问，改为：

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

@app.post("/api/scan")
async def run_full_scan(
    req: ProbeRequest,
    credentials: HTTPAuthorizationCredentials = Security(HTTPBearer(auto_error=False)),
):
    """一键体检。可选鉴权。"""
    current_user = None
    if credentials:
        try:
            current_user = decode_access_token(credentials.credentials)
        except HTTPException:
            pass  # token无效也允许访问（第一版）
    # ... 现有代码不变 ...
```

---

## 验证方法

1. 启动后端：`cd ~/Desktop/CiteFlow && source .venv/bin/activate && uvicorn api:app --reload --port 8000`

2. 注册：
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678"}'
# 预期: {"status":"success","token":"eyJ...","user":{"id":1,"email":"test@example.com"}}
```

3. 重复注册：
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678"}'
# 预期: 400 {"detail":"该邮箱已注册"}
```

4. 登录：
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678"}'
# 预期: {"status":"success","token":"eyJ...","user":{"id":1,"email":"test@example.com"}}
```

5. 登录错误密码：
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
# 预期: 401 {"detail":"邮箱或密码错误"}
```

6. 获取当前用户：
```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <token>"
# 预期: {"user_id":1,"email":"test@example.com"}
```

7. 无 token 访问 /api/auth/me：
```bash
curl http://localhost:8000/api/auth/me
# 预期: 401 {"detail":"未登录"}
```

---

## CHECKLIST 自检

**任务1 — 依赖:**
- [ ] python-jose 安装成功
- [ ] passlib 安装成功
- [ ] requirements.txt 已更新

**任务2 — auth_db.py:**
- [ ] get_db() 自动建表
- [ ] create_user() 正常创建用户
- [ ] create_user() 邮箱重复抛 ValueError
- [ ] get_user_by_email() 正常查询

**任务3 — auth.py:**
- [ ] hash_password() 返回 bcrypt 哈希
- [ ] verify_password() 正确验证
- [ ] create_access_token() 返回 JWT
- [ ] decode_access_token() 正确解码
- [ ] decode_access_token() 过期/无效抛 401

**任务4 — API端点:**
- [ ] POST /api/auth/register 注册成功返回 token
- [ ] POST /api/auth/register 邮箱重复返回 400
- [ ] POST /api/auth/register 密码太短返回 400
- [ ] POST /api/auth/login 登录成功返回 token
- [ ] POST /api/auth/login 密码错误返回 401
- [ ] GET /api/auth/me 有效 token 返回用户信息
- [ ] GET /api/auth/me 无 token 返回 401

**任务5 — /scan 鉴权:**
- [ ] /api/scan 带 token 正常访问
- [ ] /api/scan 不带 token 行为符合预期（401或放行）

---

## 交付格式

```
自检结果: X/3 依赖 + X/4 db + X/5 auth + X/7 api + X/2 scan = XX/21
失败项: (无 / 列出)
```

---

## 注意事项

1. SECRET_KEY 在生产环境必须换，用环境变量
2. SQLite 文件 citeflow.db 放在项目根目录
3. 不引入 SQLAlchemy，用 sqlite3 标准库
4. bcrypt 在某些系统上编译慢，首次 import 可能要几秒
5. JWT 过期时间 72 小时（3天），后续可调
6. 不改现有 /api/probe、/api/analyst、/api/doctor 端点
7. /api/scan 的鉴权第一版可选，后续强制
