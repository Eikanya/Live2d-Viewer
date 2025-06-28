<template>
  <div>
    <n-card title="模型选择" :bordered="false" >
      <template #header-extra>
        <n-button
          quaternary
          circle
          @click="loadModelData"
          :loading="loading"
        >
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </n-icon>
          </template>
        </n-button>
      </template>

      <div class="model-selector-vertical-layout">
      <!-- 预设模型选择区域 -->
      <n-card class="preset-models-card" title="服务器预设模型" size="small">
        <template #header-extra>
          <n-space>      
          </n-space>
        </template>
        <div class="preset-models-grid">
          <n-card
            v-for="model in presetModels"
            :key="model.id"
            size="small"
            hoverable
            class="preset-model-card"
            @click="loadPresetModel(model)"
            :class="{ 'loading': loadingPresetModel === model.id }"
          >
            <template #header>
              <div class="preset-model-header">
                <n-icon size="18" color="#18a058">
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </n-icon>
                <span class="preset-model-name">{{ model.name }}</span>
                <n-spin v-if="loadingPresetModel === model.id" size="small" />
              </div>
            </template>
            <div class="preset-model-url" style="font-size: 11px; color: #aaa; margin-top: 2px;">
              <n-ellipsis line-clamp="1">
                {{ model.url }}
              </n-ellipsis>
            </div>
            <div v-if="model.description" class="preset-model-description" style="font-size: 12px; color: #666; margin-top: 4px;">
              {{ model.description }}
            </div>
          </n-card>

          <n-empty v-if="presetModels.length === 0" description="暂无预设模型" style="grid-column: 1 / -1;">
            <template #icon>
              <n-icon size="48" color="var(--n-text-color-disabled)">
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </n-icon>
            </template>
          </n-empty>
        </div>
      </n-card>

      <!-- 自定义模型添加表单 -->
      <n-card class="add-model-card" title="添加自定义模型" size="small">


        <n-form label-placement="top">
          <n-grid :cols="1" :y-gap="16">
            <!-- 模型URL选择与输入 -->
            <n-grid-item>
              <n-form-item label="模型URL">
                <n-select
                  v-model:value="modelUrl"
                  placeholder="从列表选择或手动输入模型URL"
                  :options="localModelOptions"
                  :disabled="addingModel"
                  clearable
                  filterable
                  tag
                >
                  <template #empty>
                    <div style="text-align: center; padding: 16px;">
                      <n-text depth="3">未找到本地模型索引</n-text>
                      <br>
                      <n-text depth="3" style="font-size: 12px;">
                        可运行脚本生成索引或手动输入URL
                      </n-text>
                    </div>
                  </template>
                </n-select>
              </n-form-item>
            </n-grid-item>
            
            <!-- 添加按钮 -->
            <n-grid-item>
              <n-button
                type="primary"
                block
                @click="addModel"
                :disabled="!modelUrl || addingModel"
                :loading="addingModel"
                class="add-model-btn"
              >
                <template #icon>
                  <n-icon>
                    <svg viewBox="0 0 24 24">
                      <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </n-icon>
                </template>
                {{ addingModel ? '加载中...' : '加载模型' }}
              </n-button>
            </n-grid-item>
          </n-grid>
        </n-form>
      </n-card>

      <!-- 下：已加载模型列表 -->
      <n-card class="loaded-models-card" title="已加载模型" size="small">
        <template #header-extra>
          <n-space>
            <span style="font-size: 12px; color: var(--n-text-color-disabled);">
              共 {{ loadedModels.length }} 个模型
            </span>
          </n-space>
        </template>
        <div class="models-list-scroll">
          <n-space vertical v-if="loadedModels.length > 0" size="large">
            <n-card
              v-for="model in loadedModels"
              :key="model.id"
              size="small"
              :bordered="true"
              hoverable
              class="model-card"
            >
              <template #header>
                <n-space align="center">
                  <n-icon size="20" color="#18a058">
                    <svg viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </n-icon>
                  <div>
                    <div style="font-weight: 500;">{{ getModelDisplayName(model) }}</div>
                  </div>
                </n-space>
              </template>
              <template #header-extra>
                <div class="model-card-actions">
                  <n-button
                    size="small"
                    @click="configureModel(model)"
                    tertiary
                  >
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                        </svg>
                      </n-icon>
                    </template>
                    设置
                  </n-button>
                  <n-popconfirm
                    @positive-click="removeModel(model)"
                    positive-text="确定"
                    negative-text="取消"
                  >
                    <template #trigger>
                      <n-button
                        size="small"
                        type="error"
                        secondary
                        circle
                      >
                        <template #icon>
                          <n-icon>
                            <svg viewBox="0 0 24 24">
                              <path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12Z"/>
                            </svg>
                          </n-icon>
                        </template>
                      </n-button>
                    </template>
                    确定要移除模型 "{{ getModelDisplayName(model) }}" 吗？
                  </n-popconfirm>
                </div>
              </template>
              <div class="model-path">
                模型路径: {{ model.url }}
              </div>
            </n-card>
          </n-space>
          <n-empty v-else description="暂无已加载的模型" style="margin: 40px 0;">
            <template #icon>
              <n-icon size="48" color="var(--n-text-color-disabled)">
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </n-icon>
            </template>
            <template #extra>
              <n-button size="small" @click="scrollToTop">
                添加第一个模型
              </n-button>
            </template>
          </n-empty>
        </div>
      </n-card>
    </div>
    </n-card>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMessage, NEllipsis } from 'naive-ui'
import { useLive2DStore } from '../stores/live2d'
import { useWebSocketStore } from '../stores/websocket'

export default {
  name: 'ModelSelector',
  components: {
    NEllipsis
  },
  emits: ['model-selected', 'model-configure'],
  setup(_, { emit }) {
    const live2dStore = useLive2DStore()
    const webSocketStore = useWebSocketStore()
    const message = useMessage()

    const loading = ref(false)
    const addingModel = ref(false)
    const loadingPresetModel = ref(null)
    const modelUrl = ref('')
    const localModelOptions = ref([])
    const presetModels = ref([])

    // 模型序号计数器
    const modelCounter = ref(1)

    // 生成下一个模型ID
    const generateModelId = () => {
      // 获取当前所有已加载模型的 id
      const allIds = Array.from(live2dStore.modelDataMap?.keys() || [])
      let maxNumber = 0
      allIds.forEach(id => {
        const match = id.match(/^model_(\d+)$/)
        if (match) {
          const num = parseInt(match[1])
          if (num > maxNumber) maxNumber = num
        }
      })
      return `model_${maxNumber + 1}`
    }

    // 从 store 中获取已加载的模型
    const loadedModels = computed(() => {
      return Array.from(live2dStore.modelDataMap?.values() || [])
    })

    // 方法
    const loadModelData = async () => {
      loading.value = true
      presetModels.value = [] // 每次加载前先清空
      try {
        console.log('🔄 [ModelSelector] 检查服务器预设模型...')

        // 仅当连接时，才从WebSocket store获取模型信息
        if (webSocketStore.isConnected) {
          const serverModelInfo = webSocketStore.configs.character?.model_info
          if (serverModelInfo) {
            console.log('📦 [ModelSelector] 发现已加载的服务器模型信息:', serverModelInfo)
            const serverModel = {
              id: serverModelInfo.name ,
              name: serverModelInfo.name ,
              description: serverModelInfo.description ,
              url: serverModelInfo.url,
              ...serverModelInfo
            }
            presetModels.value = [serverModel]
            console.log('✅ [ModelSelector] 服务器预设模型已设置。')
          } else {
            console.log('ℹ️ [ModelSelector] 已连接但当前配置无模型信息。')
          }
        } else {
          console.log('ℹ️ [ModelSelector] 未连接到服务器，不加载预设模型。')
        }
      } catch (error) {
        console.error('❌ [ModelSelector] 模型数据加载失败:', error)
        message.error('模型数据加载失败: ' + error.message)
        presetModels.value = []
      } finally {
        loading.value = false
      }
    }

    const loadPresetModel = async (model) => {
      if (loadingPresetModel.value) return // 防止重复点击
      
      loadingPresetModel.value = model.id
      try {
        console.log('🔄 [ModelSelector] 加载预设模型:', model)
        
        // 构建模型数据
        const modelData = {
          id: model.id,
          name: model.name,
          url: model.url,
          description: model.description
        }
        // 通过 emit 事件让父组件处理模型加载
        emit('model-selected', modelData)
        message.success(`已选择模型 "${model.name}"，请等待加载...`)
      } catch (error) {
        console.error('❌ [ModelSelector] 加载预设模型失败:', error)
        message.error(`加载模型失败: ${error.message}`)
      } finally {
        loadingPresetModel.value = null
      }
    }

    const addModel = async () => {
      let modelDataRaw = modelUrl.value
      if (!modelDataRaw) {
        message.warning('请选择或输入模型URL')
        return
      }

      addingModel.value = true
      try {
        let modelData
        if (typeof modelDataRaw === 'object') {
          // 选择的是本地模型对象
          modelData = {
            id: generateModelId(),
            url: modelDataRaw.path,
            name: modelDataRaw.name || getModelDisplayName(modelDataRaw),
            description: modelDataRaw.description || '',
            thumbnail: modelDataRaw.thumbnail || '',
            version: modelDataRaw.version || '',
            author: modelDataRaw.author || '',
            tags: modelDataRaw.tags || []
          }
        } else {
          // 手动输入的 url 字符串
          modelData = {
            id: generateModelId(),
            url: modelDataRaw,
            name: getModelDisplayName(modelDataRaw)
          }
        }

        // 检查是否已经加载相同URL的模型
        const existingModel = Array.from(live2dStore?.modelDataMap?.values() || []).find(
          model => model.url === modelData.url
        )
        if (existingModel) {
          message.warning(`URL "${modelData.url}" 的模型已经加载`)
          return
        }

        console.log('➕ [ModelSelector] 添加自定义模型:', modelData, '(使用序号ID)')
        // 将模型数据存储到 store
        if (live2dStore?.setModelData) {
          live2dStore.setModelData(modelData)
        }
        emit('model-selected', modelData)

        message.success(`自定义模型 "${modelData.name}" 添加成功`)

        // 重置输入
        modelUrl.value = ''
      } catch (error) {
        console.error('❌ [ModelSelector] 添加自定义模型失败:', error)
        message.error('添加自定义模型失败')
      } finally {
        addingModel.value = false
      }
    }

    const removeModel = async (model) => {
      try {
        console.log('🗑️ [ModelSelector] 移除模型:', model)
        console.log('🗑️ [ModelSelector] 模型URL类型:', typeof model.url, '值:', model.url)

        // 1. 彻底移除 Live2DManager/PIXI 场景中的模型
        if (live2dStore?.manager) {
          try {
            live2dStore.manager.removeModel(model.id)
          } catch (e) {
            console.warn('⚠️ [ModelSelector] manager.removeModel 失败:', e)
          }
        }

        // 2. 从 store 中移除模型数据和实例
        if (live2dStore?.removeLoadedModel) {
          live2dStore.removeLoadedModel(model.id)
        }

        // 3. 如果移除的是当前模型，清除当前模型
        if (live2dStore?.currentModel?.id === model.id) {
          if (live2dStore?.setCurrentModel) {
            live2dStore.setCurrentModel(null)
          }
        }

        message.success(`模型 "${getModelDisplayName(model)}" 已移除`)
      } catch (error) {
        console.error('❌ [ModelSelector] 移除模型失败:', error)
        message.error('移除模型失败')
      }
    }

    const configureModel = (model) => {
      console.log('⚙️ [ModelSelector] 配置模型:', model)
      emit('model-configure', model)
    }

    const scrollToTop = () => {
      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }


    // 优化：优先显示模型对象的 name 字段
    const getModelDisplayName = (modelOrUrl) => {
      if (!modelOrUrl) return '未知模型'
      // 如果传入的是模型对象，优先用 name 字段
      if (typeof modelOrUrl === 'object' && modelOrUrl.name) {
        return modelOrUrl.name
      }
      // 否则尝试用 url 字符串解析
      let url = typeof modelOrUrl === 'string' ? modelOrUrl : modelOrUrl.url
      if (!url || typeof url !== 'string') return '未知模型'
      try {
        const urlParts = url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        return fileName.replace(/\.(json|moc3|model3\.json)$/i, '') || '未知模型'
      } catch (error) {
        return '未知模型'
      }
    }

    // WebSocket 事件处理器
    const handleModelConfigUpdate = (event) => {
      console.log('🔄 [ModelSelector] 收到模型配置更新:', event.detail)
      const config = event.detail

      if (config.model_info) {
        console.log('📦 [ModelSelector] 更新预设模型信息:', config.model_info)

        const serverModel = {
          id: config.model_info.name || 'server-model',
          name: config.model_info.name || '服务器模型',
          description: config.model_info.description,
          url: config.model_info.url,
          ...config.model_info
        }
        console.log('最终 serverModel:', serverModel)
        presetModels.value = [serverModel]

        console.log('✅ [ModelSelector] 预设模型列表已更新:', presetModels.value)
        // 消息提示由 ServerSettings 组件处理，避免重复
      } else {
        // 如果新配置没有模型信息，则清空
        presetModels.value = []
        console.log('ℹ️ [ModelSelector] 新配置无模型信息，清空预设模型列表。')
      }
    }

    const loadLocalModelsIndex = async () => {
      try {
        const response = await fetch('/models/models-index.json');
        if (!response.ok) {
          console.warn(`[ModelSelector] 未找到本地模型索引文件 /models/models-index.json`);
          return;
        }
        const models = await response.json();
        if (Array.isArray(models)) {
          localModelOptions.value = models.map(model => ({
            label: `${model.folder}/${model.name}`,
            value: model // 这里 value 是完整对象
          })).sort((a, b) => a.label.localeCompare(b.label));
          console.log('✅ [ModelSelector] 本地模型索引加载成功:', localModelOptions.value.length, '个模型');
        }
      } catch (error) {
        console.error('❌ [ModelSelector] 加载本地模型索引失败:', error);
      }
    };

    // 监听连接状态变化
    watch(() => webSocketStore.isConnected, (isConnected) => {
      if (isConnected) {
        // 连接成功后，尝试加载一次模型数据
        loadModelData()
      } else {
        // 断开连接后，清空预设模型
        presetModels.value = []
        console.log('🔌 [ModelSelector] 已断开连接，清空预设模型。')
      }
    })

    onMounted(() => {
      // 添加事件监听器
      window.addEventListener('websocket:set-model-and-conf', handleModelConfigUpdate)
      loadModelData()
      loadLocalModelsIndex()
    })

    onUnmounted(() => {
      // 清理事件监听器
      window.removeEventListener('websocket:set-model-and-conf', handleModelConfigUpdate)
    })

    return {
      // 响应式数据
      modelUrl,
      presetModels,
      localModelOptions,
      loadedModels,
      loading,
      addingModel,
      loadingPresetModel,

      // 方法
      loadModelData,
      loadPresetModel,
      addModel,
      removeModel,
      configureModel,
      scrollToTop,
      getModelDisplayName
    }
  }
}
</script>

<style scoped>
.model-selector-vertical-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

/* 预设模型样式 */
.preset-models-card {
  border-radius: 18px;
}

.preset-models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 5px;
  max-height: 300px;
  overflow-y: auto;
  padding: 1px;
}

.preset-model-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--n-border-color);
}

.preset-model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--n-primary-color);
}

.preset-model-card.loading {
  opacity: 0.7;
  pointer-events: none;
}

.preset-model-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-model-name {
  font-weight: 600;
  font-size: 14px;
}

.preset-model-url {
  font-size: 11px;
  color: var(--n-text-color-disabled);
  margin-top: 4px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 自定义模型添加样式 */
.add-model-card {
  border-radius: 18px;
}

.add-model-btn {
  min-width: 120px;
  width: 100%;
  border-radius: 8px;
}

/* 已加载模型样式 */
.loaded-models-card {
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  max-height: 48vh;
}

.models-list-scroll {
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.model-card {
  transition: box-shadow 0.2s, border-color 0.2s;
  border-left: 4px solid var(--n-primary-color);
  border-radius: 12px;
}

.model-card-actions {
  display: flex;
  gap: 8px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.model-card:hover .model-card-actions {
  opacity: 1;
}

/* 响应式设计 */
@media (max-width: 900px) {
  .model-selector-vertical-layout {
    gap: 5px;
  }

  .preset-models-grid {
    grid-template-columns: 1fr;
    max-height: 250px;
  }

  .add-model-card, .loaded-models-card {
    max-width: 100%;
    min-width: 0;
  }

  .loaded-models-card {
    max-height: none;
  }

  .add-model-btn {
    min-width: 0;
  }
}

@media (max-width: 600px) {
  .preset-models-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .preset-model-url {
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
}

.model-path {
  font-size: 12px;
  color: var(--n-text-color-disabled);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
