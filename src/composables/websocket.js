import { ref, onMounted, onUnmounted } from 'vue'
import { useWebSocketStore } from '@/stores/websocket'
import { useMessage } from 'naive-ui'
import { BackendMessageTypes } from '@/stores/websocket'

// 业务错误类型
const BusinessErrorType = {
  CHAT: 'CHAT',           // 聊天相关错误
  AUDIO: 'AUDIO',         // 音频相关错误
  HISTORY: 'HISTORY'      // 历史记录相关错误
}

export function useWebSocket() {
  const message = useMessage()
  const webSocketStore = useWebSocketStore()
  
  // 状态
  const isProcessing = ref(false)
  const currentOperation = ref(null)
  const lastError = ref(null)

  // 处理业务错误
  const handleBusinessError = (error, type) => {
    lastError.value = {
      type,
      message: error.message,
      timestamp: new Date().toISOString()
    }

    const errorMessages = {
      [BusinessErrorType.CHAT]: '发送消息失败',
      [BusinessErrorType.AUDIO]: '音频处理失败',
      [BusinessErrorType.HISTORY]: '历史记录操作失败'
    }

    message.error(errorMessages[type] || '操作失败')
    // 使用更简洁的错误日志格式
    console.error(`[WebSocketComposable] ${type}:`, error.message)
  }

  // 发送消息 - 适配后端格式
  const sendMessage = async (content, type = 'text') => {
    try {
      isProcessing.value = true
      currentOperation.value = 'sending_message'

      // 根据类型使用不同的发送方法
      let success = false
      if (type === 'text') {
        success = await webSocketStore.sendTextMessage(content)
      } else {
        // 对于其他类型，使用通用发送方法
        const message = {
          type: BackendMessageTypes.CONVERSATION.TEXT_INPUT,
          text: content
        }
        success = await webSocketStore.sendMessage(message)
      }

      if (!success) {
        throw new Error('消息发送失败')
      }

      return true
    } catch (error) {
      handleBusinessError(error, BusinessErrorType.CHAT)
      return false
    } finally {
      isProcessing.value = false
      currentOperation.value = null
    }
  }

  // 历史记录操作
  const historyOperation = async (operation, data = {}) => {
    try {
      isProcessing.value = true
      currentOperation.value = `history_${operation}`

      // 直接使用 webSocketStore 的历史记录方法
      switch (operation) {
        case 'fetch':
          await webSocketStore.fetchHistoryList()
          break
        case 'load':
          await webSocketStore.fetchAndSetHistory(data.historyId)
          break
        case 'create':
          await webSocketStore.createNewHistory()
          break
        case 'delete':
          await webSocketStore.deleteHistory(data.historyId)
          break
        default:
          throw new Error(`不支持的历史记录操作: ${operation}`)
      }

      return true
    } catch (error) {
      handleBusinessError(error, BusinessErrorType.HISTORY)
      return false
    } finally {
      isProcessing.value = false
      currentOperation.value = null
    }
  }

  // 生命周期钩子
  onMounted(() => {
    webSocketStore.connect()
  })

  onUnmounted(() => {
    webSocketStore.disconnect()
  })

  return {
    // 状态
    isProcessing,
    currentOperation,
    lastError,
    isConnected: webSocketStore.isConnected,

    // 操作方法
    sendMessage,
    historyOperation,

    // 状态
    configStatus: webSocketStore.configStatus,
    historyList: webSocketStore.historyList,
    currentHistory: webSocketStore.currentHistory
  }
} 