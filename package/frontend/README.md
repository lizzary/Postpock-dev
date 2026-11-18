# PostPock 前端

React 19 + Vite 8（纯 JavaScript）。

```bash
npm install
npm run dev      # http://localhost:5190
npm run build    # 产物在 dist/，放到 .exe 同级的 frontend/ 目录即可被后端代理
```

## 分层（UI 与数据分离）

| 目录 | 职责 |
| --- | --- |
| `src/ui/` | 只做界面与交互：页面（home / author / post）、浮层（search / export / sync / settings / editors）、组件、图标、星月夜画作 |
| `src/bridge/` | 中间层：React hooks（Suspense 页面数据、带主题失效的缓存、实时任务/连接/设置 store、乐观的页面设置） |
| `src/data/api/` | 数据层对外 API，UI 只经由 bridge 调用这里 |
| `src/data/domain/` | 业务规则：导出文件名模板校验与展开、目录树规划、搜索（各搜索域取并集） |
| `src/data/mock/` | 本轮的模拟后端（硬编码、可确定生成的数据、任务模拟器）；接入 Go 服务时替换 `data/api` 里的 `backend` 为 HTTP/SSE 客户端即可 |

## 其他约定

- 路由为 hash（`#/`、`#/author/:id`、`#/post/:id`），任何目录下都可直接托管。
- 字体只使用 `public/fonts/` 中的三款 TTF；图标全部来自 `src/ui/icons/Icon.jsx`，禁止 emoji。
- 首页星月夜：`src/ui/art/starry/`（厚涂引擎移植自 The Pelican Test 第 12 幕，MIT）。在 Web Worker 中绘制并缓存到 IndexedDB，之后访问直接解码。
- 文案在 `src/i18n/`（简体中文 / English）。
- 模拟数据层用浏览器存储保存设置、各作者的页面设置与上次导出配置（对应后端的 config.toml / sqlite）；新增的作者与文章只保存在内存中，刷新后回到样例库。
- 设置里把数据库路径改为其他目录会切换到一个空库，可用来查看空状态；改回默认路径即恢复样例库。
- 同步清单目前一次渲染全部条目（按作者分组并使用 `content-visibility`），数百到一两千条没有问题；若单次检查达到上万条，建议给列表加虚拟滚动。
