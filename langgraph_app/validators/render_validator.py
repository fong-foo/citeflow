# render_validator.py — 渲染前数据校验器
# 在 generate_html() 之前调用，验证 ProbeOutput 数据是否满足渲染契约。
# 返回 RenderWarning 列表，模板据此决定：正常渲染 / 渲染占位符 / 隐藏区块。

from dataclasses import dataclass, field
from typing import Optional, Any
from langgraph_app.render_contract import SECTIONS, SectionContract, FieldSpec


@dataclass
class RenderWarning:
    block: str           # 区块 section_id
    severity: str        # "error" | "warning" | "info"
    field: str           # 字段路径，如 "citation_metrics.industry_rate"
    display_name: str    # 用户可见的字段名
    msg: str
    value: Any = None    # 实际值（用于调试）


@dataclass
class ValidationReport:
    valid: bool  # True = 所有 required 字段都有值，可以完整渲染
    warnings: list[RenderWarning] = field(default_factory=list)
    sections_present: list[str] = field(default_factory=list)    # 哪些区块有数据可渲染
    sections_missing: list[str] = field(default_factory=list)    # 哪些区块数据源为 None
    sections_degraded: list[str] = field(default_factory=list)   # 哪些区块缺可选字段

    @property
    def error_count(self) -> int:
        return sum(1 for w in self.warnings if w.severity == "error")

    @property
    def warning_count(self) -> int:
        return sum(1 for w in self.warnings if w.severity == "warning")


def _resolve_path(data: dict, path: str) -> Any:
    """解析点号分隔的路径，如 'citation_metrics.industry_rate' → 值。
    支持列表字段标记 '[]'，如 'competitor_analysis.[].query'。
    返回 (value, found) — found=False 表示路径中某层为 None 或不存在。
    """
    parts = path.split(".")
    current = data
    for part in parts:
        if part == "[]":
            # 列表标记：调用方应展开处理，这里返回标记
            return ("<list_marker>", True)
        if current is None:
            return (None, False)
        if isinstance(current, dict):
            if part not in current:
                return (None, False)
            current = current[part]
        else:
            return (None, False)
    return (current, True)


def validate_probe_output(probe_dict: dict) -> ValidationReport:
    """校验 ProbeOutput dict 是否满足渲染契约。

    probe_dict: ProbeOutput.model_dump() 的结果（或 JSON 加载的 dict）

    返回 ValidationReport，其中：
    - valid=True: 所有 required 字段都有值，可以完整渲染
    - valid=False: 有 required 字段缺失，模板应显示占位符或降级
    """
    warnings = []
    sections_present = []
    sections_missing = []
    sections_degraded = []

    # 顶层元信息检查
    if not isinstance(probe_dict, dict):
        return ValidationReport(
            valid=False,
            warnings=[RenderWarning(
                block="probe_output", severity="error",
                field="(root)", display_name="ProbeOutput",
                msg="ProbeOutput 不是 dict 类型，无法渲染", value=type(probe_dict).__name__
            )]
        )

    for section in SECTIONS:
        section_warnings = []
        has_required_missing = False

        # 检查数据源是否存在
        source_data = probe_dict.get(section.data_source)
        if source_data is None:
            # 数据源整体缺失
            has_any_required = any(f.required for f in section.fields)
            if has_any_required:
                sections_missing.append(section.section_id)
                section_warnings.append(RenderWarning(
                    block=section.section_id, severity="error",
                    field=section.data_source, display_name=section.display_name,
                    msg=f"数据源 {section.data_source} 为 None，区块将隐藏", value=None
                ))
                warnings.extend(section_warnings)
                continue
            else:
                # 全部可选 → 跳过不报错
                sections_missing.append(section.section_id)
                continue

        sections_present.append(section.section_id)
        section_degraded = False

        # 处理列表数据源
        if section.list_source:
            list_data = probe_dict.get(section.list_source)
            if not isinstance(list_data, list) or len(list_data) == 0:
                section_warnings.append(RenderWarning(
                    block=section.section_id, severity="warning",
                    field=section.list_source, display_name=section.display_name,
                    msg=f"列表数据源 {section.list_source} 为空，区块将显示空状态",
                    value=list_data
                ))
                warnings.extend(section_warnings)
                sections_degraded.append(section.section_id)
                continue

            # 对列表的每个元素检查必填字段
            item_fields = [f for f in section.fields if "[]" in f.model_path]
            if item_fields:
                for idx, item in enumerate(list_data):
                    if not isinstance(item, dict):
                        continue
                    for f in item_fields:
                        # 从 "competitor_analysis.[].query" 提取 "query"
                        field_name = f.model_path.split(".[].")[-1] if ".[]." in f.model_path else f.model_path.replace("[]","")
                        value = item.get(field_name)
                        if f.required and (value is None or (isinstance(value, str) and value == "")):
                            section_warnings.append(RenderWarning(
                                block=section.section_id, severity="warning",
                                field=f"{section.list_source}[{idx}].{field_name}",
                                display_name=f.display_name,
                                msg=f"列表第{idx+1}项缺少 {f.display_name}",
                                value=value
                            ))
                            section_degraded = True
            if section_degraded:
                sections_degraded.append(section.section_id)
            warnings.extend(section_warnings)
            continue

        # 处理普通 dict 数据源
        for f in section.fields:
            value, found = _resolve_path(probe_dict, f.model_path)
            is_empty = value is None or (isinstance(value, str) and value == "") or \
                       (isinstance(value, (list, dict)) and len(value) == 0)

            if f.required and (not found or is_empty):
                has_required_missing = True
                section_warnings.append(RenderWarning(
                    block=section.section_id, severity="error",
                    field=f.model_path, display_name=f.display_name,
                    msg=f"必填字段 {f.display_name} ({f.model_path}) 缺失或为空",
                    value=value
                ))
            elif not f.required and (not found or is_empty):
                section_degraded = True
                section_warnings.append(RenderWarning(
                    block=section.section_id, severity="info",
                    field=f.model_path, display_name=f.display_name,
                    msg=f"可选字段 {f.display_name} 缺失，将使用 fallback: {f.fallback}",
                    value=value
                ))

        if has_required_missing:
            sections_degraded.append(section.section_id)
        elif section_degraded:
            sections_degraded.append(section.section_id)

        warnings.extend(section_warnings)

    return ValidationReport(
        valid=len([w for w in warnings if w.severity == "error"]) == 0,
        warnings=warnings,
        sections_present=sections_present,
        sections_missing=sections_missing,
        sections_degraded=list(set(sections_degraded)),
    )


def validate_for_template(probe_dict: dict) -> dict:
    """供模板调用的简化接口。

    返回字典，模板可以直接用：
    {
        "valid": True/False,
        "sections": {section_id: {"show": True/False, "degraded": True/False, "warnings": [...]}},
        "summary": "9/9 区块可渲染"
    }
    """
    report = validate_probe_output(probe_dict)
    section_status = {}

    for s in SECTIONS:
        sec_warnings = [w for w in report.warnings if w.block == s.section_id]
        show = s.section_id in report.sections_present
        degraded = s.section_id in report.sections_degraded
        errors = [w for w in sec_warnings if w.severity == "error"]

        section_status[s.section_id] = {
            "show": show,
            "degraded": degraded,
            "has_errors": len(errors) > 0,
            "warnings": [{"field": w.display_name, "msg": w.msg, "severity": w.severity}
                         for w in sec_warnings],
        }

    present_count = len(report.sections_present)
    total_count = len(SECTIONS)

    return {
        "valid": report.valid,
        "sections": section_status,
        "summary": f"{present_count}/{total_count} 区块可渲染" +
                   (f"，{report.error_count} 个必填字段缺失" if report.error_count > 0 else ""),
        "total_warnings": len(report.warnings),
        "total_errors": report.error_count,
    }
