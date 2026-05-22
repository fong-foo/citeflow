# TASK_DOMAIN_VALIDATION.md — 域名验证 + 失败提示

> 药老出品 · 2026-05-18
> 目标: 用户输入域名后立即验证，不可访问时提示用户补充信息，而不是等到扫描完成才报错
> 预计工时: 2-3小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 新增域名验证函数 | brand_profiler.py | 0.5h |
| 2 | 修改前端输入流程，增加验证步骤 | ScanChat 组件 | 1.5h |
| 3 | 验证正常域名和异常域名 | 手动测试 | 0.5h |

**完成标准**: 用户输入不可访问的域名时，立即提示补充信息，而不是等到扫描完成才报错

---

## 背景

### 问题
当前流程：
```
用户输入域名 → 收集信息 → 开始扫描 → 爬取失败 → 用降级数据 → 结果不准
```

用户期望：
```
用户输入域名 → 立即验证 → 
  ├─ 可访问 → 继续收集信息
  └─ 不可访问 → 立即提示用户补充信息
```

### 测试用例
- `ugreen.com` → 可访问 ✅
- `partheafashion.com` → 不可访问 ❌（DNS解析失败/服务器无响应）

---

## 任务1: 新增域名验证函数

### 需要改的文件
`langgraph_app/tools/brand_profiler.py`

### 实现要求

1. **新增域名验证函数**（放在文件顶部的工具函数区域）

```python
async def validate_domain(domain: str) -> dict:
    """
    验证域名是否可访问。
    
    Returns:
        {
            "accessible": bool,  # 是否可访问
            "status_code": int | None,  # HTTP 状态码
            "error": str | None,  # 错误信息
            "redirect_url": str | None,  # 重定向后的 URL
        }
    """
    import httpx
    
    if not domain:
        return {"accessible": False, "status_code": None, "error": "域名为空", "redirect_url": None}
    
    # 确保域名有协议前缀
    if not domain.startswith(("http://", "https://")):
        url = f"https://{domain}"
    else:
        url = domain
    
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.head(url)
            return {
                "accessible": True,
                "status_code": response.status_code,
                "error": None,
                "redirect_url": str(response.url) if str(response.url) != url else None,
            }
    except httpx.ConnectError as e:
        return {"accessible": False, "status_code": None, "error": f"连接失败: {str(e)}", "redirect_url": None}
    except httpx.TimeoutException:
        return {"accessible": False, "status_code": None, "error": "连接超时", "redirect_url": None}
    except httpx.HTTPStatusError as e:
        return {"accessible": False, "status_code": e.response.status_code, "error": f"HTTP错误: {e.response.status_code}", "redirect_url": None}
    except Exception as e:
        return {"accessible": False, "status_code": None, "error": f"未知错误: {str(e)}", "redirect_url": None}
```

2. **新增 API 端点**（在 `api.py` 中）

```python
@app.post("/api/validate-domain")
async def validate_domain_endpoint(req: dict):
    """验证域名是否可访问"""
    from langgraph_app.tools.brand_profiler import validate_domain
    
    domain = req.get("domain", "")
    if not domain:
        return {"accessible": False, "error": "域名为空"}
    
    result = await validate_domain(domain)
    return result
```

---

## 任务2: 修改前端输入流程

### 需要改的文件
- `frontend/components/scan-chat.tsx`（或当前的对话输入组件）
- `frontend/app/(app)/scan/page.tsx`（如果需要修改流程）

### 实现要求

**目标流程：**

```
Step 1: 输入域名
  ├─ 用户输入域名（如 ugreen.com）
  ├─ 前端调用 /api/validate-domain 验证
  ├─ 显示验证状态（loading...）
  │
  ├─ 可访问 ✅
  │   └─ 显示："✅ 域名验证成功" → 继续 Step 2
  │
  └─ 不可访问 ❌
      └─ 显示验证失败提示 + 补充信息表单
```

**验证失败时的提示文案：**

```
⚠️ 域名无法访问

我们无法访问 partheafashion.com，可能的原因：
• 域名不存在或已过期
• 服务器无响应
• 网站暂时不可用

为了继续为您生成品牌分析，请补充以下信息：

┌─────────────────────────────────────────────┐
│  品牌名称 *（必填）                           │
│  ┌─────────────────────────────────────┐    │
│  │ Parthea Fashion                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  品牌简介 *（必填，50字以上）                 │
│  ┌─────────────────────────────────────┐    │
│  │ 请简要描述您的品牌：做什么产品、      │    │
│  │ 目标客户是谁、有什么特色...           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  其他链接（可选，提升分析准确度）             │
│  ┌─────────────────────────────────────┐    │
│  │ 亚马逊店铺 / 社交媒体 / 其他官网     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [继续分析]                                  │
└─────────────────────────────────────────────┘
```

**前端代码示例：**

```tsx
// 在 ScanChat 组件中
const [domainStatus, setDomainStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
const [domainError, setDomainError] = useState<string>("");
const [showFallbackForm, setShowFallbackForm] = useState(false);

async function handleDomainSubmit(domain: string) {
  setDomainStatus("validating");
  
  try {
    const res = await fetch(`${API_BASE}/api/validate-domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();
    
    if (data.accessible) {
      setDomainStatus("valid");
      // 继续收集其他信息
      onNextStep();
    } else {
      setDomainStatus("invalid");
      setDomainError(data.error || "域名无法访问");
      setShowFallbackForm(true);
    }
  } catch {
    setDomainStatus("invalid");
    setDomainError("验证请求失败");
    setShowFallbackForm(true);
  }
}

// 渲染验证状态
{domainStatus === "validating" && (
  <div className="flex items-center gap-2">
    <span className="animate-spin">⏳</span>
    <span>正在验证域名...</span>
  </div>
)}

{domainStatus === "valid" && (
  <div className="text-green-500">✅ 域名验证成功</div>
)}

{domainStatus === "invalid" && showFallbackForm && (
  <div>
    <p className="text-yellow-500">⚠️ 域名无法访问</p>
    <p className="text-sm text-gray-400">{domainError}</p>
    {/* 补充信息表单 */}
    <FallbackInfoForm onSubmit={handleFallbackSubmit} />
  </div>
)}
```

**FallbackInfoForm 组件：**

```tsx
function FallbackInfoForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [brandName, setBrandName] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [otherLinks, setOtherLinks] = useState("");

  return (
    <div className="mt-4 p-4 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-sm mb-4" style={{ color: "#9A9AB0" }}>
        为了继续为您生成品牌分析，请补充以下信息：
      </p>
      
      {/* 品牌名称 */}
      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{ color: "#5E5E78" }}>品牌名称 *</label>
        <input
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="如：Parthea Fashion"
          className="w-full px-3 py-2 text-sm"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#EDEDF5" }}
        />
      </div>
      
      {/* 品牌简介 */}
      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{ color: "#5E5E78" }}>品牌简介 *（50字以上）</label>
        <textarea
          value={brandDescription}
          onChange={(e) => setBrandDescription(e.target.value)}
          placeholder="请简要描述您的品牌：做什么产品、目标客户是谁、有什么特色..."
          rows={4}
          className="w-full px-3 py-2 text-sm"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#EDEDF5" }}
        />
        <p className="text-xs mt-1" style={{ color: "#5E5E78" }}>
          {brandDescription.length}/50 字 {brandDescription.length < 50 ? "（还需补充）" : "✅"}
        </p>
      </div>
      
      {/* 其他链接 */}
      <div className="mb-4">
        <label className="text-xs mb-1 block" style={{ color: "#5E5E78" }}>其他链接（可选）</label>
        <input
          value={otherLinks}
          onChange={(e) => setOtherLinks(e.target.value)}
          placeholder="亚马逊店铺 / 社交媒体 / 其他官网"
          className="w-full px-3 py-2 text-sm"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#EDEDF5" }}
        />
      </div>
      
      {/* 提交按钮 */}
      <button
        onClick={() => onSubmit({ brandName, brandDescription, otherLinks })}
        disabled={!brandName || brandDescription.length < 50}
        className="px-6 py-2 text-sm font-medium"
        style={{
          background: brandName && brandDescription.length >= 50 ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${brandName && brandDescription.length >= 50 ? "rgba(56,189,248,0.22)" : "rgba(255,255,255,0.06)"}`,
          color: brandName && brandDescription.length >= 50 ? "#7DD3FC" : "#5E5E78",
          cursor: brandName && brandDescription.length >= 50 ? "pointer" : "not-allowed",
        }}
      >
        继续分析
      </button>
    </div>
  );
}
```

---

## 任务3: 后端处理降级数据

### 需要改的文件
`langgraph_app/tools/brand_profiler.py`

### 实现要求

1. **修改 profile() 函数**，支持接收降级数据

```python
async def profile(user_input: dict) -> dict:
    """生成结构化品牌画像。支持域名爬取和手动输入两种模式。"""
    
    # 检查是否有手动输入的降级数据
    fallback_data = user_input.get("fallback_data")
    
    if fallback_data:
        # 使用手动输入的数据
        page_text = None
        crawl_status = {"success": False, "pages_ok": 0, "total_chars": 0, "structured_data": {}, "source": "manual_input"}
        
        # 将手动输入转换为 prompt 可用的格式
        user_input["brand_name"] = fallback_data.get("brand_name", user_input.get("brand_name", ""))
        user_input["core_product"] = fallback_data.get("brand_description", "")
        user_input["other_links"] = fallback_data.get("other_links", "")
    else:
        # 正常爬取流程
        page_text, _pages_ok, _chars, crawl_status = await _crawl_website(user_input.get("domain", ""))
    
    # ... 后续逻辑保持不变
```

2. **修改 _build_prompt() 函数**，支持手动输入数据

```python
def _build_prompt(user_input: dict, page_text: str | None) -> str:
    has_crawl = "（官网爬取成功）" if page_text else "（官网爬取失败，仅用用户输入）"
    crawl_section = page_text[:12000] if page_text else "无官网数据"
    
    # 检查是否有手动输入
    other_links = user_input.get("other_links", "")
    other_links_section = f"其他链接：{other_links}\n" if other_links else ""
    
    return (
        f"Generate a structured brand profile based on the user input and website content.\n\n"
        f"=== USER INPUT ({has_crawl}) ===\n"
        f"Brand: {user_input.get('brand_name', 'N/A')}\n"
        f"Industry (reference): {user_input.get('industry', 'N/A')}\n"
        f"Target Market (reference): {user_input.get('target_market', 'N/A')}\n"
        f"Core Product (reference): {user_input.get('core_product', 'N/A')}\n"
        f"{other_links_section}"
        f"\n"
        f"=== WEBSITE CONTENT ===\n"
        f"{crawl_section}\n\n"
        # ... 后续保持不变
    )
```

---

## 验证方法

**测试1: 正常域名**
1. 输入 `ugreen.com`
2. 应该显示"正在验证域名..."
3. 验证成功，显示"✅ 域名验证成功"
4. 继续收集其他信息

**测试2: 不可访问域名**
1. 输入 `partheafashion.com`
2. 应该显示"正在验证域名..."
3. 验证失败，显示"⚠️ 域名无法访问"
4. 显示补充信息表单
5. 填写品牌名+简介（50字以上）
6. 点击"继续分析"
7. 应该能继续完成扫描

**测试3: 无效域名格式**
1. 输入 `not-a-domain`
2. 应该显示"⚠️ 域名格式不正确"
3. 提示用户重新输入

---

## state.py 改动汇总

**不需要改 state.py！** 只是在 user_input 中增加 fallback_data 字段。

---

## CHECKLIST 自检

**任务1 [域名验证函数]:**
- [ ] validate_domain() 函数在 brand_profiler.py 中
- [ ] /api/validate-domain 端点在 api.py 中
- [ ] 验证超时设置为 10 秒
- [ ] 返回 accessible、status_code、error、redirect_url

**任务2 [前端输入流程]:**
- [ ] 输入域名后立即调用 /api/validate-domain
- [ ] 验证中显示 loading 状态
- [ ] 验证成功显示绿色提示
- [ ] 验证失败显示黄色警告 + 补充信息表单
- [ ] 补充信息表单包含：品牌名称、品牌简介、其他链接
- [ ] 品牌简介需要 50 字以上才能提交
- [ ] 提交后继续扫描流程

**任务3 [后端降级处理]:**
- [ ] profile() 函数支持 fallback_data 参数
- [ ] _build_prompt() 函数支持 other_links 参数
- [ ] 降级数据正确传递到 LLM prompt

---

## 交付格式

```
自检结果: X/4 任务1 + X/7 任务2 + X/3 任务3 = XX/14
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **验证超时不要太长** — 10秒足够，太长用户体验差
2. **不要阻塞主流程** — 验证是异步的，不阻塞其他操作
3. **品牌简介需要 50 字以上** — 太短的信息无法生成有效的品牌画像
4. **其他链接是可选的** — 有就更好，没有也能继续
5. **保持现有爬取逻辑不变** — 只是增加了"提前验证"和"手动输入"两条路径

---

## 预期效果

### 正常域名
```
┌─────────────────────────────────────────────┐
│  请输入您的品牌域名                           │
│  ┌─────────────────────────────────────┐    │
│  │ ugreen.com                          │    │
│  └─────────────────────────────────────┘    │
│  [发送]                                      │
│                                             │
│  ⏳ 正在验证域名...                          │
│                                             │
│  ✅ 域名验证成功                             │
│                                             │
│  请输入品牌名称：                            │
│  ┌─────────────────────────────────────┐    │
│  │ UGREEN绿联                          │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 不可访问域名
```
┌─────────────────────────────────────────────┐
│  请输入您的品牌域名                           │
│  ┌─────────────────────────────────────┐    │
│  │ partheafashion.com                  │    │
│  └─────────────────────────────────────┘    │
│  [发送]                                      │
│                                             │
│  ⏳ 正在验证域名...                          │
│                                             │
│  ⚠️ 域名无法访问                             │
│  我们无法访问 partheafashion.com，可能的原因：│
│  • 域名不存在或已过期                         │
│  • 服务器无响应                              │
│  • 网站暂时不可用                            │
│                                             │
│  为了继续为您生成品牌分析，请补充以下信息：   │
│                                             │
│  品牌名称 *                                  │
│  ┌─────────────────────────────────────┐    │
│  │ Parthea Fashion                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  品牌简介 *（50字以上）                      │
│  ┌─────────────────────────────────────┐    │
│  │ Parthea Fashion 是一个专注于女装     │    │
│  │ 的跨境电商品牌，主要面向北美市场，   │    │
│  │ 提供时尚、性价比高的日常穿搭...      │    │
│  └─────────────────────────────────────┘    │
│  78/50 字 ✅                                 │
│                                             │
│  其他链接（可选）                            │
│  ┌─────────────────────────────────────┐    │
│  │ amazon.com/parthea                  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [继续分析]                                  │
└─────────────────────────────────────────────┘
```
