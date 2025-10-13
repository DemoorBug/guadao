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

  // 在GitHub Actions中强制启用调试模式
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  if (isGitHubActions) {
    process.env.DEBUG = 'false';
    console.log('[GitHub Actions] 强制启用DEBUG模式');
  }

  console.log('=== 开始获取 Steam 和 Buff 数据 ===');
  console.log('当前工作目录:', process.cwd());
  console.log('项目根目录:', root);
  console.log('数据文件路径:', dataPath);
  console.log('DEBUG 模式:', process.env.DEBUG);
  console.log('GitHub Actions:', isGitHubActions);
  
  // 检查环境变量
  console.log('=== 环境变量检查 ===');
  console.log('- GITHUB_ACTIONS:', process.env.GITHUB_ACTIONS);
  console.log('- BUFF_COOKIE_1 存在:', !!process.env.BUFF_COOKIE_1);
  console.log('- BUFF_COOKIE_2 存在:', !!process.env.BUFF_COOKIE_2);
  console.log('- BUFF_COOKIE_3 存在:', !!process.env.BUFF_COOKIE_3);
  console.log('- BUFF_COOKIE_4 存在:', !!process.env.BUFF_COOKIE_4);
  console.log('- BUFF_COOKIE 存在:', !!process.env.BUFF_COOKIE);
  console.log('- STEAM_COOKIE 存在:', !!process.env.STEAM_COOKIE);
  
  // 生成本次构建ID（用于缓存清理与健康检查）
  const buildId = new Date().toISOString();

  // 获取完整数据
  console.log('=== 开始获取数据 ===');
  console.log('开始时间:', new Date().toISOString());
  
  let newData;
  try {
    newData = await fetchSteamAndBuffData();
    console.log(`=== 数据获取完成 ===`);
    console.log(`获取到 ${newData.length} 条数据`);
    console.log('完成时间:', new Date().toISOString());
  } catch (error) {
    console.error('=== 数据获取失败 ===');
    console.error('错误:', error.message);
    console.error('堆栈:', error.stack);
    throw error;
  }

  // 读取现有数据
  console.log('=== 读取现有数据 ===');
  const existingData = await readJson(dataPath, []);
  if (!Array.isArray(existingData)) {
    throw new Error('data/data.json 格式错误，应为数组');
  }
  console.log(`现有数据: ${existingData.length} 个物品`);

  // 处理每条新数据
  console.log('=== 开始处理数据 ===');
  for (let i = 0; i < newData.length; i++) {
    const newItem = newData[i];
    console.log(`处理第 ${i + 1}/${newData.length} 个物品: ${newItem.name}`);
    
    // 查找是否存在相同名称的物品
    const existingItemIndex = existingData.findIndex(item => item.name === newItem.name);
    
    if (existingItemIndex !== -1) {
      // 存在相同名称，添加到价格数组
      const existingItem = existingData[existingItemIndex];
      existingItem.prices.push(newItem.prices);
      console.log(`更新物品: ${newItem.name} - 添加新价格记录`);
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
      console.log(`新增物品: ${newItem.name} - 创建新条目`);
    }
  }

  // 保存更新后的数据
  console.log('=== 保存数据 ===');
  await writeJson(dataPath, existingData);
  console.log('数据已保存到:', dataPath);
  
  // 生成静态 HTML 页面
  console.log('=== 生成静态页面 ===');
  const htmlPath = path.join(root, 'public', 'index.html');
  await generateStaticPage(existingData, htmlPath, buildId);
  console.log('静态页面已生成到:', htmlPath);
  // 同步写 build_id.txt 供部署后健康检查与缓存验证
  const buildIdPath = path.join(root, 'public', 'build_id.txt');
  await ensureDir(buildIdPath);
  await fs.writeFile(buildIdPath, buildId + '\n', 'utf-8');
  console.log('写入构建标识到:', buildIdPath);
  
  const timestamp = new Date().toISOString();
  console.log(`=== 更新完成 ===`);
  console.log(`[update] ${timestamp} 处理了 ${newData.length} 条数据，总计 ${existingData.length} 个物品`);
  
  // 输出简要统计信息
  const totalPrices = existingData.reduce((sum, item) => sum + item.prices.length, 0);
  console.log(`[update] ${timestamp} items=${existingData.length} total_prices=${totalPrices} new=${newData.length}`);
}


main().catch((err) => {
  console.error('=== 错误详情 ===');
  console.error('错误类型:', err.constructor.name);
  console.error('错误消息:', err.message);
  console.error('错误堆栈:', err.stack);
  logger.error('更新脚本执行失败:', err);
  process.exitCode = 1;
});


