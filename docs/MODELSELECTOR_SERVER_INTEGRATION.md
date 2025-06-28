# ModelSelector 服务器集成功能说明

## 🎯 功能概述

ModelSelector.vue 现在支持使用连接服务器后返回的 `set-model-and-conf` 消息中的 `model_info` 数据来显示预设模型，而不仅仅依赖本地的 `/models/model_dict.json` 文件。

## 📨 服务器数据格式

### **set-model-and-conf 消息结构**
```javascript
{
  type: 'set-model-and-conf',
  model_info: {
    name: 'kewei_4',
    description: 'AI女仆.',
    url: '/live2d-models/kewei_4/kewei_4.model3.json',
    
    // Live2D 配置信息
    HitAreas: [
      { Id: 'TouchHead', Name: 'head' },
      { Id: 'TouchBody', Name: 'body' },
      { Id: 'TouchSpecail', Name: 'specail' }
    ],
    
    // 动作配置
    Motions: {
      complete: [{ File: 'motions/complete.motion3.json' }],
      effect: [{ File: 'motions/effect.motion3.json' }],
      home: [{ File: 'motions/home.motion3.json' }],
      // ... 更多动作
    },
    
    // 点击动作映射
    tapMotions: {
      body: {
        touch_body: 40,
        touch_idle1: 30,
        touch_idle2: 30
      },
      head: {
        touch_head: 50,
        touch_idle3: 50
      },
      specail: {
        touch_idle4: 20,
        touch_special: 40,
        touch_special_ex: 40
      }
    },
    
    // 物理配置
    Physics: '/live2d-models/kewei_4/kewei_4.physics3.json',
    
    // 表情映射
    emotionMap: {
      anger: 2,
      disgust: 2,
      fear: 1,
      joy: 3,
      neutral: 0,
      sadness: 1,
      smirk: 3,
      surprise: 3
    },
    
    // 显示配置
    kScale: 0.3,
    kXOffset: 1150,
    initialXshift: 0,
    initialYshift: 0,
    defaultEmotion: 0
  },
  conf_name: 'kewei_4',
  conf_uid: 'kewei_4',
  client_uid: '4105ffd0-b29d-4df4-bbe8-4972e5be2a27'
}
```

## 🔄 工作流程

### **1. 数据加载优先级**
```javascript
const loadModelData = async () => {
  // 1. 优先使用服务器返回的模型信息
  const serverModelInfo = webSocketStore.configs.character?.model_info
  if (serverModelInfo) {
    // 使用服务器数据
    presetModels.value = [convertServerModel(serverModelInfo)]
    return
  }
  
  // 2. 回退到本地文件
  const response = await fetch('/models/model_dict.json')
  // ...
}
```

### **2. 实时更新机制**
```javascript
// 监听 WebSocket 事件
window.addEventListener('websocket:set-model-and-conf', handleModelConfigUpdate)

const handleModelConfigUpdate = (event) => {
  const config = event.detail
  if (config.model_info) {
    // 实时更新预设模型列表
    const serverModel = convertServerModel(config.model_info)
    presetModels.value = [serverModel, ...existingModels]
  }
}
```

### **3. 数据转换**
```javascript
const convertServerModel = (modelInfo) => ({
  id: modelInfo.name || 'server-model',
  name: modelInfo.name || '服务器模型',
  description: modelInfo.description || 'AI女仆',
  url: modelInfo.url,
  
  // 保留完整的 Live2D 配置
  HitAreas: modelInfo.HitAreas,
  Motions: modelInfo.Motions,
  tapMotions: modelInfo.tapMotions,
  Physics: modelInfo.Physics,
  emotionMap: modelInfo.emotionMap,
  kScale: modelInfo.kScale,
  kXOffset: modelInfo.kXOffset,
  // ... 其他配置
})
```

## 🎨 UI 显示效果

### **预设模型卡片**
```vue
<n-card
  v-for="model in presetModels"
  :key="model.id"
  class="preset-model-card"
  @click="loadPresetModel(model)"
>
  <template #header>
    <div class="preset-model-header">
      <n-icon size="18" color="#18a058">
        <!-- 星形图标 -->
      </n-icon>
      <span class="preset-model-name">{{ model.name }}</span>
    </div>
  </template>
  
  <div class="preset-model-description">
    {{ model.description || '暂无描述' }}
  </div>
  
  <div class="preset-model-url">
    {{ model.url }}
  </div>
</n-card>
```

### **显示信息**
- **模型名称**: `kewei_4`
- **描述**: `AI女仆.`
- **URL**: `/live2d-models/kewei_4/kewei_4.model3.json`

## 🔧 技术实现

### **1. WebSocket Store 集成**
```javascript
import { useWebSocketStore } from '../stores/websocket'

const webSocketStore = useWebSocketStore()

// 访问服务器模型信息
const serverModelInfo = webSocketStore.configs.character?.model_info
```

### **2. 事件监听管理**
```javascript
onMounted(() => {
  // 添加事件监听器
  window.addEventListener('websocket:set-model-and-conf', handleModelConfigUpdate)
  loadModelData()
})

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('websocket:set-model-and-conf', handleModelConfigUpdate)
})
```

### **3. 错误处理**
```javascript
try {
  // 优先使用服务器数据
  if (serverModelInfo) {
    presetModels.value = [serverModel]
    message.success(`加载了服务器模型: ${serverModel.name}`)
    return
  }
  
  // 回退到本地文件
  const response = await fetch('/models/model_dict.json')
  // ...
} catch (error) {
  console.error('❌ [ModelSelector] 模型数据加载失败:', error)
  message.error('模型数据加载失败: ' + error.message)
  presetModels.value = [] // 确保有默认值
}
```

## 📊 数据流向

```
服务器连接 → set-model-and-conf 消息 → WebSocketStore → ModelSelector
     ↓
WebSocketStore.configs.character.model_info
     ↓
ModelSelector.loadModelData() → 检查服务器数据
     ↓
转换为预设模型格式 → 显示在 UI 中
     ↓
用户点击 → loadPresetModel() → 加载完整配置
```

## 🎯 优势特性

### **1. 数据优先级**
- ✅ **服务器优先**: 优先使用服务器返回的模型信息
- ✅ **本地回退**: 服务器数据不可用时使用本地文件
- ✅ **实时更新**: 服务器数据变化时自动更新 UI

### **2. 完整配置支持**
- ✅ **Live2D 配置**: 支持 HitAreas、Motions、tapMotions
- ✅ **物理配置**: 支持 Physics 文件路径
- ✅ **表情映射**: 支持 emotionMap 配置
- ✅ **显示参数**: 支持 kScale、kXOffset 等参数

### **3. 用户体验**
- ✅ **即时反馈**: 连接服务器后立即显示可用模型
- ✅ **无缝切换**: 服务器和本地数据之间无缝切换
- ✅ **错误处理**: 完善的错误处理和用户提示

## 🔄 使用场景

### **场景1: 首次连接服务器**
1. 用户点击"连接服务器"
2. 服务器返回 `set-model-and-conf` 消息
3. ModelSelector 自动显示服务器模型
4. 用户可以直接点击加载

### **场景2: 配置切换**
1. 用户在服务器设置中切换配置
2. 服务器发送新的 `set-model-and-conf` 消息
3. ModelSelector 实时更新预设模型列表
4. 新模型出现在列表顶部

### **场景3: 离线使用**
1. 服务器未连接或数据不可用
2. ModelSelector 自动回退到本地 `model_dict.json`
3. 显示本地预设模型
4. 功能正常工作

## 📝 注意事项

### **数据格式兼容性**
- 服务器 `model_info` 必须包含 `name`、`url` 字段
- 其他字段为可选，但建议提供完整配置
- 支持嵌套的 Live2D 配置结构

### **性能考虑**
- 服务器数据优先级更高，减少本地文件请求
- 事件监听器正确清理，避免内存泄漏
- 错误处理确保 UI 始终可用

### **向后兼容性**
- 保持对本地 `model_dict.json` 的支持
- 现有功能不受影响
- 渐进式增强，不破坏现有工作流

## 总结

ModelSelector 现在完全支持使用服务器返回的模型信息，提供了更加动态和灵活的模型选择体验。用户连接服务器后可以立即看到可用的模型，并且支持实时更新，同时保持了对本地文件的向后兼容性。
