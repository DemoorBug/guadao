import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSteamAndBuffData } from './fetchers/steam_test.js';
import { generateStaticPage } from './generators/html.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const buf = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(buf);
  } catch (e) {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  await ensureDir(filePath);
  await fs.writeFile(filePath, json + '\n', 'utf-8');
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const dataPath = path.join(root, 'data', 'data.json');

  logger.log('开始获取 Steam 和 Buff 数据...');
  
  // 获取完整数据
  const newData = await fetchSteamAndBuffData();
  logger.log(`获取到 ${newData.length} 条数据`);

  // 读取现有数据
  const existingData = await readJson(dataPath, []);
  if (!Array.isArray(existingData)) {
    throw new Error('data/data.json 格式错误，应为数组');
  }

  // 处理每条新数据
  for (const newItem of newData) {
    // 查找是否存在相同名称的物品
    const existingItemIndex = existingData.findIndex(item => item.name === newItem.name);
    
    if (existingItemIndex !== -1) {
      // 存在相同名称，添加到价格数组
      const existingItem = existingData[existingItemIndex];
      existingItem.prices.push(newItem.prices);
      logger.log(`更新物品: ${newItem.name} - 添加新价格记录`);
    } else {
      // 不存在，创建新条目
      const newEntry = {
        id: existingData.length + 1,
        name: newItem.name,
        buff_link: `https://buff.163.com/goods/${newItem.goods_id}?from=market#tab=selling`,
        link: newItem.link,
        prices: [newItem.prices]
      };
      existingData.push(newEntry);
      logger.log(`新增物品: ${newItem.name} - 创建新条目`);
    }
  }

  // 保存更新后的数据
  await writeJson(dataPath, existingData);
  
  // 生成静态 HTML 页面
  const htmlPath = path.join(root, 'public', 'index.html');
  await generateStaticPage(existingData, htmlPath);
  
  const timestamp = new Date().toISOString();
  logger.log(`[update] ${timestamp} 处理了 ${newData.length} 条数据，总计 ${existingData.length} 个物品`);
  
  // 输出简要统计信息
  const totalPrices = existingData.reduce((sum, item) => sum + item.prices.length, 0);
  console.log(`[update] ${timestamp} items=${existingData.length} total_prices=${totalPrices} new=${newData.length}`);
}


main().catch((err) => {
  logger.error(err);
  process.exitCode = 1;
});


