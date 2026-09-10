# SVG 美术规格与清单

状态：28 个独立 SVG 静态资源和 6 个游戏音频。SVG 均在本轮直接绘制，未使用外部图片、字体文件或生成式位图；游戏中的姿态切换、破壳与界面效果已在浏览器验证。

## 视觉方向

奶油黄母鸡搭配淡紫色场地；圆润身体、深紫灰描边、暖橙色翅膀、珊瑚红鸡冠。画面重点是母鸡、蛋与小鸡，背景只保留少量低对比色块和草芽。

| 用途 | 色值 |
| --- | --- |
| 描边与主文字 | `#493954` |
| 身体与主按钮 | `#FFD369` |
| 翅膀 | `#FFBE55` |
| 鸟喙 | `#F29450` |
| 鸡冠与爱心 | `#EF796F` |
| 蛋与浅色面板 | `#FFF9EC` |
| 场地 | `#C5BCEC` |
| 地面色块 | `#B8ACE5` |

## 接入约定

- 所有角色初始朝右；朝左时围绕逻辑接地锚点水平翻转。
- 坐标原点在 SVG 左上角，锚点以源文件像素表示。切换姿态不得自动裁剪透明边缘后重新居中，否则会产生抖动。
- 母鸡锚点 `(128, 228)`，小鸡锚点 `(64, 112)`，蛋锚点 `(48, 104)`。上、下蛋壳仍保留完整蛋的画布和锚点，初始重合后再做破壳位移。
- 母鸡 happy 帧的双脚抬起属于跳跃姿态，仍沿用相同逻辑锚点；不能把每帧最下方可见像素重新吸附到地面。
- 地面阴影与角色分离，阴影中心锚点 `(64, 16)`；将其中心对齐角色接地位置。跳跃时缩小阴影，不随角色一同抬高。
- 特效以中心 `(48, 48)` 为锚点，图标以 `(32, 32)` 为中心，背景以 `(0, 0)` 为原点。
- 母鸡路径主描边 7 px，小鸡 4.5 px，蛋 5 px，图标 4 px；随素材整体等比缩放。
- 所有游戏资源都不包含文字；按钮名称和分数由 DOM 负责。预览稿的中文使用本机字体，仅用于视觉讨论。
- 使用稳定资源键，例如 `hen.idle`、`egg.crack-1`；发布时可改变文件名，但保持键与尺寸/锚点契约。
- 首版按适配后的显示尺寸与受限 DPR 缓存纹理；不要为每次变换、每个实体生成新纹理。不得在每帧重新解析 SVG。
- PNG 预览图仅供审阅，不能代替透明角色资源，也不应随首屏游戏包发布。

## 建议动画

| 动作 | 姿态与变换建议 | 时间初值 |
| --- | --- | --- |
| 母鸡待机 | idle，小幅呼吸；偶尔切 blink | 约 2 秒一轮，眨眼约 120 ms |
| 母鸡散步 | walk-a / idle / walk-b / idle | 约 500 ms 一轮 |
| 下蛋 | lay 后回 idle，温和的压缩回弹 | 约 200 ms；连点可重启视觉反馈，计数以规则事件为准 |
| 开心 | happy，小幅上提；缩小地面阴影 | 约 400 ms，低频里程碑时使用 |
| 蛋孵化 | whole → crack-1 → crack-2 → 分开的上下壳 | 共约 2 秒，最后约 300 ms 破壳 |
| 小鸡出现 | hatch → idle → walk-a / walk-b | 出生反馈约 250 ms |
| 反馈 | star / puff 的缩放、轻位移、淡出 | 约 250–450 ms |

以上时间是实现起点；由统一游戏时钟决定蛋何时孵化，动画只显示该状态。当前只有姿态首稿，不表示已经通过走路循环或破壳连续播放验收。

## 资源清单

大小均为未压缩源文件大小，不包含设计预览与文档。

| 资源键 | 文件 | 画布 | 字节 |
| --- | --- | --- | ---: |
| `chick.hatch` | [characters/chick-hatch.svg](characters/chick-hatch.svg) | 128 × 128 | 786 |
| `chick.idle` | [characters/chick-idle.svg](characters/chick-idle.svg) | 128 × 128 | 816 |
| `chick.walk-a` | [characters/chick-walk-a.svg](characters/chick-walk-a.svg) | 128 × 128 | 817 |
| `chick.walk-b` | [characters/chick-walk-b.svg](characters/chick-walk-b.svg) | 128 × 128 | 817 |
| `hen.blink` | [characters/hen-blink.svg](characters/hen-blink.svg) | 256 × 256 | 1220 |
| `hen.happy` | [characters/hen-happy.svg](characters/hen-happy.svg) | 256 × 256 | 1241 |
| `hen.idle` | [characters/hen-idle.svg](characters/hen-idle.svg) | 256 × 256 | 1244 |
| `hen.lay` | [characters/hen-lay.svg](characters/hen-lay.svg) | 256 × 256 | 1266 |
| `hen.walk-a` | [characters/hen-walk-a.svg](characters/hen-walk-a.svg) | 256 × 256 | 1245 |
| `hen.walk-b` | [characters/hen-walk-b.svg](characters/hen-walk-b.svg) | 256 × 256 | 1245 |
| `egg.crack-1` | [eggs/egg-crack-1.svg](eggs/egg-crack-1.svg) | 96 × 120 | 488 |
| `egg.crack-2` | [eggs/egg-crack-2.svg](eggs/egg-crack-2.svg) | 96 × 120 | 537 |
| `egg.whole` | [eggs/egg-whole.svg](eggs/egg-whole.svg) | 96 × 120 | 366 |
| `egg.shell-bottom` | [eggs/shell-bottom.svg](eggs/shell-bottom.svg) | 96 × 120 | 306 |
| `egg.shell-top` | [eggs/shell-top.svg](eggs/shell-top.svg) | 96 × 120 | 296 |
| `environment.lilac-field` | [environment/lilac-field.svg](environment/lilac-field.svg) | 1600 × 1000 | 1471 |
| `environment.shadow` | [environment/shadow.svg](environment/shadow.svg) | 128 × 32 | 202 |
| `fx.heart` | [fx/heart.svg](fx/heart.svg) | 96 × 96 | 290 |
| `fx.puff` | [fx/puff.svg](fx/puff.svg) | 96 × 96 | 259 |
| `fx.star` | [fx/star.svg](fx/star.svg) | 96 × 96 | 286 |
| `ui.home` | [ui/home.svg](ui/home.svg) | 64 × 64 | 322 |
| `ui.fullscreen` | [ui/fullscreen.svg](ui/fullscreen.svg) | 64 × 64 | 293 |
| `ui.fullscreen-exit` | [ui/fullscreen-exit.svg](ui/fullscreen-exit.svg) | 64 × 64 | 293 |
| `ui.pause` | [ui/pause.svg](ui/pause.svg) | 64 × 64 | 343 |
| `ui.play` | [ui/play.svg](ui/play.svg) | 64 × 64 | 273 |
| `ui.replay` | [ui/replay.svg](ui/replay.svg) | 64 × 64 | 306 |
| `ui.sound-off` | [ui/sound-off.svg](ui/sound-off.svg) | 64 × 64 | 341 |
| `ui.sound-on` | [ui/sound-on.svg](ui/sound-on.svg) | 64 × 64 | 352 |

共 **28 个 SVG，17,720 字节（17.7 KB；未压缩）**。合成稿内嵌了重复图形，因此其体积不应算作游戏必需资源。

## 设计预览

- [美术总览 SVG](../design/previews/asset-board.svg) / [PNG](../design/previews/asset-board.png)
- [桌面 SVG](../design/previews/desktop.svg) / [PNG](../design/previews/desktop.png)
- [手机 SVG](../design/previews/mobile.svg) / [PNG](../design/previews/mobile.png)

## 后续仍需准备

音频在 [audio/THIRD_PARTY_NOTICES.md](audio/THIRD_PARTY_NOTICES.md) 中列出出处与授权。当前资源足够支撑第一版可玩闭环；皮肤、复杂连续动作和更多场景应在玩法确认后扩展。
