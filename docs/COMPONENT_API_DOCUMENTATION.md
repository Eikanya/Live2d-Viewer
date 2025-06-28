# Vue组件API文档

## 📋 组件概览

本文档详细描述了项目中所有Vue组件的API接口，包括props、events、methods、slots等。

## 🎭 核心组件

### **App.vue**
主应用组件，负责整体布局和路由管理。

#### **Props**
无

#### **Events**
无

#### **Methods**
- `toggleTheme()` - 切换主题
- `toggleSettingsPanel()` - 切换设置面板
- `handleMenuSelect(key)` - 处理菜单选择
- `handleModelSelected(model)` - 处理模型选择
- `handleModelConfigure(model)` - 处理模型配置

#### **Computed Properties**
- `theme` - 当前主题
- `currentComponent` - 当前显示的组件
- `connectionBadgeType` - 连接状态徽章类型
- `aiStatus` - AI状态信息

#### **Lifecycle Hooks**
- `onMounted` - 初始化主题和WebSocket连接

---

### **Live2DViewer.vue**
Live2D模型显示组件，核心渲染组件。

#### **Props**
无

#### **Events**
无

#### **Methods**
- `loadModel(modelData)` - 加载Live2D模型
- `removeModel(modelId)` - 移除模型
- `initLive2D()` - 初始化Live2D管理器

#### **Computed Properties**
- `petMode` - 是否为桌宠模式
- `petModeStyle` - 桌宠模式样式

#### **Lifecycle Hooks**
- `onMounted` - 初始化Live2D管理器
- `onUnmounted` - 清理资源

#### **Refs**
- `viewerContainer` - 容器DOM引用

---

### **ModelSelector.vue**
模型选择器组件，用于选择和管理Live2D模型。

#### **Props**
无

#### **Events**
- `model-selected` - 模型选择事件
  - **参数**: `{ modelData }`
- `model-configure` - 模型配置事件
  - **参数**: `{ modelData }`

#### **Methods**
- `handleAddModel()` - 添加模型
- `handleLocalModelSelect(value)` - 处理本地模型选择
- `handleModelSelect(model)` - 处理模型选择
- `handleModelConfigure(model)` - 处理模型配置
- `handleModelRemove(model)` - 移除模型
- `loadLocalModels()` - 加载本地模型列表

#### **Computed Properties**
- `loadedModels` - 已加载的模型列表
- `localModelOptions` - 本地模型选项

#### **Data Properties**
- `modelUrl` - 模型URL
- `selectedLocalModel` - 选中的本地模型
- `loading` - 加载状态
- `addingModel` - 添加模型状态

---

### **ChatInterface.vue**
聊天界面组件，处理AI对话显示。

#### **Props**
无

#### **Events**
无

#### **Methods**
- `sendMessage(content, type)` - 发送消息
- `handleSendMessage()` - 处理发送消息
- `scrollToBottom()` - 滚动到底部
- `handleRetry(message)` - 重试消息发送

#### **Computed Properties**
- `messages` - 消息列表
- `isConnected` - 连接状态
- `canSend` - 是否可以发送消息

#### **Refs**
- `messagesContainer` - 消息容器引用
- `inputText` - 输入文本引用

---

### **MessageBubble.vue**
消息气泡组件，显示单条消息。

#### **Props**
- `message` (Object, required) - 消息对象
  - `id` - 消息ID
  - `content` - 消息内容
  - `sender` - 发送者 ('user' | 'ai')
  - `timestamp` - 时间戳
  - `audio` - 音频数据
  - `type` - 消息类型

#### **Events**
- `retry` - 重试事件
  - **参数**: `{ message }`

#### **Methods**
- `toggleAudio()` - 切换音频播放
- `formatTime(timestamp)` - 格式化时间
- `handleRetry()` - 处理重试

#### **Computed Properties**
- `isUser` - 是否为用户消息
- `formattedTime` - 格式化的时间
- `hasAudio` - 是否有音频

#### **Data Properties**
- `isPlaying` - 音频播放状态
- `audioDuration` - 音频时长
- `currentTime` - 当前播放时间

---

### **AIControlPanel.vue**
AI控制面板组件，提供AI交互控制。

#### **Props**
无

#### **Events**
无

#### **Methods**
- `handleSendMessage()` - 发送文本消息
- `toggleRecording()` - 切换录音状态
- `handleAISpeakOnce()` - AI主动说话
- `toggleAISpeaking()` - 切换AI说话状态

#### **Computed Properties**
- `isConnected` - WebSocket连接状态
- `isRecording` - 录音状态
- `isAISpeaking` - AI说话状态
- `connectionStatus` - 连接状态文本

#### **Data Properties**
- `inputText` - 输入文本
- `recognizedText` - 识别的文本
- `asrService` - ASR服务实例

#### **Lifecycle Hooks**
- `onMounted` - 初始化ASR服务和事件监听
- `onUnmounted` - 清理资源

---

## 🔧 设置组件

### **ServerSettings.vue**
服务器设置组件，管理WebSocket连接配置。

#### **Props**
无

#### **Events**
无

#### **Methods**
- `handleConnect()` - 连接服务器
- `handleDisconnect()` - 断开连接
- `handleConfigSwitch(configFile)` - 切换配置
- `updateServerConfig(config)` - 更新服务器配置
- `fetchConfigs()` - 获取配置列表

#### **Computed Properties**
- `isConnected` - 连接状态
- `connectionStatus` - 连接状态文本
- `configOptions` - 配置选项列表

#### **Data Properties**
- `serverConfig` - 服务器配置
- `selectedConfig` - 选中的配置
- `connecting` - 连接中状态

---

### **VoiceSettings.vue**
语音设置组件，管理音频相关配置。

#### **Props**
无

#### **Events**
无

#### **Methods**
- `updateAudioSettings()` - 更新音频设置
- `testMicrophone()` - 测试麦克风
- `resetSettings()` - 重置设置

#### **Computed Properties**
- `microphonePermission` - 麦克风权限状态
- `audioLevel` - 音频电平

#### **Data Properties**
- `audioSettings` - 音频设置
- `testing` - 测试状态

---

### **CanvasSettings.vue**
画布设置组件，管理Live2D显示配置。

#### **Props**
无

#### **Events**
无

#### **Methods**
- `updateSettings()` - 更新设置
- `resetSettings()` - 重置设置
- `applySettings()` - 应用设置
- `exportSettings()` - 导出设置

#### **Computed Properties**
- `stats` - 性能统计
- `isPaused` - 是否暂停渲染

#### **Data Properties**
- `settings` - 画布设置
- `loading` - 加载状态
- `applying` - 应用状态

---

## 🎵 音频组件

### **Subtitle.vue**
字幕组件，显示AI说话时的字幕。

#### **Props**
无

#### **Events**
无

#### **Methods**
无

#### **Computed Properties**
- `showSubtitle` - 是否显示字幕
- `subtitleText` - 字幕文本
- `isVisible` - 是否可见

---

## 🛠️ 工具组件

### **ErrorBoundary.vue**
错误边界组件，处理组件错误。

#### **Props**
- `fallback` (String) - 错误时显示的内容

#### **Events**
- `error` - 错误事件
  - **参数**: `{ error, errorInfo }`

#### **Methods**
- `handleError(error, errorInfo)` - 处理错误
- `retry()` - 重试

#### **Data Properties**
- `hasError` - 是否有错误
- `errorMessage` - 错误消息

---

## 📊 组件使用规范

### **Props定义规范**
```javascript
// 推荐的props定义方式
props: {
  message: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && typeof value.id !== 'undefined'
    }
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => {
      return ['small', 'medium', 'large'].includes(value)
    }
  }
}
```

### **Events命名规范**
- 使用kebab-case命名
- 动词开头，描述具体动作
- 携带必要的数据

```javascript
// 推荐的事件触发方式
this.$emit('model-selected', { modelData })
this.$emit('config-changed', { config })
this.$emit('error-occurred', { error, context })
```

### **Methods命名规范**
- 使用camelCase命名
- 动词开头，描述具体功能
- 私有方法使用下划线前缀

```javascript
// 公共方法
handleClick() { }
updateSettings() { }
fetchData() { }

// 私有方法
_validateInput() { }
_processData() { }
```

### **Computed Properties规范**
- 使用camelCase命名
- 名词或形容词，描述计算结果
- 避免副作用

```javascript
computed: {
  isLoading() { },
  formattedDate() { },
  canSubmit() { }
}
```

## 🔄 组件通信模式

### **父子组件通信**
```javascript
// 父组件传递数据
<ChildComponent :data="parentData" @child-event="handleChildEvent" />

// 子组件接收和触发
props: ['data']
this.$emit('child-event', eventData)
```

### **兄弟组件通信**
```javascript
// 通过Store进行通信
const store = useStore()
store.updateData(newData)
```

### **跨层级通信**
```javascript
// 使用provide/inject
// 父组件
provide('configData', configData)

// 子组件
const configData = inject('configData')
```

## 📝 开发建议

### **组件设计原则**
1. **单一职责**: 每个组件只负责一个功能
2. **可复用性**: 设计通用的、可复用的组件
3. **可测试性**: 组件应该易于测试
4. **性能优化**: 避免不必要的重新渲染

### **最佳实践**
1. 使用Composition API
2. 合理使用computed和watch
3. 及时清理副作用
4. 使用TypeScript增强类型安全

### **常见问题**
1. **内存泄漏**: 及时清理事件监听器和定时器
2. **性能问题**: 避免在模板中使用复杂计算
3. **状态管理**: 合理使用本地状态和全局状态

## 总结

本文档提供了项目中所有主要组件的API接口说明。开发者应该遵循统一的命名规范和设计模式，确保代码的一致性和可维护性。建议在开发新组件时参考现有组件的设计模式，并及时更新本文档。
