import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchBuffPrices } from '../fetchers/buff.js';
import { fetchSteamPrices } from '../fetchers/steam.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const args = { source: 'both', id: null };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--source=')) args.source = a.split('=')[1];
    else if (a.startsWith('--id=')) args.id = a.split('=')[1];
  }
  return args;
}

async function readItems() {
  const root = path.resolve(__dirname, '../..');
  const p = path.join(root, 'config', 'items.json');
  const txt = await fs.readFile(p, 'utf-8');
  const items = JSON.parse(txt);
  if (!Array.isArray(items)) throw new Error('config/items.json 应为数组');
  return items;
}

function pickItems(items, id) {
  if (!id) return items;
  return items.filter(i => i.id === id);
}

function asPlainObject(map) {
  const obj = {};
  for (const [k, v] of map.entries()) obj[k] = v;
  return obj;
}

function validateNumber(n) {
  return n == null ? 'null' : (Number.isFinite(Number(n)) ? 'number' : 'INVALID');
}

async function main() {
  const { source, id } = parseArgs(process.argv);
  const items = pickItems(await readItems(), id);
  if (items.length === 0) {
    console.log('未匹配到待测物品（检查 --id 或 config/items.json）');
    process.exit(0);
  }

  const tasks = [];
  if (source === 'buff' || source === 'both') tasks.push(fetchBuffPrices(items));
  if (source === 'steam' || source === 'both') tasks.push(fetchSteamPrices(items));

  const results = await Promise.all(tasks);
  const names = (source === 'both') ? ['buff', 'steam'] : [source];

  names.forEach((name, idx) => {
    const map = results[idx];
    const obj = asPlainObject(map);
    console.log(`\n[${name}] 原始结果:`);
    console.log(obj);
    console.log(`[${name}] 校验:`);
    for (const it of items) {
      const v = obj[it.id];
      console.log(` - ${it.id} (${it.name}): ${v} -> ${validateNumber(v)}`);
    }
  });
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});


