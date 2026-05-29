# base_node.py — 公共 harness 组件
# 提取自 9 个节点文件中重复的 CircuitBreaker / NodeLogger / TokenTracker


# ─── 第 9 层：熔断器 ───────────────────────────────────
class CircuitBreaker:
    def __init__(self, max_failures: int = 3):
        self.max_failures = max_failures
        self.failure_count = 0

    def record_failure(self):
        self.failure_count += 1

    def is_open(self) -> bool:
        return self.failure_count >= self.max_failures

    def reset(self):
        self.failure_count = 0


# ─── 第 10 层：节点日志 ─────────────────────────────────
class NodeLogger:
    def __init__(self, node_name: str):
        self.node_name = node_name

    def log(self, message: str, level: str = "info"):
        print(f"[{level.upper()}] [{self.node_name}] {message}")


# ─── 第 11 层：Token 追踪 ──────────────────────────────
class TokenTracker:
    def __init__(self):
        self.total_tokens = 0

    def track(self, tokens: int):
        self.total_tokens += tokens

    def get_total(self) -> int:
        return self.total_tokens
