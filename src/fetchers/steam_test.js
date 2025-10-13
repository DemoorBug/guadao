// 从 items.json 读取配置并获取 Steam 市场数据的脚本
// 用法：node src/fetchers/steam_test.js
import { fetchBuffPrices } from './buff.js';
import { getUsdCnyRate } from './Conversion.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

function loadItems() {
  try {
    const itemsPath = path.join(process.cwd(), 'config', 'items.json');
    const data = fs.readFileSync(itemsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('读取 items.json 失败:', error.message);
    process.exit(1);
  }
}
async function main() {
  // 代理支持
  // await import('../utils/proxy.js');
  
  // 从 items.json 加载配置
  const items = loadItems();
  logger.log('加载了', items.length, '个物品配置');
  
  // 处理每个物品
  for (const item of items) {
    if (!item.url) {
      logger.warn(`物品 ${item.name} 缺少 URL，跳过`);
      continue;
    }
    
    logger.log(`\n处理物品: ${item.name}`);
    await processItem(item);
  }
}

async function processItem(item) {
  const pages = item.page || 1; // 默认获取1页
  const allExtracted = [];
  
  logger.log(`开始获取物品 ${item.name} 的 ${pages} 页数据`);
  
  for (let page = 0; page < pages; page++) {
    const start = page * 10; // 每页10条，第二页从10开始
    const pageUrl = updateUrlStart(item.url, start);
    
    logger.log(`获取第 ${page + 1} 页数据 (start=${start})`);
    
    try {
      const res = await fetch(pageUrl, { method: 'GET', headers: {
        'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2'
      }});
      
      logger.log('Status:', res.status, res.statusText);
      logger.log('Content-Type:', res.headers.get('content-type'));
      
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.error(`第 ${page + 1} 页响应非 2xx，正文预览：`, text.slice(0, 500));
        continue; // 继续处理下一页
      }
      
      const data = await res.json();
      const html = typeof data?.results_html === 'string' ? data.results_html : '';
      
      // 解析当前页的数据
      const pageExtracted = parseHtmlData(html);
      allExtracted.push(...pageExtracted);
      
      logger.log(`第 ${page + 1} 页提取到 ${pageExtracted.length} 条数据`);
      
      // 添加延迟避免请求过于频繁
      if (page < pages - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      logger.error(`获取第 ${page + 1} 页数据时出错:`, error.message);
      continue; // 继续处理下一页
    }
  }
  
  logger.log(`物品 ${item.name} 总共提取到 ${allExtracted.length} 条数据`);
  
  // 处理每个物品的 Buff 数据
  // 获取一次 USD->CNY 汇率（页面级别一次）
  const usdCnyRate = await getUsdCnyRate();
  if (usdCnyRate) {
    logger.log('获取到 USD->CNY 汇率:', usdCnyRate);
  } else {
    logger.warn('未能获取到 USD->CNY 汇率，将仅解析本币金额');
  }

  // 从 items.json 的 name 推断 BUFF 的 game 参数（如 csgo/dota2）
  const game = typeof item.name === 'string' ? item.name.toLowerCase() : 'csgo';

  const processedData = await processBuffData(allExtracted, usdCnyRate, game);
  
  logger.log(`处理完成，共 ${processedData.length} 条数据:`);
  logger.log(JSON.stringify(processedData, null, 2));
  
  return processedData;
}

function updateUrlStart(url, start) {
  // 更新URL中的start参数
  const urlObj = new URL(url);
  urlObj.searchParams.set('start', start.toString());
  return urlObj.toString();
}

function parseHtmlData(html) {
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
  
  return extracted;
}

async function processBuffData(steamData, usdCnyRate, game) {
  const processedData = [];
  let cookieIndex = 0;
  
  // 获取可用的 Cookie 数量
  const getAvailableCookieCount = () => {
    let count = 0;
    if (process.env.BUFF_COOKIE_1) count++;
    if (process.env.BUFF_COOKIE_2) count++;
    if (process.env.BUFF_COOKIE_3) count++;
    if (process.env.BUFF_COOKIE_4) count++;
    
    // 如果没有设置任何 Cookie，使用默认的 BUFF_COOKIE
    if (count === 0 && process.env.BUFF_COOKIE) {
      count = 1;
    }
    
    return count;
  };
  
  const availableCookieCount = getAvailableCookieCount();
  logger.log(`检测到 ${availableCookieCount} 个可用 Cookie`);
  
  for (let i = 0; i < steamData.length; i++) {
    const item = steamData[i];
    logger.log(`\n处理第 ${i + 1}/${steamData.length} 个物品: ${item.name}`);
    
    try {
      // 解析 Steam 价格：支持 "¥ 12.34"、"$2.10 USD" 等
      const steamPriceStr = item.price || '';
      let steamPrice;
      // 1) 匹配美元格式: $2.10 USD / USD $2.10 / $ 2.10
      const usdMatch = steamPriceStr.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*(USD)?/i);
      if (usdMatch && usdCnyRate) {
        const usd = parseFloat(usdMatch[1]);
        if (!isNaN(usd)) steamPrice = parseFloat((usd * usdCnyRate).toFixed(2));
      }
      // 2) 若非美元或未命中，则尝试人民币格式（含中文/符号）
      if (steamPrice == null || isNaN(steamPrice)) {
        const cnyClean = steamPriceStr.replace(/[^0-9.,-]/g, '').replace(',', '.');
        const n = Number(cnyClean);
        if (Number.isFinite(n)) steamPrice = n;
      }
      
      if (isNaN(steamPrice)) {
        logger.warn(`${item.name} 的 Steam 价格解析失败: ${item.price}`);
        continue;
      }

      // 3) 小于 5 元人民币则跳过后续请求（直接下一个）
      if (steamPrice < 5) {
        logger.warn(`${item.name} 的 Steam 价格低于 ¥5（解析值: ¥${steamPrice}），跳过`);
        continue;
      }

      // 查询 Buff 数据，使用当前 Cookie 索引（仅当价格达标时才请求）
      const buffResult = await fetchBuffPrices(item.name, { 
        cookieIndex: cookieIndex,
        game: game 
      });
      
      if (buffResult.size === 0) {
        logger.warn(`未找到 ${item.name} 的 Buff 数据，跳过`);
        continue;
      }
      
      // 获取 Buff 数据
      const buffData = buffResult.get(item.name);
      if (!buffData) {
        logger.warn(`未找到 ${item.name} 的 Buff 数据，跳过`);
        continue;
      }
      
      // 获取 Buff 最低价格和用户名
      const buffPrice = buffData.price;
      const buffUsername = buffData.orders && buffData.orders.length > 0 
        ? buffData.orders[0].nickname 
        : '未知用户';
      
      // 计算比例：buff_price / (steam_price * 0.85)
      const ratio = buffPrice / (steamPrice * 0.85);
      
      // 生成当前时间戳
      const timestamp = new Date().toISOString();
      
      // 构建最终数据格式
      const finalData = {
        id: i + 1,
        name: item.name,
        goods_id: buffData.goods_id,
        link: item.market_listing_row_link,
        prices: {
          steam_price: steamPrice,
          buff_price: buffPrice,
          buff_username: buffUsername,
          timestamp: timestamp,
          ratio: parseFloat(ratio.toFixed(4))
        }
      };
      
      processedData.push(finalData);
      logger.log(`成功处理: ${item.name} - Steam: ¥${steamPrice}, Buff: ¥${buffPrice}, 比例: ${ratio.toFixed(4)}`);
      
    } catch (error) {
      logger.error(`处理 ${item.name} 时出错:`, error.message);
      continue;
    }
    
    // 更新 Cookie 索引（循环使用）
    cookieIndex = (cookieIndex + 1) % availableCookieCount;
    logger.log(`下次请求将使用 Cookie 索引: ${cookieIndex}`);
    
    // 根据 Cookie 数量调整延迟时间
    if (i < steamData.length - 1) {
      let delay;
      if (availableCookieCount >= 2) {
        // 2个或更多Cookie时，延迟2-5秒
        delay = Math.floor(Math.random() * 3000) + 2000; // 2-5秒
      } else {
        // 1个Cookie时，延迟5-10秒
        delay = Math.floor(Math.random() * 5000) + 5000; // 5-10秒
      }
      logger.log(`等待 ${delay}ms 后处理下一个物品... (${availableCookieCount}个Cookie)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return processedData;
}


// 导出函数供其他模块使用
export async function fetchSteamAndBuffData() {
  // 条件代理支持（本地启用，GitHub Actions禁用）
  await import('../utils/proxy.js');
  
  // 从 items.json 加载配置
  const items = loadItems();
  logger.log('加载了', items.length, '个物品配置');
  
  const results = [];
  
  // 处理每个物品
  for (const item of items) {
    if (!item.url) {
      logger.warn(`物品 ${item.name} 缺少 URL，跳过`);
      continue;
    }
    
    logger.log(`\n处理物品: ${item.name}`);
    const processedData = await processItem(item);
    results.push(...processedData);
  }
  
  return results;
}
// 测试
// main().catch(err => {
//   logger.error(err);
//   process.exit(1);
// });


// url='https://steamcommunity.com/market/search/render/?query=&start=0&count=10&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=570'