# BiliBili Downloader

[![Bilibili Downloader](https://img.shields.io/badge/BiliBili_Downloader-v1.0.6-00A1D6?logo=bilibili&logoColor=white)](https://github.com/Yan-huimin/BiliBili-Downloader)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white)](https://www.electronjs.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)

---

一个基于 Electron + React + TypeScript 的 Bilibili 视频下载桌面应用。

将 B站视频分享链接粘贴到软件中，选择保存路径，点击下载即可。支持多种清晰度选择、多线程下载、B 站账号登录等功能。

![app](./public/app.png)

---

## 功能

### 已实现

- 下载 B 站免费视频（支持 BV 号格式）
- 多线程下载，支持视频/音频分离后自动合并（ffmpeg）
- 下载进度条实时显示
- 用户自定义文件保存路径（文件夹选择器）
- **明/暗双主题** — 点击右下角功能菜单切换
- **B 站账号登录** — 扫码登录，自动保持登录状态约 30 天
- **多种清晰度** — 支持 360p / 480p / 720p / 720p 高帧率 / 1080p / 1080p 高码率 / 1080p 60帧 / 4K（大会员专属清晰度需要登录对应账号）
- **默认配置** — 可保存默认清晰度、默认下载路径
- **系统通知** — 下载完成后弹出系统通知，2 秒后自动消失
- **彩带特效** — 下载成功后播放彩带动画
- **设置项开关** — 系统通知、彩带特效均可独立开关
- **自定义窗口标题栏** — 支持关闭、最小化、最大化按钮

### 待实现

- 支持其他视频格式（目前仅支持 BV 号视频）
- 合集视频一键下载
- 软件内查看下载视频信息
- 下载速率显示
- 下载耗时显示
- 历史下载记录
- 自定义视频文件名
- 软件自动更新

> 当前不考虑 UI 重构，如果你擅长前端，欢迎 PR。

---

## 截图

### 亮色主题

![亮色主题](./public/day.png)

### 暗色主题

![暗色主题](./public/app.png)

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端框架 | React 19 |
| 构建工具 | Vite |
| 桌面框架 | Electron 36 |
| 样式 | Tailwind CSS 4 |
| 语言 | TypeScript |
| 动画 | Framer Motion |
| 二维码 | react-qr-code |
| 视频合并 | ffmpeg (ffmpeg-static) |
| HTTP 请求 | axios + axios-cookiejar-support |

---

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式（React + Electron 并行）
npm run dev

# 仅启动 React 开发服务器
npm run dev:react

# 仅编译 Electron
npm run dev:electron

# 构建
npm run build
```

## 打包

```bash
# macOS (ARM64)
npm run dist:mac

# Windows (x64)
npm run dist:win

# Linux (x64)
npm run dist:linux
```

## 测试

```bash
npm run test:e2e
```

## 环境要求

- Node.js >= 18
- npm >= 9

## 许可

&copy; 2025 yhm
