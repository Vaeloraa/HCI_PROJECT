# FocusFlow

[English README](./README.md)

FocusFlow 是一款自适应注意力管理阅读助手。它通过眼动追踪（或鼠标位置）感知阅读行为，推断专注、分心、阅读困难等认知状态，并触发高亮、提示、摘要等轻量干预。

应用以浏览器静态网页形式运行，可选本地开发服务器以启用 LLM 相关功能。

## 环境要求

- **Node.js** 18 及以上（用于开发服务器；Node 18+ 内置 `fetch`）
- 现代浏览器：**Chrome**、**Edge** 或 **Firefox**
- **摄像头**（可选）— 仅眼动追踪（WebGazer）需要；无摄像头时可使用鼠标追踪

> **重要：** 请勿直接用 `file://` 打开 `index.html`。摄像头权限与 Service Worker 需要通过本地 HTTP 服务访问（`http://localhost:8080` 或 `http://127.0.0.1:8080`）。

## 快速开始

### 1. 安装依赖

在项目根目录（`HCI_PROJECT/`）执行：

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm start
```

该命令会运行 `server/dev-server.js`，并在以下地址提供应用：

**http://127.0.0.1:8080**

在浏览器中打开上述地址即可。

### 3. 使用应用

1. 阅读默认文章，或点击 **Import File（导入文件）** 加载自己的文本（支持 `.txt`、`.md`、`.pdf`、`.docx`、`.pptx` 等）。
2. 默认启用 **鼠标追踪** — 将光标移到阅读区域即可模拟视线位置。
3. 如需 **眼动追踪**，点击顶栏的摄像头/追踪按钮，并在浏览器弹出授权时允许摄像头访问；若出现校准流程，请按提示完成。
4. 可在顶栏切换语言（**中文 / EN**）、主题和专注模式。
5. 在侧边栏查看认知状态、注意力指标和会话时间线。

## 运行方式

| 命令 | 说明 |
|------|------|
| `npm start` | **推荐。** 启动开发服务器（静态文件 + LLM API 代理） |
| `npm run serve` | 与 `npm start` 相同 |
| `npm run start:static` | 仅静态文件服务（无 LLM 代理），通过 `http-server` 在 8080 端口运行 |

## 可选：LLM 功能（摘要、翻译、会话洞察）

AI 功能（段落摘要、全文翻译、会话报告洞察）需要在服务器端配置 API 密钥。

在项目根目录修改 `.env` 文件：

```env
OPENAI_API_KEY=your_api_key_here

# 可选配置：
# PORT=8080
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4o-mini
# FOCUSFLOW_LLM_API_KEY=your_api_key_here
```

修改 `.env` 后需重启开发服务器。

- 未配置 API 密钥时，应用仍可正常运行；LLM 功能会回退到本地启发式逻辑或显示为不可用。
- 检查 LLM 状态：访问 `GET http://127.0.0.1:8080/api/llm/status`

**请勿将 `.env` 提交到 Git 或泄露 API 密钥。**

## 项目结构

```
HCI_PROJECT/
├── index.html          # 应用入口
├── css/                # 样式
├── js/
│   ├── main.js         # 应用主控
│   ├── perception/     # 视线 / 滚动 / 人脸感知
│   ├── cognition/      # 认知状态机
│   ├── decision/       # 干预策略与执行
│   ├── ui/             # 阅读视图、视觉效果、调试面板
│   ├── analytics/      # 会话指标与报告
│   ├── nlp/            # 摘要与翻译
│   └── i18n/           # 中英文界面文案
├── server/
│   └── dev-server.js   # 本地开发服务器 + LLM 代理
├── manifest.json       # PWA 配置
└── sw.js               # Service Worker（离线支持）
```

## 常见问题

### 摄像头 / 眼动追踪无法使用

- 请通过 `http://127.0.0.1:8080` 或 `http://localhost:8080` 访问，不要使用 `file://`。
- 在浏览器中允许摄像头权限（地址栏锁形图标）。
- 关闭可能占用摄像头的其他应用（Zoom、Teams 等）。
- 若眼动追踪失败，应用会自动回退到鼠标追踪。

### LLM / AI 摘要不可用

- 确认 `.env` 中配置了有效的 `OPENAI_API_KEY`。
- 修改 `.env` 后重新执行 `npm start`。
- 访问 `/api/llm/status`，若返回 `"enabled": true` 表示服务器已识别 API 密钥。

### 导入文件出现乱码

- 中文 `.txt` 文件会自动检测 UTF-8、GBK、Big5 等编码。
- 旧版二进制格式 `.doc` / `.ppt` 不支持，请转换为 `.docx` / `.pptx`。

### 端口被占用

在 `.env` 中指定其他端口：

```env
PORT=3000
```

然后访问 `http://127.0.0.1:3000`。
