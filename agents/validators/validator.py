# validator.py — 通用节点输出验证器
# Phase 1: 基础结构验证 + Phase 3: Pydantic Model 验证 + LLM 重试

from pydantic import BaseModel, ValidationError


def validate_llm_output(raw_json: dict, expected_model: type[BaseModel], node_name: str) -> dict:
    """验证 LLM 返回的 JSON 是否符合 Pydantic Model。

    Returns: {"valid": bool, "errors": list[str], "parsed": BaseModel|None}
    """
    try:
        parsed = expected_model(**raw_json)
        return {"valid": True, "errors": [], "parsed": parsed}
    except ValidationError as e:
        errors = []
        for err in e.errors():
            field = " → ".join(str(loc) for loc in err["loc"])
            errors.append(f"{field}: {err['msg']} (got: {err.get('input', 'N/A')})")
        return {"valid": False, "errors": errors, "parsed": None}


def validate_node_output(node_name: str, output: dict, expected_model=None) -> dict:
    """
    通用验证函数。
    - 检查 output 是否包含 status 字段
    - 检查 status 是否为 "success" 或 "error"
    - 如果 status == "error"，检查是否有 error 字段
    - 返回 {"valid": bool, "errors": list[str]}
    """
    errors = []

    # 规则 1: output 必须是 dict
    if not isinstance(output, dict):
        return {"valid": False, "errors": [f"{node_name}: output is not a dict"]}

    # 规则 2: output 必须有 "status" key
    if "status" not in output:
        errors.append(f"{node_name}: missing 'status' key")
        return {"valid": False, "errors": errors}

    status = output["status"]

    # 规则 3: status 必须是 "success" 或 "error"
    if status not in ("success", "error"):
        errors.append(f"{node_name}: invalid status '{status}', must be 'success' or 'error'")
        return {"valid": False, "errors": errors}

    # 规则 4: 如果 status == "error"，必须有 "error" key 且非空
    if status == "error":
        if "error" not in output or not output["error"]:
            errors.append(f"{node_name}: status is 'error' but missing or empty 'error' field")
            return {"valid": False, "errors": errors}

    return {"valid": True, "errors": errors}
