# test_harness_p0.py — Harness P0 改进任务测试
# 覆盖: Task1 Timeout, Task2 幂等性, Task3 Schema验证, Task4 类型安全

import asyncio
import json
import os
import shutil
import tempfile
import time
from unittest.mock import patch, MagicMock

import pytest

from langgraph_app.nodes.probe_node import (
    _is_error_result, _make_key, _cache_get, _cache_set, _cache_clear,
    _get_task_id, _ensure_cache_dir,
    TIMEOUT_BRAND, TIMEOUT_SEARCH_P1, TIMEOUT_MM_GAP, TIMEOUT_CITE,
    TIMEOUT_SCORER, TIMEOUT_COMPETITOR,
)
from langgraph_app.validators.validator import validate_llm_output, validate_node_output
from langgraph_app.nodes.analyst_node import _append_retry
from langgraph_app.state import (
    AnalystOutput, Diagnosis, ActionItem, CompetitorGap,
    CitationDetail, CitationMetrics,
)

# ═══════════════════════════════════════════════════════════
# Task 4: 搜索结果恢复类型安全
# ═══════════════════════════════════════════════════════════

class TestTypeSafety:
    def test_is_error_result_exception(self):
        assert _is_error_result(Exception("fail")) is True

    def test_is_error_result_none(self):
        assert _is_error_result(None) is True

    def test_is_error_result_checkpoint_error_dict(self):
        assert _is_error_result({"_error": "something failed"}) is True

    def test_is_error_result_fresh_error_dict(self):
        assert _is_error_result({"error": "API failure"}) is True

    def test_is_error_result_valid_dict(self):
        assert _is_error_result({"answer": "hello", "tokens": 10}) is False

    def test_is_error_result_no_search_dict(self):
        assert _is_error_result({"no_search": True, "answer": "direct"}) is False

    def test_filter_error_results_from_list(self):
        results = [
            {"answer": "ok1", "tokens": 5},
            Exception("fail"),
            None,
            {"_error": "checkpoint error"},
            {"error": "api error"},
            {"answer": "ok2", "tokens": 3},
            {"no_search": True, "answer": "direct"},
        ]
        filtered = [r for r in results if isinstance(r, dict) and not _is_error_result(r)]
        assert len(filtered) == 3  # ok1, ok2, no_search
        assert filtered[0]["answer"] == "ok1"
        assert filtered[1]["answer"] == "ok2"
        assert filtered[2]["no_search"] is True

    def test_mixed_recovery_scenario(self):
        """模拟: 20个正常 + 10个错误 → 恢复后只有20个正常"""
        results = []
        for i in range(20):
            results.append({"answer": f"ok_{i}", "tokens": i})
        for i in range(10):
            results.append({"_error": f"fail_{i}"})
        filtered = [r for r in results if not _is_error_result(r)]
        assert len(filtered) == 20


# ═══════════════════════════════════════════════════════════
# Task 1: Wall-clock Timeout
# ═══════════════════════════════════════════════════════════

class TestTimeout:
    def test_timeout_constants(self):
        """验证所有超时常量已定义且合理。"""
        assert TIMEOUT_BRAND == 30
        assert TIMEOUT_SEARCH_P1 == 300
        assert TIMEOUT_MM_GAP == 60
        assert TIMEOUT_CITE == 90
        assert TIMEOUT_SCORER == 30
        assert TIMEOUT_COMPETITOR == 60

    @pytest.mark.asyncio
    async def test_wait_for_timeout_triggers(self):
        """验证 asyncio.wait_for 超时触发 TimeoutError。"""
        async def slow():
            await asyncio.sleep(10)
            return "done"

        task = asyncio.create_task(slow())
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(task, timeout=0.1)

    @pytest.mark.asyncio
    async def test_wait_for_completes_within_timeout(self):
        """验证在超时内完成时正常返回。"""
        async def fast():
            await asyncio.sleep(0.01)
            return "done"

        result = await asyncio.wait_for(asyncio.create_task(fast()), timeout=5)
        assert result == "done"

    @pytest.mark.asyncio
    async def test_other_tasks_not_cancelled_on_timeout(self):
        """验证一个 task 超时不影响其他并行 task。"""
        async def fast():
            await asyncio.sleep(0.01)
            return "fast_done"

        async def slow():
            await asyncio.sleep(10)
            return "slow_done"

        fast_task = asyncio.create_task(fast())
        slow_task = asyncio.create_task(slow())

        # slow 超时
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(slow_task, timeout=0.1)

        # fast 应该仍然可以获取结果
        result = await fast_task
        assert result == "fast_done"


# ═══════════════════════════════════════════════════════════
# Task 2: 幂等性磁盘缓存
# ═══════════════════════════════════════════════════════════

class TestIdempotency:
    def setup_method(self):
        """每个测试前清理缓存。"""
        self.test_task_id = "test_harness_p0_idem"
        _ensure_cache_dir()
        _cache_clear(self.test_task_id)

    def teardown_method(self):
        _cache_clear(self.test_task_id)

    def test_make_key_deterministic(self):
        """相同输入 → 相同 key。"""
        k1 = _make_key("fc_search", "test query", "brand_name", "domain.com")
        k2 = _make_key("fc_search", "test query", "brand_name", "domain.com")
        assert k1 == k2
        assert len(k1) == 12

    def test_make_key_different_inputs(self):
        """不同输入 → 不同 key。"""
        k1 = _make_key("fc_search", "query1", "brand")
        k2 = _make_key("fc_search", "query2", "brand")
        assert k1 != k2

    def test_cache_set_and_get(self):
        """基本写入和读取。"""
        _cache_set(self.test_task_id, "key1", {"data": "hello", "num": 42})
        result = _cache_get(self.test_task_id, "key1")
        assert result == {"data": "hello", "num": 42}

    def test_cache_get_nonexistent_key(self):
        """读取不存在的 key 返回 None。"""
        assert _cache_get(self.test_task_id, "nonexistent") is None

    def test_cache_get_nonexistent_task(self):
        """读取不存在的 task_id 返回 None。"""
        assert _cache_get("no_such_task", "key1") is None

    def test_cache_atomic_write_survives(self):
        """验证原子写入：写 100 条后全部可读。"""
        for i in range(100):
            _cache_set(self.test_task_id, f"key_{i}", {"index": i})
        for i in range(100):
            assert _cache_get(self.test_task_id, f"key_{i}") == {"index": i}

    def test_cache_clear(self):
        """清除后 key 不可读。"""
        _cache_set(self.test_task_id, "key1", {"data": "test"})
        _cache_clear(self.test_task_id)
        assert _cache_get(self.test_task_id, "key1") is None

    def test_cache_corrupted_file_handled(self):
        """损坏的缓存文件不会导致崩溃。"""
        from langgraph_app.nodes.probe_node import _cache_path
        path = _cache_path(self.test_task_id)
        _ensure_cache_dir()
        with open(path, "w") as f:
            f.write("not valid json{{{")
        # 读取应返回 None，不抛异常
        result = _cache_get(self.test_task_id, "any_key")
        assert result is None

    def test_get_task_id_from_user_input(self):
        """从 state 的 user_input.task_id 获取 task_id。"""
        state = {"user_input": {"task_id": "my_custom_task", "domain": "test.com"}}
        assert _get_task_id(state) == "my_custom_task"

    def test_get_task_id_fallback(self):
        """无 task_id 时用 domain + 时间戳 fallback。"""
        state = {"user_input": {"domain": "fallback.com"}}
        tid = _get_task_id(state)
        assert tid.startswith("fallback.com_")

    def test_cache_simulates_crash_recovery(self):
        """
        模拟场景:
        1. API 调用成功，结果写入磁盘缓存
        2. checkpoint 保存前进程崩溃（checkpoint 丢失）
        3. 重试时从磁盘缓存恢复结果，不重新调 API
        """
        # Step 1: 模拟 API 调用成功，写入缓存
        api_result = {"answer": "GPT result", "tokens": 100}
        key = _make_key("fc_search", "test query", "test_brand", "test.com")
        _cache_set(self.test_task_id, key, api_result)

        # Step 2: 模拟崩溃 — 缓存保留在磁盘，checkpoint 丢失

        # Step 3: 重试 — 从缓存读取
        cached = _cache_get(self.test_task_id, key)
        assert cached is not None
        assert cached["answer"] == "GPT result"
        # API 没有被再次调用（这里只验证了缓存命中，mock 验证在实际集成测试中）


# ═══════════════════════════════════════════════════════════
# Task 3: Schema 验证升级
# ═══════════════════════════════════════════════════════════

class TestSchemaValidation:
    def test_validate_llm_output_valid(self):
        """正确 JSON → 验证通过。"""
        data = {
            "diagnosis": {
                "core_problem": "AI 认知偏差",
                "problem_detail": "详细诊断",
                "severity": "warning",
            },
            "actions": [
                {
                    "priority": "P0",
                    "action": "优化官网",
                    "rationale": "提高 AI 引用",
                    "expected_impact": "引用率提升 10%",
                    "target_metric": "引用率",
                    "current_value": "30",
                    "expected_value": "40",
                    "action_steps": ["修改 H1", "更新 meta"],
                    "estimated_time": "2-4周",
                    "estimated_cost": "免费",
                }
            ],
            "competitor_gap": {
                "losing_dimensions": ["品牌力"],
                "root_cause": "竞品内容更多",
                "counter_strategy": "差异化定位",
            },
            "one_line_verdict": "一句话总结",
        }
        result = validate_llm_output(data, AnalystOutput, "analyst")
        assert result["valid"] is True
        assert result["errors"] == []
        assert result["parsed"] is not None
        assert result["parsed"].diagnosis.core_problem == "AI 认知偏差"
        assert len(result["parsed"].actions) == 1
        assert result["parsed"].actions[0].priority == "P0"
        assert result["parsed"].one_line_verdict == "一句话总结"

    def test_validate_llm_output_missing_required_field(self):
        """缺少 required 字段 → 验证失败 + 错误信息包含字段名。"""
        data = {"diagnosis": {"severity": "warning"}}  # 缺 core_problem, problem_detail
        result = validate_llm_output(data, AnalystOutput, "analyst")
        assert result["valid"] is False
        assert len(result["errors"]) > 0
        assert any("core_problem" in e for e in result["errors"])

    def test_validate_llm_output_wrong_type(self):
        """类型错误 → 验证失败 + 错误信息包含期望类型。"""
        data = {
            "diagnosis": {
                "core_problem": 123,  # 应为 str
                "problem_detail": "ok",
                "severity": "not_a_valid_severity",  # 应为 critical|warning|healthy
            },
            "actions": [],
            "one_line_verdict": "ok",
        }
        result = validate_llm_output(data, AnalystOutput, "analyst")
        assert result["valid"] is False

    def test_validate_llm_output_minimal_valid(self):
        """最简有效输入（所有 optional 字段省略）。"""
        data = {
            "diagnosis": {
                "core_problem": "最小诊断",
                "problem_detail": "详情",
                "severity": "healthy",
            },
            "one_line_verdict": "ok",
        }
        result = validate_llm_output(data, AnalystOutput, "analyst")
        assert result["valid"] is True  # actions 和 competitor_gap 有默认值

    def test_validate_node_output_basic(self):
        """保留的 validate_node_output 仍正常工作。"""
        assert validate_node_output("test", {"status": "success"}) == {"valid": True, "errors": []}
        r = validate_node_output("test", {"status": "error", "error": "something broke"})
        assert r["valid"] is True
        r2 = validate_node_output("test", {"no_status": True})
        assert r2["valid"] is False

    def test_append_retry_builds_correct_messages(self):
        """重试消息包含原始消息 + assistant 回复 + 错误修正提示。"""
        original = [
            {"role": "system", "content": "You are an analyst."},
            {"role": "user", "content": "Analyze this brand."},
        ]
        errors = [
            "diagnosis → core_problem: Field required (got: missing)",
            "actions → 0 → priority: expected 'P0|P1|P2' (got: 'urgent')",
        ]
        result = _append_retry(original, "bad json here", errors)
        assert len(result) == 4
        assert result[2]["role"] == "assistant"
        assert result[2]["content"] == "bad json here"  # truncated to 500
        assert result[3]["role"] == "user"
        assert "diagnosis → core_problem" in result[3]["content"]
        assert "actions → 0 → priority" in result[3]["content"]
        assert "请修正后重新返回" in result[3]["content"]

    def test_retry_prompt_truncates_long_content(self):
        """上一次的回复超过 500 字符时截断。"""
        long_content = "x" * 1000
        result = _append_retry(
            [{"role": "system", "content": "sys"}],
            long_content,
            ["error1"],
        )
        assert len(result[1]["content"]) == 500  # 截断到 500


# ═══════════════════════════════════════════════════════════
# 运行
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
