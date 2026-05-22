# TASK_CHAT_MODE.md — 对话模式 + 快速模式双入口

> 药老出品 · 2026-05-14
> 目标: 体检中心首次进入走对话流，回头客走快速表单，自动判断
> 预计工时: 2h

---

## 背景

产品体验设计：
- **首次用户**：对话流 — Probe 以对话方式接收信息，逐步确认，沉浸式体验
- **回头客**：快速表单 — 4字段预填，一键体检
- **自动判断**：localStorage 有 `cf_scan_result` → 快速模式，没有 → 对话流

## 整体流程

```
首次用户进入 /scan
  → scan-chat（对话界面）
  → 用户输入域名
  → Probe 自动爬官网，返回品牌画像
  → 用户确认/修改
  → Probe "正在启动扫描仪器..."
  → 等3秒
  → scan-loading（扫描仓）
  → scan-result（报告）

回头客进入 /scan
  → scan-input（快速表单，4字段预填上次数据）
  → 点"开始体检"
  → scan-loading（扫描仓）
  → scan-result（报告）
```

## 任务清单

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 新增 /api/profile 轻量端点 | api.py | 15min |
| 2 | 创建 ScanChat 组件 | components/scan-chat.tsx | 60min |
| 3 | 修改 scan/page.tsx 双模式入口 | app/(app)/scan/page.tsx | 20min |
| 4 | 修改 ScanInput 快速表单组件 | components/scan-input.tsx | 10min |

**完成标准**: 首次访问 /scan 走对话流，有历史记录走快速表单，两种模式都能正确进入扫描仓。

---

## 任务1: 新增 /api/profile 轻量端点

### 问题
对话流需要一个轻量 API：用户输入域名后，只跑 brand_profiler（爬官网+推断行业/市场），不跑全量 Probe。成本极低（1次网页爬取），返回 brand_profile 数据。

### 需要改的文件
`api.py`

### 实现要求

新增请求模型和端点：

```python
class ProfileRequest(BaseModel):
    domain: str
    brand_name: str = ""  # 可选，用户可能还没填


@app.post("/api/profile")
async def run_profile(req: ProfileRequest):
    """轻量品牌画像：只爬官网，提取品牌信息，不跑搜索。"""
    from langgraph_app.tools.brand_profiler import profile as brand_profile

    ui = {
        "domain": req.domain,
        "brand_name": req.brand_name,
        "industry": "",
        "target_market": "",
        "core_product": "",
        "seed_queries": [],
        "competitors": [],
    }

    try:
        import asyncio
        bp = await asyncio.wait_for(
            asyncio.to_thread(brand_profile, ui),
            timeout=30,
        )
        return {
            "status": "success",
            "brand_profile": {
                "brand_name": bp.get("brand_name", ""),
                "one_liner": bp.get("one_liner", ""),
                "inferred_industry": bp.get("inferred_industry", ""),
                "inferred_target_market": bp.get("inferred_target_market", ""),
                "inferred_core_product": bp.get("inferred_core_product", ""),
                "value_props": bp.get("value_props", []),
            },
        }
    except asyncio.TimeoutError:
        return {"status": "error", "error": "官网扫描超时，请检查域名是否正确"}
    except Exception as e:
        return {"status": "error", "error": str(e)}
```

### 验证方法
```bash
curl -X POST http://localhost:8000/api/profile \
  -H "Content-Type: application/json" \
  -d '{"domain": "ugreen.com"}'
```
预期：返回 brand_profile，包含 inferred_industry、inferred_target_market 等字段。

---

## 任务2: 创建 ScanChat 组件

### 需要创建的文件
`frontend/components/scan-chat.tsx`

### 设计规范

#### 布局
```
┌────────────────────────────────────────────┐
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Probe: 欢迎来到CiteFlow体检中心       │  │
│  │ 我是你的AI侦察兵，请输入你的品牌官网   │  │
│  │ 域名，我来帮你做一次全面体检。         │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 用户: ugreen.com                     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Probe: 收到，正在扫描 ugreen.com ...  │  │
│  │ (typing indicator 动画)               │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Probe: 扫描完成，识别到以下信息：      │  │
│  │                                      │  │
│  │   品牌：UGREEN绿联                   │  │
│  │   行业：电子配件/数码周边              │  │
│  │   目标市场：全球（重点北美）           │  │
│  │                                      │  │
│  │  以上信息是否正确？                   │  │
│  │                                      │  │
│  │  [ 确认无误 ]  [ 需要修改 ]           │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 用户: 确认无误                        │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Probe: 4项信息已确认                  │  │
│  │ 正在启动扫描仪器进行检测...           │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ─────────── 输入框 ───────────            │
│  │ 输入域名...                    │ [发送] │
│  ────────────────────────────────          │
└────────────────────────────────────────────┘
```

#### 对话流程（状态机）

```
States: greeting → ask_domain → scanning → show_profile ⇄ editing → confirm → launching → done
```

| 状态 | Probe 说 | 用户操作 | 下一状态 |
|------|----------|----------|----------|
| greeting | "欢迎来到CiteFlow体检中心。我是你的AI侦察兵，请输入你的品牌官网域名，我来帮你做一次全面体检。" | — | ask_domain |
| ask_domain | (等用户输入) | 输入域名 | scanning |
| scanning | "收到，正在扫描 {domain}..." (typing indicator) | — | show_profile |
| show_profile | "扫描完成，识别到以下信息：品牌名/行业/目标市场。以上信息是否正确？" | 点"确认无误" → confirm；点"需要修改" → editing | confirm 或 editing |
| editing | (Profile card 下方弹出可编辑4字段表单) | 用户修改后点"确认修改" → 更新信息 → show_profile | show_profile |
| confirm | (用户点确认) | — | launching |
| launching | "4项信息已确认。正在启动扫描仪器进行检测..." | — | done (3秒后，纯 UI 过渡，让用户读完消息) |

#### 消息类型

```typescript
type Sender = "probe" | "user";

interface ChatMessage {
  id: string;
  sender: Sender;
  content: string;
  timestamp: number;
  // probe 消息的附加类型
  type?: "text" | "profile_card" | "typing" | "confirm_buttons";
  // profile_card 类型的数据
  profileData?: {
    brand_name: string;
    industry: string;
    target_market: string;
  };
}
```

#### 状态机

```typescript
type ChatState = "greeting" | "ask_domain" | "scanning" | "show_profile" | "confirm" | "launching" | "done";

interface ScanChatProps {
  onComplete: (data: { domain: string; brandName: string; industry: string; targetMarket: string }) => void;
}
```

`onComplete` 回调：对话结束后，把4个字段传给 page.tsx，由 page.tsx 触发扫描仓。

#### 视觉规范

**Probe 消息气泡**：
- 背景：rgba(10, 15, 30, 0.8)
- 边框：1px solid rgba(56, 189, 248, 0.1)
- 左对齐
- 左侧有小的 CiteFlow 像素图标

**用户消息气泡**：
- 背景：rgba(56, 189, 248, 0.08)
- 边框：1px solid rgba(56, 189, 248, 0.15)
- 右对齐

**输入框**：
- 暗色背景，和设计系统一致
- placeholder: "输入域名，例如 ugreen.com"
- 发送按钮：蓝色 #38BDF8
- 支持 Enter 发送

**Typing indicator**：
- 三个跳动的点（...）
- 动画：dotsPulse（复用扫描仓的动画）

**Profile card（Probe 返回的品牌信息）**：
- 在消息气泡内嵌一个卡片
- 卡片背景：rgba(255, 255, 255, 0.03)
- 三行信息：品牌名（白色）、行业（蓝色）、目标市场（蓝色）
- 底部两个按钮：[确认无误] [需要修改]

**确认按钮**：
- [确认无误]：蓝色填充，#38BDF8 背景
- [需要修改]：透明背景，蓝色边框

**"需要修改" 流程**：
- 用户点"需要修改"后，Profile card 下方直接弹出可编辑的4字段表单
- 表单预填当前推断值（品牌名、行业、目标市场、域名）
- 用户修改后点"确认修改"
- Probe 更新信息，重新展示更新后的 Profile card + 确认按钮

#### 动画

- 消息出现时有 fadeIn 动画（从下方滑入）
- Probe 消息有打字机效果（逐字显示，速度 30ms/字）
- Typing indicator 在 Probe "思考" 时显示
- 对话结束后，整体淡出，过渡到扫描仓

#### 自动滚动

- 新消息出现时自动滚动到底部
- 使用 `scrollIntoView({ behavior: 'smooth' })`

#### 域名校验

- 用户在对话中输入域名时，先做格式校验（复用 ScanInput 的 `isValidDomain` 逻辑）
- 校验不通过：Probe 提示"请输入有效的域名，例如 ugreen.com"，不调 /api/profile
- 校验通过：调 /api/profile

---

## 任务3: 修改 scan/page.tsx 双模式入口

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

在 page.tsx 中加入模式判断逻辑：

```tsx
import { ScanChat } from "@/components/scan-chat";
import { ScanInput } from "@/components/scan-input";
import { ScanLoading } from "@/components/scan-loading";
import { ScanResult } from "@/components/scan-result";

type EntryMode = "chat" | "quick";

export default function ScanPage() {
  // ... 现有 state ...
  const [entryMode, setEntryMode] = useState<EntryMode>("chat");

  useEffect(() => {
    const token = localStorage.getItem("cf_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    // 判断入口模式
    const hasHistory = localStorage.getItem("cf_scan_result");
    setEntryMode(hasHistory ? "quick" : "chat");

    // 恢复上次结果（如果有）
    if (hasHistory) {
      try {
        const parsed = JSON.parse(hasHistory);
        if (parsed.data) {
          setData(parsed.data);
          setMode(parsed.mode || "light");
          setStep("result");
        }
      } catch {}
    }
    setInitialized(true);
  }, []);

  // 对话完成回调
  function handleChatComplete(chatData: {
    domain: string;
    brandName: string;
    industry: string;
    targetMarket: string;
  }) {
    // 把对话收集的信息传给 handleScan
    handleScan(chatData.domain, chatData.brandName, chatData.industry, chatData.targetMarket);
  }

  // 修改 handleScan 接受更多参数
  async function handleScan(
    domain: string,
    brandName: string,
    industry?: string,
    targetMarket?: string,
  ) {
    setStep("loading");
    // ... 现有 API 调用逻辑，传入 industry 和 targetMarket ...
  }

  return (
    <div className="flex min-h-screen">
      <ScanSidebar currentStep={...} completedSteps={...} />
      <main className="flex-1 ml-[200px] flex flex-col items-center px-4 pt-12 pb-12">
        {step === "idle" && entryMode === "chat" && (
          <ScanChat onComplete={handleChatComplete} />
        )}
        {step === "idle" && entryMode === "quick" && (
          <ScanInput onSubmit={handleScan} isLoading={false} />
        )}
        {step === "loading" && <ScanLoading elapsed={elapsed} domain={scanDomain} brandName={scanBrandName} />}
        {step === "result" && <ScanResult data={data} mode={mode} />}
        {step === "error" && (...)}
      </main>
    </div>
  );
}
```

---

## 任务4: 修改 ScanInput 快速表单组件

### 需要改的文件
`frontend/components/scan-input.tsx`

### 实现要求

scan-input.tsx 已有完整的4字段表单+校验逻辑。只需新增一个功能：

**底部增加"切换到对话模式"链接**：

```
   ── 或 ──
   [ 切换到对话模式 ]
```

- 点击后清除 localStorage 中的 `cf_scan_result`
- 触发页面重新判断入口模式（entryMode = "chat"）
- 文字样式：小字，#6E6E88，hover 变亮

---

## state.py 改动汇总

无改动。

---

## CHECKLIST 自检

**任务1 /api/profile:**
- [ ] 端点可访问：POST /api/profile
- [ ] 输入域名，返回 brand_profile
- [ ] 超时返回错误信息
- [ ] 不影响现有端点

**任务2 ScanChat:**
- [ ] 对话状态机完整（greeting→ask_domain→scanning→show_profile→confirm→launching→done）
- [ ] Probe 消息有打字机效果
- [ ] Typing indicator 正常显示
- [ ] Profile card 显示品牌名/行业/目标市场
- [ ] "确认无误"按钮可点击
- [ ] "需要修改"弹出编辑框，预填当前值
- [ ] 编辑后确认，更新 Profile card
- [ ] 自动滚动到最新消息
- [ ] Enter 可发送消息
- [ ] 域名格式校验（无效域名提示重输）
- [ ] 对话结束后调用 onComplete 回调
- [ ] 消息气泡样式和设计系统一致

**任务3 page.tsx:**
- [ ] localStorage 有历史 → 快速模式
- [ ] localStorage 无历史 → 对话模式
- [ ] 对话完成后正确触发 handleScan
- [ ] 快速模式预填上次数据
- [ ] 两种模式切换不报错

**任务4 ScanInput:**
- [ ] 底部新增"切换到对话模式"链接
- [ ] 点击后清除 localStorage + 切换到对话流
- [ ] 不影响现有表单功能

---

## 交付格式

```
自检结果: X/4 任务1 + X/10 任务2 + X/5 任务3 + X/5 任务4 = XX/24
失败项: (无 / 列出)
```

---

## 注意事项

1. **brand_profiler 是同步函数** — 需要用 `asyncio.to_thread()` 包装，不要阻塞事件循环
2. **对话消息 ID 用递增计数器** — `let msgId = 0; msgId++`，不需要装额外依赖
3. **打字机效果用 setTimeout 逐字渲染** — 不要用 setInterval（容易累积延迟）
4. **ScanChat 的 onComplete 必须传4个字段** — page.tsx 的 handleScan 依赖这些参数
5. **ScanInput 的"切换到对话模式"要清除 localStorage** — 否则刷新后又回到快速模式
6. **不要改 scan-loading.tsx 和 scan-result.tsx** — 这两个组件后续单独做
7. **对话流中 Probe 的自动识别（行业/市场）来自 /api/profile** — 不要硬编码
