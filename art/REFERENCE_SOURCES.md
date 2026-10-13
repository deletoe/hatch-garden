# 2026-10-13 参考重绘

本轮根据实际人物图和游戏画面手工重绘 SVG。参考图片通过浏览器放大检查；发布包只包含路径、圆、椭圆及纯色填充，没有嵌入参考位图或外部图片。

## 参考来源

| 参考 | 链接 | 绘制依据 |
| --- | --- | --- |
| Peppa Pig 官方人物页 | [Characters](https://www.peppapig.com/en-us/characters) | 佩奇、乔治的头部轮廓、斜向吻部、眼睛、耳朵、腮红与服装颜色 |
| 官方佩奇人物图 | [peppa_pig.webp](https://assets-us-01.kc-usercontent.com/500e0a65-283d-00ef-33b2-7f1f20488fe2/442b7436-d438-4d8f-8b40-03e07f0db72d/peppa_pig.webp) | 测量头部关键点，采样主要纯色色块；站立、走路与跳跃共用轮廓 |
| 官方乔治人物图 | [georgepig.webp](https://assets-us-01.kc-usercontent.com/500e0a65-283d-00ef-33b2-7f1f20488fe2/6b0f945a-5907-43c2-a447-7e5ad83ce037/georgepig.webp) | 保留婴儿式大头与椭圆身体；按用户要求省略助听器 |
| P2 Games 授权游戏指南 | [Happy Mrs Chicken Quick Start Guide](https://www.p2games.co.uk/supportfiles/Happy%20Mrs%20Chicken%20QSG%20Downloadable%20231213.pdf) | 第 1–3 页的图标和游戏截图，核对母鸡与幼鸡的简洁轮廓 |
| P2 Games 游戏截图 | [10105sshotsL.jpg](https://www.p2games.co.uk/sshots/10105sshotsL.jpg) | 黄色圆身体、红鸡冠、单点眼睛、三瓣小翅膀、黑色细腿及奶油色蛋 |
| P2 Games 支持页图片 | [peppapig2.jpg](https://www.p2games.co.uk/in-app-help/images/hmc/peppapig2.jpg) | 对照 Happy Mrs Chicken 标志中的轮廓与展开鸟喙 |
| 游戏截图补充对照 | [Common Sense Media](https://www.commonsensemedia.org/app-reviews/peppa-pig-happy-mrs-chicken) | 核对实际下蛋画面的蛋、裂纹与母鸡形象 |

鸡的细节以授权游戏的清晰画面为主要依据。动作帧是在参考轮廓上的手工扩展，不复制整张游戏截图。

## 文件与接入

- 佩奇、乔治各 4 个姿态；母鸡 6 个；幼鸡 4 个；蛋与蛋壳 5 个，共重绘 23 个 SVG。
- 保留现有画布与锚点，佩奇缩放 0.90、乔治 0.63。调整为整人统一缩放，保持各自头身比；乔治头宽约为佩奇的 93%。佩奇头部整体后移 12 个源像素，幼鸡与母鸡的大小关系延续原有设置。
- 小猪沿用同色粉描边和红/蓝服装描边；鸡使用深色线条与明黄色填充，蛋为奶油色与金黄色轮廓。
- 没有纹理滤镜、渐变、外部字体或动态 SVG DOM；Phaser 仍在加载时生成有限纹理并复用。
- 重绘资源 URL 使用 `v=reference-3`，避免浏览器继续使用旧图。
- 重建命令：`node scripts/generate-pig-assets.mjs`、`node scripts/generate-chicken-assets.mjs`、`node scripts/generate-art-preview.mjs`。
- [素材预览 SVG](../design/previews/reference-redraw.svg) / [PNG](../design/previews/reference-redraw.png)。预览按游戏中的相对大小和脚部锚点展示。

## 验证

37 个 SVG 均可按 XML 解析，无嵌入图片。23 个重绘资源与现有游戏尺寸/锚点一致；整套 SVG 共 33,909 字节，逐文件 gzip 合计 17,229 字节。预览图不进入游戏首屏下载。

`npm test`：33 项规则测试通过；`npm run build`：类型检查与构建通过。Chrome 开发与生产预览检查走路、下蛋、孵化、共同跳泥坑、暂停、重开及桌面/竖屏适配，查看对应截图。小猪头部 SVG 几何边界按场内缩放后：佩奇约 102.6 × 103.3 px，乔治约 95.4 × 82.4 px（720 px 短边视口，未包含描边）。

第三方角色及名称的权利说明见 [CHARACTER_NOTICES.md](CHARACTER_NOTICES.md)。
