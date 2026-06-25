# heic-tools API — 批量/付费版 + Agent 可调 MCP

服务端 HEIC 转换。一套核心（`src/convert.js`），三个出口：HTTP API、批量、MCP。
浏览器站是免费流量入口；这层是**导流/现金 + Agent 调用**。

> ⚠️ 护城河自检：裸 HEIC 转换 = 纯代码，libheif 开源，Agent 自己能跑 → **护城河弱**。
> 这层价值在**便利 + 可靠 + 免运维**（towebp 的 App 导流逻辑），是现金/导流层，**不是壁垒**。
> 真壁垒是新词 MCP（见 `../../../docs/出海方向-MCP候选.md`）。定价便宜、跑量即可。

## 结构

```
src/convert.js   # 转换核心：HEIC buffer -> JPG/PNG buffer（heic-convert / libheif）
src/server.js    # HTTP API：/v1/convert /v1/batch /v1/usage（API-key + 计量）
src/mcp.js       # MCP server：convert_heic 工具（stdio，base64 进/出）
src/billing.js   # API-key 鉴权 + 按调用计量（MVP stub）
```

## 安装 / 运行

```bash
cd apps/heic-tools/api
npm install
cp .env.example .env        # 填 API_KEYS（留空=开放，仅 dev）

npm start                   # HTTP API → http://localhost:8787
npm run mcp                 # MCP server（stdio）
```

## HTTP API

```bash
# 单文件转换（按调用计费）
curl -X POST "http://localhost:8787/v1/convert?to=jpg&quality=0.9" \
  -H "x-api-key: YOUR_KEY" \
  -F "file=@photo.heic" --output photo.jpg

# 批量 → zip（按转换张数计费）
curl -X POST "http://localhost:8787/v1/batch?to=png" \
  -H "x-api-key: YOUR_KEY" \
  -F "file=@a.heic" -F "file=@b.heic" --output out.zip

# 用量
curl "http://localhost:8787/v1/usage" -H "x-api-key: YOUR_KEY"
```

## MCP（给 Agent 用）

注册为 stdio MCP server，工具 `convert_heic(image_base64, to, quality)` 返回 base64 图片。
Claude 等客户端配置示例：

```json
{
  "mcpServers": {
    "heic-tools": { "command": "node", "args": ["/abs/path/apps/heic-tools/api/src/mcp.js"] }
  }
}
```

## 变现接法（实证）

`src/billing.js` 是 MVP 计量 stub。生产二选一：
1. **xpay.sh**：把 API URL 贴进去、每个 endpoint 设价，Agent 调用自动扣费（server 零改动）—— 最快
2. **x402**：HTTP 402 + USDC 按次微支付（Coinbase/Cloudflare 标准）
3. **Stripe MPP / usage-based billing**：按调用计量出账

参考定价（同类 agent API）：Exa $0.001/result、Tavily $0.008/query。转换类可定 ~$0.002–0.01/图。

## 部署

- HTTP API：Node 服务（Railway/Fly/Render）或 Cloudflare Workers（注意 WASM/内存限制）
- 成本锁：限流 + 单文件大小上限 + 免费额度封顶（防"越火越亏"）
- 监控：用量看板（计量已埋点，接 DB/KV 持久化即可）

## 待办

- [ ] 计量持久化（换 KV/DB，替掉 in-memory Map）
- [ ] 接 xpay/x402 真实收费
- [ ] 单文件大小上限 + 限流中间件
- [ ] 网页"批量/去广告"付费版 → 调本 API
- [ ] 上 MCP registry / marketplace 提升 Agent 可发现性
