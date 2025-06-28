<template>
  <div class="server-settings-container">
    <n-card title="服务器设置" :bordered="false">
      <template #header-extra>
        <n-space>
          <n-badge 
            :type="webSocketStore.isConnected ? 'success' : 'error'"
            dot
          >
            <n-text>{{ connectionStatusText }}</n-text>
          </n-badge>
        </n-space>
      </template>

      <n-space vertical size="large">
        <!-- 连接状态 -->
        <n-card title="连接状态详情" size="small">
          <n-space vertical>
            <!-- 主要状态信息 -->
            <n-space align="center" justify="space-between">
              <n-space align="center">
                <n-tag
                  :type="connectionStatusType"
                  :bordered="false"
                  size="large"
                >
                  <template #icon>
                    <n-icon>
                      <component :is="connectionStatusIcon" />
                    </n-icon>
                  </template>
                  {{ connectionStatusText }}
                </n-tag>
                <n-text v-if="webSocketStore.clientUid" depth="3" style="font-size: 12px;">
                  客户端ID: {{ webSocketStore.clientUid }}
                </n-text>
              </n-space>

              <n-space>
                <n-button
                  v-if="!webSocketStore.isConnected"
                  type="primary"
                  @click="handleConnect"
                  :loading="webSocketStore.isConnecting"
                >
                  连接服务器
                </n-button>
                <n-button
                  v-else
                  @click="handleDisconnect"
                >
                  断开连接
                </n-button>
                <n-button
                  quaternary
                  @click="handleRefreshConfigs"
                  :disabled="!webSocketStore.isConnected"
                  :loading="isLoadingConfigs"
                >
                  刷新配置
                </n-button>
              </n-space>
            </n-space>

            <!-- 详细连接信息 -->
            <n-descriptions v-if="webSocketStore.isConnected || webSocketStore.connectionTime" :column="2" size="small">
              <n-descriptions-item v-if="webSocketStore.isConnected" label="连接时长">
                {{ connectionDuration }}
              </n-descriptions-item>
              <n-descriptions-item v-if="webSocketStore.connectionTime" label="连接时间">
                {{ formatTime(webSocketStore.connectionTime) }}
              </n-descriptions-item>
              <n-descriptions-item v-if="webSocketStore.lastConnectAttempt" label="最后尝试">
                {{ formatTime(webSocketStore.lastConnectAttempt) }}
              </n-descriptions-item>
              <n-descriptions-item v-if="webSocketStore.retryCount > 0" label="重试次数">
                {{ webSocketStore.retryCount }}
              </n-descriptions-item>
              <n-descriptions-item label="服务器地址">
                {{ webSocketStore.serverUrl }}
              </n-descriptions-item>
              <n-descriptions-item v-if="webSocketStore.clientUid" label="客户端ID">
                {{ webSocketStore.clientUid }}
              </n-descriptions-item>
            </n-descriptions>

            <!-- 错误信息 -->
            <n-alert v-if="webSocketStore.connectionError" type="error" size="small" :show-icon="false">
              连接错误: {{ webSocketStore.connectionError }}
            </n-alert>

            <!-- 最后错误信息 -->
            <n-alert v-if="webSocketStore.lastError && !webSocketStore.isConnected" type="warning" size="small" :show-icon="false">
              {{ webSocketStore.lastError.type }}: {{ webSocketStore.lastError.message }}
              <n-text depth="3" style="font-size: 11px; margin-left: 8px;">
                {{ formatTime(webSocketStore.lastError.timestamp) }}
              </n-text>
            </n-alert>
          </n-space>
        </n-card>

        <!-- 连接设置 -->
        <n-card title="连接配置" size="small" :segmented="{ content: true }">
          <n-form :model="serverConfig" label-placement="left" label-width="100">
            <n-form-item label="协议">
              <n-select 
                v-model:value="serverConfig.protocol"
                :options="protocolOptions"
                :disabled="webSocketStore.isConnected"
              />
            </n-form-item>
            
            <n-form-item label="主机地址">
              <n-input 
                v-model:value="serverConfig.host"
                placeholder="localhost"
                :disabled="webSocketStore.isConnected"
              />
            </n-form-item>
            
            <n-form-item label="端口">
              <n-input-number 
                v-model:value="serverConfig.port"
                :min="1"
                :max="65535"
                :disabled="webSocketStore.isConnected"
              />
            </n-form-item>
            
            <n-form-item label="完整地址">
              <n-input 
                :value="webSocketStore.serverUrl"
                readonly
                type="textarea"
                :autosize="{ minRows: 1, maxRows: 3 }"
              />
            </n-form-item>
          </n-form>
        </n-card>

        <!-- 服务器配置文件 -->
        <n-card title="服务器配置文件" size="small">
          <n-space vertical>
            <n-descriptions :column="1" size="small">
              <n-descriptions-item label="当前配置">当前配置：{{ currentConfigDisplayName }}</n-descriptions-item>
    
            </n-descriptions>

            <n-select
              v-model="selectedConfig"
              :options="configOptions"
              placeholder="选择配置文件"
              :disabled="!webSocketStore.isConnected || isLoadingConfigs"
              @update:value="handleConfigChange"
              clearable
            />

            <n-space v-if="webSocketStore.configList.character.length === 0 && webSocketStore.isConnected">
              <n-text depth="3">暂无可用配置文件</n-text>
              <n-button size="small" @click="handleRefreshConfigs">
                重新获取
              </n-button>
            </n-space>
          </n-space>
        </n-card>

        <!-- 测试功能 -->
        <n-card title="连接测试" size="small" :segmented="{ content: true }">
          <n-space vertical>
            <n-input
              v-model:value="testMessage"
              placeholder="输入测试消息"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
            />

            <n-space justify="end">
              <n-button
                @click="handleSendTestMessage"
                :disabled="!webSocketStore.isConnected || !testMessage.trim()"
                size="small"
              >
                发送测试消息
              </n-button>
            </n-space>
          </n-space>
        </n-card>

        <!-- 错误信息 -->
        <n-card v-if="webSocketStore.lastError" title="错误信息" size="small">
          <n-alert type="error" :show-icon="false">
            {{ webSocketStore.lastError }}
          </n-alert>
        </n-card>
      </n-space>
    </n-card>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, h } from 'vue'
import { useWebSocketStore } from '@/stores/websocket'
import { useMessage } from 'naive-ui'

export default {
  name: 'ServerSettings',
  setup() {
    const webSocketStore = useWebSocketStore()
    const message = useMessage()
    
    // 本地状态
    const selectedConfig = ref(null)
    const testMessage = ref('')
    const isLoadingConfigs = ref(false)
    
    // 服务器配置 - 与WebSocket store保持一致
    const serverConfig = reactive({
      protocol: 'ws',
      host: 'localhost',
      port: 12393,
      path: '/client-ws'
    })
    
    // 协议选项
    const protocolOptions = [
      { label: 'WebSocket (ws)', value: 'ws' },
      { label: 'WebSocket Secure (wss)', value: 'wss' }
    ]
    
    // 计算属性
    const connectionStatusText = computed(() => {
      if (webSocketStore.isConnecting) return '连接中'
      if (webSocketStore.isConnected) return '已连接'
      return '未连接'
    })

    const connectionStatusType = computed(() => {
      if (webSocketStore.isConnected) return 'success'
      if (webSocketStore.isConnecting) return 'warning'
      return 'error'
    })

    const connectionStatusIcon = computed(() => {
      if (webSocketStore.isConnected) {
        return h('svg', { viewBox: '0 0 24 24' }, [
          h('path', { fill: 'currentColor', d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' })
        ])
      }
      if (webSocketStore.isConnecting) {
        return h('svg', { viewBox: '0 0 24 24' }, [
          h('path', { fill: 'currentColor', d: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z' })
        ])
      }
      return h('svg', { viewBox: '0 0 24 24' }, [
        h('path', { fill: 'currentColor', d: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' })
      ])
    })

    const configOptions = computed(() => {
      return (webSocketStore.configList.character || []).map(config => {
        let label = config.filename;
        if (config.name && config.name !== config.filename) {
          label = `${config.name} (${config.filename})`;
        } else if (config.name) {
          label = config.name;
        }
        return { label, value: config.filename, disabled: false };
      })
    })

    const currentConfigDisplayName = computed(() => {
      // 优先显示 set-model-and-conf 消息中的 conf_name
      const confName = webSocketStore.configs.character?.conf_name;
      if (confName) return confName;
      // 其次用下拉框选中的
      const filename = selectedConfig.value || webSocketStore.configs.character?.filename;
      if (!filename) return '未选择';
      const configFromList = (webSocketStore.configList.character || []).find(
        c => c.filename === filename
      );
      if (configFromList) {
        if (configFromList.name && configFromList.name !== configFromList.filename) {
          return `${configFromList.name} (${configFromList.filename})`;
        }
        return configFromList.name || configFromList.filename;
      }
      // fallback
      return filename;
    });

    // 连接持续时间（实时更新）
    const connectionDuration = ref('未连接')

    // 更新连接持续时间
    const updateConnectionDuration = () => {
      if (webSocketStore.isConnected && webSocketStore.connectionTime) {
        const duration = Date.now() - webSocketStore.connectionTime
        const seconds = Math.floor(duration / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)

        if (hours > 0) {
          connectionDuration.value = `${hours}小时${minutes % 60}分钟`
        } else if (minutes > 0) {
          connectionDuration.value = `${minutes}分钟${seconds % 60}秒`
        } else {
          connectionDuration.value = `${seconds}秒`
        }
      } else {
        connectionDuration.value = '未连接'
      }
    }

    // 格式化时间
    const formatTime = (timestamp) => {
      if (!timestamp) return '无'
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
    

    
    // 方法
    const handleConnect = async () => {
      try {
        console.log('🔌 [ServerSettings] 开始连接服务器:', serverConfig)
        // 更新服务器配置
        webSocketStore.updateServerConfig(serverConfig)
        
        await webSocketStore.connect()
        console.log('🔌 [ServerSettings] 服务器连接成功')
        message.success('连接成功')
        await handleRefreshConfigs()
      } catch (error) {
        console.error('🔌 [ServerSettings] 连接失败:', error)
        message.error(`连接失败: ${error.message}`)
      }
    }
    
    const handleDisconnect = () => {
      try {
        console.log('🔌 [ServerSettings] 断开服务器连接')
        webSocketStore.disconnect()
        message.info('已断开连接')
        selectedConfig.value = null

      } catch (error) {
        console.error('🔌 [ServerSettings] 断开连接失败:', error)
        message.error(`断开连接失败: ${error.message}`)
      }
    }


    
    const handleSendTestMessage = async () => {
      if (!testMessage.value.trim()) return

      try {
        // 使用WebSocket store的文本消息发送方法
        const success = await webSocketStore.sendTextMessage(testMessage.value.trim())

        if (success) {
          message.success('测试消息已发送')
          testMessage.value = ''
        } else {
          throw new Error('发送失败')
        }
      } catch (error) {
        console.error('📝 [ServerSettings] 发送测试消息失败:', error)
        message.error(`发送测试消息失败: ${error.message}`)
      }
    }

    const handleRefreshConfigs = async () => {
      try {
        isLoadingConfigs.value = true
        console.log('📋 [ServerSettings] 开始获取配置列表')
        await webSocketStore.fetchConfigs()
        const configs = webSocketStore.configList.character
        console.log('📋 [ServerSettings] 配置列表获取成功:', configs)
        message.success('配置列表已刷新')

        // 如果没有当前选中的配置，并且获取到了配置列表，则默认选择第一个
        if (!selectedConfig.value && configs && configs.length > 0) {
          const firstConfigFilename = configs[0].filename
          if (firstConfigFilename) {
            console.log(`[ServerSettings] 默认选择第一个配置: ${firstConfigFilename}`)
            selectedConfig.value = firstConfigFilename
            // 触发配置切换
            await handleConfigChange(firstConfigFilename)
          }
        }
      } catch (error) {
        console.error('📋 [ServerSettings] 获取配置列表失败:', error)
        message.error(`获取配置列表失败: ${error.message}`)
      } finally {
        isLoadingConfigs.value = false
      }
    }

    const handleConfigChange = async (configFile) => {
      // configFile 是被选中的 filename
      if (!configFile) { 
        selectedConfig.value = null
        return
      }

      try {
        console.log('🔄 [ServerSettings] 请求切换配置:', configFile)
        message.info(`正在切换到配置: ${configFile}...`)
        await webSocketStore.switchConfig(configFile)
        // UI 更新将由 'websocket:set-model-and-conf' 事件处理器驱动
        // 不再需要 setTimeout
      } catch (error) {
        console.error('🔄 [ServerSettings] 切换配置失败:', error)
        message.error(`切换配置失败: ${error.message}`)
        selectedConfig.value = webSocketStore.configs.character?.filename|| null
      }
    }





    // WebSocket事件处理器
    const handleConfigFilesUpdate = (event) => {
      console.log('📋 [ServerSettings] 收到配置文件列表更新:', event.detail)
      isLoadingConfigs.value = false
    }

    const handleModelConfigUpdate = (event) => {
      console.log('🔄 [ServerSettings] 收到模型和配置更新:', event.detail)
      const config = event.detail

      // 处理 set-model-and-conf 消息
      if (config.filename) {
        // 使用 filename 更新选择器的值，确保与 configOptions 的 value 匹配
        selectedConfig.value = config.filename

        // 显示成功消息，包含模型信息
        let successMsg = `配置已切换到: ${config.name || config.filename}`
        if (config.model_info && config.model_info.name) {
          successMsg += ` (模型: ${config.model_info.name})`
        }
        message.success(successMsg)

        // 记录详细信息
        console.log('📋 [ServerSettings] 配置详情:', {
          配置名称: config.name || config.filename,
          文件名: config.filename,
          配置UID: config.conf_uid,
          模型信息: config.model_info,
          客户端UID: config.client_uid,
        })
      }
    }

    // 定时器
    let durationTimer = null

    // 初始化时同步配置
    onMounted(() => {
      try {
        Object.assign(serverConfig, webSocketStore.serverConfig)
        // 初始化时，将选择器的值设置为当前已加载配置的 filename
        selectedConfig.value = webSocketStore.configs.character?.filename || null

        // 添加事件监听器
        window.addEventListener('websocket:config-files', handleConfigFilesUpdate)
        window.addEventListener('websocket:set-model-and-conf', handleModelConfigUpdate)

        // 启动连接持续时间更新定时器
        durationTimer = setInterval(updateConnectionDuration, 1000)
        updateConnectionDuration() // 立即更新一次
      } catch (error) {
        console.error('⚙️ [ServerSettings] 初始化配置失败:', error)
        message.error(`初始化配置失败: ${error.message}`)
      }
    })

    // 清理事件监听器
    onUnmounted(() => {
      window.removeEventListener('websocket:config-files', handleConfigFilesUpdate)
      window.removeEventListener('websocket:set-model-and-conf', handleModelConfigUpdate)

      // 清理定时器
      if (durationTimer) {
        clearInterval(durationTimer)
        durationTimer = null
      }
    })
    
    return {
      webSocketStore,
      selectedConfig,
      testMessage,
      serverConfig,
      protocolOptions,
      connectionStatusText,
      connectionStatusType,
      connectionStatusIcon,
      configOptions,
      currentConfigDisplayName,
      isLoadingConfigs,
      connectionDuration,
      formatTime,
      handleConnect,
      handleDisconnect,
      handleRefreshConfigs,
      handleConfigChange,
      handleSendTestMessage
    }
  }
}
</script>

<style scoped>
/* 服务器设置容器 - 使用overflow-y: auto实现滚动 */
.server-settings-container {
  height: 100%;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  padding-right: 8px; /* 为滚动条留出空间 */
}

/* 自定义滚动条样式 */
.server-settings-container::-webkit-scrollbar {
  width: 6px;
}

.server-settings-container::-webkit-scrollbar-track {
  background: transparent;
}

.server-settings-container::-webkit-scrollbar-thumb {
  background: var(--n-scrollbar-color, #d0d0d0);
  border-radius: 3px;
  transition: background 0.3s ease;
}

.server-settings-container::-webkit-scrollbar-thumb:hover {
  background: var(--n-scrollbar-color-hover, #a0a0a0);
}

/* Firefox滚动条样式 */
.server-settings-container {
  scrollbar-width: thin;
  scrollbar-color: var(--n-scrollbar-color, #d0d0d0) transparent;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-content {
    padding: 8px;
    padding-right: 4px;
  }

  :deep(.n-descriptions) {
    --n-th-padding: 8px;
    --n-td-padding: 8px;
  }

  :deep(.n-form-item) {
    --n-label-width: 80px;
  }
}
</style>
