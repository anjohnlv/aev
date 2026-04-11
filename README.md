# 🎬 AI Video Generator

一个智能视频生成器，将文字主题自动转化为精美的分镜视频。

![Demo](https://img.shields.io/badge/Status-Beta-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特性

- **📝 智能扩写** - AI 自动扩写输入主题，丰富内容细节
- **🎬 自动分镜** - AI 智能分析文本，生成专业分镜头
- **🖼️ AI 画图** - 每个分镜自动生成匹配的图片背景
- **🎥 视频合成** - FFmpeg 高质量合成 MP4 视频
- **✏️ 分镜编辑** - 可视化编辑每个分镜的场景和文字
- **📱 响应式设计** - 适配桌面端和移动端

## 🚀 快速开始

### 环境要求

- Node.js 18+
- FFmpeg
- OpenCode API Key（用于文本扩写和翻译）

### 安装

```bash
# 克隆项目
git clone https://github.com/anjohnlv/aev.git
cd aev

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 API Key
```

### 启动

```bash
npm run dev
```

访问 http://localhost:3000

## 🔧 配置

在 `.env.local` 中配置：

```env
# OpenCode API（用于扩写和翻译）
OPENCODE_API_KEY=your_api_key_here

# 视频提供商（slideshow 为本地模式）
VIDEO_PROVIDER=slideshow

# 每个分镜时长（秒）
SLIDESHOW_SEC_PER_SLIDE=4
```

## 📖 使用流程

1. **输入主题** - 输入你想生成视频的主题
2. **选择模式** - 选择"扩写并分镜"或"直接分镜"
3. **编辑分镜** - 查看和调整 AI 生成的分镜
4. **生成视频** - 点击生成，等待视频完成
5. **下载分享** - 预览并下载生成的视频

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **AI 服务**: OpenCode API, AI Horde
- **图片处理**: Sharp
- **视频合成**: FFmpeg
- **部署**: Vercel / GitHub Codespaces

## 📄 License

MIT License - 详见 [LICENSE](LICENSE)
