# guadao

一个用于每小时抓取 Steam 市场与 Buff 第三方价格，并将结果附加写入 `data/data.json` 的 Node 应用；`public/index.html` 使用 Chart.js 可视化历史数据。

## 使用方式

1. Node 版本：需要 Node >= 18.18（或 20）。
2. 配置抓取目标：编辑 `config/items.json`（数组），示例：

```json
[
  { "id": "example-1", "name": "示例物品 1", "buffGoodsId": 123, "appid": 730, "market_hash_name": "AK-47 | Redline (Field-Tested)" }
]
```

3. 环境变量（本地运行可在 shell 中导出，GitHub Actions 需配置 secrets）：
   - `BUFF_API_KEY`, `BUFF_BASE_URL`
   - `STEAM_API_KEY`, `STEAM_BASE_URL`

4. 运行更新（会在 `data/data.json` 末尾追加一条快照）：

```bash
npm run update
```

5. 可视化：打开 `public/index.html`（本地可通过任意静态服务器如 `npx http-server`，或直接浏览器 file:// 打开）。

## GitHub Actions 定时任务

- 工作流位于 `.github/workflows/update.yml`，每小时整点运行。
- 会调用 `npm run update`，若 `data/data.json` 变化则自动提交回仓库。

## 开发说明

- 抓取器骨架位于 `src/fetchers/{buff,steam}.js`，需要你根据实际 API 返回完善请求与解析逻辑。
- 更新逻辑位于 `src/update.js`，负责读取 `config/items.json`、并行抓取、生成 `{ timestamp, items[] }` 快照并追加到 `data/data.json`。

