# HEIC·Tools — 浏览器端图片转换工具站（P0 MVP）

起手词 `heic to jpg`。纯静态、零服务器、文件不出浏览器。
对应方案：`../../docs/方案-图片文件转换工具站.md`、竞品/词族：`../../docs/heic-to-jpg-竞品拆解与词族.md`

## 结构

```
index.html          # HEIC → JPG 主工具页（首屏即工具）
heic-to-png.html    # HEIC → PNG（config 驱动，矩阵示例）
assets/
  styles.css        # 全站样式
  converter.js      # 共享转换引擎（heic2any 解码 + JSZip 批量打包）
sitemap.xml         # 提交 Google + Bing
robots.txt
```

## 核心设计

- **100% 浏览器端**：`heic2any`(libheif WASM) 本地解码，文件从不上传 = 隐私卖点
- **config 驱动矩阵**：每个工具页只改一行 `window.CONVERT_CONFIG`，复用同一引擎
- **批量 + zip**：多文件一键转、打包下载（JSZip）
- **SEO**：每页独立 TDH + canonical + OG + FAQ 结构化数据；内链互通

## 本地预览

任意静态服务器即可（不能用 file:// 打开，CDN 脚本和路径需 http）：

```bash
cd apps/heic-tools
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 加一个矩阵页（如 heic-to-webp）

1. 复制 `heic-to-png.html` → `heic-to-webp.html`
2. 改 TDH/canonical/h1 文案
3. 改底部 `window.CONVERT_CONFIG = { to:"webp", mime:"image/webp", ext:"webp", quality:0.92 }`
4. 加进 `sitemap.xml` 和各页 matrix 内链

> 注：webp/avif 输出需浏览器 canvas 支持（多数现代浏览器 OK）。pdf 输出需另接 pdf-lib。

## 部署（Cloudflare Pages，零成本）

1. 推到 git → Cloudflare Pages 连仓库，无构建命令、输出目录设为本目录
2. 把所有 `https://example.com` 占位换成真实域名（TDH/canonical/OG/sitemap/robots）
3. 配 Cloudflare：SSL=Full、缓存规则
4. 接 GA + GSC + Clarity；提交 sitemap 到 Google + Bing
5. 申请 AdSense（补 about/privacy 页让内容完整再申请）

## 待办（P0 之后）

- [ ] 真实域名替换占位符
- [ ] og.png（before/after 对比图）
- [ ] about / privacy 页（AdSense 过审）
- [ ] 矩阵扩展：heic-to-pdf / heic-to-webp / webp-to-jpg / png-to-jpg
- [ ] how-to 内容页（windows/win11/mac/iphone）抢信息流量
- [ ] 导流入口：批量/API 付费版（可挂 xpay → Agent 也能调）
