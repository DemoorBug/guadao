/**
 * 获取 Steam 市场价格数据。
 * items: 数组 [{ id, name, steamMarketUrl 或 appid/market_hash_name }]
 * options: { apiKey?: string, baseUrl?: string }
 * 返回：Map<id, priceNumber>
 */
export async function fetchSteamPrices(items, options = {}) {
  // 代理支持（若设置 PROXY_URL/HTTPS_PROXY/ALL_PROXY/HTTP_PROXY 将全局生效）
  await import('../utils/proxy.js');
  const { apiKey = process.env.STEAM_API_KEY, baseUrl = process.env.STEAM_BASE_URL } = options;
  // 如果未提供 baseUrl，则使用已给定的搜索接口 URL（CS2/CSGO appid=730）
  const url = baseUrl || 'https://steamcommunity.com/market/search/render/?query=&start=0&count=100&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=730';
  const result = new Map();
  for (const it of items) result.set(it.id, undefined);

  try {
    const res = await fetch(url, {method: 'GET'});
    console.log(res)
    if (!res.ok) throw new Error(`steam fetch failed: ${res.status}`);
    const data = await res.json();
    console.log('data')
    console.log(data)
    const results = Array.isArray(data?.results) ? data.results : [];
    if (results.length === 0) return result;

    // 建立 hash_name -> price 映射，价格优先取 sell_price（分/最小货币单位），否则从 sell_price_text 解析数字
    const nameToPrice = new Map();
    for (const r of results) {
      const name = r?.hash_name || r?.name || r?.hash_name_localized;
      if (!name) continue;
      let price = null;
      if (typeof r?.sell_price === 'number' && Number.isFinite(r.sell_price)) {
        // sell_price 通常是以最小货币单位计价（如分），此处直接保留原值或按需换算
        price = r.sell_price;
      } else if (typeof r?.sell_price_text === 'string') {
        // 解析如 "¥ 12.34"、"$1.23" 等字符串为数字
        const m = r.sell_price_text.replace(/[^0-9.,-]/g, '').replace(',', '.');
        const n = Number(m);
        if (Number.isFinite(n)) price = n;
      }
      if (price != null) nameToPrice.set(name, price);
    }

    // 将 items 中配置的 market_hash_name 映射到抓取结果
    for (const item of items) {
      const key = item?.market_hash_name || item?.name;
      if (!key) continue;
      // 精确匹配优先；若失败可考虑做一次宽松匹配（可选）
      const v = nameToPrice.get(key);
      if (v != null) result.set(item.id, v);
    }
  } catch (err) {
    console.log(err)
    // 出错不抛出，保持 undefined，主流程会做容错
    // 你可在此加入日志或上报
  }

  return result;
}

try {
  const m = await fetchSteamPrices([
    { id: '1', name: 'AK-47 | Redline (Field-Tested)', market_hash_name: 'AK-47 | Redline (Field-Tested)' }
  ]);
  console.log(m);
} catch (e) {
  console.error(e);
}
