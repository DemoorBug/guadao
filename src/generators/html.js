import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

/**
 * 生成静态 HTML 页面
 * @param {Array} data - 数据数组
 * @param {string} outputPath - 输出路径
 */
export async function generateStaticPage(data, outputPath, buildId) {
  const htmlContent = generateHtmlContent(data, buildId);
  
  // 直接写入 HTML 文件，不使用 JSON 格式化
  await ensureDir(outputPath);
  await fs.writeFile(outputPath, htmlContent, 'utf-8');
  logger.log('静态 HTML 页面已生成');
}

/**
 * 生成 HTML 内容
 * @param {Array} data - 数据数组
 * @returns {string} HTML 内容
 */
function generateHtmlContent(data, buildId) {
  const BUILD_ID = typeof buildId === 'string' && buildId ? buildId : new Date().toISOString();
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>价格监控图表</title>
    <meta name="x-build-id" content="${BUILD_ID}">
    <script>
      // 构建版本号用于缓存规避及健康检查
      window.BUILD_ID = ${JSON.stringify(BUILD_ID)};
    </script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js?v=${encodeURIComponent(BUILD_ID)}"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 2rem;
        }
        
        .tabs {
            display: flex;
            flex-wrap: wrap;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        
        .tab {
            padding: 12px 20px;
            cursor: pointer;
            border: none;
            background: transparent;
            color: #495057;
            font-size: 14px;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
        }
        
        .tab:hover {
            background: #e9ecef;
            color: #007bff;
        }
        
        .tab.active {
            background: white;
            color: #007bff;
            border-bottom-color: #007bff;
            font-weight: 600;
        }
        
        .chart-container {
            padding: 20px;
            position: relative;
            height: 500px;
        }
        
        .loading {
            text-align: center;
            padding: 50px;
            color: #6c757d;
        }
        
        .error {
            text-align: center;
            padding: 50px;
            color: #dc3545;
        }
        
        .stats {
            display: flex;
            justify-content: space-around;
            padding: 15px 20px;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
            font-size: 14px;
            color: #6c757d;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-value {
            font-weight: 600;
            color: #495057;
        }
        
        .table-container {
            padding: 20px;
            background: #f8f9fa;
        }
        
        .table-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #495057;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .data-table th {
            background: #007bff;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        .data-table td {
            padding: 12px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .data-table tr:hover {
            background: #f8f9fa;
        }
        
        .price-link {
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
        }
        
        .price-link:hover {
            text-decoration: underline;
        }
        
        .ratio-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .ratio-low {
            background: #d4edda;
            color: #155724;
        }
        
        .ratio-medium {
            background: #fff3cd;
            color: #856404;
        }
        
        .ratio-high {
            background: #f8d7da;
            color: #721c24;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CSGO 价格监控图表</h1>
        </div>
        
        <div class="tabs" id="tabs">
            <!-- 选项卡将在这里动态生成 -->
        </div>
        
        <div class="chart-container">
            <div class="loading" id="loading">加载中...</div>
            <canvas id="priceChart" style="display: none;"></canvas>
        </div>
        
        <div class="stats" id="stats">
            <!-- 统计信息将在这里显示 -->
        </div>
        
        <div class="table-container">
            <div class="table-title">所有物品价格对比表</div>
            <table class="data-table" id="dataTable">
                <thead>
                    <tr>
                        <th>物品名称</th>
                        <th>Steam 价格</th>
                        <th>Buff 价格</th>
                        <th>比例</th>
                        <th>更新时间</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <!-- 表格数据将在这里动态生成 -->
                </tbody>
            </table>
        </div>
    </div>

    <script>
        let chart = null;
        let data = ${JSON.stringify(data)};
        
        // 初始化页面
        function initializePage() {
            initializeTabs();
            initializeTable();
            showLoading(false);
            if (data.length > 0) {
                switchToItem(0);
            }
        }
        
        // 初始化选项卡
        function initializeTabs() {
            const tabsContainer = document.getElementById('tabs');
            const statsContainer = document.getElementById('stats');
            
            // 生成选项卡
            data.forEach((item, index) => {
                const tab = document.createElement('button');
                tab.className = 'tab';
                tab.textContent = item.name;
                tab.onclick = () => switchToItem(index);
                tabsContainer.appendChild(tab);
            });
            
            // 显示统计信息
            const totalItems = data.length;
            const totalPrices = data.reduce((sum, item) => sum + item.prices.length, 0);
            const avgPrices = data.reduce((sum, item) => sum + item.prices.length, 0) / data.length;
            
            statsContainer.innerHTML = \`
                <div class="stat-item">
                    <div class="stat-value">\${totalItems}</div>
                    <div>物品数量</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">\${totalPrices}</div>
                    <div>价格记录</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">\${avgPrices.toFixed(1)}</div>
                    <div>平均记录数</div>
                </div>
            \`;
        }
        
        // 初始化表格
        function initializeTable() {
            const tableBody = document.getElementById('tableBody');
            
            // 获取每个物品的最新数据并排序
            const sortedData = data.map(item => {
                const latestPrice = item.prices[item.prices.length - 1];
                return {
                    ...item,
                    latestPrice: latestPrice
                };
            }).sort((a, b) => a.latestPrice.ratio - b.latestPrice.ratio);
            
            // 生成表格行
            tableBody.innerHTML = sortedData.map(item => {
                const latestPrice = item.latestPrice;
                const ratio = latestPrice.ratio;
                const ratioClass = ratio < 0.75 ? 'ratio-low' : ratio < 0.85 ? 'ratio-medium' : 'ratio-high';
                const updateTime = new Date(latestPrice.timestamp).toLocaleString('zh-CN');
                
                return \`
                    <tr>
                        <td>\${item.name}</td>
                        <td>
                            <a href="\${item.link}" target="_blank" class="price-link">
                                ¥\${latestPrice.steam_price}
                            </a>
                        </td>
                        <td>
                            <a href="\${item.buff_link}" target="_blank" class="price-link">
                                ¥\${latestPrice.buff_price}
                            </a>
                        </td>
                        <td>
                            <span class="ratio-badge \${ratioClass}">\${ratio.toFixed(3)}</span>
                        </td>
                        <td>\${updateTime}</td>
                    </tr>
                \`;
            }).join('');
        }
        
        // 切换到指定物品
        function switchToItem(index) {
            // 更新选项卡状态
            document.querySelectorAll('.tab').forEach((tab, i) => {
                tab.classList.toggle('active', i === index);
            });
            
            // 显示图表
            showLoading(false);
            createChart(data[index]);
        }
        
        // 创建图表
        function createChart(item) {
            const ctx = document.getElementById('priceChart').getContext('2d');
            
            // 销毁现有图表
            if (chart) {
                chart.destroy();
            }
            
            // 准备数据
            const labels = item.prices.map(price => {
                const date = new Date(price.timestamp);
                return date.toLocaleString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            });
            
            const steamPrices = item.prices.map(price => price.steam_price);
            const buffPrices = item.prices.map(price => price.buff_price);
            const ratios = item.prices.map(price => price.ratio);
            
            // 创建图表
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Steam 价格',
                            data: steamPrices,
                            borderColor: '#007bff',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Buff 价格',
                            data: buffPrices,
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: item.name,
                            font: {
                                size: 18,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                afterLabel: function(context) {
                                    const index = context.dataIndex;
                                    const ratio = ratios[index];
                                    const timestamp = item.prices[index].timestamp;
                                    const date = new Date(timestamp).toLocaleString('zh-CN');
                                    
                                    return [
                                        \`比例: \${ratio.toFixed(3)}\`,
                                        \`时间: \${date}\`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: '时间'
                            }
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: '价格 (¥)'
                            },
                            beginAtZero: false
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }
        
        // 显示/隐藏加载状态
        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
            document.getElementById('priceChart').style.display = show ? 'none' : 'block';
        }
        
        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', initializePage);
    </script>
</body>
</html>`;
}
