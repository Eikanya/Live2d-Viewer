# 状态管理文档 (Pinia Stores)

## 📋 概述

本项目使用Pinia作为状态管理库，采用模块化设计，按功能领域划分不同的store。每个store负责特定的业务逻辑和状态管理。

## 🏪 Store架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Pinia Stores                        │
├─────────────────────────────────────────────────────────────┤
│  live2dStore          │  chatStore           │  audioStore  │
│  ├── 模型管理         │  ├── 消息管理        │  ├── 录音管理 │
│  ├── 动画控制         │  ├── 历史记录        │  ├── 播放控制 │
│  └── 设置配置         │  └── AI交互          │  └── 音频队列 │
├─────────────────────────────────────────────────────────────┤
│  webSocketStore       │  settingsStore       │  themeStore  │
│  ├── 连接管理         │  ├── 用户设置        │  ├── 主题切换 │
│  ├── 消息队列         │  ├── 配置同步        │  └── 样式管理 │
│  └── 错误处理         │  └── 数据持久化      │              │
├─────────────────────────────────────────────────────────────┤
│  subtitleStore                                              │
│  ├── 字幕显示                                              │
│  └── 同步控制                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎭 live2dStore

### **职责**
管理Live2D模型的加载、显示、动画和交互。

### **状态定义**
```javascript
// 核心状态
const manager = ref(null)              // Live2D管理器实例
const currentModel = ref(null)         // 当前活跃模型
const loadedModels = ref(new Map())    // 已加载模型集合
const modelDataMap = ref(new Map())    // 模型数据映射
const isLoading = ref(false)           // 加载状态
const error = ref(null)                // 错误信息

// 设置配置
const settings = reactive({
  showText: true,                      // 显示文本
  enableAudio: true,                   // 启用音频
  canvasWidth: 1200,                   // 画布宽度
  canvasHeight: 800,                   // 画布高度
  autoResize: true,                    // 自动调整大小
  enableAIControl: true,               // 启用AI控制
  autoExpression: true,                // 自动表情
  autoMotion: true,                    // 自动动作
  autoLipSync: true,                   // 自动唇同步
  textDisplayDuration: 3000,           // 文本显示时长
  emotionMapping: { ... }              // 情感映射
})

// 模型状态
const modelState = reactive({
  scale: 0.15,                         // 缩放比例
  position: { x: 0, y: 0 },           // 位置
  rotation: 0,                         // 旋转角度
  focusing: false,                     // 是否聚焦
  breathing: true,                     // 呼吸动画
  eyeBlinking: true,                   // 眨眼动画
  interactive: true                    // 交互启用
})
```

### **主要Actions**
```javascript
// 管理器操作
setManager(newManager)                 // 设置管理器
setCurrentModel(model)                 // 设置当前模型

// 模型操作
addLoadedModel(id, model, url)         // 添加已加载模型
removeLoadedModel(id)                  // 移除模型
setModelData(id, modelData)            // 设置模型数据
getModelData(id)                       // 获取模型数据

// 状态管理
setLoading(loading)                    // 设置加载状态
setError(error)                        // 设置错误信息
updateSettings(newSettings)            // 更新设置
updateModelState(newState)             // 更新模型状态

// AI控制
handleAIResponse(response)             // 处理AI响应
triggerExpression(expression)          // 触发表情
triggerMotion(motion)                  // 触发动作
```

### **计算属性**
```javascript
const hasLoadedModels = computed(() => loadedModels.value.size > 0)
const getModelById = computed(() => (id) => loadedModels.value.get(id))
const getAllModels = computed(() => Array.from(loadedModels.value.values()))
```

---

## 💬 chatStore

### **职责**
管理聊天消息、历史记录、AI交互和对话状态。

### **状态定义**
```javascript
// 聊天状态
const messages = ref([])               // 消息列表
const currentHistoryId = ref(null)     // 当前历史记录ID
const isAISpeaking = ref(false)        // AI说话状态
const isTyping = ref(false)            // 打字状态
const currentAudio = ref(null)         // 当前音频

// 历史记录
const historyList = ref([])            // 历史记录列表
const currentHistory = ref(null)       // 当前历史记录

// 设置配置
const chatSettings = reactive({
  maxMessages: 100,                    // 最大消息数
  autoScroll: true,                    // 自动滚动
  showTimestamp: true,                 // 显示时间戳
  enableNotification: true,            // 启用通知
  messageRetention: 7                  // 消息保留天数
})

// AI设置
const aiSettings = reactive({
  autoReply: true,                     // 自动回复
  replyDelay: 1000,                    // 回复延迟
  enableEmotion: true,                 // 启用情感
  voiceEnabled: true,                  // 启用语音
  lastInteractionTime: null            // 最后交互时间
})

// 统计信息
const chatStats = reactive({
  totalMessages: 0,                    // 总消息数
  userMessages: 0,                     // 用户消息数
  aiMessages: 0,                       // AI消息数
  currentSessionMessages: 0,           // 当前会话消息数
  sessionStartTime: Date.now()         // 会话开始时间
})
```

### **主要Actions**
```javascript
// 消息管理
addMessage(message, isNew)             // 添加消息
sendMessage(content, type)             // 发送消息
sendTextMessage(text)                  // 发送文本消息
sendVoiceMessage(audioData)            // 发送语音消息
clearMessages()                        // 清空消息

// AI交互
handleAIResponse(response)             // 处理AI响应
stopAISpeaking()                       // 停止AI说话
setTyping(typing)                      // 设置打字状态

// 历史记录
fetchHistoryList()                     // 获取历史列表
loadHistory(historyId)                 // 加载历史记录
deleteHistory(historyId)               // 删除历史记录
createNewHistory()                     // 创建新历史

// 设置管理
updateChatSettings(settings)           // 更新聊天设置
updateAISettings(settings)             // 更新AI设置
resetStats()                           // 重置统计
```

### **计算属性**
```javascript
const recentMessages = computed(() => 
  messages.value.slice(-chatSettings.maxMessages)
)
const sessionDuration = computed(() => 
  Date.now() - chatStats.sessionStartTime
)
const shouldAISpeak = computed(() => 
  aiSettings.voiceEnabled && !isAISpeaking.value
)
```

---

## 🔊 audioStore

### **职责**
管理音频录制、播放、ASR识别和音频队列。

### **状态定义**
```javascript
// 音频状态
const isRecording = ref(false)         // 录音状态
const isPlaying = ref(false)           // 播放状态
const isInitialized = ref(false)       // 初始化状态
const microphonePermission = ref(null) // 麦克风权限
const currentAudio = ref(null)         // 当前音频
const audioQueue = ref([])             // 音频队列

// VAD和ASR
const voiceDetected = ref(false)       // 语音检测
const audioLevel = ref(0)              // 音频电平
const silenceDetected = ref(false)     // 静音检测
const asrEnabled = ref(true)           // ASR启用
const asrResult = ref('')              // ASR结果
const asrConfidence = ref(0)           // ASR置信度
const asrProcessing = ref(false)       // ASR处理中

// 音频设置
const audioSettings = reactive({
  sampleRate: 16000,                   // 采样率
  channels: 1,                         // 声道数
  bitDepth: 16,                        // 位深度
  vadThreshold: 0.5,                   // VAD阈值
  silenceThreshold: 0.1,               // 静音阈值
  maxRecordingTime: 30000,             // 最大录音时间
  autoStop: true,                      // 自动停止
  echoCancellation: true,              // 回声消除
  noiseSuppression: true               // 噪音抑制
})
```

### **主要Actions**
```javascript
// 初始化和权限
initialize()                           // 初始化音频系统
checkMicrophonePermission()            // 检查麦克风权限
destroy()                              // 销毁音频系统

// 录音控制
startRecording()                       // 开始录音
stopRecording()                        // 停止录音
toggleRecording()                      // 切换录音状态

// 播放控制
playAudio(audioData, options)          // 播放音频
playAIAudio(audioData)                 // 播放AI音频
stopAudio()                            // 停止音频

// 音频队列
addAudioTask(task)                     // 添加音频任务
clearAudioQueue()                      // 清空音频队列
hasAudioTask()                         // 检查是否有任务
waitForAudioCompletion()               // 等待音频完成

// 设置管理
updateAudioSettings(settings)          // 更新音频设置
setCallbacks(callbacks)                // 设置回调函数
```

### **计算属性**
```javascript
const canRecord = computed(() => 
  isInitialized.value && microphonePermission.value === 'granted'
)
const recordingStatus = computed(() => {
  if (!isInitialized.value) return 'uninitialized'
  if (isRecording.value) return 'recording'
  if (voiceDetected.value) return 'voice-detected'
  return 'ready'
})
```

---

## 🌐 webSocketStore

### **职责**
管理WebSocket连接、消息队列、配置同步和错误处理。

### **状态定义**
```javascript
// 连接状态
const isConnected = ref(false)         // 连接状态
const isConnecting = ref(false)        // 连接中状态
const connectionError = ref(null)      // 连接错误
const retryCount = ref(0)              // 重试次数
const clientUid = ref(null)            // 客户端UID

// 消息统计
const messageStats = reactive({
  sent: 0,                             // 已发送
  received: 0,                         // 已接收
  queued: 0,                           // 队列中
  failed: 0,                           // 失败
  retried: 0                           // 重试
})

// 消息队列
const messageQueue = ref([])           // 消息队列
const queueStats = reactive({
  total: 0,                            // 总数
  processed: 0,                        // 已处理
  failed: 0,                           // 失败
  dropped: 0,                          // 丢弃
  lastProcessed: null                  // 最后处理时间
})

// 配置管理
const configs = reactive({
  character: null,                     // 角色配置
  background: null                     // 背景配置
})
const configList = reactive({
  character: [],                       // 角色配置列表
  background: []                       // 背景配置列表
})
```

### **主要Actions**
```javascript
// 连接管理
connect(config)                        // 连接WebSocket
disconnect()                           // 断开连接
reconnect()                            // 重新连接

// 消息发送
sendMessage(message, priority)         // 发送消息
sendTextMessage(text)                  // 发送文本消息
sendAudioData(audioData)               // 发送音频数据
sendAudioEnd()                         // 发送音频结束

// 队列管理
addToQueue(message, priority)          // 添加到队列
processQueue()                         // 处理队列
clearQueue()                           // 清空队列

// 配置管理
fetchConfigs()                         // 获取配置列表
switchConfig(configFile)               // 切换配置
updateServerConfig(config)             // 更新服务器配置

// 历史记录
fetchHistoryList()                     // 获取历史列表
loadHistory(historyId)                 // 加载历史
deleteHistory(historyId)               // 删除历史
```

---

## 🎨 themeStore

### **职责**
管理应用主题、样式配置和用户界面偏好。

### **状态定义**
```javascript
const currentTheme = ref('light')      // 当前主题
const themes = reactive({
  light: { ... },                     // 浅色主题配置
  dark: { ... }                       // 深色主题配置
})
const customTheme = reactive({})       // 自定义主题
```

### **主要Actions**
```javascript
setTheme(themeName)                    // 设置主题
toggleTheme()                          // 切换主题
updateCustomTheme(config)              // 更新自定义主题
```

---

## 📝 subtitleStore

### **职责**
管理字幕显示、同步控制和文本渲染。

### **状态定义**
```javascript
const showSubtitle = ref(true)         // 显示字幕
const subtitleText = ref('')           // 字幕文本
const isVisible = ref(false)           // 是否可见
```

### **主要Actions**
```javascript
setSubtitleText(text)                  // 设置字幕文本
showSubtitleText(text, duration)       // 显示字幕
hideSubtitle()                         // 隐藏字幕
toggleSubtitle()                       // 切换字幕显示
```

---

## 🔄 数据流模式

### **单向数据流**
```
组件 → Action → State → 组件更新
```

### **跨Store通信**
```javascript
// chatStore中调用audioStore
const audioStore = useAudioStore()
audioStore.playAudio(audioData)

// webSocketStore中更新chatStore
const chatStore = useChatStore()
chatStore.addMessage(message)
```

### **状态持久化**
```javascript
// 使用localStorage持久化设置
watch(settings, (newSettings) => {
  localStorage.setItem('app-settings', JSON.stringify(newSettings))
}, { deep: true })
```

## 📊 最佳实践

### **Store设计原则**
1. **单一职责**: 每个store负责特定领域
2. **状态最小化**: 只存储必要的状态
3. **计算属性**: 使用computed派生状态
4. **副作用隔离**: 在actions中处理副作用

### **性能优化**
1. **响应式优化**: 合理使用ref和reactive
2. **计算缓存**: 利用computed的缓存特性
3. **批量更新**: 避免频繁的状态更新
4. **内存管理**: 及时清理不需要的状态

### **错误处理**
1. **统一错误处理**: 在store中集中处理错误
2. **错误恢复**: 提供错误恢复机制
3. **用户反馈**: 及时向用户反馈错误信息

### **调试支持**
1. **Pinia DevTools**: 使用官方调试工具
2. **状态日志**: 记录重要状态变化
3. **性能监控**: 监控store性能

## 🚀 开发指南

### **创建新Store**
```javascript
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'

export const useNewStore = defineStore('newStore', () => {
  // 状态定义
  const state = ref(initialValue)
  
  // 计算属性
  const computedValue = computed(() => {
    return processState(state.value)
  })
  
  // Actions
  const updateState = (newValue) => {
    state.value = newValue
  }
  
  return {
    state,
    computedValue,
    updateState
  }
})
```

### **Store组合**
```javascript
// 在组件中使用多个store
export default {
  setup() {
    const chatStore = useChatStore()
    const audioStore = useAudioStore()
    const webSocketStore = useWebSocketStore()
    
    return {
      chatStore,
      audioStore,
      webSocketStore
    }
  }
}
```

## 总结

本项目的状态管理采用了模块化的Pinia架构，每个store负责特定的业务领域，通过清晰的接口进行通信。这种设计提供了良好的可维护性、可测试性和性能表现。开发者应该遵循既定的设计模式和最佳实践，确保状态管理的一致性和可靠性。
