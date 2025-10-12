import { fetchSteamAndBuffData } from './fetchers/steam_test.js';

// 直接调用，无需参数
const results = await fetchSteamAndBuffData();
console.log('最终检验结果',results);