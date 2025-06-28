/**
 * Live2D Utils - 工具函数
 * 提供Live2D相关的通用工具函数
 */

/**
 * 等待 Live2D 库加载完成
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<boolean>}
 */
export function waitForLive2D(timeout = 10000) {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const maxAttempts = timeout / 100 // 每100ms检查一次

    const checkLive2D = () => {
      attempts++

      // 检查本地 PIXI Live2D 库是否已加载
      if (window.PIXI &&
          window.PIXI.live2d &&
          window.PIXI.live2d.Live2DModel &&
          window.PIXI.live2d.Cubism4ModelSettings) {

        // 配置Live2D设置
        if (window.PIXI.live2d.CubismConfig) {
          window.PIXI.live2d.CubismConfig.setOpacityFromMotion = true
        }

        console.log('✅ [Live2DUtils] Live2D 库加载完成')
        resolve(true)
        return
      }

      if (attempts >= maxAttempts) {
        const error = new Error('Live2D 库加载超时，请检查 /libs/ 文件夹中的库文件')
        console.error('❌ [Live2DUtils]', error.message)
        reject(error)
        return
      }

      // 继续等待
      setTimeout(checkLive2D, 100)
    }

    checkLive2D()
  })
}

/**
 * 检查浏览器是否支持 WebGL
 * @returns {boolean}
 */
export function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  } catch (error) {
    console.error('❌ [Live2DUtils] WebGL 支持检查失败:', error)
    return false
  }
}

/**
 * 获取设备性能等级
 * @returns {string} 'high' | 'medium' | 'low'
 */
export function getDevicePerformanceLevel() {
  // 检查硬件并发数
  const cores = navigator.hardwareConcurrency || 2
  
  // 检查内存（如果可用）
  const memory = navigator.deviceMemory || 4
  
  // 检查GPU信息（如果可用）
  let gpuTier = 'unknown'
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        // 简单的GPU性能判断
        if (renderer.includes('GeForce') || renderer.includes('Radeon') || renderer.includes('Intel Iris')) {
          gpuTier = 'high'
        } else if (renderer.includes('Intel HD')) {
          gpuTier = 'medium'
        } else {
          gpuTier = 'low'
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ [Live2DUtils] GPU信息获取失败:', error)
  }

  // 综合判断性能等级
  if (cores >= 8 && memory >= 8 && gpuTier === 'high') {
    return 'high'
  } else if (cores >= 4 && memory >= 4 && gpuTier !== 'low') {
    return 'medium'
  } else {
    return 'low'
  }
}

/**
 * 获取推荐的性能设置
 * @param {string} performanceLevel - 性能等级
 * @returns {Object}
 */
export function getRecommendedSettings(performanceLevel = null) {
  const level = performanceLevel || getDevicePerformanceLevel()
  
  const settings = {
    high: {
      maxFPS: 60,
      minFPS: 30,
      antialias: true,
      enableCulling: true,
      enableBatching: true,
      textureGCMode: 'conservative',
      resolution: window.devicePixelRatio || 1,
      powerPreference: 'high-performance'
    },
    medium: {
      maxFPS: 45,
      minFPS: 20,
      antialias: true,
      enableCulling: true,
      enableBatching: true,
      textureGCMode: 'auto',
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      powerPreference: 'default'
    },
    low: {
      maxFPS: 30,
      minFPS: 15,
      antialias: false,
      enableCulling: true,
      enableBatching: true,
      textureGCMode: 'aggressive',
      resolution: 1,
      powerPreference: 'low-power'
    }
  }

  return settings[level] || settings.medium
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间
 * @returns {Function}
 */
export function throttle(func, limit) {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}



/**
 * 生成唯一ID
 * @param {string} prefix - 前缀
 * @returns {string}
 */
export function generateUniqueId(prefix = 'live2d') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * 深度克隆对象
 * @param {any} obj - 要克隆的对象
 * @returns {any}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

/**
 * 检查URL是否有效
 * @param {string} url - 要检查的URL
 * @returns {boolean}
 */
export function isValidUrl(url) {
  try {
    new URL(url, window.location.origin)
    return true
  } catch (error) {
    return false
  }
}

/**
 * 从URL中提取文件名
 * @param {string} url - URL字符串
 * @param {boolean} removeExtension - 是否移除扩展名
 * @returns {string}
 */
export function extractFilenameFromUrl(url, removeExtension = true) {
  if (!url || typeof url !== 'string') return '未知文件'
  
  try {
    const urlParts = url.split('/')
    let filename = urlParts[urlParts.length - 1]
    
    if (removeExtension) {
      filename = filename.replace(/\.(model3\.json|moc3|png|jpg|jpeg)$/i, '')
    }
    
    return filename || '未知文件'
  } catch (error) {
    console.error('❌ [Live2DUtils] 提取文件名失败:', error)
    return '未知文件'
  }
}

/**
 * 计算两点之间的距离
 * @param {Object} point1 - 点1 {x, y}
 * @param {Object} point2 - 点2 {x, y}
 * @returns {number}
 */
export function calculateDistance(point1, point2) {
  const dx = point2.x - point1.x
  const dy = point2.y - point1.y
  return Math.sqrt(dx * dx + dy * dy)
}



/**
 * 限制数值在指定范围内
 * @param {number} value - 数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * 线性插值
 * @param {number} start - 起始值
 * @param {number} end - 结束值
 * @param {number} t - 插值参数 (0-1)
 * @returns {number}
 */
export function lerp(start, end, t) {
  return start + (end - start) * clamp(t, 0, 1)
}



/**
 * 获取随机数组元素
 * @param {Array} array - 数组
 * @returns {any}
 */
export function getRandomArrayElement(array) {
  if (!Array.isArray(array) || array.length === 0) return null
  return array[Math.floor(Math.random() * array.length)]
}
