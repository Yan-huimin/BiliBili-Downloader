# BiliBili Downloader

[![Bilibili Downloader](https://img.shields.io/badge/BiliBili_Downloader-v1.0.7-00A1D6?logo=bilibili&logoColor=white)](https://github.com/Yan-huimin/BiliBili-Downloader)
[![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Electron](https://img.shields.io/badge/Electron-36-47848F?logo=electron&logoColor=white)](https://www.electronjs.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev)

一个基于 Electron、React、TypeScript 和 Tailwind CSS 的 B 站视频下载桌面应用。

应用采用固定 `400 x 500` 的无边框窗口，主界面是带网格背景的毛玻璃风格。你可以粘贴 B 站视频分享链接，选择保存目录，然后下载视频；登录后可使用账号权限内的更高清晰度。支持合集视频批量下载和下载队列管理。

![深色主题主界面](./public/ex.svg)

## 功能

- 支持从分享链接中提取 BV 号并获取视频地址。
- 支持 360p、480p、720p、720p 高帧率、1080p、1080p 高码率、1080p60、4K 等清晰度配置。
- 支持 B 站扫码登录，登录 Cookie 会持久化保存。
- 支持视频和音频分离下载后通过 `ffmpeg-static` 自动合并为 MP4。
- 大文件使用 Range 分片下载，小文件自动走单次下载。
- **合集视频批量下载**：输入合集分享链接后，可一键获取合集内所有视频，自由勾选并批量加入下载队列。
- **下载队列管理**：所有下载任务统一进入队列，支持实时进度、取消、重试、清空等操作。
- 单个视频下载失败自动重试 3 次，超时（5 秒无进度）直接标记失败。
- 支持实时下载进度条，下载按钮滚动显示当前任务名称。
- 支持默认下载目录、默认清晰度、系统通知和彩带特效配置。
- 支持下载完成后的系统通知和可选彩带动画。
- 自定义 Electron 标题栏，保留关闭、最小化和最大化按钮，屏蔽双击全屏。
- 支持深色和浅色主题切换，默认深色主题。
- **系统托盘与后台模式**：支持最小化到系统托盘，后台继续下载；托盘图标实时显示下载进度，支持单实例锁防止重复启动。
- **动漫番剧、电影、综艺下载**：支持识别番剧、电影、综艺等类型链接，可浏览剧集列表并选择具体集数下载。
- **流式下载与停滞重试**：视频和音频轨道流式写入，60 秒无活动自动中止并重试；后台模式下跳过 UI 渲染降低 CPU 占用。

## 截图

### 深色主题

![深色主题](./public/app.png)

### 浅色主题

![浅色主题](./public/day.png)

## 使用方式

### 单个视频下载

1. 打开应用。
2. 将 B 站视频分享链接粘贴到”分享链接”输入框。
3. 输入或选择保存路径。
4. 点击”开始下载”，任务自动加入下载队列。

### 合集视频批量下载

1. 粘贴合集分享链接到输入框。
2. 点击右上角 **fx** 菜单，选择”获取合集”按钮（仅在有输入内容时显示）。
3. 在合集列表中勾选需要下载的视频（默认选中输入链接对应的视频）。
4. 可通过”全选”按钮一键选中全部视频。
5. 点击”下载”，所选视频批量加入下载队列。

### 番剧、电影、综艺下载

1. 粘贴番剧、电影或综艺的分享链接到输入框。
2. 应用会自动识别链接类型，展示剧集/期数列表。
3. 勾选需要下载的剧集（支持全选）。
4. 点击”下载”，所选剧集批量加入下载队列。

### 下载队列管理

1. 点击右上角 **fx** 菜单，选择”下载队列”按钮。
2. 查看所有任务的实时状态：等待中、下载中、合并中、已完成、失败。
3. 可取消正在等待或下载中的任务。
4. 失败任务可点击”重试”重新加入队列。
5. 点击”清空下载队列”清除全部任务。

如果需要下载更高清晰度，请先扫码登录拥有对应权限的 B 站账号。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 桌面端 | Electron 36 |
| 前端 | React 19 |
| 样式 | Tailwind CSS 4 + 局部 CSS |
| 语言 | TypeScript 5.7 |
| 构建 | Vite 6 |
| 动画 | Framer Motion |
| 图标 | react-icons |
| 二维码 | react-qr-code |
| HTTP 与 Cookie | axios、axios-cookiejar-support、tough-cookie |
| 视频合并 | ffmpeg-static |
| 测试 | Playwright |

## 项目结构

```text
src/
  electron/              Electron 主进程、IPC、下载队列与业务逻辑
    downloadQueue.ts     下载队列服务（顺序执行、重试、超时）
    collectionService.ts 合集信息获取服务
    bangumiService.ts    番剧、电影、综艺信息服务
    utils.ts             下载核心（分片、合并、流式写入）、设置、Cookie 管理
    ipcEventHandler.ts   IPC 事件注册与分发
    preload.cts          contextBridge 暴露给渲染进程的 API
    bilibiliAuthService.ts  B 站扫码登录逻辑
    bilibiliClient.ts    axios 客户端（CookieJar）
    cookieStore.ts       Cookie 持久化
    createWindows.ts     窗口创建
    pathResolver.ts      路径解析
    tray.ts              系统托盘（菜单、进度显示、单实例锁）
    main.ts              应用入口
  ui/
    components/          React 展示组件
      VideoListPanel.tsx   番剧/电影/综艺剧集选择面板
      DownloadQueue.tsx    下载队列面板
      DownloadPanel.tsx    主下载面板
      FloatingActions.tsx  fx 浮动菜单
      QueueTaskItem.tsx    队列任务条目
      Settings.tsx         设置面板
      LoginBili.tsx        扫码登录面板
      Header.tsx           标题栏
      AlertToast.tsx       通知提示
    hooks/               下载、合集、队列、设置、登录等自定义 hooks
      useDownloadManager.ts  下载管理 hook
      useBangumi.ts          番剧业务 hook
      useCollection.ts       合集业务 hook
      useDownloadQueue.ts    下载队列 hook
      useSettingsPanel.ts    设置 hook
      useBiliQrLogin.ts      扫码登录 hook
      useBackgroundMode.ts   后台模式 hook
      useTransientAlert.ts   通知 hook
      useClickOutside.ts     点击外部关闭 hook
      useProductionGuards.ts 生产环境保护 hook
    constants/           清晰度等静态配置
    utils/               分享链接校验等工具
    stores/              全局状态（应用运行时等）
    css/                 毛玻璃界面与弹窗样式
      Panels.css          面板样式
public/                  README 截图与公共静态资源
e2e/                     Playwright 端到端测试
types.d.ts              全局类型定义
```

## 开发

```bash
# 安装依赖
npm install

# 同时启动 React 和 Electron
npm run dev

# 只启动 React 开发服务
npm run dev:react

# 编译并启动 Electron 开发环境
npm run dev:electron

# 类型检查并构建前端产物
npm run build
```

开发模式下 React 服务默认运行在 `http://localhost:5123`。

## 打包

```bash
# macOS ARM64
npm run dist:mac

# Windows x64
npm run dist:win

# Linux x64
npm run dist:linux
```

## 测试

```bash
npm run test:e2e
```

如果本机还没有 Playwright 浏览器，需要先执行：

```bash
npx playwright install
```

## 环境要求

- Node.js 18 或更高版本
- npm 9 或更高版本
- Windows、macOS 或 Linux 桌面环境

## 注意事项

- 支持包含 BV 号的 B 站视频链接，以及番剧、电影、综艺等类型的分享链接。
- 高清、4K 等清晰度取决于登录账号权限。
- 下载失败的视频会自动重试最多 3 次，流式下载 60 秒无进度自动中止并重试。
- 下载内容请遵守 B 站用户协议和相关版权规定，本项目仅用于学习与个人使用。

## 作者

© 2025 yhm  
GitHub: [Yan-huimin](https://github.com/Yan-huimin)
