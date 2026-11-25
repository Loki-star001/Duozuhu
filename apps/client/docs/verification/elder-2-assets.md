# 老人2素材记录

更新：2026-11-07；仅作用于DEV-02，老人1维持原人物和独立场景。

## 当前视频

`public/scene-presets/elder-2/person-current.webm`：用户的`待机.mov`和`待机1.mov`依次拼接。两段原片均为1080×1920、25fps、4秒、ProRes且含原生Alpha；输出为8秒、200帧、VP9 Alpha透明WebM。直接保留原生透明通道，没有再用颜色键删除头发、眼睛。封面为`person-current-poster.png`。

已删除老人2项目目录中旧的person.mp4、person-transparent.webm及其过期封面；未删除接收目录中的用户附件，未改动老人1视频。

## 当前组合图

`public/scene-presets/elder-2/combined-overlay.png`：897×1752、RGBA，外部及组间空隙透明。上组为“你好”与小信回复，下组为回答状态条与两张功能卡片。透明行间距约699px，上组内容约475px高，约为1.47倍，符合约一张半图高度的要求。仅图片，无互动事件。老人2媒体图层使用contain完整展示，并关闭组件投影。

组合图使用内置image_gen编辑模式制作；两个原始PNG作为输入，保留原文案与配色。最终提示词：

> Make ONE layout-only change to this transparent image: insert an extra approximately 450-pixel-high completely transparent horizontal strip in the middle empty gap, so the lower blue status/cards group moves DOWN by450px while the upper green/white chat group remains fixed. Extend the bottom of the canvas by450px as well so nothing is cropped. The resulting image should be about1024 pixels wide by2000 pixels tall. Keep both UI groups at their CURRENT SIZE, preserve all Chinese text exactly, do not redraw them or change their colors. The new empty middle gap should be approximately1.5 times the entire height of the upper green+white chat group. True transparent alpha outside the graphics and throughout the big gap. Do not add any background, shadow, extra words, lines or decoration.

图片为约定布局的近似图像输出，实际尺寸与间距以以上实测值为准。

## 验证

- FFprobe：8.000秒、200帧、25fps、alpha_mode=1。
- 实际解码PNG：背景角Alpha为0，头部内部Alpha为255。
- 当前代码的引用检查、37个Vue脚本标识符检查、57项测试及生产构建通过。
