# API接口文档

## 📋 概述

本文档详细描述了前后端之间的接口定义，包括WebSocket消息格式、HTTP API接口、错误码定义等。

## 🌐 WebSocket接口

### **连接信息**
- **协议**: WebSocket (ws://)
- **默认地址**: `ws://localhost:12393/client-ws`
- **数据格式**: JSON

### **消息基础格式**

#### **WSMessage类型定义**
```typescript
interface WSMessage {
  type: string                    // 消息类型 (必需)
  action?: string                 // 操作类型 (可选)
  text?: string                   // 文本内容 (可选)
  audio?: number[]                // 音频数据 (可选)
  images?: string[]               // 图片列表 (可选)
  history_uid?: string            // 历史记录UID (可选)
  file?: string                   // 文件名 (可选)
  display_text?: DisplayText      // 显示文本对象 (可选)
}
```

#### **DisplayText对象**
```typescript
interface DisplayText {
  text: string                    // 显示文本
  name?: string                   // 发送者名称 (默认: "AI")
  avatar?: string                 // 头像路径 (可选)
}
```

## 📤 前端发送消息

### **1. 群组操作**

#### **添加客户端到群组**
```json
{
  "type": "add-client-to-group",
  "text": "group_name"
}
```

#### **从群组移除客户端**
```json
{
  "type": "remove-client-from-group",
  "text": "group_name"
}
```

#### **请求群组信息**
```json
{
  "type": "request-group-info"
}
```

### **2. 历史记录操作**

#### **获取历史记录列表**
```json
{
  "type": "fetch-history-list"
}
```

#### **获取并设置特定历史记录**
```json
{
  "type": "fetch-and-set-history",
  "history_uid": "history-uuid-string"
}
```

#### **创建新历史记录**
```json
{
  "type": "create-new-history"
}
```

#### **删除历史记录**
```json
{
  "type": "delete-history",
  "history_uid": "history-uuid-string"
}
```

### **3. 对话操作**

#### **文本输入**
```json
{
  "type": "text-input",
  "text": "用户输入的文本内容"
}
```

#### **麦克风音频结束**
```json
{
  "type": "mic-audio-end"
}
```

#### **AI主动说话信号**
```json
{
  "type": "ai-speak-signal"
}
```

### **4. 配置操作**

#### **获取配置列表**
```json
{
  "type": "fetch-configs"
}
```

#### **切换配置**
```json
{
  "type": "switch-config",
  "file": "character-config-name.yaml"
}
```

#### **获取背景列表**
```json
{
  "type": "fetch-backgrounds"
}
```

### **5. 控制操作**

#### **中断信号**
```json
{
  "type": "interrupt-signal"
}
```

#### **音频播放开始**
```json
{
  "type": "audio-play-start"
}
```

### **6. 音频数据**

#### **麦克风音频数据**
```json
{
  "type": "mic-audio-data",
  "audio": [0.1, 0.2, -0.1, ...]
}
```

#### **原始音频数据**
```json
{
  "type": "raw-audio-data",
  "audio": [0.1, 0.2, -0.1, ...]
}
```

## 📥 后端响应消息

### **1. AI回复消息**

#### **音频回复**
```json
{
  "type": "audio",
  "audio": "/path/to/audio/file.wav",
  "display_text": {
    "text": "AI回复的文本内容",
    "name": "AI",
    "avatar": "/path/to/avatar.png"
  },
  "actions": ["smile", "wave"]
}
```

#### **文本回复**
```json
{
  "type": "text",
  "text": "AI回复的纯文本内容",
  "display_text": {
    "text": "AI回复的文本内容",
    "name": "AI"
  }
}
```

### **2. 配置响应**

#### **配置列表**
```json
{
  "type": "configs",
  "configs": {
    "character": [
      {
        "file": "character1.yaml",
        "conf_name": "角色1",
        "conf_uid": "uuid-string"
      }
    ],
    "background": [
      {
        "file": "bg1.yaml",
        "name": "背景1"
      }
    ]
  }
}
```

#### **当前配置**
```json
{
  "type": "set-model-and-conf",
  "client_uid": "client-uuid",
  "conf_name": "当前配置名称",
  "conf_uid": "config-uuid",
  "live2d_model_name": "模型名称",
  "character_name": "角色名称",
  "human_name": "用户名称"
}
```

### **3. 历史记录响应**

#### **历史记录列表**
```json
{
  "type": "history-list",
  "histories": [
    {
      "uid": "history-uuid",
      "name": "对话标题",
      "created_at": "2024-01-01T00:00:00Z",
      "message_count": 10
    }
  ]
}
```

#### **历史记录数据**
```json
{
  "type": "history-data",
  "history_uid": "history-uuid",
  "messages": [
    {
      "role": "user",
      "content": "用户消息",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    {
      "role": "assistant",
      "content": "AI回复",
      "timestamp": "2024-01-01T00:00:01Z"
    }
  ]
}
```

### **4. 控制响应**

#### **控制信号**
```json
{
  "type": "control",
  "text": "interrupt"  // 或 "mic-audio-end"
}
```

### **5. 错误响应**

#### **错误消息**
```json
{
  "type": "error",
  "message": "错误描述信息",
  "code": "ERROR_CODE",
  "details": {
    "context": "错误上下文",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## 🔢 错误码定义

### **连接错误 (1000-1099)**
- `1001`: WebSocket连接失败
- `1002`: 连接超时
- `1003`: 认证失败
- `1004`: 协议版本不匹配

### **消息错误 (1100-1199)**
- `1101`: 消息格式错误
- `1102`: 必需字段缺失
- `1103`: 数据类型错误
- `1104`: 消息过大

### **业务错误 (1200-1299)**
- `1201`: 配置文件不存在
- `1202`: 历史记录不存在
- `1203`: 群组操作失败
- `1204`: 音频处理失败

### **系统错误 (1300-1399)**
- `1301`: 服务器内部错误
- `1302`: 服务不可用
- `1303`: 资源不足
- `1304`: 超时错误

## 🔄 消息优先级

### **优先级定义**
```javascript
const MessagePriority = {
  HIGH: 0,    // 高优先级 (控制命令)
  NORMAL: 1,  // 普通优先级 (聊天消息)
  LOW: 2      // 低优先级 (状态更新)
}
```

### **优先级分配**
- **HIGH**: 中断信号、控制命令
- **NORMAL**: 文本输入、音频数据
- **LOW**: 状态更新、统计信息

## 📊 消息流程图

### **文本对话流程**
```
用户输入 → text-input → 后端处理 → audio/text → 前端显示
```

### **语音对话流程**
```
录音开始 → mic-audio-data → VAD检测 → mic-audio-end → 
后端ASR → 后端处理 → audio/text → 前端播放/显示
```

### **配置管理流程**
```
fetch-configs → 后端扫描 → configs → 前端显示 →
switch-config → 后端切换 → set-model-and-conf → 前端更新
```

## 🛡️ 安全考虑

### **数据验证**
- 所有输入数据必须进行类型和格式验证
- 音频数据大小限制
- 文本长度限制
- 文件路径安全检查

### **错误处理**
- 优雅的错误降级
- 详细的错误日志
- 用户友好的错误提示
- 自动重连机制

### **性能优化**
- 消息队列管理
- 连接池复用
- 数据压缩
- 超时控制

## 🔧 开发工具

### **消息调试**
```javascript
// 启用详细日志
window.DEBUG_WEBSOCKET = true

// 监听所有消息
window.addEventListener('websocket:message', (event) => {
  console.log('WebSocket消息:', event.detail)
})
```

### **连接测试**
```javascript
// 测试连接
const testConnection = async () => {
  const ws = new WebSocket('ws://localhost:12393/client-ws')
  ws.onopen = () => console.log('连接成功')
  ws.onerror = (error) => console.error('连接失败:', error)
}
```

## 📝 最佳实践

### **消息设计**
1. 保持消息结构简单明确
2. 使用有意义的消息类型名称
3. 包含必要的错误处理信息
4. 避免过大的消息负载

### **错误处理**
1. 提供详细的错误信息
2. 实现自动重试机制
3. 记录错误日志用于调试
4. 向用户提供友好的错误提示

### **性能优化**
1. 合理使用消息优先级
2. 避免频繁发送小消息
3. 实现消息批处理
4. 监控连接状态和性能

## 📋 接口变更记录

### **v1.0.0 (当前版本)**
- 初始版本，支持基础聊天功能
- 实现配置管理和历史记录
- 添加音频数据传输
- 支持群组操作

### **计划中的改进**
- 添加文件传输支持
- 实现消息加密
- 支持多媒体消息
- 优化大数据传输

## 总结

本接口文档提供了前后端WebSocket通信的完整规范。开发者应该严格按照定义的消息格式进行开发，确保前后端的兼容性。建议在开发过程中使用提供的调试工具进行测试，并及时更新文档以反映接口变更。
AI语音对话功能问题与解决过程总结
问题现象

启动语音对话时，前端 onAudioData 回调收到的数据类型不一致，有时为 { data: Float32Array }，有时为 Float32Array。
前端尝试将音频数据转换为 Uint8Array 或 ArrayBuffer，导致调用 webSocketStore.sendAudioData 时类型不匹配。
控制台报错：“音频数据类型仅支持 Float32Array 或 Int16Array”。
排查过程

通过日志输出，确认 onAudioData 回调的数据结构和类型。
检查 websocket.js 的 sendAudioData 方法，发现只接受 Float32Array 或 Int16Array，否则报错。
发现前端多余的类型转换导致类型不兼容。
解决措施

在 onAudioData 回调中，兼容 { data: Float32Array } 结构，提取 .data 字段。
只允许 Float32Array 或 Int16Array 直接传递给 webSocketStore.sendAudioData，不再做多余的类型转换。
增加类型检查和详细日志，便于后续排查。
最终效果

报错消失，音频数据能够正确发送，前后端数据类型完全兼容，AI语音对话功能恢复正常。
经验总结：

前后端音频数据类型必须严格一致，避免多余的类型转换。
回调数据结构不统一时，需在前端做兼容处理。
日志输出有助于快速定位和解决类型兼容性问题。