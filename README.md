# 品信多租户前端

当前运行和维护的是 **用户端**；旧管理端和视频制作平台分别存档。

| 目录 | 用途 |
| --- | --- |
| [apps/client](apps/client/README.md) | 完整 Vue 用户端：源码、配置、媒体、测试、公司规范 |
| [backups/admin](backups/admin/README.md) | 旧 React 管理端、重复旧用户端、隐藏页面及历史云端部署备份 |
| [backups/video-platform](backups/video-platform/README.md) | 旧视频制作平台、集成片段、历史上传与生成素材备份 |
| backups/admin/design-exports | 历史SVG、PNG、光球独立代码等设计交付备份 |
| [deliverables](deliverables/README.md) | 可独立运行的用户端前端交付包 |

## 启动

在本目录执行：

```powershell
npm install
npm run dev
```

打开 `http://localhost:5173/`。根目录命令仅启动用户端，备份不参与编译、资源服务或页面入口。

```powershell
npm run check   # 模块、隐藏入口、依赖和媒体引用检查
npm test        # 现有交互、键盘、场景保存等测试
npm run build   # 构建用户端，产物位于 apps/client/dist
```

## 本次整理

- 用户端从原混合源码中按真实入口及其依赖整理，保留所有现有可见功能。
- 隐藏的视频、直播、旧独立交互页、独立设备Logo页、旧设备日志页和独立充值页移入备份。
- 去掉当前工程的 React / Next 适配层、旧管理端状态与演示数据，以及未使用的依赖。
- 原 `public` 中历史视频任务、生成素材、卡片与音乐素材移入视频备份。用户端保留人物待机/说话视频、背景、Logo、必要缩略图及旧配置兼容头像。
- 网址、浏览器保存键与IndexedDB库名保持原值，原有场景配置可继续读取。

备份位置索引和原始文件校验值见 [migration-manifest.json](backups/migration-manifest.json)。整理前的199份源码、配置、测试文件另有经过校验的ZIP快照，便于以后恢复历史代码。
