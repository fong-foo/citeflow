# chatgpt_api.py — 通用 OpenAI 兼容 API 调用
# 不包含业务逻辑，只做 HTTP 请求 + 重试

import time
import httpx


def call_api(messages: list[dict], config: dict, tools: list[dict] | None = None,
             temperature: float = 0.3, response_format: dict | None = None,
             tool_choice: str | None = None) -> dict:
    """发一次请求到 OpenAI 兼容 API，返回原始响应 JSON。

    Args:
        messages: 标准 OpenAI messages 列表
        config: 包含 base_url, model, api_key, timeout, max_retries 的字典
        tools: 可选，function calling 的工具定义
        temperature: 温度参数
        response_format: 可选，如 {"type": "json_object"} 强制 JSON 输出

    Returns:
        完整的 API 响应 JSON dict

    Raises:
        httpx.HTTPStatusError: HTTP 错误
        Exception: 网络错误或超时后重试用尽
    """
    payload = {
        "model": config["model"],
        "messages": messages,
        "temperature": temperature,
    }
    if tools:
        payload["tools"] = tools
    if tool_choice:
        payload["tool_choice"] = tool_choice
    if response_format:
        payload["response_format"] = response_format

    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
    }

    last_exception = None
    for attempt in range(config.get("max_retries", 3)):
        try:
            timeout_val = config.get("timeout", 120)
            if isinstance(timeout_val, (int, float)):
                timeout_val = httpx.Timeout(connect=15.0, read=timeout_val, write=15.0, pool=10.0)
            resp = httpx.post(
                config["base_url"],
                headers=headers,
                json=payload,
                timeout=timeout_val,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            last_exception = e
            if attempt < config.get("max_retries", 3) - 1:
                time.sleep(2 ** attempt)  # 指数退避：1s, 2s, 4s

    raise last_exception  # type: ignore[misc]
