/**
 * 资源管理器
 * 统一管理定时器、事件监听器、音频上下文、WebGL上下文等资源
 */

export class ResourceManager {
  constructor() {
    this.resources = new Map()
    this.timers = new Set()
    this.eventListeners = new Map()
    this.audioContexts = new Set()
    this.webglContexts = new Set()
    this.cleanupCallbacks = new Set()
    
    // 新增：统一的事件监听器管理
    this.globalEventListeners = new Map()
    this.modelEventListeners = new Map()
    
    // 新增：统一的资源清理策略
    this.cleanupStrategies = {
      timer: (timer) => clearTimeout(timer),
      interval: (interval) => clearInterval(interval),
      eventListener: (listener) => {
        if (listener.element && listener.handler) {
          listener.element.removeEventListener(listener.event, listener.handler)
        }
      },
      audioContext: (context) => {
        if (context && typeof context.close === 'function') {
          context.close()
        }
      },
      webglContext: (context) => {
        if (context && typeof context.getExtension === 'function') {
          const loseContext = context.getExtension('WEBGL_lose_context')
          if (loseContext) {
            loseContext.loseContext()
          }
        }
      },
      model: (model) => {
        if (model && typeof model.destroy === 'function') {
          model.destroy({ children: true, texture: true, baseTexture: true })
        }
      }
    }
  }

  /**
   * 注册定时器
   * @param {string} id - 定时器ID
   * @param {number} timer - 定时器引用
   */
  registerTimer(id, timer) {
    this.timers.add(timer)
    console.log(`📝 [ResourceManager] 注册定时器: ${id}`)
  }

  /**
   * 注册事件监听器
   * @param {string} id - 监听器ID
   * @param {HTMLElement} element - 元素
   * @param {string} event - 事件类型
   * @param {Function} handler - 事件处理函数
   */
  registerEventListener(id, element, event, handler) {
    if (!this.eventListeners.has(id)) {
      this.eventListeners.set(id, [])
    }
    this.eventListeners.get(id).push({ element, event, handler })
    console.log(`📝 [ResourceManager] 注册事件监听器: ${id}`)
  }

  /**
   * 注册全局事件监听器
   * @param {string} name - 监听器名称
   * @param {string} event - 事件类型
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 事件选项
   */
  registerGlobalEventListener(name, event, handler, options = {}) {
    if (!this.globalEventListeners.has(name)) {
      this.globalEventListeners.set(name, [])
    }
    
    const listener = { event, handler, options }
    this.globalEventListeners.get(name).push(listener)
    window.addEventListener(event, handler, options)
    console.log(`📝 [ResourceManager] 注册全局事件监听器: ${name} (${event})`)
  }

  /**
   * 注册模型事件监听器
   * @param {string} modelId - 模型ID
   * @param {string} eventType - 事件类型
   * @param {Function} handler - 事件处理函数
   */
  registerModelEventListener(modelId, eventType, handler) {
    if (!this.modelEventListeners.has(modelId)) {
      this.modelEventListeners.set(modelId, [])
    }
    
    const listener = { eventType, handler }
    this.modelEventListeners.get(modelId).push(listener)
    console.log(`📝 [ResourceManager] 注册模型事件监听器: ${modelId} (${eventType})`)
  }

  /**
   * 注册音频上下文
   * @param {string} id - 音频上下文ID
   * @param {AudioContext} context - 音频上下文
   */
  registerAudioContext(id, context) {
    this.audioContexts.add(context)
    console.log(`📝 [ResourceManager] 注册音频上下文: ${id}`)
  }

  /**
   * 注册WebGL上下文
   * @param {string} id - WebGL上下文ID
   * @param {WebGLRenderingContext} context - WebGL上下文
   */
  registerWebGLContext(id, context) {
    this.webglContexts.add(context)
    console.log(`📝 [ResourceManager] 注册WebGL上下文: ${id}`)
  }

  /**
   * 注册清理回调
   * @param {Function} callback - 清理回调函数
   */
  registerCleanupCallback(callback) {
    this.cleanupCallbacks.add(callback)
  }

  /**
   * 清理指定资源
   * @param {string} resourceType - 资源类型
   * @param {string} resourceId - 资源ID
   */
  cleanupResource(resourceType, resourceId) {
    try {
      switch (resourceType) {
        case 'timer':
          const timer = this.timers.values().next().value
          if (timer) {
            this.cleanupStrategies.timer(timer)
            this.timers.delete(timer)
          }
          break
        case 'eventListener':
          const listeners = this.eventListeners.get(resourceId)
          if (listeners) {
            listeners.forEach(listener => {
              this.cleanupStrategies.eventListener(listener)
            })
            this.eventListeners.delete(resourceId)
          }
          break
        case 'globalEventListener':
          const globalListeners = this.globalEventListeners.get(resourceId)
          if (globalListeners) {
            globalListeners.forEach(listener => {
              this.cleanupStrategies.eventListener(listener)
            })
            this.globalEventListeners.delete(resourceId)
          }
          break
        case 'modelEventListener':
          const modelListeners = this.modelEventListeners.get(resourceId)
          if (modelListeners) {
            modelListeners.forEach(listener => {
              // 模型事件监听器通常由模型自己管理
              console.log(`🧹 [ResourceManager] 清理模型事件监听器: ${resourceId} (${listener.eventType})`)
            })
            this.modelEventListeners.delete(resourceId)
          }
          break
        case 'audioContext':
          const audioContext = this.audioContexts.values().next().value
          if (audioContext) {
            this.cleanupStrategies.audioContext(audioContext)
            this.audioContexts.delete(audioContext)
          }
          break
        case 'webglContext':
          const webglContext = this.webglContexts.values().next().value
          if (webglContext) {
            this.cleanupStrategies.webglContext(webglContext)
            this.webglContexts.delete(webglContext)
          }
          break
      }
      console.log(`🧹 [ResourceManager] 清理资源: ${resourceId}`)
    } catch (error) {
      console.error(`❌ [ResourceManager] 清理${resourceType}失败${resourceId ? ` (${resourceId})` : ''}:`, error)
    }
  }

  /**
   * 清理所有定时器
   */
  cleanupTimers() {
    let cleanedCount = 0
    this.timers.forEach(timer => {
      this.cleanupStrategies.timer(timer)
      cleanedCount++
    })
    this.timers.clear()
    console.log(`🧹 [ResourceManager] 清理定时器: ${cleanedCount} 个`)
  }

  /**
   * 清理所有事件监听器
   */
  cleanupEventListeners() {
    let cleanedCount = 0
    this.eventListeners.forEach((listeners, key) => {
      listeners.forEach(({ element, event, handler }) => {
        this.cleanupStrategies.eventListener({ element, event, handler })
        cleanedCount++
      })
    })
    this.eventListeners.clear()
    console.log(`🧹 [ResourceManager] 清理事件监听器: ${cleanedCount} 个`)
  }

  /**
   * 清理所有全局事件监听器
   */
  cleanupGlobalEventListeners() {
    let cleanedCount = 0
    this.globalEventListeners.forEach((listeners, name) => {
      listeners.forEach(listener => {
        this.cleanupStrategies.eventListener(listener)
        cleanedCount++
      })
    })
    this.globalEventListeners.clear()
    console.log(`🧹 [ResourceManager] 清理全局事件监听器: ${cleanedCount} 个`)
  }

  /**
   * 清理所有模型事件监听器
   */
  cleanupModelEventListeners() {
    let cleanedCount = 0
    this.modelEventListeners.forEach((listeners, modelId) => {
      listeners.forEach(listener => {
        console.log(`🧹 [ResourceManager] 清理模型事件监听器: ${modelId} (${listener.eventType})`)
        cleanedCount++
      })
    })
    this.modelEventListeners.clear()
    console.log(`🧹 [ResourceManager] 清理模型事件监听器: ${cleanedCount} 个`)
  }

  /**
   * 清理所有音频上下文
   */
  cleanupAudioContexts() {
    let cleanedCount = 0
    this.audioContexts.forEach(context => {
      this.cleanupStrategies.audioContext(context)
      cleanedCount++
    })
    this.audioContexts.clear()
    console.log(`🧹 [ResourceManager] 清理音频上下文: ${cleanedCount} 个`)
  }

  /**
   * 清理所有WebGL上下文
   */
  cleanupWebGLContexts() {
    let cleanedCount = 0
    this.webglContexts.forEach(context => {
      this.cleanupStrategies.webglContext(context)
      cleanedCount++
    })
    this.webglContexts.clear()
    console.log(`🧹 [ResourceManager] 清理 WebGL 上下文: ${cleanedCount} 个`)
  }

  /**
   * 执行所有清理回调
   */
  executeCleanupCallbacks() {
    let executedCount = 0
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback()
        executedCount++
      } catch (error) {
        console.error('❌ [ResourceManager] 执行清理回调失败:', error)
      }
    })
    this.cleanupCallbacks.clear()
    console.log(`🧹 [ResourceManager] 执行清理回调: ${executedCount} 个`)
  }

  /**
   * 清理所有资源
   */
  cleanupAll() {
    console.log('🧹 [ResourceManager] 开始清理所有资源...')
    
    // 执行清理回调
    this.executeCleanupCallbacks()
    
    // 清理定时器
    this.cleanupTimers()
    
    // 清理事件监听器
    this.cleanupEventListeners()
    
    // 清理全局事件监听器
    this.cleanupGlobalEventListeners()
    
    // 清理模型事件监听器
    this.cleanupModelEventListeners()
    
    // 清理音频上下文
    this.cleanupAudioContexts()
    
    // 清理WebGL上下文
    this.cleanupWebGLContexts()
    
    // 清理其他资源
    this.resources.clear()
    
    const resourceCount = this.getResourceCount()
    console.log(`🧹 [ResourceManager] 所有资源已清理完成 (资源: ${resourceCount} 个)`)
  }

  /**
   * 获取资源统计信息
   */
  getResourceCount() {
    return {
      timers: this.timers.size,
      eventListeners: Array.from(this.eventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      globalEventListeners: Array.from(this.globalEventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      modelEventListeners: Array.from(this.modelEventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      audioContexts: this.audioContexts.size,
      webglContexts: this.webglContexts.size,
      cleanupCallbacks: this.cleanupCallbacks.size,
      resources: this.resources.size
    }
  }

  /**
   * 向后兼容的获取统计信息方法
   * @deprecated 使用 getResourceCount() 替代
   */
  getStats() {
    console.warn('⚠️ [ResourceManager] getStats已废弃，请使用getResourceCount')
    return this.getResourceCount()
  }

  /**
   * 检查是否有未清理的资源
   */
  hasUncleanedResources() {
    const counts = this.getResourceCount()
    return Object.values(counts).some(count => count > 0)
  }
}

// 创建全局资源管理器实例
export const globalResourceManager = new ResourceManager()

// 页面卸载时自动清理所有资源
window.addEventListener('beforeunload', () => {
  globalResourceManager.cleanupAll()
}) 