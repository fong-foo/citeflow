# auth_db.py — 用户数据库（SQLite）
import sqlite3
import os
import threading

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "citeflow.db"))

_conn: sqlite3.Connection | None = None
_conn_lock = threading.Lock()


def _init_conn():
    global _conn
    if _conn is not None:
        return
    with _conn_lock:
        if _conn is not None:
            return
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA busy_timeout=5000")
        _conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                tier TEXT NOT NULL DEFAULT 'free',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Migrate: add tier column if missing (for existing DBs)
        try:
            _conn.execute("ALTER TABLE users ADD COLUMN tier TEXT NOT NULL DEFAULT 'free'")
        except sqlite3.OperationalError:
            pass
        # Migrate: add has_light_scan column if missing
        try:
            _conn.execute("ALTER TABLE users ADD COLUMN has_light_scan INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        _conn.commit()


def get_db() -> sqlite3.Connection:
    """获取共享数据库连接（WAL 模式，线程安全）。自动初始化表结构。"""
    _init_conn()
    return _conn


def create_user(email: str, password_hash: str) -> dict:
    """创建用户，返回用户信息。邮箱重复抛 ValueError。"""
    conn = get_db()
    with _conn_lock:
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


def get_user_by_email(email: str) -> dict | None:
    """根据邮箱查询用户。"""
    conn = get_db()
    with _conn_lock:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row:
            return {"id": row["id"], "email": row["email"], "password_hash": row["password_hash"], "tier": row["tier"]}
        return None


def update_user_tier(email: str, tier: str) -> bool:
    """更新用户等级。tier: 'free' | 'probe' | 'full'"""
    conn = get_db()
    with _conn_lock:
        conn.execute("UPDATE users SET tier = ? WHERE email = ?", (tier, email))
        conn.commit()
        return conn.total_changes > 0


def has_light_scan(email: str) -> bool:
    """检查用户是否已跑过初步体检。"""
    conn = get_db()
    with _conn_lock:
        row = conn.execute("SELECT has_light_scan FROM users WHERE email = ?", (email,)).fetchone()
        return bool(row and row["has_light_scan"])


def set_has_light_scan(email: str) -> bool:
    """标记用户已完成初步体检。"""
    conn = get_db()
    with _conn_lock:
        conn.execute("UPDATE users SET has_light_scan = 1 WHERE email = ?", (email,))
        conn.commit()
        return conn.total_changes > 0
