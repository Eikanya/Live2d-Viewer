# Live2D VTuber 前端开发指南

## 📋 项目概述

基于 Vue3 + Naive UI + Electron 构建的现代化 Live2D 虚拟桌宠应用，提供 AI 对话、Live2D 模型展示、语音交互等功能。

### 🛠️ 技术栈
- **前端框架**: Vue 3 (Composition API)
- **UI 组件库**: Naive UI
- **桌面应用**: Electron
- **状态管理**: Pinia
- **构建工具**: Vite
- **样式**: CSS3 + CSS Variables

### 🎯 核心功能
- 🎭 Live2D 模型展示与交互
- 💬 AI 智能对话（文本/语音）
- 🌐 WebSocket 实时通信
- 🔊 语音输入输出
- ⚙️ 模型设置与控制
- 📱 响应式布局设计

## 🏗️ 项目结构

```
frontend-vue-electron/
├── src/
│   ├── App.vue                    # 主应用入口
│   ├── main.js                    # 应用启动文件
│   ├── components/                # 组件目录
│   │   ├── Live2DViewer.vue       # Live2D 模型查看器
│   │   ├── ModelSelector.vue      # 模型选择器
│   │   ├── ModelSettings.vue      # 模型设置
│   │   ├── CanvasSettings.vue     # 画布设置
│   │   ├── ErrorBoundary.vue      # 错误边界组件
│   │   ├── chat/                  # 聊天相关组件
│   │   │   ├── ChatInterface.vue  # 聊天界面
│   │   │   └── AIResponseBubble.vue # AI 回复气泡
│   │   ├── connection/            # 连接相关组件
│   │   │   └── ServerSettings.vue # 服务器设置
│   │   ├── audio/                 # 音频相关组件
│   │   │   └── VoiceSettings.vue  # 语音设置
│   │   └── settings/              # 设置相关组件
│   │       ├── GlobalSettings.vue # 全局设置
│   │       ├── HistoryManager.vue # 历史对话管理
│   │       └── ServerConfigPanel.vue # 服务器配置面板
│   ├── stores/                    # Pinia 状态管理
│   │   ├── live2d.js             # Live2D 状态
│   │   ├── websocket.js          # WebSocket 状态
│   │   ├── audio.js              # 音频状态
│   │   ├── chat.js               # 聊天状态
│   │   └── settings.js           # 设置状态
│   ├── utils/                     # 工具函数
│   │   ├── live2d-manager.js     # Live2D 管理器
│   │   ├── websocket-service.js  # WebSocket 服务
│   │   └── audio-manager.js      # 音频管理器
│   └── assets/                    # 静态资源
├── public/                        # 公共资源
│   ├── libs/                     # Live2D 库文件
│   │   ├── cubism4.min.js        # Cubism 4 运行时
│   │   └── live2dcubismcore.min.js # Live2D 核心
│   └── models/                   # Live2D 模型文件
├── docs/                         # 文档目录
└── package.json                  # 项目配置
```

## 🎨 界面布局架构

### 整体三栏布局
```
┌─────────────────────────────────────────────────────────────┐
│ [☰] 页面标题      [🟢状态] [🌙主题] [⚙️设置] [头像]        │ ← 顶部标题栏 (64px)
├─────────────┬─────────────────────────────────────────────────┤
│  🎭 Logo    │                                                 │
│ [🟢] 已连接  │              主内容区域                          │
│ 📱 模型选择  │         (聊天界面为双栏布局)                     │
│ ⚙️ 模型设置  │         (其他页面为单栏布局)                     │
│ 🎨 画布设置  │                                                 │
│ 💬 AI对话   │                                                 │
│ 🌐 服务器   │                                                 │
│ 🔊 语音设置  │                                                 │
│ 🎭 Live2D   │                                                 │
│ 版本信息    │                                                 │
└─────────────┴─────────────────────────────────────────────────┘
  ↑ 左侧导航栏 (280px/64px)
```

### 聊天界面双栏布局
```
┌─────────────────┬─┬─────────────────────────────────────┐
│   聊天对话区     │ │         Live2D 模型展示区          │
│   (450px)       │ │         (剩余空间)                  │
│ ┌─────────────┐ │ │  ┌─────────────────────────────┐   │
│ │ AI消息气泡  │ │ │  │        Live2D Canvas        │   │
│ └─────────────┘ │ │  │                             │   │
│ ┌─────────────┐ │ │  └─────────────────────────────┘   │
│ │ 用户消息气泡 │ │ │  ┌─────────────────────────────┐   │
│ └─────────────┘ │ │  │ 模型控制面板 [选择][动作]   │   │
│ ┌─────────────┐ │ │  └─────────────────────────────┘   │
│ │ 输入框+按钮  │ │ │                                     │
│ └─────────────┘ │ │                                     │
└─────────────────┴─┴─────────────────────────────────────┘
                   ↑ 可拖拽调整的分隔线
```

## 🔧 核心组件详解

### 1. App.vue - 主应用组件
**功能**: 整体布局管理、路由控制、主题切换
**关键特性**:
- 三栏响应式布局 (Header + Sider + Content)
- 聊天界面特殊双栏布局
- 移动端抽屉导航
- 全局状态管理集成

**主要方法**:
```javascript
toggleSidebar()      // 智能侧边栏切换
startResize()        // 拖拽调整面板宽度
handleModelAction()  // 模型动作控制
```

### 2. Live2DViewer.vue - Live2D 模型查看器
**功能**: Live2D 模型加载、渲染、交互控制
**关键特性**:
- 支持 Cubism 3/4 模型
- 模型动作和表情控制
- 鼠标交互响应
- 自适应画布大小

### 3. ChatInterface.vue - 聊天界面
**功能**: AI 对话交互、消息展示、语音控制
**关键特性**:
- 消息气泡展示 (用户右侧蓝色，AI左侧灰色)
- 语音输入/输出控制
- 历史消息加载
- 实时消息同步

### 4. HistoryManager.vue - 历史对话管理
**功能**: 对话历史的增删改查、重命名、搜索
**关键特性**:
- 历史记录列表展示
- 智能时间解析显示
- 自定义名称管理
- 快速创建/加载对话

### 5. ServerSettings.vue - 服务器设置
**功能**: WebSocket 连接管理、配置切换
**关键特性**:
- 连接状态实时显示
- 服务器配置管理
- 配置文件切换
- 连接统计信息

## 📦 状态管理 (Pinia Stores)

### 1. useWebSocketStore - WebSocket 状态
```javascript
// 主要状态
isConnected: boolean        // 连接状态
isConnecting: boolean       // 连接中状态
clientUid: string          // 客户端ID
serverConfig: object       // 服务器配置
availableConfigs: array    // 可用配置列表
messageStats: object       // 消息统计

// 主要方法
connect()                  // 建立连接
disconnect()               // 断开连接
sendMessage(data)          // 发送消息
fetchConfigs()             // 获取配置列表
switchConfig(filename)     // 切换配置
```

### 2. useChatStore - 聊天状态
```javascript
// 主要状态
messages: array            // 消息列表
currentHistoryId: string   // 当前历史记录ID
isTyping: boolean         // AI输入状态
voiceEnabled: boolean     // 语音开关

// 主要方法
addMessage(message)        // 添加消息
loadHistory(historyId)     // 加载历史记录
clearMessages()            // 清空消息
handleAIResponse(data)     // 处理AI回复
```

### 3. useAudioStore - 音频状态
```javascript
// 主要状态
isInitialized: boolean     // 初始化状态
isRecording: boolean       // 录音状态
microphonePermission: string // 麦克风权限
currentAudio: object       // 当前播放音频

// 主要方法
initializeAudio()          // 初始化音频系统
startRecording()           // 开始录音
stopRecording()            // 停止录音
playAudio(audioPath)       // 播放音频
```

### 4. useLive2DStore - Live2D 状态
```javascript
// 主要状态
currentModel: object       // 当前模型
modelList: array          // 模型列表
settings: object          // Live2D设置
manager: object           // Live2D管理器实例

// 主要方法
loadModel(modelData)       // 加载模型
playMotion(motionName)     // 播放动作
setExpression(expression)  // 设置表情
updateSettings(settings)   // 更新设置
```

## 🎯 开发指南

### 启动项目
```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建应用
npm run build

# Electron 打包
npm run electron:build
```

### 添加新页面
1. 在 `components/` 下创建新组件
2. 在 `App.vue` 的 `menuOptions` 中添加菜单项
3. 在 `currentComponent` 计算属性中添加路由映射
4. 在 `currentPageTitle` 中添加页面标题

### 添加新的状态管理
1. 在 `stores/` 下创建新的 store 文件
2. 使用 Pinia 的 `defineStore` 定义状态
3. 在需要的组件中通过 `useXXXStore()` 使用

### 样式开发规范
- 使用 CSS Variables 进行主题适配
- 响应式断点: 768px (移动端), 1200px (大屏)
- 动画使用 `cubic-bezier(0.4, 0, 0.2, 1)` 缓动函数
- 深度样式使用 `:deep()` 语法

## 🔌 API 接口

### WebSocket 消息类型
```javascript
// 发送消息
{
  type: 'text-input',
  text: '用户输入的文本'
}

// 接收消息
{
  type: 'audio',
  audio: '/path/to/audio.wav',
  display_text: {
    text: 'AI回复文本',
    name: 'AI',
    avatar: '/path/to/avatar.png'
  },
  actions: ['smile', 'wave']
}

// 配置管理
{
  type: 'fetch-configs'  // 获取配置列表
}
{
  type: 'switch-config', // 切换配置
  file: 'config-name.yaml'
}

// 历史管理
{
  type: 'fetch-history-list'  // 获取历史列表
}
{
  type: 'fetch-and-set-history', // 加载历史记录
  history_uid: 'history-id'
}
```

## 📱 响应式设计

### 断点设置
- **大屏** (≥1200px): 完整双栏布局
- **中屏** (768px-1199px): 侧边栏可折叠，双栏布局保持
- **小屏** (<768px): 抽屉导航，聊天界面改为垂直布局

### 移动端适配
- 侧边栏自动折叠为抽屉模式
- 聊天界面改为上下布局 (上半部分聊天，下半部分Live2D)
- 触摸友好的按钮尺寸
- 优化的滚动体验

## 🚀 性能优化

### 已实现的优化
- 组件懒加载 (Suspense)
- 虚拟滚动 (大量消息时)
- 图片懒加载
- 错误边界保护
- 防抖处理 (输入、拖拽)

### 建议的优化
- 使用 Web Workers 处理音频
- 实现消息分页加载
- 添加离线缓存
- 优化 Live2D 渲染性能

## 🐛 常见问题

### 1. Live2D 模型加载失败
- 检查模型文件路径是否正确
- 确认 Cubism 库文件已正确加载
- 查看浏览器控制台错误信息

### 2. WebSocket 连接失败
- 检查服务器地址和端口配置
- 确认后端服务正在运行
- 查看网络连接状态

### 3. 音频功能异常
- 检查麦克风权限
- 确认音频设备可用
- 查看音频格式支持情况

## 📚 相关文档

- [布局重构报告](./LAYOUT_REFACTOR_REPORT.md)
- [历史管理解决方案](./HISTORY_MANAGEMENT_SOLUTION.md)
- [集成修复报告](./INTEGRATION_FIXES_REPORT.md)
- [Vue 3 官方文档](https://vuejs.org/)
- [Naive UI 组件库](https://www.naiveui.com/)
- [Electron 官方文档](https://www.electronjs.org/)

## 🧪 测试指南

### **测试框架配置**
```bash
# 安装测试依赖
npm install -D vitest @vue/test-utils jsdom

# 运行测试
npm run test

# 测试覆盖率
npm run test:coverage
```

### **组件测试示例**
```javascript
// tests/components/MessageBubble.test.js
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import MessageBubble from '@/components/chat/MessageBubble.vue'

describe('MessageBubble', () => {
  it('renders user message correctly', () => {
    const message = {
      id: '1',
      content: 'Hello',
      sender: 'user',
      timestamp: Date.now()
    }

    const wrapper = mount(MessageBubble, {
      props: { message }
    })

    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.classes()).toContain('user-message')
  })
})
```

### **Store测试示例**
```javascript
// tests/stores/chat.test.js
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '@/stores/chat'

describe('Chat Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds message correctly', () => {
    const store = useChatStore()
    const message = {
      content: 'Test message',
      sender: 'user'
    }

    store.addMessage(message)

    expect(store.messages).toHaveLength(1)
    expect(store.messages[0].content).toBe('Test message')
  })
})
```

## 🔧 调试技巧

### **Vue DevTools**
```javascript
// 在组件中添加调试信息
export default {
  name: 'MyComponent',
  __VUE_DEVTOOLS_UID__: 'my-component-debug'
}
```

### **WebSocket调试**
```javascript
// 启用WebSocket详细日志
localStorage.setItem('DEBUG_WEBSOCKET', 'true')

// 监听所有WebSocket消息
window.addEventListener('websocket:message', (event) => {
  console.log('📨 WebSocket消息:', event.detail)
})
```

### **音频调试**
```javascript
// 启用音频调试
window.DEBUG_AUDIO = true

// 监听音频事件
window.addEventListener('audio:state-change', (event) => {
  console.log('🔊 音频状态:', event.detail)
})
```

## 🔒 安全最佳实践

### **输入验证**
```javascript
// 验证用户输入
const validateMessage = (message) => {
  if (!message || typeof message !== 'string') {
    throw new Error('Invalid message format')
  }

  if (message.length > 1000) {
    throw new Error('Message too long')
  }

  // XSS防护
  return message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}
```

### **权限控制**
```javascript
// 检查操作权限
const checkPermission = (action) => {
  const permissions = store.getters.userPermissions
  return permissions.includes(action)
}

// 使用权限检查
if (!checkPermission('delete-history')) {
  throw new Error('Permission denied')
}
```

## 📊 性能监控

### **性能指标收集**
```javascript
// 性能监控
const performanceMonitor = {
  startTime: Date.now(),

  mark(name) {
    performance.mark(name)
  },

  measure(name, startMark, endMark) {
    performance.measure(name, startMark, endMark)
    const measure = performance.getEntriesByName(name)[0]
    console.log(`${name}: ${measure.duration}ms`)
  }
}

// 使用示例
performanceMonitor.mark('component-render-start')
// ... 组件渲染逻辑
performanceMonitor.mark('component-render-end')
performanceMonitor.measure('component-render', 'component-render-start', 'component-render-end')
```

### **内存监控**
```javascript
// 内存使用监控
const memoryMonitor = {
  check() {
    if (performance.memory) {
      const memory = performance.memory
      console.log({
        used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
        total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
      })
    }
  }
}

// 定期检查内存使用
setInterval(() => {
  memoryMonitor.check()
}, 30000)
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### **代码提交规范**
```bash
# 功能开发
git commit -m "feat: 添加新的聊天功能"

# 问题修复
git commit -m "fix: 修复音频播放问题"

# 文档更新
git commit -m "docs: 更新API文档"

# 样式调整
git commit -m "style: 调整按钮样式"

# 重构代码
git commit -m "refactor: 重构WebSocket连接逻辑"
```
