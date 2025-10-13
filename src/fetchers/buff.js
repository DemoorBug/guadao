import { createModuleLogger } from '../utils/logger.js';

/**
 * 获取 Buff 价格数据。
 * itemName: 字符串，物品名称
 * options: { cookie?: string, debug?: boolean }
 * 返回：Map<id, priceNumber>
 */
export async function fetchBuffPrices(itemName, options = {}) {
  const { cookieIndex = 0, game: gameFromOptions } = options;
  const result = new Map();
  
  // 使用统一的日志控制
  const logger = createModuleLogger('BUFF', options);
  
  // 条件代理支持（本地启用，GitHub Actions禁用）
  await import('../utils/proxy.js');
  
  // 获取多 Cookie 配置
  const getBuffCookies = () => {
    const cookies = [];
    
    // 检查第一个 Cookie
    if (process.env.BUFF_COOKIE_1) {
      cookies.push(process.env.BUFF_COOKIE_1);
    }
    
    // 检查第二个 Cookie
    if (process.env.BUFF_COOKIE_2) {
      cookies.push(process.env.BUFF_COOKIE_2);
    }
    
    // 检查第三个 Cookie
    if (process.env.BUFF_COOKIE_3) {
      cookies.push(process.env.BUFF_COOKIE_3);
    }
    
    // 检查第四个 Cookie
    if (process.env.BUFF_COOKIE_4) {
      cookies.push(process.env.BUFF_COOKIE_4);
    }
    
    // 如果没有设置任何 Cookie，使用默认的 BUFF_COOKIE
    if (cookies.length === 0) {
      if (process.env.BUFF_COOKIE) {
        cookies.push(process.env.BUFF_COOKIE);
      } else {
        logger.warn('未设置任何 BUFF_COOKIE 环境变量');
        return [''];
      }
    }
    
    return cookies;
  };
  
  // 获取当前使用的 Cookie
  const getCurrentCookie = () => {
    const cookies = getBuffCookies();
    if (cookies.length === 0) return '';
    return cookies[cookieIndex % cookies.length];
  };
  
  const currentCookie = getCurrentCookie();
  const availableCookieCount = getBuffCookies().length;
  // console.log('availableCookieCount', availableCookieCount);
  // console.log('cookieIndex', cookieIndex);
  logger.log(`使用 Cookie 索引 ${cookieIndex}/${availableCookieCount}: ${currentCookie.substring(0, 50)}...`);

  // 公共 headers 配置
  const getHeaders = () => ({
    'Cookie': getCurrentCookie(),
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
    'Referer': 'https://buff.163.com/market/csgo'
  });
  
  // 解析 game 参数：优先 options.game，其次默认 csgo；仅允许已知枚举
  const resolveGame = () => {
    const g = (gameFromOptions || '').toLowerCase();
    if (g === 'csgo' || g === 'dota2') return g;
    return 'csgo';
  };
  const game = resolveGame();

  try {
    const res = await fetch(`https://buff.163.com/api/market/goods?game=${game}&page_num=1&search=${encodeURIComponent(itemName)}`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    logger.log('Response Status:', res.status, res.statusText);
    logger.log('Response Headers:', Object.fromEntries(res.headers.entries()));
    
    if (!res.ok) {
      logger.error('Request failed:', res.status, res.statusText);
      return result;
    }
    
    const data = await res.json();
    logger.log('Full API Response:', JSON.stringify(data, null, 2));
    
    // 提取 items 数组 - 修正路径为 data.data.items
    if (data && data.data && Array.isArray(data.data.items) && data.data.items.length > 0) {
      logger.log('Items found:', data.data.items.length);
      logger.log('Items data:');
      data.data.items.forEach((item, index) => {
        logger.log(`Item ${index + 1}:`, {
          id: item.id,
          name: item.name,
          sell_min_price: item.sell_min_price,
          sell_num: item.sell_num,
          steam_price: item.goods_info?.steam_price
        });
      });
      
      // 遍历所有 items 找到名称完全匹配的物品
      let matchedItem = null;
      for (const item of data.data.items) {
        if (item.name === itemName) {
          matchedItem = item;
          logger.log('Found matching item:', item.name);
          break;
        }
      }
      
      if (!matchedItem) {
        logger.log('No matching item found for:', itemName);
        logger.log('Available items:', data.data.items.map(i => i.name));
        return result;
      }
      
      logger.log(`Found matching item: "${matchedItem.name}"`);
      const goodsId = matchedItem.id;
      logger.log('Extracted goods_id:', goodsId);
      
      // 构建新的 API 请求 URL
      const sellOrderUrl = `https://buff.163.com/api/market/goods/sell_order?game=${game}&goods_id=${goodsId}&page_num=1&sort_by=default&mode=&allow_tradable_cooldown=1&from_refresh=1`;
      logger.log('New sell order URL:', sellOrderUrl);
      
      // 发起新的请求获取销售订单
      try {
        const sellOrderRes = await fetch(sellOrderUrl, {
          method: 'GET',
          headers: getHeaders()
        });
        
        logger.log('Sell Order Response Status:', sellOrderRes.status, sellOrderRes.statusText);
        
        if (!sellOrderRes.ok) {
          logger.error('Sell order request failed:', sellOrderRes.status, sellOrderRes.statusText);
          return result;
        }
        
        const sellOrderData = await sellOrderRes.json();
        logger.log('Sell Order Response:', JSON.stringify(sellOrderData, null, 2));
        
        // 提取价格信息
        if (sellOrderData && sellOrderData.data && sellOrderData.data.items) {
          logger.log('Sell order items found:', sellOrderData.data.items.length);
          
          // 收集所有订单信息
          const orders = sellOrderData.data.items.map((order, index) => {
            // 通过 user_id 匹配用户信息
            const userInfo = sellOrderData.data.user_infos?.[order.user_id] || {};
            
            const orderInfo = {
              price: parseFloat(order.price),
              created_at_beijing: new Date(order.created_at * 1000).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}),
              updated_at_beijing: new Date(order.updated_at * 1000).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}),
              nickname: userInfo.nickname || '未知用户',
            };
            
            logger.log(`Order ${index + 1}:`, orderInfo);
            return orderInfo;
          });
          
          // 计算最低价格
          const minPrice = Math.min(...orders.map(order => order.price));
          
          // 存储详细的对象信息
          const resultData = {
            price: minPrice,
            goods_id: goodsId,
            orders: orders,
            orders_count: orders.length,
            latest_order: orders[0], // 最新的订单（通常是第一个）
            oldest_order: orders[orders.length - 1] // 最旧的订单
          };
          
          result.set(itemName, resultData);
          logger.log('Final data set:', resultData);
        } else {
          logger.log('No sell order items found in response');
          logger.log('Available keys in data:', Object.keys(sellOrderData || {}));
          
          // 如果没有销售订单，使用商品信息中的最低价格
          const sellMinPrice = parseFloat(matchedItem.sell_min_price);
          if (!isNaN(sellMinPrice)) {
            const fallbackData = {
              price: sellMinPrice,
              orders: [],
              orders_count: 0,
              source: 'sell_min_price',
              steam_price: matchedItem.goods_info?.steam_price,
              sell_num: matchedItem.sell_num
            };
            result.set(itemName, fallbackData);
            logger.log('Using sell_min_price:', fallbackData);
          }
        }
      } catch (error) {
        logger.error('Error fetching sell order:', error);
      }
    } else {
      logger.log('No items found or invalid response structure');
      logger.log('Available keys:', Object.keys(data || {}));
    }
  } catch (error) {
    logger.error('Error in fetchBuffPrices:', error);
  }
  
  return result;
}

// 测试代码
// fetchBuffPrices('M4A1 消音型 | 女火神之炽焰 (略有磨损)').then(result => {
//   console.log('\n=== Buff 价格结果 ===');
//   console.log('Map 大小:', result.size);
//   console.log('所有条目:');
  
//   if (result.size === 0) {
//     console.log('  (无数据)');
//   } else {
//     for (const [key, value] of result.entries()) {
//       console.log(`\n物品: "${key}"`);
//       console.log('  价格:', value.price);
//       console.log('  订单数量:', value.orders_count);
//       console.log('  数据源:', value.source || 'sell_order');
//       if (value.orders && value.orders.length > 0) {
//         console.log('  最新订单时间:', value.latest_order?.created_at_beijing);
//         console.log('  最旧订单时间:', value.oldest_order?.created_at_beijing);
//       }
//       if (value.steam_price) {
//         console.log('  Steam 价格:', value.steam_price);
//       }
//     }
//   }
  
//   console.log('\n完整 Map 对象:');
//   console.log(JSON.stringify(Object.fromEntries(result), null, 2));
// });