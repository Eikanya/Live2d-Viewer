import { defineStore } from 'pinia'
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useWebSocketStore } from './websocket.js'
import { useAudioStore } from './audio.js'
import { useSubtitleStore } from './subtitle.js'
import { useAIStore } from './ai.js' // Import the AI store
import { audioService } from '@/services/AudioService.js'

// 日志工具函数
const log = (message, level = 'info') => {
  const prefix = '[ChatStore]'
  const timestamp = new Date().toISOString()
  
  switch (level) {
    case 'error':
      console.error(`${timestamp} ${prefix} ${message}`)
      break
    case 'warn':
      console.warn(`${timestamp} ${prefix} ${message}`)
      break
    case 'debug':
      if (window.DEBUG_MODE) {
        console.log(`${timestamp} ${prefix} ${message}`)
      }
      break
    default:
      console.log(`${timestamp} ${prefix} ${message}`)
  }
}

export const useChatStore = defineStore('chat', () => {
  const webSocketStore = useWebSocketStore()
  const audioStore = useAudioStore()
  const subtitleStore = useSubtitleStore()
  const aiStore = useAIStore() // Use the AI store

  // 聊天状态
  const messages = ref([])
  const currentHistoryId = ref(null)
  const isAISpeaking = ref(false)
  const isTyping = ref(false)
  const currentAudio = ref(null)
  
  // 历史记录
  const historyList = ref([])
  
  // 聊天设置
  const chatSettings = reactive({
    showTimestamp: true,
    showAvatar: true,
    autoScroll: true,
    maxMessages: 1000,
    // 语音相关设置
    enableVoiceInput: localStorage.getItem('enableVoiceInput') === 'true',
    autoPlayAudio: localStorage.getItem('autoPlayAudio') !== 'false'
  })


  // 统计信息
  const chatStats = reactive({
    totalMessages: 0,
    userMessages: 0,
    aiMessages: 0,
    currentSessionMessages: 0,
    sessionStartTime: Date.now()
  })



  // 计算属性
  const recentMessages = computed(() => {
    return messages.value.slice(-50) // 只显示最近50条消息
  })

  const sessionDuration = computed(() => {
    return Date.now() - chatStats.sessionStartTime
  })





  // 添加消息，支持isNew参数
  const addMessage = (message, isNew = true) => {
    // 智能ID生成：优先使用后端ID，避免冲突
    let messageId
    if (message.message_id) {
      // 后端提供的ID，直接使用
      messageId = message.message_id
    } else if (message.id && !message.id.startsWith('msg_')) {
      // 如果有ID但不是前端生成的格式，可能是后端ID
      messageId = message.id
    } else {
      // 生成前端ID，但要检查是否冲突
      do {
        messageId = generateMessageId()
      } while (messages.value.some(msg => msg.id === messageId))
    }

    // 检查消息是否已存在（防止重复添加）
    const existingMessage = messages.value.find(msg =>
      msg.id === messageId ||
      (msg.metadata?.backendMessageId && msg.metadata.backendMessageId === message.message_id)
    )

    if (existingMessage) {
      log('消息已存在，更新而非添加', 'warn')
      // 更新现有消息而不是添加新消息
      Object.assign(existingMessage, {
        content: message.content || existingMessage.content,
        audio: message.audio || existingMessage.audio,
        metadata: {
          ...existingMessage.metadata,
          ...(message.metadata || {}),
          backendMessageId: message.message_id || existingMessage.metadata?.backendMessageId
        }
      })
      return existingMessage
    }

    const messageObj = {
      id: messageId,
      timestamp: message.timestamp || Date.now(),
      type: message.type || 'text',
      sender: message.sender || 'user',
      content: message.content || '',
      audio: message.audio || null,
      metadata: {
        // 基础状态
        status: message.sender === 'user' ? 'sent' : 'received',
        isStreaming: message.sender === 'ai' ? true : false,

        // 保存状态字段
        isSaved: message.sender === 'user' ? true : false,
        saveTimestamp: message.sender === 'user' ? Date.now() : null,
        historyUid: currentHistoryId.value,
        backendMessageId: message.message_id || null,

        // ID冲突检查信息
        idSource: message.message_id ? 'backend' : 'frontend',
        originalId: message.id || null,

        // 合并原有metadata
        ...(message.metadata || {})
      },
      isNew,
      ...message
    }
    messages.value.push(messageObj)
    
    // 更新统计
    chatStats.totalMessages++
    chatStats.currentSessionMessages++
    
    if (messageObj.sender === 'user') {
      chatStats.userMessages++
    } else if (messageObj.sender === 'ai') {
      chatStats.aiMessages++
    }

    // 限制消息数量
    if (messages.value.length > chatSettings.maxMessages) {
      messages.value.shift()
    }

    log('添加消息', 'debug')
    return messageObj
  }

  // 发送消息（统一入口）
  const sendMessage = async (message) => {
    if (!checkConnection()) {
      return false
    }

    // 添加用户消息
    const userMessage = addMessage({
      sender: 'user',
      type: message.type || 'text',
      content: message.content || '',
      metadata: {
        status: 'sending'
      }
    })

    // 设置打字状态
    setTyping(true)

    try {
      // 使用后端兼容的专用发送方法
      let success = false
      if (message.type === 'text' || !message.type) {
        success = await webSocketStore.sendTextMessage(message.content)
      } else if (message.type === 'audio') {
        success = await webSocketStore.sendAudioData(message.audio || message.content)
      } else {
        // 对于其他类型，使用通用方法
        success = await webSocketStore.sendMessage({
          type: message.type,
          text: message.content,
          ...message
        })
      }

      if (success) {
        // 更新消息状态
        userMessage.metadata.status = 'sent'
        return true
      } else {
        userMessage.metadata.status = 'failed'
        setTyping(false)
        return false
      }
    } catch (error) {
      log(`发送消息失败: ${error.message}`, 'error')
      userMessage.metadata.status = 'failed'
      setTyping(false)
      throw error
    }
  }

  // 发送文本消息（兼容旧接口）
  const sendTextMessage = async (text) => {
    return sendMessage({
      type: 'text',
      content: text
    })
  }

  // 发送语音消息
  const sendVoiceMessage = async (audioData) => {
    if (!checkConnection()) {
      return false
    }

    // 添加用户语音消息
    const userMessage = addMessage({
      sender: 'user',
      type: 'audio',
      audio: audioData,
      metadata: {
        status: 'sending'
      }
    })

    // 设置打字状态
    setTyping(true)

    try {
      // 使用后端兼容的音频数据发送方法
      const success = await webSocketStore.sendAudioData(audioData)

      if (success) {
        // 更新消息状态
        userMessage.metadata.status = 'sent'
      } else {
        userMessage.metadata.status = 'failed'
        setTyping(false)
      }

      return success
    } catch (error) {
      log(`发送语音消息失败: ${error.message}`, 'error')
      userMessage.metadata.status = 'failed'
      setTyping(false)
      return false
    }
  }

  // 处理AI响应，合并分段文本/音频，AI新消息isNew=true
  const handleAIResponse = async (response) => {
    log('收到AI响应', 'debug')

    let aiMessage = null
    const lastUserMessage = messages.value.slice().reverse().find(msg => msg.sender === 'user')
    const lastMessage = messages.value.length > 0 ? messages.value[messages.value.length - 1] : null

    // 当AI开始响应时，更新AI状态
    if (!lastMessage || lastMessage.sender !== 'ai' || (response.type === 'audio' && !lastMessage.audio)) {
      aiStore.setAIStatus('thinking_speaking');
    }

    // 确定要显示的文本内容（优先使用display_text）
    let displayContent = ''
    if (response.display_text && response.display_text.text) {
      displayContent = response.display_text.text
    } else if (response.text) {
      displayContent = response.text
    }

    // 如果是新的AI回复开始，清除之前的字幕
    // if (!lastMessage || lastMessage.sender !== 'ai') {
    //   subtitleStore.clearSubtitle()
    // }

    // 处理不同类型的响应
    if (response.type === 'full-text' && displayContent) {
      // 处理简单的文本响应
      if (lastUserMessage && (!lastMessage || lastMessage.sender !== 'ai')) {
        aiMessage = addMessage({
          sender: 'ai',
          type: 'text',
          content: displayContent,
          metadata: {
            status: 'received',
            isStreaming: false,
            originalResponse: response  // 保存原始响应用于调试
          }
        }, true)

      } else if (lastMessage && lastMessage.sender === 'ai') {
        // 如果最后一条消息是AI的，更新它
        lastMessage.content = displayContent
        lastMessage.metadata.isStreaming = false
        aiMessage = lastMessage

      }
    } else if (response.type === 'audio') {
      // 处理音频响应格式
      if (lastUserMessage && (!lastMessage || lastMessage.sender !== 'ai')) {
        // 创建新的AI消息
        aiMessage = addMessage({
          sender: 'ai',
          type: 'text', // 显示为文本类型，但包含音频数据
          content: displayContent,
          audio: response.audio || null,
          metadata: {
            allDisplayTexts: response.display_text ? [response.display_text] : [],
            actions: response.actions,
            volumes: response.volumes,
            sliceLength: response.slice_length,
            status: 'received',
            isStreaming: false,
            originalResponse: response
          }
        }, true)

      } else if (lastMessage && lastMessage.sender === 'ai') {
        // 更新现有AI消息 - 带分段序号的累积逻辑
        if (response.audio) {
          lastMessage.audio = response.audio
        }
        if (response.display_text) {
          if (!lastMessage.metadata.allDisplayTexts) lastMessage.metadata.allDisplayTexts = []
          if (!lastMessage.metadata.segmentOrder) lastMessage.metadata.segmentOrder = []

          // 如果这是第一个真正的AI回复，清除"Thinking..."状态
          if (lastMessage.content === 'Thinking...' && lastMessage.metadata.allDisplayTexts.length === 0) {
            lastMessage.content = ''
          }

          // 获取分段信息
          const segmentId = response.segment_id || lastMessage.metadata.allDisplayTexts.length
          const segmentOrder = response.segment_order || lastMessage.metadata.allDisplayTexts.length

          // 检查分段是否已存在（防止重复）
          const existingSegment = lastMessage.metadata.allDisplayTexts.find(item =>
            (typeof item === 'object' && item.segment_id === segmentId) ||
            (typeof item === 'object' && item.text === response.display_text.text) ||
            (typeof item === 'string' && item === response.display_text.text)
          )

          if (!existingSegment) {
            // 添加分段信息
            const segmentInfo = {
              ...response.display_text,
              segment_id: segmentId,
              segment_order: segmentOrder,
              timestamp: Date.now()
            }

            lastMessage.metadata.allDisplayTexts.push(segmentInfo)
            lastMessage.metadata.segmentOrder.push(segmentOrder)

            // 按顺序重新构建内容
            const sortedSegments = lastMessage.metadata.allDisplayTexts
              .filter(item => typeof item === 'object' && item.text)
              .sort((a, b) => (a.segment_order || 0) - (b.segment_order || 0))

            lastMessage.content = sortedSegments.map(segment => segment.text).join('')

            log('分段累积', 'debug')
          } else {
            log('重复分段，跳过', 'warn')
          }
        }
        lastMessage.metadata.isStreaming = false
        aiMessage = lastMessage

      }
    } else if (displayContent) {
      // 处理其他包含文本的消息
      if (lastUserMessage && (!lastMessage || lastMessage.sender !== 'ai')) {
        aiMessage = addMessage({
          sender: 'ai',
          type: response.type || 'text',
          content: displayContent,
          metadata: {
            status: 'received',
            isStreaming: false,
            originalResponse: response
          }
        }, true)

      } else if (lastMessage && lastMessage.sender === 'ai') {
        lastMessage.content = displayContent
        lastMessage.metadata.isStreaming = false
        aiMessage = lastMessage

      }
    }

    // 处理音频播放（统一处理逻辑）
    if (response.type === 'audio' || response.audio) {
      playAudioWithSubtitle(response.audio, response.display_text?.text)
    }



    // 停止打字指示器
    setTyping(false)

    return aiMessage
  }

  // 停止AI说话
  const stopAISpeaking = async () => {
    try {
      // 使用后端兼容的中断信号发送方法
      await webSocketStore.sendInterrupt()

      // 停止本地播放
      if (currentAudio.value) {
        audioService.stopPlayback()
      }
      resetAIState()
      aiStore.setAIStatus('interrupted'); // Set AI status to interrupted


    } catch (error) {
      log(`停止AI说话失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 获取历史记录列表
  const fetchHistoryList = async () => {
    try {
      await webSocketStore.fetchHistoryList()
      // 历史记录列表将通过WebSocket事件更新
    } catch (error) {
      log(`获取历史记录列表失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 加载历史记录
  const loadHistory = async (historyId) => {
    try {
      await webSocketStore.fetchAndSetHistory(historyId)
      currentHistoryId.value = historyId
      // 历史记录数据将通过WebSocket事件更新
    } catch (error) {
      log(`加载历史记录失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 删除历史记录
  const deleteHistory = async (historyId) => {
    try {
      await webSocketStore.deleteHistory(historyId)
      // 删除结果将通过WebSocket事件更新
    } catch (error) {
      log(`删除历史记录失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 创建新对话
  const createNewHistory = async () => {
    try {
      // 先停止当前的AI响应
      if (isTyping.value || isAISpeaking.value) {
        await stopAISpeaking()
      }
      
      // 清空当前消息
      messages.value = []
      currentHistoryId.value = null
      
      // 发送创建新对话请求
      await webSocketStore.createNewHistory()
      // 新对话创建结果将通过WebSocket事件更新
    } catch (error) {
      log(`创建新对话失败: ${error.message}`, 'error')
      throw error
    }
  }



  // 清空消息
  const clearMessages = () => {
    messages.value = []
    chatStats.currentSessionMessages = 0
    chatStats.sessionStartTime = Date.now()
    log('消息已清空')
  }

  // 更新聊天设置
  const updateChatSettings = (newSettings) => {
    Object.assign(chatSettings, newSettings)
    
    // 持久化存储语音相关设置
    if ('enableVoiceInput' in newSettings) {
      localStorage.setItem('enableVoiceInput', newSettings.enableVoiceInput)
    }
    if ('autoPlayAudio' in newSettings) {
      localStorage.setItem('autoPlayAudio', newSettings.autoPlayAudio)
    }
  }



  // 设置打字状态
  const setTyping = (typing) => {
    isTyping.value = typing
  }

  // 检查WebSocket连接状态
  const checkConnection = () => {
    if (!webSocketStore.isConnected) {
      log('WebSocket未连接', 'warn')
      return false
    }
    return true
  }

  // 查找最后一条AI消息
  const getLastAIMessage = () => {
    return messages.value.slice().reverse().find(msg => msg.sender === 'ai')
  }

  // 重置AI状态
  const resetAIState = () => {
    isAISpeaking.value = false
    currentAudio.value = null
    subtitleStore.clearSubtitle()
    aiStore.setAIStatus('idle'); // Reset AI status to idle
  }

  // 统一的音频播放方法
  const playAudioWithSubtitle = (audioData, displayText) => {
    if (!audioData) return

    try {
      // 使用 audioStore 的音频队列功能
      audioStore.addAudioTask(async () => {
        // 更新字幕 - 累积显示而不是覆盖
        if (displayText) {
          subtitleStore.appendSubtitleText(displayText)
        }

        // 播放音频
        isAISpeaking.value = true
        currentAudio.value = await audioStore.playAudio(audioData, {
          onEnd: () => {
            resetAIState()
          },
          onError: (error) => {
            log(`音频播放失败: ${error.message}`, 'error')
            resetAIState()
          }
        })
      })
    } catch (error) {
      log(`音频播放任务添加失败: ${error.message}`, 'error')
      isAISpeaking.value = false
      currentAudio.value = null
      subtitleStore.clearSubtitle()
    }
  }

  // 生成消息ID - 增强唯一性保证
  let messageIdCounter = 0
  const generateMessageId = () => {
    messageIdCounter++
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 11)
    const counter = messageIdCounter.toString(36)

    // 格式: msg_时间戳_计数器_随机字符串
    const id = `msg_${timestamp}_${counter}_${random}`

    // 双重检查确保唯一性
    if (messages.value.some(msg => msg.id === id)) {
      log('ID冲突，重新生成', 'warn')
      return generateMessageId() // 递归重新生成
    }

    return id
  }

  // 消息状态查询方法
  const getMessageStatus = (messageId) => {
    const message = messages.value.find(msg => msg.id === messageId)
    return message ? message.metadata : null
  }

  const getUnsavedMessages = () => {
    return messages.value.filter(msg =>
      msg.sender === 'ai' &&
      msg.metadata &&
      !msg.metadata.isSaved
    )
  }

  const getSavedMessagesCount = () => {
    return messages.value.filter(msg =>
      msg.metadata &&
      msg.metadata.isSaved
    ).length
  }







  // 存储事件监听器引用，用于清理
  const eventListeners = new Map()

  // 清理WebSocket监听器
  const cleanupWebSocketListeners = () => {
    eventListeners.forEach((handler, eventType) => {
      window.removeEventListener(eventType, handler)
    })
    eventListeners.clear()
    log('已清理WebSocket监听器')
  }

  // 设置WebSocket监听器
  const setupWebSocketListeners = () => {
    // 清理可能存在的旧监听器
    cleanupWebSocketListeners()

    // 监听控制消息
    const controlHandler = (event) => {
      const message = event.detail
      if (message.text) {
        switch (message.text) {
          case 'start-mic':
            log('开始麦克风', 'debug')
            if (chatSettings.enableVoiceInput) {
              audioStore.startRecording()
              aiStore.setAIStatus('listening'); // Set AI status to listening
            }
            break
          case 'interrupt':
            log('中断信号', 'debug')
            stopAISpeaking()
            break
          case 'mic-audio-end':
            log('麦克风音频结束', 'debug')
            audioStore.stopRecording()
            // If voice input was active (AI was listening), set status to waiting for AI response
            if (aiStore.status.value === 'listening') {
              aiStore.setAIStatus('waiting');
            } else {
              aiStore.setAIStatus('idle'); // Otherwise, back to idle
            }
            break
          case 'conversation-chain-start':
            log('对话链开始', 'debug')
            setTyping(true)
            aiStore.setAIStatus('loading'); // AI is loading/processing
            break
          case 'conversation-chain-end':
            log('对话链结束', 'debug')
            setTyping(false)
            aiStore.setAIStatus('idle'); // AI is idle after conversation chain

            // 标记最后一条AI消息为已保存
            const lastAIMessage = getLastAIMessage()
            if (lastAIMessage && lastAIMessage.metadata && !lastAIMessage.metadata.isSaved) {
              lastAIMessage.metadata.isSaved = true
              lastAIMessage.metadata.saveTimestamp = Date.now()
              lastAIMessage.metadata.status = 'saved'
              log('标记AI回复为已保存', 'debug')
            }
            break
        }
      }
    }
    window.addEventListener('websocket:control', controlHandler)
    eventListeners.set('websocket:control', controlHandler)

    // 监听用户输入转录
    const userInputTranscriptionHandler = (event) => {
      const message = event.detail
      if (message.type === 'user-input-transcription' && message.text) {
        log('收到用户输入转录', 'debug')
        addMessage({
          sender: 'user',
          type: 'text',
          content: message.text,
          metadata: {
            status: 'sent',
            isTranscription: true
          }
        });
      }
    }
    window.addEventListener('websocket:user-input-transcription', userInputTranscriptionHandler)
    eventListeners.set('websocket:user-input-transcription', userInputTranscriptionHandler)

    // 监听AI完整文本响应
    const fullTextHandler = (event) => {
      const message = event.detail
      handleAIResponse(message)
    }
    window.addEventListener('websocket:full-text', fullTextHandler)
    eventListeners.set('websocket:full-text', fullTextHandler)

    // 监听AI音频响应
    const audioHandler = (event) => {
      const message = event.detail
      handleAIResponse(message)
    }
    window.addEventListener('websocket:audio', audioHandler)
    eventListeners.set('websocket:audio', audioHandler)

    // 监听历史记录列表更新
    const historyListHandler = (event) => {
      const data = event.detail
      historyList.value = data.histories || []
      log(`历史记录列表已更新: ${historyList.value.length} 条`)
    }
    window.addEventListener('websocket:history-list', historyListHandler)
    eventListeners.set('websocket:history-list', historyListHandler)

    // 监听历史记录数据
    const historyDataHandler = (event) => {
      const data = event.detail
      const historyMessages = data.messages || []
      // 清空当前消息并加载历史消息
      messages.value = []
      historyMessages.forEach((msg, index) => {
        addMessage({
          // 为历史消息生成稳定的ID
          id: msg.id || msg.message_id || `hist_${currentHistoryId.value}_${index}`,
          message_id: msg.message_id || msg.id,
          sender: ['user', 'human'].includes(msg.role) ? 'user' : 'ai',
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
          type: 'text',
          metadata: {
            // 历史消息状态
            status: 'saved', // 历史消息都是已保存的
            isSaved: true,
            saveTimestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
            isStreaming: false,
            isHistorical: true,
            originalRole: msg.role,
            historyUid: currentHistoryId.value,
            idSource: msg.message_id ? 'backend' : 'generated'
          }
        }, false) // isNew = false 表示这是历史消息
      })
      setTyping(false)
      log(`历史记录数据已加载: ${historyMessages.length} 条`)
    }
    window.addEventListener('websocket:history-data', historyDataHandler)
    eventListeners.set('websocket:history-data', historyDataHandler)

    // 监听新历史记录创建
    const newHistoryHandler = async (event) => {
      const data = event.detail
      if (data.history_uid) {
        currentHistoryId.value = data.history_uid
        messages.value = []
        log(`新历史记录已创建: ${data.history_uid}`)
        // 自动加载新创建的历史记录
        try {
          await loadHistory(data.history_uid)
        } catch (error) {
          log(`加载新历史记录失败: ${error.message}`, 'error')
        }
      }
    }
    window.addEventListener('websocket:new-history-created', newHistoryHandler)
    eventListeners.set('websocket:new-history-created', newHistoryHandler)

    // 监听历史记录删除
    const deleteHistoryHandler = (event) => {
      const data = event.detail
      if (data.success && data.history_uid) {
        historyList.value = historyList.value.filter(h => h.uid !== data.history_uid)
        if (currentHistoryId.value === data.history_uid) {
          currentHistoryId.value = null
          currentHistory.value = null
          messages.value = []
        }
        log(`历史记录已删除: ${data.history_uid}`)
      }
    }
    window.addEventListener('websocket:history-deleted', deleteHistoryHandler)
    eventListeners.set('websocket:history-deleted', deleteHistoryHandler)

    // 监听错误
    const errorHandler = (event) => {
      const error = event.detail
      handleError(error)
    }
    window.addEventListener('websocket:error', errorHandler)
    eventListeners.set('websocket:error', errorHandler)

    // 监听后端合成完成（基础处理）
    const backendSynthCompleteHandler = () => {
      log('后端语音合成完成', 'debug')
      // 基础处理：可以用于更新UI状态
    }
    window.addEventListener('websocket:backend-synth-complete', backendSynthCompleteHandler)
    eventListeners.set('websocket:backend-synth-complete', backendSynthCompleteHandler)

    // 监听强制新消息（增强处理）
    const forceNewMessageHandler = () => {
      log('强制新消息分割', 'debug')

      // 结束打字状态
      setTyping(false)

      // 更新最后一条AI消息的状态
      const lastAIMessage = getLastAIMessage()
      if (lastAIMessage && lastAIMessage.metadata && !lastAIMessage.metadata.isSaved) {
        lastAIMessage.metadata.isStreaming = false
        lastAIMessage.metadata.status = 'completed'
        log('更新AI消息状态为已完成', 'debug')
      }
    }
    window.addEventListener('websocket:force-new-message', forceNewMessageHandler)
    eventListeners.set('websocket:force-new-message', forceNewMessageHandler)

    // 监听连接建立后的模型配置消息，自动初始化历史记录
    let initializationState = {
      isInitialized: false,
      lastInitTime: 0,
      initializationId: null
    }

    const setModelAndConfHandler = async (event) => {
      const now = Date.now()
      const timeSinceLastInit = now - initializationState.lastInitTime

      // 防止重复初始化：检查多个条件
      if (initializationState.isInitialized && timeSinceLastInit < 5000) {
        log('历史记录已初始化，跳过 (时间间隔太短)', 'debug')
        return
      }

      if (currentHistoryId.value && historyList.value.length > 0) {
        log('历史记录已存在，跳过初始化', 'debug')
        return
      }

      const initId = 'init_' + now + '_' + Math.random().toString(36).substring(2, 8)
      initializationState.initializationId = initId
      initializationState.lastInitTime = now

      log('连接建立，开始初始化历史记录', 'debug')

      try {
        // 获取历史记录列表
        await fetchHistoryList()

        // 等待一下确保历史记录列表已更新
        await new Promise(resolve => setTimeout(resolve, 100))

        // 如果没有历史记录，自动创建一个新的
        if (historyList.value.length === 0) {
          log('没有历史记录，自动创建新对话', 'debug')
          await createNewHistory()
        } else {
          // 如果有历史记录但没有当前历史记录，加载最新的
          if (!currentHistoryId.value && historyList.value.length > 0) {
            const latestHistory = historyList.value[0]
            const latestHistoryId = latestHistory.uid || latestHistory.id || latestHistory.history_uid
            log(`自动加载最新历史记录: ${latestHistoryId}`, 'debug')
            await loadHistory(latestHistoryId)
          }
        }

        // 标记初始化完成
        initializationState.isInitialized = true
        log('历史记录初始化完成', 'debug')
      } catch (error) {
        log(`自动初始化历史记录失败: ${error.message}`, 'error')
        // 如果初始化失败，创建一个新的历史记录作为备选
        try {
          log('尝试创建备选历史记录', 'debug')
          await createNewHistory()
          initializationState.isInitialized = true
        } catch (createError) {
          log(`创建备选历史记录也失败: ${createError.message}`, 'error')
          // 重置初始化状态，允许下次重试
          initializationState.isInitialized = false
          initializationState.lastInitTime = 0
        }
      }
    }
    window.addEventListener('websocket:set-model-and-conf', setModelAndConfHandler)
    eventListeners.set('websocket:set-model-and-conf', setModelAndConfHandler)

    log('WebSocket监听器已设置完成')
  }

  // 错误恢复机制
  const handleError = async (error) => {
    log(`发生错误: ${error.message}`, 'error')

    // 根据错误类型进行恢复
    switch (error.type) {
      case 'connection':
        // 尝试重新连接
        try {
          await webSocketStore.connect()
        } catch (reconnectError) {
          log(`重连失败: ${reconnectError.message}`, 'error')
        }
        break

      case 'state':
        // 尝试恢复状态
        try {
          await fetchHistoryList()
        } catch (stateError) {
          log(`状态恢复失败: ${stateError.message}`, 'error')
        }
        break

      case 'message':
        // 重试发送失败的消息
        if (error.message) {
          try {
            await sendTextMessage(error.message)
          } catch (retryError) {
            log(`消息重试失败: ${retryError.message}`, 'error')
          }
        }
        break

      default:
        log(`未知错误类型: ${error.type}`, 'warn')
    }
  }

  // 初始化
  setupWebSocketListeners()

  // 组件卸载时清理
  onUnmounted(() => {
    log('组件卸载，清理资源')
    cleanupWebSocketListeners()
    stopAISpeaking()
    setTyping(false)
  })

  return {
    // 状态
    messages,
    currentHistoryId,
    isAISpeaking,
    isTyping,
    currentAudio,
    historyList,
    chatSettings,
    chatStats,
    
    // 计算属性
    recentMessages,
    sessionDuration,
    
    // 方法
    addMessage,
    sendMessage,
    sendTextMessage,
    sendVoiceMessage,
    handleAIResponse,
    stopAISpeaking,
    fetchHistoryList,
    loadHistory,
    deleteHistory,
    createNewHistory,
    clearMessages,
    updateChatSettings,
    setTyping,

    // 消息状态管理方法
    getMessageStatus,
    getUnsavedMessages,
    getSavedMessagesCount
  }
})
