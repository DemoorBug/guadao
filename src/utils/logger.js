/**
 * 统一的日志控制工具
 * 支持全局环境变量控制，所有模块都可以使用
 * set -x DEBUG true 开启日志
 * set -x DEBUG false 关闭日志
 */

/**
 * 获取调试状态
 * @param {Object} options - 选项
 * @param {boolean} options.debug - 是否开启调试
 * @returns {boolean} 是否开启调试模式
 */
export function getDebugState(options = {}) {
  // 优先级：参数 > 环境变量 > 默认关闭
  if (typeof options.debug === 'boolean') {
    return options.debug;
  }
  return process.env.DEBUG === 'true';
}

/**
 * 创建日志函数
 * @param {Object} options - 选项
 * @param {boolean} options.debug - 是否开启调试
 * @param {string} options.prefix - 日志前缀
 * @returns {Object} 日志函数对象
 */
export function createLogger(options = {}) {
  const debug = getDebugState(options);
  const prefix = options.prefix || '';
  
  const formatMessage = (...args) => {
    if (prefix) {
      return [`[${prefix}]`, ...args];
    }
    return args;
  };
  
  return {
    // 普通日志
    log: (...args) => debug && console.log(...formatMessage(...args)),
    
    // 错误日志
    error: (...args) => debug && console.error(...formatMessage(...args)),
    
    // 警告日志
    warn: (...args) => debug && console.warn(...formatMessage(...args)),
    
    // 信息日志
    info: (...args) => debug && console.info(...formatMessage(...args)),
    
    // 调试日志
    debug: (...args) => debug && console.debug(...formatMessage(...args)),
    
    // 表格日志
    table: (data) => debug && console.table(data),
    
    // 分组日志
    group: (label) => debug && console.group(label),
    groupEnd: () => debug && console.groupEnd(),
    
    // 时间日志
    time: (label) => debug && console.time(label),
    timeEnd: (label) => debug && console.timeEnd(label),
    
    // 获取调试状态
    isDebug: () => debug
  };
}

/**
 * 默认日志实例（无前缀）
 */
export const logger = createLogger();

/**
 * 为特定模块创建日志实例
 * @param {string} moduleName - 模块名称
 * @param {Object} options - 选项
 * @returns {Object} 日志函数对象
 */
export function createModuleLogger(moduleName, options = {}) {
  return createLogger({ ...options, prefix: moduleName });
}

/**
 * 全局调试控制
 */
export const debugControl = {
  // 开启全局调试
  enable: () => {
    process.env.DEBUG = 'true';
  },
  
  // 关闭全局调试
  disable: () => {
    process.env.DEBUG = 'false';
  },
  
  // 检查当前状态
  isEnabled: () => process.env.DEBUG === 'true',
  
  // 切换状态
  toggle: () => {
    if (process.env.DEBUG === 'true') {
      process.env.DEBUG = 'false';
    } else {
      process.env.DEBUG = 'true';
    }
  }
};
