# TASK_TEST_FUNCTION_CALLING.md — 测试 Gemini/Grok function calling 兼容性

> 药老出品 · 2026-05-07
> 目标: 验证 Gemini 和 Grok 通过 ofox.ai 代理是否支持 OpenAI function calling 格式
> 预计工时: 30min

---

## 测试内容

1. **Gemini 是否支持 function calling**
2. **Grok 是否支持 function calling**
3. **tool response 的回传格式是否兼容**

---

## 测试脚本

```python
#!/usr/bin/env python3
"""
test_function_calling.py — 测试 Gemini/Grok function calling 兼容性

用法：
  python test_function_calling.py
"""

import json
import os
from openai import OpenAI

# 配置
BASE_URL = "https://api.ofox.ai/v1"
API_KEY = os.environ.get("OPENAI_API_KEY", "")

# 测试模型
MODELS = {
    "gemini": "gemini-3.1-flash-lite-preview",
    "grok": "grok-4.1-fast",
}

# 测试用的 function calling 定义
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "搜索网页获取信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索查询词"
                    }
                },
                "required": ["query"]
            }
        }
    }
]

# 测试消息
MESSAGES = [
    {"role": "user", "content": "搜索一下 YesWelder 的评价"}
]


def test_function_calling(model_name: str, model_id: str) -> dict:
    """测试单个模型的 function calling 支持"""
    
    client = OpenAI(base_url=BASE_URL, api_key=API_KEY)
    
    result = {
        "model": model_name,
        "model_id": model_id,
        "supports_function_calling": False,
        "tool_calls_format_correct": False,
        "tool_response_format_correct": False,
        "error": None,
        "raw_response": None,
    }
    
    try:
        # Step 1: 发送带 tools 的请求
        response = client.chat.completions.create(
            model=model_id,
            messages=MESSAGES,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.1,
        )
        
        message = response.choices[0].message
        result["raw_response"] = message.model_dump()
        
        # Step 2: 检查是否有 tool_calls
        if message.tool_calls:
            result["supports_function_calling"] = True
            
            # Step 3: 检查 tool_calls 格式
            tool_call = message.tool_calls[0]
            if (hasattr(tool_call, "id") and 
                hasattr(tool_call, "type") and 
                hasattr(tool_call, "function") and
                hasattr(tool_call.function, "name") and
                hasattr(tool_call.function, "arguments")):
                result["tool_calls_format_correct"] = True
            
            # Step 4: 模拟 tool response 并检查兼容性
            tool_response = {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps({"results": ["YesWelder is a budget-friendly welding brand"]}),
            }
            
            messages_with_tool = MESSAGES + [message.model_dump(), tool_response]
            
            try:
                response2 = client.chat.completions.create(
                    model=model_id,
                    messages=messages_with_tool,
                    temperature=0.1,
                )
                result["tool_response_format_correct"] = True
            except Exception as e:
                result["error"] = f"tool response 回传失败: {e}"
        else:
            # 模型没有调用 function，可能是不支持或者不需要
            result["error"] = "模型没有调用 function（可能不支持或判断不需要）"
    
    except Exception as e:
        result["error"] = f"请求失败: {e}"
    
    return result


def main():
    """主函数"""
    print("=" * 60)
    print("Gemini/Grok function calling 兼容性测试")
    print("=" * 60)
    print()
    
    results = []
    for model_name, model_id in MODELS.items():
        print(f"测试 {model_name} ({model_id})...")
        result = test_function_calling(model_name, model_id)
        results.append(result)
        
        # 输出结果
        status = "✅" if result["supports_function_calling"] else "❌"
        print(f"  {status} 支持 function calling: {result['supports_function_calling']}")
        
        if result["supports_function_calling"]:
            status2 = "✅" if result["tool_calls_format_correct"] else "❌"
            print(f"  {status2} tool_calls 格式正确: {result['tool_calls_format_correct']}")
            
            status3 = "✅" if result["tool_response_format_correct"] else "❌"
            print(f"  {status3} tool response 兼容: {result['tool_response_format_correct']}")
        
        if result["error"]:
            print(f"  ⚠️ 错误: {result['error']}")
        
        print()
    
    # 总结
    print("=" * 60)
    print("总结")
    print("=" * 60)
    
    for result in results:
        model = result["model"]
        fc = result["supports_function_calling"]
        tc = result["tool_calls_format_correct"]
        tr = result["tool_response_format_correct"]
        
        if fc and tc and tr:
            print(f"{model}: ✅ 完全兼容")
        elif fc and tc:
            print(f"{model}: ⚠️ 支持 function calling，但 tool response 不兼容")
        elif fc:
            print(f"{model}: ⚠️ 支持 function calling，但格式不完全兼容")
        else:
            print(f"{model}: ❌ 不支持 function calling")


if __name__ == "__main__":
    main()
```

---

## 预期输出

```
============================================================
Gemini/Grok function calling 兼容性测试
============================================================

测试 gpt (gpt-4o)...
  ✅ 支持 function calling: True
  ✅ tool_calls 格式正确: True
  ✅ tool response 兼容: True

测试 gemini (gemini-2.5-pro)...
  ✅ 支持 function calling: True
  ✅ tool_calls 格式正确: True
  ✅ tool response 兼容: True

测试 grok (grok-3)...
  ✅ 支持 function calling: True
  ✅ tool_calls 格式正确: True
  ✅ tool response 兼容: True

============================================================
总结
============================================================
gpt: ✅ 完全兼容
gemini: ✅ 完全兼容
grok: ✅ 完全兼容
```

---

## CHECKLIST 自检

- [ ] 测试脚本创建
- [ ] 跑测试，检查 Gemini 是否支持 function calling
- [ ] 跑测试，检查 Grok 是否支持 function calling
- [ ] 跑测试，检查 tool response 回传格式是否兼容
- [ ] 记录结果，更新任务文件

---

## 注意事项

1. **模型名需要确认** — 用户说的 "Grok 4.1 Fast" 和 "Gemini 3.1 Flash Lite Preview" 不在 ofox.ai 列表里
2. **如果模型不支持 function calling** — 需要改方案：不用 function calling，直接用 Serper 搜索 + 合成答案
3. **如果 tool response 不兼容** — 需要适配回传格式
