import { defineStore } from 'pinia'
import { webSocketService } from '@/services/WebSocketService'
import { useAIStore } from './ai' // Import the AI store
import { useChatStore } from './chat' // Import the Chat store

// 常量定义
const MAX_RETRY_COUNT = 3


// 错误类型定义
const StoreErrorType = {
  CONNECTION: 'CONNECTION',      // 连接状态错误
  MESSAGE: 'MESSAGE',           // 消息处理错误
  CONFIG: 'CONFIG',            // 配置相关错误
  HISTORY: 'HISTORY',          // 历史记录错误
}




// 后端WebSocket消息类型 - 基于websocket_handler.py
const BackendMessageTypes = {

  // 历史记录操作
  HISTORY: {
    FETCH_LIST: 'fetch-history-list',
    FETCH_AND_SET: 'fetch-and-set-history',
    CREATE_NEW: 'create-new-history',
    DELETE: 'delete-history'
  },
  // 对话操作
  CONVERSATION: {
    MIC_AUDIO_DATA: 'mic-audio-data',
    MIC_AUDIO_END: 'mic-audio-end',
    TEXT_INPUT: 'text-input',
    AI_SPEAK_SIGNAL: 'ai-speak-signal'
  },
  // AI状态
  AI_STATUS: 'ai-status', // Add new AI status message type
  // 配置操作
  CONFIG: {
    FETCH_CONFIGS: 'fetch-configs',
    SWITCH_CONFIG: 'switch-config',
    FETCH_BACKGROUNDS: 'fetch-backgrounds'
  },
  // 控制操作
  CONTROL: {
    INTERRUPT_SIGNAL: 'interrupt-signal',
    AUDIO_PLAY_START: 'audio-play-start'
  },
  // 数据操作
  DATA: {
    RAW_AUDIO_DATA: 'raw-audio-data'
  }
}

// 导出常量供其他文件使用
export { BackendMessageTypes }

export const useWebSocketStore = defineStore('websocket', {
  state: () => ({
    // 连接状态
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    retryCount: 0,
    lastError: null,
    clientUid: null,  // 客户端唯一标识符
    connectionTime: null,  // 连接建立时间
    lastConnectAttempt: null,  // 最后连接尝试时间
    
    

    
    // 配置相关
    configs: {
      character: null,    // 当前角色配置
      background: null    // 当前背景配置
    },
    configList: {
      character: [],      // 角色配置列表
      background: []      // 背景配置列表
    },

    
    // 历史记录
    historyList: [],
    currentHistory: null,
    

    
    // 背景列表
    backgrounds: [],
    


    // 服务器配置
    serverConfig: {
      host: 'localhost',
      port: 12393,
      protocol: 'ws',
      path: '/client-ws'
    },


  }),

  getters: {
    // 连接状态
    connectionStatus: (state) => {
      if (state.isConnected) return '已连接'
      if (state.isConnecting) return '连接中'
      if (state.connectionError) return `连接错误: ${state.connectionError}`
      return '未连接'
    },

    // 服务器URL
    serverUrl: (state) => `${state.serverConfig.protocol}://${state.serverConfig.host}:${state.serverConfig.port}${state.serverConfig.path}`,

    // 配置状态
    configStatus: (state) => ({
      current: state.configs,
      available: state.configList
    }),

    // 连接持续时间（毫秒）
    connectionDuration: (state) => {
      if (!state.isConnected || !state.connectionTime) return 0
      return Date.now() - state.connectionTime
    },

    // 格式化的连接持续时间
    formattedConnectionDuration: (state, getters) => {
      const duration = getters.connectionDuration
      if (duration === 0) return '未连接'

      const seconds = Math.floor(duration / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (hours > 0) {
        return `${hours}小时${minutes % 60}分钟`
      } else if (minutes > 0) {
        return `${minutes}分钟${seconds % 60}秒`
      } else {
        return `${seconds}秒`
      }
    }
  },

  actions: {
    // 更新服务器配置
    updateServerConfig(config) {
      this.serverConfig = { ...this.serverConfig, ...config }
      this.log(`服务器配置已更新: ${this.serverUrl}`)
    },



    // 日志记录
    log(message, type = 'info') {
      const prefix = `[WebSocketStore]`
      switch (type) {
        case 'error':
          console.error(`${prefix} ${message}`)
          break
        case 'warn':
          console.warn(`${prefix} ${message}`)
          break
        case 'debug':
          if (window.DEBUG_WEBSOCKET) {
            console.log(`${prefix} ${message}`)
          }
          break
        default:
          console.log(`${prefix} ${message}`)
      }
    },

    // 错误处理
    handleError(error, type = StoreErrorType.CONNECTION) {
      this.lastError = {
        type,
        message: error.message,
        timestamp: new Date().toISOString()
      }
      
      this.log(`错误 [${type}]: ${error.message}`, 'error')
      
      switch (type) {
        case StoreErrorType.CONNECTION:
          this.handleConnectionError(error)
          break
        case StoreErrorType.MESSAGE:
          this.handleMessageError(error)
          break
        case StoreErrorType.CONFIG:
          this.handleConfigError(error)
          break
        case StoreErrorType.HISTORY:
          this.handleHistoryError(error)
          break

      }
    },

    // 连接错误处理
    handleConnectionError(error) {
      this.connectionError = error.message
      this.retryCount++
      
      if (this.retryCount < MAX_RETRY_COUNT) {
        this.log(`尝试重新连接 (${this.retryCount}/${MAX_RETRY_COUNT})...`)
        setTimeout(() => this.connect(), 1000 * this.retryCount)
      } else {
        this.log('达到最大重试次数，请手动重连', 'warn')
      }
    },

    // 消息错误处理
    handleMessageError(error) {
      this.log(`消息处理失败: ${error.message}`, 'error')
    },

    // 配置错误处理
    handleConfigError(error) {
      this.log(`配置错误: ${error.message}`, 'error')
    },

    // 历史记录错误处理
    handleHistoryError(error) {
      this.log(`历史记录错误: ${error.message}`, 'error')
    },

    // 连接管理
    async connect() {
      if (this.isConnected || this.isConnecting) {
        this.handleError(new Error('已经在连接中或已连接'), StoreErrorType.CONNECTION)
        return false
      }

      this.isConnecting = true
      this.connectionError = null
      this.lastConnectAttempt = Date.now()

      try {
        const url = this.serverUrl
        this.log(`正在连接到 ${url}...`)

        // 设置消息处理器
        this.setupMessageHandlers()

        const connected = await webSocketService.connect(url)

        if (connected) {
          this.isConnected = true
          this.isConnecting = false
          this.retryCount = 0
          this.connectionTime = Date.now()

          this.log('连接成功')

          // 连接成功后获取初始数据
          await Promise.all([
            this.fetchHistoryList(),
            this.fetchConfigs()
          ])

          return true
        }

        throw new Error('连接失败')
      } catch (error) {
        this.handleError(error, StoreErrorType.CONNECTION)
        this.isConnecting = false
        return false
      }
    },

    disconnect() {
      this.log('正在断开连接...')
      webSocketService.disconnect()
      this.isConnected = false
      this.isConnecting = false
      this.connectionError = null
      this.retryCount = 0
      this.connectionTime = null
      this.log('已断开连接')
    },



    // 发送消息 - 适配后端格式
    async sendMessage(message) {
      if (!this.isConnected) {
        this.log('WebSocket未连接，无法发送消息', 'warn')
        return false
      }

      try {
        const formattedMessage = this.formatMessageForBackend(message)
        const response = await webSocketService.sendMessage(formattedMessage)
        
        // 处理响应
        if (response.error) {
          this.handleError(new Error(response.error), StoreErrorType.MESSAGE)
          return false
        }
        
        return true
      } catch (error) {
        this.handleError(error, StoreErrorType.MESSAGE)
        return false
      }
    },

    // 格式化消息以符合后端期望
    formatMessageForBackend(message) {
      // 如果已经是正确格式，直接返回
      if (typeof message === 'object' && message.type) {
        return message
      }

      // 兼容旧格式的消息转换
      if (typeof message === 'string') {
        return {
          type: BackendMessageTypes.CONVERSATION.TEXT_INPUT,
          text: message
        }
      }

      return message
    },



    // 历史记录管理 - 适配后端接口
    async fetchHistoryList() {
      this.log('开始获取历史记录列表...')
      try {
        const sent = await this.sendMessage({
          type: BackendMessageTypes.HISTORY.FETCH_LIST
        })
        if (!sent) {
          throw new Error('发送获取历史记录请求失败')
        }
      } catch (error) {
        this.handleError(error, StoreErrorType.HISTORY)
      }
    },

    async fetchAndSetHistory(historyUid) {
      this.log(`开始获取历史记录: ${historyUid}`)
      try {
        const sent = await this.sendMessage({
          type: BackendMessageTypes.HISTORY.FETCH_AND_SET,
          history_uid: historyUid
        })
        if (!sent) {
          throw new Error('发送获取历史记录请求失败')
        }
      } catch (error) {
        this.handleError(error, StoreErrorType.HISTORY)
      }
    },

    async createNewHistory() {
      this.log('开始创建新历史记录...')
      try {
        const sent = await this.sendMessage({
          type: BackendMessageTypes.HISTORY.CREATE_NEW
        })
        if (!sent) {
          throw new Error('发送创建历史记录请求失败')
        }
      } catch (error) {
        this.handleError(error, StoreErrorType.HISTORY)
      }
    },

    async deleteHistory(historyUid) {
      this.log(`开始删除历史记录: ${historyUid}`)
      try {
        const sent = await this.sendMessage({
          type: BackendMessageTypes.HISTORY.DELETE,
          history_uid: historyUid
        })
        if (!sent) {
          throw new Error('发送删除历史记录请求失败')
        }
      } catch (error) {
        this.handleError(error, StoreErrorType.HISTORY)
      }
    },



    // 配置管理 - 适配后端接口
    async fetchConfigs() {
      this.log('开始获取配置列表...')
      try {
        const sent = await this.sendMessage({
          type: BackendMessageTypes.CONFIG.FETCH_CONFIGS
        })
        if (!sent) {
          throw new Error('发送获取配置请求失败')
        }
        return true
      } catch (error) {
        this.handleError(error, StoreErrorType.CONFIG)
        return false
      }
    },

    async switchConfig(configFile) {
      this.log(`开始切换配置: ${configFile}`)
      try {
        const sent = await this.sendMessage({
          type: BackendMessageTypes.CONFIG.SWITCH_CONFIG,
          file: configFile
        })
        if (!sent) {
          throw new Error('发送切换配置请求失败')
        }
        return true
      } catch (error) {
        this.handleError(error, StoreErrorType.CONFIG)
        return false
      }
    },

    // 发送文本消息 - 适配后端接口
    async sendTextMessage(text) {
      this.log(`发送文本消息: ${text}`)
      try {
        const sent = await this.sendMessage({
          type: BackendMessageTypes.CONVERSATION.TEXT_INPUT,
          text: text
        })
        if (!sent) {
          throw new Error('发送文本消息失败')
        }
        return true
      } catch (error) {
        this.handleError(error, StoreErrorType.MESSAGE)
        return false
      }
    },

    // 发送音频数据（官方兼容：每帧用JSON分块发送）
    async sendAudioData(audioData) {
      try {
        // 仅支持 Float32Array 或 Int16Array，其他类型报错
        let float32Data
        if (audioData instanceof Float32Array) {
          float32Data = audioData
        } else if (audioData instanceof Int16Array) {
          // Int16转Float32（-32768~32767 → -1~1）
          float32Data = new Float32Array(audioData.length)
          for (let i = 0; i < audioData.length; i++) {
            float32Data[i] = audioData[i] / 32768
          }
        } else {
          this.log('音频数据类型仅支持 Float32Array 或 Int16Array', 'error')
          throw new Error('音频数据类型仅支持 Float32Array 或 Int16Array')
        }
        // 分块发送（如官方实现，chunkSize可根据实际调整）
        const chunkSize = 4096
        for (let i = 0; i < float32Data.length; i += chunkSize) {
          const chunk = float32Data.slice(i, i + chunkSize)
          const sent = await this.sendMessage({
            type: BackendMessageTypes.CONVERSATION.MIC_AUDIO_DATA,
            audio: Array.from(chunk)
          })
          this.log(`发送音频数据分块 ${i / chunkSize + 1}: ${sent ? '成功' : '失败'}`, 'debug')
          if (!sent) {
            throw new Error('发送音频分块失败')
          }
        }
        return true
      } catch (error) {
        this.handleError(error, StoreErrorType.MESSAGE)
        return false
      }
    },

    // 发送音频结束信号
    async sendAudioEnd() {
      try {
        const sent = await this.sendMessage({
          type: BackendMessageTypes.CONVERSATION.MIC_AUDIO_END
        })
        if (!sent) {
          throw new Error('发送音频结束信号失败')
        }
        return true
      } catch (error) {
        this.handleError(error, StoreErrorType.MESSAGE)
        return false
      }
    },

    // 发送中断信号
    async sendInterrupt(text = '') {
      this.log('发送中断信号')
      try {
        const sent = await this.sendMessage({
          type: BackendMessageTypes.CONTROL.INTERRUPT_SIGNAL,
          text: text
        })
        if (!sent) {
          throw new Error('发送中断信号失败')
        }
        return true
      } catch (error) {
        this.handleError(error, StoreErrorType.MESSAGE)
        return false
      }
    },





    // 设置消息处理器 - 用于接收后端消息
    setupMessageHandlers() {
      const aiStore = useAIStore(); // Get AI store instance

      // 注册各种消息类型的处理器
      webSocketService.onMessage('full-text', (message) => {
        this.handleFullTextMessage(message)
      })

      // Handle AI status messages
      webSocketService.onMessage(BackendMessageTypes.AI_STATUS, (message) => {
        if (message.status) {
          aiStore.setAIStatus(message.status);
        }
      });

      webSocketService.onMessage('audio', (message) => {
        this.handleAudioMessage(message)
      })

      webSocketService.onMessage('control', (message) => {
        this.handleControlMessage(message)
      })

      webSocketService.onMessage('history-list', (message) => {
        this.handleHistoryListMessage(message)
      })

      webSocketService.onMessage('history-data', (message) => {
        this.handleHistoryDataMessage(message)
      })



      webSocketService.onMessage('config-files', (message) => {
        this.handleConfigFilesMessage(message)
      })

      webSocketService.onMessage('error', (message) => {
        this.handleErrorMessage(message)
      })

      webSocketService.onMessage('set-model-and-conf', (message) => {
        this.handleSetModelAndConfMessage(message)
      })

      webSocketService.onMessage('backend-synth-complete', (message) => {
        this.handleBackendSynthCompleteMessage(message)
      })

      webSocketService.onMessage('force-new-message', (message) => {
        this.handleForceNewMessageMessage(message)
      })

      webSocketService.onMessage('asr_result', (message) => {
        this.handleASRResultMessage(message)
      })

      webSocketService.onMessage('user-input-transcription', (message) => {
        this.handleUserInputTranscriptionMessage(message)
      })
    },

    // 处理各种后端消息
    handleFullTextMessage(message) {
      this.log(`收到完整文本消息: ${message.text}`)
      // 触发事件给其他组件
      window.dispatchEvent(new CustomEvent('websocket:full-text', { detail: message }))
    },

    handleAudioMessage(message) {
      this.log(`收到音频消息: ${message.display_text?.text || '无文本'}`)
      // 触发事件给其他组件
      window.dispatchEvent(new CustomEvent('websocket:audio', { detail: message }))
    },



    handleSetModelAndConfMessage(message) {
      this.log('收到设置模型和配置消息')

      // 设置客户端UID
      if (message.client_uid) {
        this.clientUid = message.client_uid
        this.log(`设置客户端UID: ${message.client_uid}`)
      }

      // 更新当前配置信息
      if (message.conf_name) {
        this.configs.character = {
          conf_name: message.conf_name,
          conf_uid: message.conf_uid,
          name: message.conf_name,
          uid: message.conf_uid,
          // 添加对 model_info 的支持
          model_info: message.model_info,
          live2d_model_name: message.model_info?.name || message.model_info?.model_name,
          character_name: message.model_info?.character_name,
          human_name: message.model_info?.human_name
        }
        this.log(`更新配置: ${message.conf_name} (UID: ${message.conf_uid})`)

        // 增强的Live2D模型信息处理
        if (message.model_info) {
          this.log(`Live2D模型: ${message.model_info.name || message.model_info.model_name || '未知'}`)

          // 验证和清理模型配置数据
          const safeModelInfo = this.validateAndCleanModelInfo(message.model_info)

          if (safeModelInfo) {
            // 更新配置中的模型信息
            this.configs.character.model_info = safeModelInfo

            // 触发Live2D模型配置更新事件
            window.dispatchEvent(new CustomEvent('websocket:live2d-model-config', {
              detail: {
                modelInfo: safeModelInfo,
                confName: message.conf_name,
                confUid: message.conf_uid
              }
            }))
          }
        }
      }

      // 触发事件给其他组件
      window.dispatchEvent(new CustomEvent('websocket:set-model-and-conf', { detail: message }))
    },

    // 验证和清理模型信息的辅助方法
    validateAndCleanModelInfo(modelInfo) {
      try {
        if (!modelInfo || typeof modelInfo !== 'object') {
          this.log('无效的模型信息格式', 'warn')
          return null
        }

        // 创建安全的模型配置对象
        const safeConfig = {}

        // 基础信息
        if (modelInfo.name && typeof modelInfo.name === 'string') {
          safeConfig.name = modelInfo.name.trim()
        }
        if (modelInfo.model_name && typeof modelInfo.model_name === 'string') {
          safeConfig.model_name = modelInfo.model_name.trim()
        }
        if (modelInfo.url && typeof modelInfo.url === 'string') {
          safeConfig.url = modelInfo.url.trim()
        }

        // Live2D配置数据
        if (modelInfo.HitAreas && Array.isArray(modelInfo.HitAreas)) {
          safeConfig.HitAreas = modelInfo.HitAreas.filter(area =>
            area && typeof area === 'object' && area.Name
          )
        }

        if (modelInfo.Motions && typeof modelInfo.Motions === 'object') {
          safeConfig.Motions = {}
          Object.entries(modelInfo.Motions).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              safeConfig.Motions[key] = value
            }
          })
        }

        if (modelInfo.tapMotions && typeof modelInfo.tapMotions === 'object') {
          safeConfig.tapMotions = {}
          Object.entries(modelInfo.tapMotions).forEach(([key, value]) => {
            if (typeof value === 'object' || typeof value === 'number') {
              safeConfig.tapMotions[key] = value
            }
          })
        }

        if (modelInfo.Expressions && Array.isArray(modelInfo.Expressions)) {
          safeConfig.Expressions = modelInfo.Expressions.filter(expr =>
            expr && typeof expr === 'object'
          )
        }

        this.log('模型信息验证完成', 'debug')
        return safeConfig

      } catch (error) {
        this.log(`验证模型信息失败: ${error.message}`, 'error')
        return null
      }
    },

    handleControlMessage(message) {
      this.log(`收到控制消息: ${message.text}`)
      window.dispatchEvent(new CustomEvent('websocket:control', { detail: message }))
    },

    handleHistoryListMessage(message) {
      this.historyList = message.histories || []
      this.log(`更新历史记录列表，共${this.historyList.length}条`)
      window.dispatchEvent(new CustomEvent('websocket:history-list', { detail: message }))
    },

    handleHistoryDataMessage(message) {
      this.log('收到历史记录数据')
      window.dispatchEvent(new CustomEvent('websocket:history-data', { detail: message }))
    },

    handleConfigFilesMessage(message) {
      this.configList.character = message.configs || []
      this.log(`更新配置文件列表，共${this.configList.character.length}个`)
      window.dispatchEvent(new CustomEvent('websocket:config-files', { detail: message }))
    },

    handleErrorMessage(message) {
      this.log(`收到错误消息: ${message.message}`, 'error')
      this.handleError(new Error(message.message), StoreErrorType.MESSAGE)
    },

    // 处理后端语音合成完成消息
    async handleBackendSynthCompleteMessage(message) {
      this.log('🎵 后端语音合成完成')
      try {
        // 立即发送播放完成确认给后端
        const sent = await this.sendMessage({
          type: 'frontend-playback-complete'
        })
        if (sent) {
          this.log('✅ 已发送播放完成确认')
        } else {
          this.log('❌ 发送播放完成确认失败', 'error')
        }
      } catch (error) {
        this.log(`❌ 发送播放完成确认异常: ${error.message}`, 'error')
      }

      // 触发前端事件（供其他组件监听）
      window.dispatchEvent(new CustomEvent('websocket:backend-synth-complete', {
        detail: message
      }))
    },

    // 处理强制新消息分割消息
    handleForceNewMessageMessage(message) {
      this.log('🔄 收到强制新消息分割信号')
      // 触发前端事件，通知聊天组件结束当前消息累积
      window.dispatchEvent(new CustomEvent('websocket:force-new-message', {
        detail: message
      }))
    },

    // 处理ASR语音识别结果消息
    handleASRResultMessage(message) {
      this.log(`收到语音识别结果: ${message.text}`)
      // 自动将识别文本作为用户消息插入并驱动AI回复
      try {
        const chatStore = useChatStore()
        if (message.text && message.text.trim()) {
          // 1. 插入用户消息
          chatStore.addMessage({
            sender: 'user',
            type: 'text',
            content: message.text,
            timestamp: Date.now(),
            metadata: { status: 'sent', isSaved: true }
          })
          // 2. 触发AI回复
          chatStore.sendMessage({ type: 'text', content: message.text })
        }
      } catch (e) {
        this.log('处理ASR识别文本失败: ' + e.message, 'error')
      }
      // 可选：触发事件给其他组件
      window.dispatchEvent(new CustomEvent('websocket:asr-result', { detail: message }))
    },

    // 处理用户输入转录消息
    handleUserInputTranscriptionMessage(message) {
      this.log(`收到用户输入转录: ${message.text}`)
      // 自动将转录文本作为用户消息插入并驱动AI回复
      try {
        const chatStore = useChatStore()
        if (message.text && message.text.trim()) {
          // 1. 插入用户消息
          chatStore.addMessage({
            sender: 'user',
            type: 'text',
            content: message.text,
            timestamp: Date.now(),
            metadata: { status: 'sent', isSaved: true, isTranscription: true }
          })
          // 2. 触发AI回复
          chatStore.sendMessage({ type: 'text', content: message.text })
        }
      } catch (e) {
        this.log('处理用户输入转录失败: ' + e.message, 'error')
      }
      // 可选：触发事件给其他组件
      window.dispatchEvent(new CustomEvent('websocket:user-input-transcription', { detail: message }))
    },
  }
})
