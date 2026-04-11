# AI 文本扩写视频生成器 - 设计文档

**日期**: 2026-04-09  
**状态**: 设计阶段  
**技术栈**: Next.js + TypeScript + Tailwind CSS

---

## 1. 项目概述

### 1.1 目标

创建一个让用户输入文本、由 AI 自动扩写内容、并生成视频的 Web 应用。

### 1.2 核心功能

| 功能 | 描述 | 状态 |
|------|------|------|
| 文本输入 | 用户输入原始文本内容 | MVP |
| AI 扩写 | 调用 OpenCode Zen API (Big Pickle) 扩写文本 | ✅ 已完成 |
| 视频生成 | 调用阿里云百炼-可灵 API 生成视频 | ✅ 已完成 |
| 历史记录 | 保存用户的扩写历史 | MVP |

---

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────┐
│          Next.js App (App Router)   │
├─────────────────────────────────────┤
│  页面层:                            │
│  - / (首页) - 输入 → 扩写 → 预览    │
│  - /history - 历史记录              │
├─────────────────────────────────────┤
│  API 层:                            │
│  - /api/expand - AI扩写             │
│  - /api/video - 视频生成            │
├─────────────────────────────────────┤
│  组件层:                            │
│  - TextInput                        │
│  - ExpandedResult                  │
│  - VideoPreview                    │
│  - HistoryList                     │
└─────────────────────────────────────┘
              ↓
        localStorage
```

### 2.2 目录结构

```
ai-expand-video/
├── app/
│   ├── page.tsx              # 首页
│   ├── history/
│   │   └── page.tsx          # 历史记录页
│   ├── layout.tsx            # 根布局
│   ├── globals.css           # 全局样式
│   └── api/
│       ├── expand/
│       │   └── route.ts      # AI扩写API
│       └── video/
│           └── route.ts      # 视频生成API (占位)
├── components/
│   ├── TextInput.tsx         # 文本输入组件
│   ├── ExpandedResult.tsx    # 扩写结果组件
│   ├── VideoPreview.tsx      # 视频预览组件
│   ├── HistoryList.tsx       # 历史记录组件
│   └── Header.tsx            # 顶部导航
├── lib/
│   └── storage.ts            # localStorage 工具
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

### 2.3 依赖

- `next`: ^14.x
- `react`: ^18.x
- `typescript`: ^5.x
- `tailwindcss`: ^3.x

---

## 3. 页面设计

### 3.1 首页 (/')

```
┌─────────────────────────────────────────┐
│  ✨ AI扩写视频    [首页] [历史记录]      │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 输入原始文本...                       ││
│  │                                     ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                         │
│        [ 开始扩写 ]                     │
│                                         │
│  ─── 扩写结果 ───                       │
│  ┌─────────────────────────────────────┐│
│  │ AI 扩写后的内容...                    ││
│  └─────────────────────────────────────┘│
│                                         │
│        [ 生成视频 ]                     │
│                                         │
│  ─── 视频预览 ───                       │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │         🎬 视频占位区域              ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### 3.2 历史记录页 (/history)

```
┌─────────────────────────────────────────┐
│  ✨ AI扩写视频    [首页] [历史记录]      │
├─────────────────────────────────────────┤
│                                         │
│  历史记录                               │
│  ┌─────────────────────────────────────┐│
│  │ 📝 2026-04-09 14:30                ││
│  │    "春天的故事..." → 扩写 + 视频    ││
│  │    [查看] [删除]                    ││
│  ├─────────────────────────────────────┤│
│  │ 📝 2026-04-09 10:15                ││
│  │    "科技未来..." → 扩写             ││
│  │    [查看] [删除]                    ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. 数据流

### 4.1 扩写流程

```
用户输入文本 → POST /api/expand → Mock返回扩写结果 → 展示
                                         ↓
                                    保存到localStorage
```

### 4.2 视频生成流程 (占位)

```
用户点击"生成视频" → POST /api/video → 返回占位信息 → 展示占位UI
```

### 4.3 数据模型

```typescript
interface ExpandRecord {
  id: string;
  originalText: string;
  expandedText: string;
  videoUrl?: string;
  createdAt: string;
}
```

---

## 5. API 设计

### 5.1 POST /api/expand

**请求**:
```json
{
  "text": "用户输入的原始文本"
}
```

**响应**:
```json
{
  "success": true,
  "expandedText": "AI扩写后的完整内容..."
}
```

### 5.2 POST /api/video

**请求**:
```json
{
  "text": "扩写后的文本"
}
```

**响应**:
```json
{
  "success": true,
  "videoUrl": "",  // 空，暂未实现
  "message": "视频生成功能暂未接入"
}
```

---

## 6. 组件设计

### 6.1 TextInput

- `value`: string - 输入的文本
- `onChange`: (text: string) => void
- `onSubmit`: () => void

### 6.2 ExpandedResult

- `text`: string - 扩写后的文本
- `isLoading`: boolean - 是否正在扩写

### 6.3 VideoPreview

- `videoUrl`: string | null
- `isGenerating`: boolean - 是否正在生成

### 6.4 HistoryList

- `records`: ExpandRecord[]
- `onDelete`: (id: string) => void

---

## 7. 后续扩展

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 真实 AI 接入 | 接入 OpenAI/Claude/Zen API | P1 |
| 视频生成 | 接入 Runway/Pika/Kling API | P2 |
| 用户认证 | 登录后可保存更多历史 | P3 |
| 导出功能 | 导出为 Markdown/PDF | P4 |

---

## 8. 设计原则

1. **YAGNI**: 先实现核心功能，不预先设计扩展
2. **渐进增强**: Mock 先行，后续可轻松替换为真实 API
3. **本地优先**: 数据存在 localStorage，无需后端数据库
4. **简洁 UI**: 保持界面干净，减少干扰