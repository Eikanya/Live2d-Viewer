/**
 * WebSocket服务类 - 处理与后端的实时通信
 */
import { ref } from 'vue'
import { globalResourceManager } from '../utils/resource-manager.js'

// 错误类型定义
const WebSocketErrorType = {
  CONNECTION: 'CONNECTION',   // 连接错误
  TIMEOUT: 'TIMEOUT',        // 超时错误
  PARSE: 'PARSE',           // 解析错误
  NETWORK: 'NETWORK',       // 网络错误
  UNKNOWN: 'UNKNOWN'        // 未知错误
}

export class WebSocketService {
  constructor() {
    // WebSocket实例
    this.ws = null
    
    // 基础状态
    this.isConnected = ref(false)
    this.isConnecting = ref(false)
    this.error = ref(null)
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.connectionTimeout = 5000
    this.connectionTimer = null
    this.messageHandlers = new Map()
    
    // 消息队列
    this.messageQueue = []
    
    // 待处理响应
    this.pendingResponses = new Map();
    
    // 重连相关
    this.autoReconnect = true
    
    // 注册到资源管理器
    this.registerToResourceManager()
  }

  // 注册到资源管理器
  registerToResourceManager() {
    globalResourceManager.registerCleanupCallback(() => {
      this.cleanup()
    })
  }

  // 连接WebSocket
  async connect(url) {
    if (this.isConnected.value || this.isConnecting.value) {
      this.log('WebSocket正在连接或已连接', 'warn')
      return false
    }

    this.isConnecting.value = true
    this.error.value = null

    try {
      this.ws = new WebSocket(url)
      
      // 注册 WebSocket 到资源管理器
      globalResourceManager.registerResource('websocket', this.ws, (ws) => {
        if (ws && ws.readyState !== WebSocket.CLOSED) {
          ws.close(1000, '资源管理器清理')
        }
      })
      
      this.setupEventListeners()
      await this.waitForConnection()
      this.isConnected.value = true
      this.reconnectAttempts = 0
      
      // 处理队列中的消息
      this.processMessageQueue()
      
      return true
    } catch (error) {
      this.handleError(error, WebSocketErrorType.CONNECTION)
      this.isConnected.value = false
      return false
    } finally {
      this.isConnecting.value = false
    }
  }

  // 断开连接
  disconnect() {
    this.autoReconnect = false
    
    if (this.ws) {
      this.ws.close(1000, '正常关闭')
      this.ws = null
    }
    
    this.isConnected.value = false
    this.isConnecting.value = false
    this.error.value = null
    
    // 清理重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    // 清理连接超时定时器
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }
    
    // 清理所有待处理的响应
    this.cleanupPendingResponses()
  }

  // 发送消息
  async sendMessage(message) {
    if (!this.isConnected.value) {
      this.messageQueue.push(message)
      throw new Error('WebSocket未连接，消息已加入队列')
    }

    return new Promise((resolve, reject) => {
      try {
        const messageStr = JSON.stringify(message)
        this.ws.send(messageStr)
        this.log(`发送消息: ${message.type || 'unknown'}`, 'debug')
        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }

  // 发送二进制数据（如音频帧）
  sendBinary(data) {
    if (!this.ws || this.ws.readyState !== 1) {
      this.log('[sendBinary] WebSocket未连接或状态异常，无法发送二进制数据', 'warn')
      throw new Error('WebSocket未连接或状态异常')
    }
    try {
      this.ws.send(data)
      this.log(`[sendBinary] 已发送二进制数据，字节长度: ${data?.byteLength || data?.length || '未知'}`, 'debug')
      return true
    } catch (err) {
      this.log(`[sendBinary] ws.send 失败: ${err.message}`, 'error')
      throw err
    }
  }

  // 处理消息队列
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      this.sendMessage(message).catch(error => {
        this.log(`处理队列消息失败: ${error.message}`, 'error')
      })
    }
  }

  // 清理待处理的响应
  cleanupPendingResponses() {
    if (this.pendingResponses && typeof this.pendingResponses.clear === 'function') {
      this.pendingResponses.clear();
    }
  }

  // 设置事件监听器
  setupEventListeners() {
    this.ws.onopen = () => {
      this.isConnected.value = true
      this.isConnecting.value = false
      this.error.value = null
      this.reconnectAttempts = 0
      
      this.log('WebSocket连接已建立', 'info')

      // 触发连接成功事件
      window.dispatchEvent(new CustomEvent('websocket:connected'))
    }

    this.ws.onclose = (event) => {
      this.isConnected.value = false
      this.isConnecting.value = false
      this.handleClose(event)

      // 触发连接关闭事件
      window.dispatchEvent(new CustomEvent('websocket:disconnected', { detail: event }))
    }

    this.ws.onerror = (error) => {
      this.handleError(error, WebSocketErrorType.CONNECTION)

      // 触发连接错误事件
      window.dispatchEvent(new CustomEvent('websocket:error', { detail: error }))
    }

    this.ws.onmessage = (event) => {
      const message = this.handleMessage(event)
      if (message) {
        this.notifyMessageHandlers(message)
      }
    }
  }

  // 等待连接建立
  waitForConnection() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('WebSocket连接超时'))
      }, this.connectionTimeout)
      this.connectionTimer = timer
      globalResourceManager.registerTimer(timer)

      this.ws.onopen = () => {
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer)
          this.connectionTimer = null
        }
        resolve()
      }
    })
  }

  // 处理消息
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data)
      
      // 处理响应消息
      if (message.messageId && this.pendingResponses.has(message.messageId)) {
        const { resolve, timeoutId } = this.pendingResponses.get(message.messageId)
        clearTimeout(timeoutId)
        this.pendingResponses.delete(message.messageId)
        resolve(message)
        return message
      }

      // 处理普通消息 - 只在调试模式下记录
      if (window.DEBUG_WEBSOCKET) {
        this.log(`收到消息: ${message.type || 'unknown'}`, 'debug')
      }

      this.dispatchGlobalEvent(message)
      return message
    } catch (error) {
      this.handleError(error, WebSocketErrorType.PARSE)
      return null
    }
  }

  // 分发全局事件
  dispatchGlobalEvent(message) {
    window.dispatchEvent(new CustomEvent('websocket:message', { detail: message }))
  }

  // 处理连接关闭
  handleClose(event) {
    // 清理所有待处理的响应
    this.cleanupPendingResponses()
    
    this.log(`WebSocket连接已关闭: ${event.code} - ${event.reason}`, 'info')
    
    // 自动重连逻辑
    if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  // 安排重连
  scheduleReconnect() {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // 指数退避
    
    this.log(`安排重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts}) 延迟: ${delay}ms`, 'info')
    
    const timer = setTimeout(() => {
      this.reconnect()
    }, delay)
    this.reconnectTimer = timer
    globalResourceManager.registerTimer(timer)
  }

  // 重连
  async reconnect() {
    if (this.isConnecting.value || this.isConnected.value) {
      return
    }
    
    this.log('开始重连...', 'info')
    // 这里需要重新获取 URL，可能需要从 store 或其他地方获取
    // 暂时使用一个占位符，实际使用时需要传入正确的 URL
    const url = this.getReconnectUrl()
    if (url) {
      await this.connect(url)
    }
  }

  // 获取重连 URL（需要根据实际情况实现）
  getReconnectUrl() {
    // 这里应该返回实际的 WebSocket URL
    // 可以从 store 或其他配置中获取
    return null
  }

  // 处理错误
  handleError(error, type = WebSocketErrorType.UNKNOWN) {
    this.error.value = {
      type,
      message: error.message || '未知错误',
      timestamp: Date.now()
    }
    
    this.log(`WebSocket错误 [${type}]: ${error.message}`, 'error')
  }

  // 注册消息处理器
  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }
    this.messageHandlers.get(type).push(handler)
  }

  // 移除消息处理器
  offMessage(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type)
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // 通知消息处理器
  notifyMessageHandlers(message) {
    const type = message.type
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type).forEach(handler => {
        try {
          handler(message)
        } catch (error) {
          this.log(`消息处理器错误: ${error.message}`, 'error')
        }
      })
    }
  }

  // 清理资源
  cleanup() {
    this.disconnect()
    this.messageHandlers.clear()
    this.messageQueue = []
  }

  // 日志记录
  log(message, level = 'info') {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [WebSocketService] ${message}`
    
    switch (level) {
      case 'error':
        console.error(logMessage)
        break
      case 'warn':
        console.warn(logMessage)
        break
      case 'debug':
        if (window.DEBUG_WEBSOCKET) {
          console.log(logMessage)
        }
        break
      default:
        console.log(logMessage)
    }
  }
}

export { WebSocketErrorType }
export const webSocketService = new WebSocketService()
