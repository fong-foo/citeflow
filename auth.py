# auth.py — 认证工具（JWT + 密码哈希）
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ── 配置 ──────────────────────────────────────────────
SECRET_KEY = "citeflow-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72


# ── 密码哈希 ──────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT ───────────────────────────────────────────────
def create_access_token(user_id: int, email: str, tier: str = "free") -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "tier": tier,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """解码JWT，失败抛 HTTPException 401。"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"user_id": int(payload["sub"]), "email": payload["email"], "tier": payload.get("tier", "free")}
    except JWTError:
        raise HTTPException(status_code=401, detail="无效或过期的Token")


# ── FastAPI 依赖 ──────────────────────────────────────
security = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """FastAPI 依赖：从 Authorization header 解析当前用户。"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="未登录")
    return decode_access_token(credentials.credentials)
