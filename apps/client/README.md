# 品信用户端

当前维护的完整 Vue 用户端，网址保持 `http://localhost:5173/`。

## 开发与验证

在仓库根目录执行 `npm install` 后：

```powershell
npm run dev
npm run check
npm test
npm run build
```

也可直接进入本目录执行相同命令。根目录命令只转发到本用户端。

## 目录

- `src/components/views/`：当前可见页面及其复用子组件。
- `src/components/`：布局、充值弹窗、场景编辑器、数字人、问答、光球、软键盘及交互预览。
- `src/store/client.ts`：用户端实际使用的状态与动作，保留原有存储键和机器选择恢复逻辑。
- `src/mock/initialData.ts`：用户端所需的初始演示数据。
- `public/`：用户端媒体、预设背景、Logo及旧用户配置兼容资源；URL路径与整理前一致。
- `tests/`：现有场景、键盘、交互与保存测试；音轨实验驱动仅作为测试辅助文件保留。
- `docs/company-design-system/`：公司规范与完整源映射。
- `scripts/check-client.mjs`：检查隐藏功能引用、未使用生产模块、资源与依赖完整性。
- `scripts/check-vue-identifiers.mjs`：检查Vue组件脚本中的未定义标识符，补足普通tsc不读取Vue脚本的问题。

## 保留的页面

首页；机器管理；Q＆A问答、知识库管理、敏感词；设备配置、人设配置、设备应答、场景配置；用量信息、账单；右上角个人中心、充值弹窗及场景交互预览。

`ClientDeviceControlView.vue` 是设备配置中正在复用的控制面板，不是额外隐藏页面。视频生成、直播、旧版数字人交互、独立设备Logo页、旧设备日志页、独立充值页等未开放入口已移出生产代码。

公司规范只用于配置界面，画布与预览组件继续使用独立终端规范。浏览器原有场景、人物、音色等数据保留原有同源地址、localStorage键及IndexedDB库名，不要求重新配置。
