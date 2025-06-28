/**
 * 调试配置
 * 用于控制应用中的日志输出级别
 */

// 调试配置对象
export const debugConfig = {
  // 全局调试模式
  DEBUG_MODE: import.meta.env.DEV || localStorage.getItem('DEBUG_MODE') === 'true',
  
  // WebSocket 调试
  DEBUG_WEBSOCKET: import.meta.env.DEV || localStorage.getItem('DEBUG_WEBSOCKET') === 'true',
  
  // 音频调试
  DEBUG_AUDIO: localStorage.getItem('DEBUG_AUDIO') === 'true',
  
  // Live2D 调试
  DEBUG_LIVE2D: localStorage.getItem('DEBUG_LIVE2D') === 'true',
  
  // 聊天调试
  DEBUG_CHAT: localStorage.getItem('DEBUG_CHAT') === 'true',
  
  // 模型设置调试
  DEBUG_MODEL_SETTINGS: localStorage.getItem('DEBUG_MODEL_SETTINGS') === 'true'
}

// 设置调试模式
export const setDebugMode = (mode, value = true) => {
  if (mode === 'all') {
    // 设置所有调试模式
    Object.keys(debugConfig).forEach(key => {
      if (key.startsWith('DEBUG_')) {
        debugConfig[key] = value
        localStorage.setItem(key, value.toString())
      }
    })
  } else {
    // 设置特定调试模式
    const key = `DEBUG_${mode.toUpperCase()}`
    if (key in debugConfig) {
      debugConfig[key] = value
      localStorage.setItem(key, value.toString())
    }
  }
  
  // 更新全局变量
  updateGlobalDebugVars()
}

// 获取调试模式状态
export const getDebugMode = (mode) => {
  if (mode === 'all') {
    return Object.keys(debugConfig).every(key => 
      key.startsWith('DEBUG_') && debugConfig[key]
    )
  }
  
  const key = `DEBUG_${mode.toUpperCase()}`
  return debugConfig[key] || false
}

// 更新全局调试变量
export const updateGlobalDebugVars = () => {
  // 设置全局变量
  window.DEBUG_MODE = debugConfig.DEBUG_MODE
  window.DEBUG_WEBSOCKET = debugConfig.DEBUG_WEBSOCKET
  window.DEBUG_AUDIO = debugConfig.DEBUG_AUDIO
  window.DEBUG_LIVE2D = debugConfig.DEBUG_LIVE2D
  window.DEBUG_CHAT = debugConfig.DEBUG_CHAT
  window.DEBUG_MODEL_SETTINGS = debugConfig.DEBUG_MODEL_SETTINGS
}

// 初始化调试配置
export const initDebugConfig = () => {
  updateGlobalDebugVars()
  
  // 在开发环境下显示调试配置信息
  if (import.meta.env.DEV) {
    console.log('🔧 调试配置已初始化:', debugConfig)
  }
}

// 导出调试工具函数
export const debugLog = (module, message, level = 'info') => {
  const prefix = `[${module}]`
  const timestamp = new Date().toISOString()
  
  switch (level) {
    case 'error':
      console.error(`${timestamp} ${prefix} ${message}`)
      break
    case 'warn':
      console.warn(`${timestamp} ${prefix} ${message}`)
      break
    case 'debug':
      if (debugConfig.DEBUG_MODE) {
        console.log(`${timestamp} ${prefix} ${message}`)
      }
      break
    default:
      console.log(`${timestamp} ${prefix} ${message}`)
  }
}

// 默认导出
export default debugConfig 