# CHECKLIST.md — 海老交付前自检清单

> 每次完成任务后，在提交前逐项自检。每一项 PASS 才能说"完成了"。
> 发现 FAIL → 自己修 → 重检 → 直到全部 PASS。

---

## UI 任务自检 (7-Point Audit)

### 1. 字体检查
- [ ] Press Start 2P 仅用于 ≥20px 的标题（h1/h2）
- [ ] 所有 ≤16px 的文字使用了 JetBrains Mono
- [ ] 中文标签使用了 Noto Sans SC，未声明 pixel 字体
- [ ] 无任何 10px 以下的字号（字阶: 12/14/16/20/28/48）

验证方法：打开浏览器 DevTools → Elements → 逐个检查文字元素的 computed font-family 和 font-size。

### 2. 排版节奏
- [ ] 卡片间有分区隔线 (`section-divider`) 而非纯 margin
- [ ] 长列表有交替背景色区分行
- [ ] Dashboard 6 层各有编号标识（Layer 1-6 可见或可感知）

### 3. 像素风执行
- [ ] 按钮有 clip-path 锯齿角（非圆角）
- [ ] 按钮有双层边框效果（box-shadow 实现的 outer + inner）
- [ ] Agent 头像可区分角色（不是同色块），有明确视觉特征
- [ ] 扫描线 overlay 全局可见

### 4. 颜色语义
- [ ] 绿色 (#00ff41) = 成功/活跃/达标
- [ ] 琥珀 (#ffbf00) = 警告/注意/接近基准
- [ ] 红色 (#ef4444) = 危险/损失/低于基准
- [ ] 蓝色 (#00d4ff) = 信息/链接/中性强调
- [ ] 无任何"装饰性"颜色——每个颜色都能回答"它表示什么"

验证方法：遍历所有 color 声明，逐色问"这个颜色在表达什么状态？"

### 5. 卖点层突出 (Dashboard 专属)
- [ ] Layer 4（统帅作战方案）的视觉权重高于其他 5 层
- [ ] 至少满足两项：(a)2px+ 边框 (b)box-shadow glow (c)更大内边距 (d)amber强调色

验证方法：截 Dashboard 全页截图 → 模糊处理后看哪个区域最显眼 → 必须是 Layer 4。

### 6. 生命力
- [ ] War Room 日志有逐行动画（非一次性全出）
- [ ] Agent 状态点有脉冲动画（pulse-dot active 类）
- [ ] 进度条有递增动画（非静态宽度）
- [ ] 页面切换有 transition

### 7. 设计系统一致性
- [ ] 所有字号属于 {12, 14, 16, 20, 28, 48}
- [ ] 所有 padding/margin 是 8 的倍数
- [ ] 色号均来自 CSS 变量（不硬编码）

---

## 功能任务自检

### 流程完整性
- [ ] 用户可走完完整路径：Login → Onboard1 → Onboard2 → WarRoom → Preview → Dashboard
- [ ] 每个按钮有实际交互（非装饰性）
- [ ] 无 console error
- [ ] 所有页面在 1920px 和 1440px 宽度下完整显示

### 数据一致性
- [ ] 行业选择后，Onboarding Step 2 正确显示该行业专属字段
- [ ] 演示数据与所选行业一致（B2B SaaS 不出现支付查询词）
- [ ] Preview 页不泄露具体诊断证据（仅严重等级）

---

## 交付格式

CHECKLIST 完成后，在回复中附带：

```
自检结果: 7/7 UI + 4/4 功能 = 全部 PASS
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## ⚠️ 红牌规则

以下情况直接判定为 **交付不合格**，无需继续审查：
- 跳过 CHECKLIST 直接说"做好了"
- Press Start 2P 出现在 body 文字/按钮/标签中
- Dashboard Layer 4 视觉权重低于其他层
- 白色背景卡片出现（#ffffff 或类似）
