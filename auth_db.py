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
        # Migrate: add scan_credits column
        try:
            _conn.execute("ALTER TABLE users ADD COLUMN scan_credits INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        # Migrate: add probe_credits column
        try:
            _conn.execute("ALTER TABLE users ADD COLUMN probe_credits INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        _conn.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                email TEXT NOT NULL,
                phone TEXT DEFAULT '',
                product TEXT NOT NULL,
                note TEXT DEFAULT '',
                status TEXT DEFAULT 'pending',
                credits_added INTEGER DEFAULT 0,
                admin_note TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
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


def get_credits(email: str) -> dict:
    """返回用户 credits 信息。"""
    conn = get_db()
    with _conn_lock:
        row = conn.execute(
            "SELECT scan_credits, probe_credits, has_light_scan FROM users WHERE email = ?",
            (email,)
        ).fetchone()
        if row:
            return {
                "scan_credits": row["scan_credits"],
                "probe_credits": row["probe_credits"],
                "has_light_scan": bool(row["has_light_scan"]),
            }
        return {"scan_credits": 0, "probe_credits": 0, "has_light_scan": False}


def add_scan_credits(email: str, count: int) -> bool:
    """增加完整体检次数。"""
    conn = get_db()
    with _conn_lock:
        conn.execute(
            "UPDATE users SET scan_credits = scan_credits + ? WHERE email = ?",
            (count, email)
        )
        conn.commit()
        return conn.total_changes > 0


def add_probe_credits(email: str, count: int) -> bool:
    """增加单次 Probe 次数。"""
    conn = get_db()
    with _conn_lock:
        conn.execute(
            "UPDATE users SET probe_credits = probe_credits + ? WHERE email = ?",
            (count, email)
        )
        conn.commit()
        return conn.total_changes > 0


def use_scan_credit(email: str) -> tuple[bool, int]:
    """消耗 1 次完整体检。返回 (是否成功, 剩余次数)。"""
    conn = get_db()
    with _conn_lock:
        cursor = conn.execute(
            "UPDATE users SET scan_credits = scan_credits - 1 WHERE email = ? AND scan_credits > 0",
            (email,)
        )
        conn.commit()
        ok = cursor.rowcount > 0
        row = conn.execute("SELECT scan_credits FROM users WHERE email = ?", (email,)).fetchone()
        remaining = row["scan_credits"] if row else 0
        return (ok, remaining)


def use_probe_credit(email: str) -> tuple[bool, int]:
    """消耗 1 次单次 Probe。返回 (是否成功, 剩余次数)。"""
    conn = get_db()
    with _conn_lock:
        cursor = conn.execute(
            "UPDATE users SET probe_credits = probe_credits - 1 WHERE email = ? AND probe_credits > 0",
            (email,)
        )
        conn.commit()
        ok = cursor.rowcount > 0
        row = conn.execute("SELECT probe_credits FROM users WHERE email = ?", (email,)).fetchone()
        remaining = row["probe_credits"] if row else 0
        return (ok, remaining)


def get_user_full(email: str) -> dict | None:
    """获取完整用户信息（含 credits）。"""
    conn = get_db()
    with _conn_lock:
        row = conn.execute(
            "SELECT id, email, password_hash, tier, scan_credits, probe_credits, has_light_scan, created_at FROM users WHERE email = ?",
            (email,)
        ).fetchone()
        if row:
            return {
                "id": row["id"],
                "email": row["email"],
                "password_hash": row["password_hash"],
                "tier": row["tier"],
                "scan_credits": row["scan_credits"],
                "probe_credits": row["probe_credits"],
                "has_light_scan": bool(row["has_light_scan"]),
                "created_at": row["created_at"],
            }
        return None


# ── Bookings ───────────────────────────────────────

def create_booking(user_id: int, email: str, phone: str, product: str, note: str) -> int:
    """创建预约。返回 booking_id。"""
    conn = get_db()
    with _conn_lock:
        conn.execute(
            "INSERT INTO bookings (user_id, email, phone, product, note) VALUES (?, ?, ?, ?, ?)",
            (user_id, email, phone, product, note),
        )
        conn.commit()
        return conn.execute("SELECT last_insert_rowid()").fetchone()[0]


def list_bookings(status_filter: str = "") -> list[dict]:
    """列出所有预约，最新在前。可选按状态筛选。"""
    conn = get_db()
    with _conn_lock:
        if status_filter:
            rows = conn.execute(
                "SELECT * FROM bookings WHERE status = ? ORDER BY created_at DESC",
                (status_filter,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM bookings ORDER BY created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]


def update_booking_status(booking_id: int, status: str, admin_note: str = "", add_credits: bool = False) -> dict | None:
    """更新预约状态。add_credits=True 时自动调 add_scan_credits/add_probe_credits。"""
    conn = get_db()
    with _conn_lock:
        booking = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not booking:
            return None

        if add_credits and booking["credits_added"] == 0:
            if booking["product"] == "full":
                conn.execute(
                    "UPDATE users SET scan_credits = scan_credits + ?, tier = 'full' WHERE email = ?",
                    (2, booking["email"]),
                )
            elif booking["product"] == "probe":
                conn.execute(
                    "UPDATE users SET probe_credits = probe_credits + ?, tier = CASE WHEN tier = 'full' THEN 'full' ELSE 'probe' END WHERE email = ?",
                    (1, booking["email"]),
                )
            conn.execute("UPDATE bookings SET credits_added = 1 WHERE id = ?", (booking_id,))

        conn.execute(
            "UPDATE bookings SET status = ?, admin_note = ? WHERE id = ?",
            (status, admin_note, booking_id),
        )
        conn.commit()
        return dict(conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone())
