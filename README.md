# ChatGPT Folders

ChatGPT Folders 是一个 Chrome/Edge Manifest V3 浏览器扩展，用来在 ChatGPT 网页端为对话添加本地文件夹管理能力。

扩展会在 `chatgpt.com` / `chat.openai.com` 的左侧栏中注入一个 Folders 区域。你可以创建文件夹，把当前对话或可见历史对话加入文件夹，并从文件夹列表快速打开已归类的 ChatGPT 对话。

## 功能

- 创建、重命名、删除文件夹
- 将当前 ChatGPT 对话加入指定文件夹
- 批量选择当前侧栏可见的历史对话加入文件夹
- 在文件夹内重命名对话显示名
- 将单个对话移出文件夹
- 点击文件夹内对话后打开原 ChatGPT 会话链接
- 使用 `chrome.storage.sync` 保存数据，支持浏览器账号同步
- 不读取聊天正文，不调用 ChatGPT 私有 API，不上传任何数据

## 数据说明

扩展只保存用于分类展示的元数据：

- 文件夹名称
- 对话 ID
- 对话标题
- 对话 URL
- 创建、更新时间

扩展不会保存你的聊天消息内容。

## 安装使用

### 1. 构建扩展

先安装依赖：

```powershell
npm.cmd install
```

然后构建：

```powershell
npm.cmd run build
```

构建完成后会生成 `dist/` 目录。

### 2. 在 Chrome / Edge 加载

1. 打开浏览器扩展管理页面：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目生成的 `dist/` 文件夹。
5. 打开或刷新 `https://chatgpt.com/`。

左侧栏中应出现 `Folders` 区域。

## 基本操作

- 点击 `Folders` 标题右侧的省略号，可以搜索、新建文件夹、批量加入历史对话。
- 点击某个文件夹右侧的省略号，可以把当前对话加入该文件夹、批量加入、重命名或删除文件夹。
- 点击文件夹内某个对话右侧的省略号，可以重命名对话或将它移出列表。
- 删除文件夹时，对话记录不会从 ChatGPT 删除，只会从该文件夹中移出。

## 开发

常用命令：

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

项目结构：

```text
public/manifest.json   Chrome/Edge 扩展清单
src/content.ts         ChatGPT 页面注入 UI
src/storage.ts         chrome.storage.sync 状态读写
src/actions.ts         对外动作封装
src/chatgpt.ts         ChatGPT URL 和标题识别
src/types.ts           数据类型定义
tests/                 单元测试
```

## 当前限制

- 第一版只支持 Chrome / Edge。
- 只在 ChatGPT 网页端注入侧栏 UI，没有浏览器工具栏弹窗。
- 批量加入只扫描当前页面左侧栏中已经可见的历史对话，不会批量读取完整历史。
- ChatGPT 网页 DOM 可能变化，如果侧栏结构大改，注入位置和按钮行为可能需要适配。

## 隐私

所有数据都保存在浏览器的 `chrome.storage.sync` 中。扩展没有后端服务，也不会把文件夹或对话元数据上传到第三方服务器。
