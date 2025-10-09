import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchBuffPrices } from './fetchers/buff.js';
import { fetchSteamPrices } from './fetchers/steam.js';

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
  const itemsPath = path.join(root, 'config', 'items.json');
  const dataPath = path.join(root, 'data', 'data.json');

  const items = await readJson(itemsPath, []);
  if (!Array.isArray(items)) {
    throw new Error('config/items.json 格式错误，应为数组');
  }

  // 获取价格（骨架：返回 undefined 时保持为 null）
  const [buffMap, steamMap] = await Promise.all([
    fetchBuffPrices(items),
    fetchSteamPrices(items)
  ]);

  const timestamp = new Date().toISOString();
  const snapshot = {
    timestamp,
    items: items.map((it) => ({
      id: it.id,
      name: it.name,
      buffPrice: normalizePrice(buffMap.get(it.id)),
      steamPrice: normalizePrice(steamMap.get(it.id))
    }))
  };

  const history = await readJson(dataPath, []);
  if (!Array.isArray(history)) {
    throw new Error('data/data.json 格式错误，应为数组');
  }

  history.push(snapshot);
  await writeJson(dataPath, history);
  // 输出简要信息到控制台，便于 CI 日志查看
  const filled = snapshot.items.filter(i => i.buffPrice != null || i.steamPrice != null).length;
  console.log(`[update] ${timestamp} items=${items.length} filled=${filled}`);
}

function normalizePrice(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


