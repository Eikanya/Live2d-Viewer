

此项目由AI模型生成的，方便查看live2d模型和实现AI对话功能，AI对话后端对接Open-LLM-VTuber。桌宠功能还没实现。
项目没有经过充分测试，出现bug请直接问大模型解决。


下面由AI生成的内容：

基于 Vue 3的Live2d Viewer,支持 AI 对话、Live2D 模型交互和实时通信。

## ✨ 主要特性

- 🤖 **AI 对话系统** - 支持文本和语音对话，实时 AI 交互
- 🎭 **Live2D 模型渲染** - 基于 PIXI.js 和 Cubism SDK，支持 Cubism 3/4 模型
- 🔊 **音频系统** - 录音、播放、语音识别 (ASR)、音频队列管理
- 🌐 **WebSocket 通信** - 与后端实时双向通信，支持消息队列和重连
- 💬 **聊天界面** - 完整的聊天历史、消息管理、AI 状态显示
- 🎮 **丰富的交互** - 模型点击交互、表情控制、动作播放
- ⚙️ **完整的设置系统** - 服务器配置、音频设置、模型管理、画布设置
- 🎨 **现代化 UI** - Vue 3 + Composition API + Pinia + Naive UI
- 🔧 **模块化架构** - 清晰的分层设计，易于扩展和维护
- 🖥️ **跨平台支持** - 基于 Electron，支持 Windows、macOS、Linux

## 🚀 快速开始

### 环境要求

- **Node.js**: 18+ (推荐 LTS 版本)
- **npm**: 8+ 或 **yarn**: 1.22+


### 安装和运行


```
# 1. 克隆项目
git clone <repository-url>
cd live2d-vtuber-frontend

# 2. 安装依赖
npm install

# 3. 生成模型索引（如果有本地模型）
npm run generate-models-index

# 4. 开发模式
npm run dev                    # Web 版本 (http://localhost:5173)
npm run electron-dev           # Electron 桌面应用

# 5. 生产构建
npm run build                  # Web 版本构建
npm run electron-build         # Electron 应用构建
npm run dist                   # 打包所有平台
```

### 配置后端连接

1. 启动 Open-LLM-VTuber 后端服务
2. 在前端应用中配置服务器地址（默认：`ws://localhost:12393`）
3. 点击"连接服务器"建立 WebSocket 连接

## 🎯 核心功能

### 🤖 AI 对话系统
- **文本对话** - 支持文本输入和 AI 回复
- **语音对话** - 录音、语音识别 (ASR)、AI 语音回复
- **聊天历史** - 完整的对话历史记录和管理
- **实时状态** - AI 说话状态、打字状态显示
- **消息管理** - 消息重试、删除、导出功能

### 🎭 Live2D 模型系统
- **模型渲染** - 基于 PIXI.js 的高性能渲染
- **模型管理** - 支持多模型加载、切换、卸载
- **交互功能** - 点击交互、表情控制、动作播放
- **视觉效果** - 视线跟随、呼吸动画、眨眼动画
- **模型配置** - 缩放、位置、旋转等参数调整

### 🔊 音频系统
- **录音功能** - 麦克风录音、VAD 语音检测
- **音频播放** - AI 语音播放、音频队列管理
- **格式支持** - WAV、MP3 等多种音频格式
- **权限管理** - 麦克风权限检测和申请
- **音频设置** - 采样率、声道、降噪等配置

### 🌐 通信系统
- **WebSocket 连接** - 与后端实时双向通信
- **消息队列** - 支持消息优先级和重试机制
- **连接管理** - 自动重连、连接状态监控
- **协议支持** - 完整的 WSMessage 协议实现

### ⚙️ 设置系统
- **服务器设置** - WebSocket 连接配置、配置文件切换
- **音频设置** - 麦克风、播放器、VAD 参数配置
- **模型设置** - Live2D 模型参数、交互设置
- **画布设置** - 渲染参数、性能优化设置
- **主题设置** - 明暗主题切换、界面定制

## 🔧 技术栈

### 前端框架
- **Vue 3.3.8** - 使用 Composition API，现代化响应式框架
- **Vite 5.0.0** - 快速构建工具，支持热重载
- **Electron 27.1.3** - 跨平台桌面应用框架

### UI 和样式
- **Naive UI 2.41.0** - 现代化 Vue 3 组件库
- **CSS3** - 响应式设计，支持明暗主题
- **@vicons/ionicons5** - 图标库

### 状态管理和通信
- **Pinia 2.1.7** - Vue 3 推荐的状态管理库
- **WebSocket** - 实时双向通信
- **自定义服务层** - 模块化的服务架构

### Live2D 和渲染
- **PIXI.js 7.4.2** - 高性能 2D 渲染引擎
- **Live2D Cubism SDK** - 官方 Live2D 渲染库
- **自定义管理器** - 模块化的 Live2D 管理系统

### 音频处理
- **Web Audio API** - 原生音频处理
- **@ricky0123/vad-web** - 语音活动检测 (VAD)
- **自定义音频队列** - 音频播放队列管理

### 开发工具
- **ESLint** - 代码质量检查（推荐配置）
- **Prettier** - 代码格式化（推荐配置）
- **Vitest** - 单元测试框架（推荐配置）

## 📋 开发指南

### 🚀 快速开发

#### 添加新的 Live2D 模型
```bash
# 1. 将模型文件放置在 public/live2d-models/ 目录下
# 2. 运行模型索引生成脚本
npm run generate-models-index

# 3. 在应用中选择新模型
# 模型会自动出现在模型选择器中
```

### 🔧 开发工具配置

#### ESLint 配置
```bash
# 安装 ESLint
npm install -D eslint @vue/eslint-config-typescript prettier

# 创建 .eslintrc.js
# 参考 docs/CODE_QUALITY_REPORT.md
```

#### 测试配置
```bash
# 安装测试依赖
npm install -D vitest @vue/test-utils jsdom

# 运行测试
npm run test
```

### 📚 文档参考

详细的开发文档请参考 `docs/` 目录：
- **[架构分析](docs/PROJECT_ARCHITECTURE_ANALYSIS.md)** - 项目整体架构
- **[组件API](docs/COMPONENT_API_DOCUMENTATION.md)** - 组件使用指南
- **[状态管理](docs/STATE_MANAGEMENT_DOCUMENTATION.md)** - Store 使用指南
- **[接口文档](docs/API_INTERFACE_DOCUMENTATION.md)** - WebSocket 接口规范
- **[开发指南](docs/DEVELOPMENT_GUIDE.md)** - 完整开发流程

## 🔗 与后端集成

### Open-LLM-VTuber 后端集成

该前端专为 [Open-LLM-VTuber](https://github.com/t41372/Open-LLM-VTuber) 后端设计：

#### 连接配置
```javascript
// 默认配置
const serverConfig = {
  host: 'localhost',
  port: 12393,
  protocol: 'ws',
  path: '/client-ws'
}
```

#### 支持的功能
- ✅ **实时对话** - 文本和语音对话
- ✅ **配置管理** - 角色配置切换
- ✅ **历史记录** - 对话历史管理
- ✅ **Live2D 控制** - 表情和动作控制
- ✅ **群组功能** - 多客户端支持

#### 消息协议
完整的 WebSocket 消息协议请参考 [API接口文档](docs/API_INTERFACE_DOCUMENTATION.md)


## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢以下开源项目和贡献者：
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [PIXI.js](https://pixijs.com/) - 2D 渲染引擎
- [Live2D](https://www.live2d.com/) - Live2D 技术
- [Naive UI](https://www.naiveui.com/) - Vue 3 组件库
- [Open-LLM-VTuber](https://github.com/t41372/Open-LLM-VTuber) - 后端项目


---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！
