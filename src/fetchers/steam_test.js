// 简单的 URL GET 调试脚本：
// 用法：
//   node src/fetchers/steam_test.js --url='https://steamcommunity.com/market/search/render/?query=&start=0&count=10&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=730'

function parseArgs(argv) {
  const args = { url: null };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--url=')) args.url = a.slice('--url='.length);
  }
  return args;
}

async function main() {
  // 代理支持
  await import('../utils/proxy.js');
  const { url } = parseArgs(process.argv);
  if (!url) {
    console.error('缺少 --url 参数');
    process.exit(1);
  }
  const res = await fetch(url, { method: 'GET' ,headers: {
    'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
  }});
  console.log('Status:', res.status, res.statusText);
  console.log('Content-Type:', res.headers.get('content-type'));
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('响应非 2xx，正文预览：', text.slice(0, 500));
    process.exit(1);
  }
  const data = await res.json();
  const html = typeof data?.results_html === 'string' ? data.results_html : '';

  // 逐条匹配每个 <a class="market_listing_row_link" ...> ... </a> 区块，避免首条遗漏
  const extracted = [];
  const reRow = /<a\s+class=\"market_listing_row_link\"[^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = reRow.exec(html)) !== null) {
    const link = m[1];
    const block = m[2];

    // 名称：优先通用类名，再回退 result_*_name
    const nameMatch = block.match(/class=\"market_listing_item_name\"[\s\S]*?>\s*([^<]+)\s*</)
      || block.match(/id=\"result_\d+_name\"[\s\S]*?>\s*([^<]+)\s*</);
    const name = nameMatch ? nameMatch[1].trim() : null;

    // 数量
    const qtyMatch = block.match(/class=\"market_listing_num_listings_qty\"[^>]*>\s*([0-9][0-9.,\s]*)/);
    const count = qtyMatch ? Number((qtyMatch[1] || '').replace(/[^0-9]/g, '')) : null;

    // 价格：normal_price 或 sale_price
    const priceMatch = block.match(/class=\"normal_price\"[\s\S]*?>\s*([^<\n]+)\s*</)
      || block.match(/class=\"sale_price\"[\s\S]*?>\s*([^<\n]+)\s*</);
    const price = priceMatch ? priceMatch[1].trim() : null;

    extracted.push({ name, count, price, market_listing_row_link: link });
  }

  console.log(JSON.stringify(extracted, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

// url='https://steamcommunity.com/market/search/render/?query=&start=0&count=10&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=570'