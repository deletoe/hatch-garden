# SVG 美术规格与清单

状态：37 个 SVG 与 6 个音频。2026-10-13 根据官方人物图和授权游戏截图重绘小猪、母鸡、幼鸡、蛋及蛋壳共 23 个 SVG。参考来源见 [REFERENCE_SOURCES.md](REFERENCE_SOURCES.md)，角色权利说明见 [CHARACTER_NOTICES.md](CHARACTER_NOTICES.md)。

## 视觉方向

淡紫色场地保留，角色采用参考图中的平涂造型：母鸡为明黄色圆身体、深色描边、红鸡冠和三瓣小翅膀；小猪使用同色粉描边、白眼睛以及红/蓝服装描边。蛋为奶油色与金黄色轮廓。

| 用途 | 色值 |
| --- | --- |
| 界面描边与主文字 | `#493954` |
| 母鸡身体 / 轮廓 | `#FFFF11` / `#292600` |
| 主按钮 | `#FFD369` |
| 蛋填充 / 轮廓 | `#FFFFCD` / `#DCC642` |
| 佩奇肤色 / 服装 | `#F4C0D8` / `#F16465` |
| 乔治肤色 / 服装 | `#FEB8E2` / `#6497DA` |
| 鸡冠 | `#ED1635` |
| 蛋与浅色面板 | `#FFF9EC` |
| 场地 | `#C5BCEC` |
| 地面色块 | `#B8ACE5` |

## 接入约定

- 所有角色初始朝右；朝左时围绕逻辑接地锚点水平翻转。
- 坐标原点在 SVG 左上角，锚点以源文件像素表示。切换姿态不得自动裁剪透明边缘后重新居中，否则会产生抖动。
- 母鸡锚点 `(128, 228)`，小鸡锚点 `(64, 112)`，蛋锚点 `(48, 104)`。上、下蛋壳仍保留完整蛋的画布和锚点，初始重合后再做破壳位移。
- 佩奇和乔治画布均为 256 × 256，脚部锚点 `(128, 228)`，姿态 `idle / walk-a / walk-b / jump`。两人按参考图重绘后保留各自头身比，以整体缩放调整场内大小：佩奇 0.90、乔治 0.63，乔治头宽约为佩奇的 93%。佩奇整颗头向身体中心后移 12 个源像素，乔治不带助听器。母鸡缩放为 0.63。泥坑为 360 × 180，中心锚点 `(180, 90)`，按逻辑椭圆半径显示。
- 母鸡 happy 帧的双脚抬起属于跳跃姿态，仍沿用相同逻辑锚点；不能把每帧最下方可见像素重新吸附到地面。
- 地面阴影与角色分离，阴影中心锚点 `(64, 16)`；将其中心对齐角色接地位置。跳跃时缩小阴影，不随角色一同抬高。
- 特效以中心 `(48, 48)` 为锚点，图标以 `(32, 32)` 为中心，背景以 `(0, 0)` 为原点。
- 母鸡主描边 7.5 px，幼鸡为其 0.5 倍，蛋 4.5 px；小猪的粉色头部与服装描边按参考图比例设置，随整体等比缩放。
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
| `chick.hatch` | [characters/chick-hatch.svg](characters/chick-hatch.svg) | 128 × 128 | 931 |
| `chick.idle` | [characters/chick-idle.svg](characters/chick-idle.svg) | 128 × 128 | 912 |
| `chick.walk-a` | [characters/chick-walk-a.svg](characters/chick-walk-a.svg) | 128 × 128 | 914 |
| `chick.walk-b` | [characters/chick-walk-b.svg](characters/chick-walk-b.svg) | 128 × 128 | 911 |
| `hen.blink` | [characters/hen-blink.svg](characters/hen-blink.svg) | 256 × 256 | 861 |
| `hen.happy` | [characters/hen-happy.svg](characters/hen-happy.svg) | 256 × 256 | 892 |
| `hen.idle` | [characters/hen-idle.svg](characters/hen-idle.svg) | 256 × 256 | 873 |
| `hen.lay` | [characters/hen-lay.svg](characters/hen-lay.svg) | 256 × 256 | 913 |
| `hen.walk-a` | [characters/hen-walk-a.svg](characters/hen-walk-a.svg) | 256 × 256 | 875 |
| `hen.walk-b` | [characters/hen-walk-b.svg](characters/hen-walk-b.svg) | 256 × 256 | 872 |
| `egg.crack-1` | [eggs/egg-crack-1.svg](eggs/egg-crack-1.svg) | 96 × 120 | 428 |
| `egg.crack-2` | [eggs/egg-crack-2.svg](eggs/egg-crack-2.svg) | 96 × 120 | 574 |
| `egg.whole` | [eggs/egg-whole.svg](eggs/egg-whole.svg) | 96 × 120 | 280 |
| `egg.shell-bottom` | [eggs/shell-bottom.svg](eggs/shell-bottom.svg) | 96 × 120 | 305 |
| `egg.shell-top` | [eggs/shell-top.svg](eggs/shell-top.svg) | 96 × 120 | 292 |
| `environment.lilac-field` | [environment/lilac-field.svg](environment/lilac-field.svg) | 1600 × 1000 | 1471 |
| `environment.shadow` | [environment/shadow.svg](environment/shadow.svg) | 128 × 32 | 202 |
| `fx.heart` | [fx/heart.svg](fx/heart.svg) | 96 × 96 | 290 |
| `fx.puff` | [fx/puff.svg](fx/puff.svg) | 96 × 96 | 259 |
| `fx.star` | [fx/star.svg](fx/star.svg) | 96 × 96 | 286 |
| `ui.home` | [ui/home.svg](ui/home.svg) | 64 × 64 | 322 |
| `ui.fullscreen` | [ui/fullscreen.svg](ui/fullscreen.svg) | 64 × 64 | 293 |
| `ui.fullscreen-exit` | [ui/fullscreen-exit.svg](ui/fullscreen-exit.svg) | 64 × 64 | 292 |
| `ui.pause` | [ui/pause.svg](ui/pause.svg) | 64 × 64 | 343 |
| `ui.play` | [ui/play.svg](ui/play.svg) | 64 × 64 | 273 |
| `ui.replay` | [ui/replay.svg](ui/replay.svg) | 64 × 64 | 306 |
| `ui.sound-off` | [ui/sound-off.svg](ui/sound-off.svg) | 64 × 64 | 341 |
| `ui.sound-on` | [ui/sound-on.svg](ui/sound-on.svg) | 64 × 64 | 352 |

当前共 **37 个 SVG、33,909 字节（未压缩）**，逐文件 gzip 合计 17,229 字节。两张表按现有资源分组；设计合成稿和 PNG 预览不算作游戏必需资源。

| 资源键 | 文件 | 画布 | 字节 |
| --- | --- | --- | ---: |
| `peppa.idle` | [characters/peppa-idle.svg](characters/peppa-idle.svg) | 256 × 256 | 2169 |
| `peppa.walk-a` | [characters/peppa-walk-a.svg](characters/peppa-walk-a.svg) | 256 × 256 | 2171 |
| `peppa.walk-b` | [characters/peppa-walk-b.svg](characters/peppa-walk-b.svg) | 256 × 256 | 2169 |
| `peppa.jump` | [characters/peppa-jump.svg](characters/peppa-jump.svg) | 256 × 256 | 2307 |
| `george.idle` | [characters/george-idle.svg](characters/george-idle.svg) | 256 × 256 | 2049 |
| `george.walk-a` | [characters/george-walk-a.svg](characters/george-walk-a.svg) | 256 × 256 | 2051 |
| `george.walk-b` | [characters/george-walk-b.svg](characters/george-walk-b.svg) | 256 × 256 | 2049 |
| `george.jump` | [characters/george-jump.svg](characters/george-jump.svg) | 256 × 256 | 2194 |
| `mud` | [environment/mud-puddle.svg](environment/mud-puddle.svg) | 360 × 180 | 887 |

## 设计预览

- [本轮参考重绘 SVG](../design/previews/reference-redraw.svg) / [PNG](../design/previews/reference-redraw.png)
- [美术总览 SVG](../design/previews/asset-board.svg) / [PNG](../design/previews/asset-board.png)
- [桌面 SVG](../design/previews/desktop.svg) / [PNG](../design/previews/desktop.png)
- [手机 SVG](../design/previews/mobile.svg) / [PNG](../design/previews/mobile.png)

## 后续仍需准备

音频在 [audio/THIRD_PARTY_NOTICES.md](audio/THIRD_PARTY_NOTICES.md) 中列出出处与授权。当前资源足够支撑第一版可玩闭环；皮肤、复杂连续动作和更多场景应在玩法确认后扩展。
