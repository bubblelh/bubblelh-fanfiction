# Bubble.lh
[Bubble.lh](https://bubblelh.github.io/bubblelh-fanfiction/)

Bubble.lh 是一个单文件前端聊天与写作助手，主要用于日常对话、剧情讨论、长篇创作、设定整理和对话归档。前端可以直接部署到 GitHub Pages，API 请求建议通过 Cloudflare Worker 转发到 DeepSeek，避免把 API Key 暴露在网页源码里。

## 功能

- 普通聊天、剧情讨论、创作续写三种模式：`Chat` / `Discuss` / `Creative`
- 支持 DeepSeek Chat、Reasoner、V4 Flash、V4 Pro 模型选择
- 流式回复、停止生成、保留已生成内容
- 当前对话摘要，可手动生成/更新
- 写作设定管理：角色、世界观、时间线、伏笔、文风与禁忌、叙事规则
- 每个设定模块可单独开关“带入”
- 带入预览：发送前查看本次会带给 AI 的上下文
- 上下文消息数量上限滑块，方便控制 token 消耗
- Cloudflare D1 云同步，支持手机和电脑共享同一份数据
- 当前对话内搜索并跳转
- 收藏消息、收藏对话、标签、归档、删除确认
- 草稿按对话自动保存
- TXT 文件导入到输入框
- 当前对话导出为 Markdown
- 全部数据导出/导入为 JSON 备份
- 移动端适配，可添加到手机桌面

## 模式说明

### Chat

适合普通聊天、问问题、临时测试。

这个模式不会自动带入对话摘要和写作设定，最省 token。

### Discuss

适合讨论剧情、分析人物动机、推大纲、检查逻辑。

这个模式会带入当前对话摘要，以及设定页里开启“带入”的非空模块，但不会附加 Creative 写作规则。

### Creative

适合正式续写、扩写、润色、整理章节。

这个模式会带入摘要、开启的设定模块和 Creative 附加规则，更倾向于直接产出正文。

## 部署方式

### 1. 部署 Cloudflare Worker

在 Cloudflare Workers 中新建一个 Worker，把 `cloudflare-worker.js` 的全部内容复制到 Worker 编辑器里，然后点击 Deploy。

如果需要云同步，先在 Cloudflare 中创建一个 D1 数据库，并把它绑定到 Worker：

- Binding name: `DB`
- Database: 选择你创建的 D1 数据库

数据库表结构见 `schema.sql`。Worker 也会在首次访问 `/sync` 时自动创建表。

在 Worker 的 Settings / Variables 里添加：

- `DEEPSEEK_API_KEY`：DeepSeek API Key，建议作为 Secret 添加
- `ACCESS_TOKEN`：自定义访问令牌，建议作为 Secret 添加
- `ALLOWED_ORIGIN`：允许访问的网页域名，例如 `https://你的用户名.github.io`
- `SYNC_USER`：可选，单用户云同步 ID，默认是 `bubblelh`

如果你使用 Cloudflare Pages 域名，则填写类似：

```txt
https://bubble-lh-station.pages.dev
```

注意：`ALLOWED_ORIGIN` 只写域名来源，不要带路径。

### 2. 配置网页

打开 Bubble.lh 网页，进入设置页：

- `API Endpoint` 填 Cloudflare Worker URL
- `Worker Access Token` 填你在 Worker 里设置的 `ACCESS_TOKEN`
- `API Key` 留空
- 如需云同步，打开 `云同步`

部署到公开网页时，不要把 DeepSeek API Key 填进前端设置里。

### 3. 首次云同步

云同步使用同一个 Worker 地址，并通过 `/sync` 接口读写 D1。

建议第一次这样做：

1. 在已有数据的设备上打开设置页
2. 填好 `API Endpoint` 和 `Worker Access Token`
3. 开启 `云同步`
4. 点击 **上传本机**
5. 在另一台设备上打开网页
6. 填同一个 `API Endpoint` 和 `Worker Access Token`
7. 开启 `云同步`
8. 点击 **拉取云端**

之后开启云同步的设备会在本地数据变化后自动同步到 D1。

## API Key 安全

如果直接把 API Key 填在网页前端，浏览器本地可以使用，但不适合公开部署。因为网页代码和浏览器请求都可能暴露 Key。

推荐方式是：

1. API Key 放在 Cloudflare Worker 的 Secret 里
2. 前端只填写 Worker URL
3. 前端用 `Worker Access Token` 调用自己的 Worker

这样 GitHub Pages 上不会出现你的 DeepSeek API Key。

## 数据保存

Bubble.lh 的数据默认保存在当前浏览器的 `localStorage` 里，包括：

- 对话
- 摘要
- 写作设定
- 收藏
- 标签
- 归档状态
- 草稿
- 设置

清理浏览器缓存、换浏览器或换设备时，数据可能不会自动保留。建议定期使用设置页底部的 **导出全部数据** 备份 JSON。

恢复数据时使用 **导入数据**。

开启云同步后，对话、设定、收藏、标签、归档状态会同步到 Cloudflare D1。`API Key` 和 `Worker Access Token` 不会同步到 D1，需要在每台设备上单独填写。

## Markdown 导出

右上角 `...` 菜单中可以导出当前对话为 Markdown。

Markdown 适合阅读、整理正文、存档到本地笔记软件。JSON 备份适合恢复应用数据，两者用途不同。

## 省 token 建议

- 普通聊天用 `Chat`
- 剧情讨论用 `Discuss`
- 正式写作用 `Creative`
- 不需要的设定模块关闭“带入”
- 把长期内容压缩进对话摘要
- 上下文消息数量不要长期设为“不限制”
- 发送前用“带入预览”检查本次上下文

推荐日常设置：

- Discuss：摘要 + 必要设定，历史消息 `10-20`
- Creative：摘要 + 必要设定，历史消息 `20-50`
- Chat：不带设定，最省

## 手机端使用

网页已包含图标和 Manifest。手机浏览器打开后，可以添加到主屏幕。

iPhone/Safari 会使用 `apple-touch-icon.png`。

安卓/Chrome 会使用 `manifest.webmanifest` 中的图标。

## 文件说明

```txt
index.html              主应用
cloudflare-worker.js    Cloudflare Worker 转发 API 请求
schema.sql              D1 云同步表结构
manifest.webmanifest    PWA / 添加到桌面配置
icon.svg                浏览器图标
apple-touch-icon.png    iPhone 主屏幕图标
icon-192.png            安卓/Chrome 图标
icon-512.png            安卓/Chrome 图标
```
