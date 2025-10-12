import { ProxyAgent, setGlobalDispatcher } from 'undici';

/**
 * 条件代理设置
 * - 在本地环境（非GitHub Actions）中启用代理
 * - 在GitHub Actions中禁用代理
 */
export function setupConditionalProxy() {
  // 检查是否在GitHub Actions环境中
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  
  if (isGitHubActions) {
    console.log('[proxy] 检测到GitHub Actions环境，跳过代理设置');
    return;
  }
  
  // 优先级：PROXY_URL > HTTPS_PROXY > ALL_PROXY > HTTP_PROXY
  const proxyUrl = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.ALL_PROXY || process.env.HTTP_PROXY;

  if (proxyUrl) {
    try {
      const agent = new ProxyAgent(proxyUrl);
      setGlobalDispatcher(agent);
      console.log('[proxy] 本地环境启用代理:', proxyUrl);
    } catch (error) {
      console.warn('[proxy] 代理初始化失败:', error.message);
    }
  } else {
    console.log('[proxy] 本地环境未设置代理，使用直连');
  }
}

// 自动执行代理设置
setupConditionalProxy();


