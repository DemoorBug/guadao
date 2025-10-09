import { ProxyAgent, setGlobalDispatcher } from 'undici';

// 优先级：PROXY_URL > HTTPS_PROXY > ALL_PROXY > HTTP_PROXY
const proxyUrl = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.ALL_PROXY || process.env.HTTP_PROXY;

if (proxyUrl) {
  try {
    const agent = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(agent);
    // 可按需打开调试：console.log('[proxy] using', proxyUrl);
  } catch (_) {
    // 忽略代理初始化错误
  }
}


