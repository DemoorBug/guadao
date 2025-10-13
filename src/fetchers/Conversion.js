export async function conversion() {
    // https://www.google.com/finance/_/GoogleFinanceUi/data/batchexecute?rpcids=HqGpWd,xh8wxf,mKsvE,AiCwsd,SICF5d,Pr8h2e,yYvDpf&source-path=/finance/quote/USD-CNY&f.sid=8274659642958837002&bl=boq_finance-ui_20250930.06_p0&hl=zh-CN&soc-app=162&soc-platform=1&soc-device=1&_reqid=2270116&rt=c
    // post
    // body: f.req=%5B%5B%5B%22HqGpWd%22%2C%22%5B%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%5D%22%2Cnull%2C%223%22%5D%2C%5B%22xh8wxf%22%2C%22%5B%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%2C1%5D%22%2Cnull%2C%225%22%5D%2C%5B%22mKsvE%22%2C%22%5B%5C%22USD-CNY%5C%22%5D%22%2Cnull%2C%2213%22%5D%2C%5B%22AiCwsd%22%2C%22%5B%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%2C1%5D%22%2Cnull%2C%2221%22%5D%2C%5B%22AiCwsd%22%2C%22%5B%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%2C3%5D%22%2Cnull%2C%2223%22%5D%2C%5B%22SICF5d%22%2C%22%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%22%2Cnull%2C%2225%22%5D%2C%5B%22Pr8h2e%22%2C%22%5B%5B%5B%5D%5D%5D%22%2Cnull%2C%2227%22%5D%2C%5B%22yYvDpf%22%2C%22%5B%5B%5D%5D%22%2Cnull%2C%2229%22%5D%2C%5B%22xh8wxf%22%2C%22%5B%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%5D%22%2Cnull%2C%2237%22%5D%5D%5D&
    // proxy
    await import('../utils/proxy.js');
    const res = await fetch(`https://www.google.com/finance/_/GoogleFinanceUi/data/batchexecute`, {
        method: 'POST',
        body: 'f.req=%5B%5B%5B%22HqGpWd%22%2C%22%5B%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%5D%22%2Cnull%2C%223%22%5D%2C%5B%22xh8wxf%22%2C%22%5B%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%2C1%5D%22%2Cnull%2C%225%22%5D%2C%5B%22mKsvE%22%2C%22%5B%5C%22USD-CNY%5C%22%5D%22%2Cnull%2C%2213%22%5D%2C%5B%22AiCwsd%22%2C%22%5B%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%2C1%5D%22%2Cnull%2C%2221%22%5D%2C%5B%22AiCwsd%22%2C%22%5B%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%2C3%5D%22%2Cnull%2C%2223%22%5D%2C%5B%22SICF5d%22%2C%22%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%22%2Cnull%2C%2225%22%5D%2C%5B%22Pr8h2e%22%2C%22%5B%5B%5B%5D%5D%5D%22%2Cnull%2C%2227%22%5D%2C%5B%22yYvDpf%22%2C%22%5B%5B%5D%5D%22%2Cnull%2C%2229%22%5D%2C%5B%22xh8wxf%22%2C%22%5B%5B%5Bnull%2Cnull%2C%5B%5C%22USD%5C%22%2C%5C%22CNY%5C%22%5D%5D%5D%5D%22%2Cnull%2C%2237%22%5D%5D%5D&',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            'X-Same-Domain': '1'
        },
    });
    const text = await res.text();
    // console.log(text)

    // 目标：按“规律”提取：寻找“首元素为高精度数字的小数组（如 [7.11471843,0,0,2,2,2] ）”，
    // 不绑定具体数字 7.1147，而是使用多套策略逐个尝试，直到命中为止。
    // 成功则返回解析后的 JS 数组，失败返回 null。

    // 工具：在 raw 文本中，从 numberIndex 处向左找到使该数字作为数组首元素的 '['，
    // 然后向右做括号配对拿到完整数组切片。
    function sliceArrayWhereNumberIsFirst(raw, numberIndex) {
        let start = -1;
        for (let i = numberIndex - 1; i >= 0; i--) {
            const ch = raw[i];
            if (ch === '[') {
                const between = raw.slice(i + 1, numberIndex).trim();
                if (between.length === 0) start = i;
                break;
            } else if (ch === ']' || ch === ',') {
                break;
            }
        }
        if (start === -1) return null;
        let depth = 0;
        for (let j = start; j < raw.length; j++) {
            const ch = raw[j];
            if (ch === '[') depth++;
            else if (ch === ']') {
                depth--;
                if (depth === 0) {
                    return raw.slice(start, j + 1);
                }
            }
        }
        return null;
    }

    // 策略一：遍历所有“高精度小数”（>=4位小数），对每个命中点尝试取其作为首元素的数组
    function strategyHighPrecisionScan(raw) {
        const candidates = [];
        const re = /(?<![\dA-Za-z_])(?:[1-9]\d*|0)\.(?:\d){4,}\d*/g; // 高精度小数
        let m;
        while ((m = re.exec(raw)) !== null) {
            const idx = m.index;
            const slice = sliceArrayWhereNumberIsFirst(raw, idx);
            if (!slice) continue;
            try {
                const parsed = JSON.parse(slice);
                if (Array.isArray(parsed) && typeof parsed[0] === 'number') {
                    candidates.push(parsed);
                }
            } catch {
                // 忽略不可解析项
            }
        }
        return candidates.length ? candidates[0] : null;
    }

    // 策略二：直接基于常见形态匹配 [ number,0,0,2, ... ] 的小数组
    function strategyShapeDirectedRegex(raw) {
        const re = /\[\s*((?:[1-9]\d*|0)\.(?:\d){4,}\d*)\s*,\s*0\s*,\s*0\s*,\s*2(?:\s*,\s*-?\d+(?:\.\d+)?){0,8}\s*\]/g;
        let m;
        while ((m = re.exec(raw)) !== null) {
            const slice = m[0];
            try {
                const parsed = JSON.parse(slice);
                if (Array.isArray(parsed) && typeof parsed[0] === 'number') {
                    return parsed;
                }
            } catch {
                // 忽略不可解析项
            }
        }
        return null;
    }

    // 策略三：对每一个出现的“USD / CNY”时段附近窗口，缩小搜索范围再用策略一
    function strategyContextNarrowing(raw) {
        const contextIdxs = [];
        const ctxRe = /USD\s*\/\s*CNY/g;
        let m;
        while ((m = ctxRe.exec(raw)) !== null) {
            contextIdxs.push(m.index);
        }
        for (const idx of contextIdxs) {
            const start = Math.max(0, idx - 2000);
            const end = Math.min(raw.length, idx + 8000);
            const sub = raw.slice(start, end);
            const hit = strategyHighPrecisionScan(sub);
            if (hit) return hit;
        }
        return null;
    }

    // 依次尝试多套策略，命中即返回
    const strategies = [
        strategyHighPrecisionScan,
        strategyShapeDirectedRegex,
        strategyContextNarrowing,
    ];

    for (const s of strategies) {
        const res = s(text);
        if (res) return res;
    }

    return null;
}


// 提供一个直接返回 USD->CNY 数值的便捷方法
export async function getUsdCnyRate() {
    try {
        const arr = await conversion();
        if (Array.isArray(arr) && typeof arr[0] === 'number' && isFinite(arr[0])) {
            return arr[0];
        }
    } catch (e) {
        // ignore
    }
    return null;
}

// console.log('汇率', await conversion())

