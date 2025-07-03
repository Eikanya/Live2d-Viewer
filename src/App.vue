<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <n-dialog-provider>
        <div id="app" class="app-container" :class="{ 'pet-mode': isPetMode }">
          <!-- 非桌宠模式显示完整界面 -->
          <template v-if="!isPetMode">
          <div class="modern-layout">
            <!-- 顶部导航栏 -->
            <div class="top-nav">
              <n-space justify="space-between" align="center">
                <div class="brand-section">
                  <h2 class="brand-title" :class="{ 'dark-theme': themeStore.isDark }">
                    <span class="brand-icon">🎭</span>
                    Live2D Viewer
                  </h2>
                  <n-tag size="small" :type="connectionBadgeType" class="status-tag">
                    {{ connectionStatusText }}
                  </n-tag>
                </div>
                <n-space>
                  <n-button
                    @click="toggleSettingsPanel"
                    circle
                    quaternary
                    class="settings-toggle"
                    :class="{ 'collapsed': settingsCollapsed }"
                    aria-label="切换设置面板"
                  >
                    <template #icon>
                      <span>{{ settingsCollapsed ? '📋' : '📝' }}</span>
                    </template>
                  </n-button>
                  <n-button
                    @click="toggleTheme"
                    circle
                    quaternary
                    class="theme-toggle"
                    :aria-label="`切换到${themeStore.isDark ? '浅色' : '深色'}主题`"
                  >
                    {{ getThemeIcon() }}
                  </n-button>
                  <n-button
                    @click="showSettings = !showSettings"
                    type="primary"
                    ghost
                    v-if="!settingsCollapsed"
                    :aria-label="showSettings ? '隐藏设置' : '显示设置'"
                  >
                    <template #icon>
                      <span>⚙️</span>
                    </template>
                    {{ showSettings ? '隐藏设置' : '显示设置' }}
                  </n-button>
                </n-space>
              </n-space>
            </div>

            <!-- 主要内容区域 -->
            <div class="main-content">
              <NSplit
                direction="horizontal"
                :size="splitSize"
                :default-size="0.3"
                :min="0.05"
                :max="0.5"
                class="main-split"
                @update:size="handleSplitSizeUpdate"
              >
                <template #1>
                  <!-- 左侧设置区域 -->
                  <div class="settings-panel" :class="{ 'collapsed': settingsCollapsed }">
                    <div class="settings-sidebar" v-show="!settingsCollapsed">
                      <n-card
                        title="功能菜单"
                        size="small"
                        class="menu-card"
                        :bordered="false"
                      >
                        <n-menu
                          :value="activeKey"
                          :options="menuOptions"
                          @update:value="handleMenuSelect"
                          class="main-menu"
                        />
                      </n-card>
                    </div>

                    <!-- 折叠状态下的侧边栏 -->
                    <div class="collapsed-sidebar" v-show="settingsCollapsed">
                      <div class="collapsed-menu">
                        <n-tooltip
                          v-for="option in menuOptions.filter(opt => opt.key)"
                          :key="option.key"
                          placement="right"
                        >
                          <template #trigger>
                            <n-button
                              :type="activeKey === option.key ? 'primary' : 'tertiary'"
                              size="small"
                              circle
                              @click="handleMenuSelect(option.key)"
                              class="collapsed-menu-item"
                            >
                              <component :is="option.icon" />
                            </n-button>
                          </template>
                          <span>{{ option.label }}</span>
                        </n-tooltip>
                      </div>
                    </div>

                    <div class="settings-content" v-show="!settingsCollapsed">
                      <n-card
                        :title="currentPageTitle"
                        size="small"
                        class="content-card"
                        :bordered="false"
                      >
                        <template #header-extra>
                          <n-tag size="small" type="info">
                            {{ activeKey }}
                          </n-tag>
                        </template>

                        <div class="scrollable-content">
                          <ErrorBoundary @error="handleComponentError" @retry="handleComponentRetry">
                            <Suspense>
                              <template #default>
                                <component
                                  :is="currentComponent"
                                  :key="activeKey"
                                  @model-selected="handleModelSelected"
                                  @model-configure="handleModelConfigure"
                                  @back="handleBack"
                                  @settings-changed="handleSettingsChanged"
                                />
                              </template>
                              <template #fallback>
                                <div class="loading-container">
                                  <n-spin size="large">
                                    <template #description>
                                      加载组件中...
                                    </template>
                                  </n-spin>
                                </div>
                              </template>
                            </Suspense>
                          </ErrorBoundary>
                        </div>
                      </n-card>
                    </div>
                  </div>
                </template>
                <template #2>
                  <!-- 右侧Live2D显示区域 -->
                  <div class="live2d-main-area">
                    <NSplit
                      direction="vertical"
                      :default-size="0.7"
                      :min="0.5"
                      :max="0.95"
                      class="live2d-split"
                    >
                      <template #1>
                        <!-- Live2D模型显示区 -->
                        <div class="live2d-viewer-container">
                          <n-card
                            title="Live2D 模型展示"
                            size="small"
                            class="live2d-card"
                            :bordered="false"
                          >
                            <template #header-extra>
                              <n-space>
                              </n-space>
                            </template>

                            <div class="live2d-display-area">
                              <Live2DViewer
                                ref="live2dViewer"
                              />

                            </div>
                          </n-card>
                        </div>
                      </template>

                      <template #2>
                        <!-- AI控制面板 -->
                        <div class="ai-control-container">
                          <AIControlPanel />
                        </div>
                      </template>
                    </NSplit>
                  </div>
                </template>
              </NSplit>
            </div>
          </div>

          <!-- 全局字幕框 -->
          <Subtitle />
          </template>

          <!-- 桌宠模式只显示模型和对话框 -->
          <template v-else>
            <div class="pet-mode-container">
              <!-- Live2D 模型 -->
              <div class="pet-model-container">
                <Live2DViewer />
              </div>
              
              <!-- AI 对话输入框 -->
              <div class="pet-chat-container">
                <ChatInterface />
              </div>
            </div>
          </template>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script>
import { ref, computed, h, onMounted, onUnmounted, watch } from 'vue'
import { darkTheme, NSplit, NDialogProvider } from 'naive-ui'
import Live2DViewer from './components/Live2DViewer.vue'
import ModelSelector from './components/ModelSelector.vue'
import ModelSettings from './components/ModelSettings.vue'
import CanvasSettings from './components/CanvasSettings.vue'
import ChatInterface from './components/chat/ChatInterface.vue'
import ServerSettings from './components/connection/ServerSettings.vue'
import VoiceSettings from './components/audio/VoiceSettings.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import { useLive2DStore } from './stores/live2d'
import { useWebSocketStore } from './stores/websocket'
import { useThemeStore } from './stores/theme'
import { useAIStore } from './stores/ai' // Import the new AI store
import AIControlPanel from './components/AIControlPanel.vue'
import Subtitle from './components/Subtitle.vue'
import { isElectron } from './utils/electron'
import './styles/app-styles.css'


export default {
  name: 'App',
  components: {
    Live2DViewer,
    ModelSelector,
    ModelSettings,
    CanvasSettings,
    ChatInterface,
    ServerSettings,
    VoiceSettings,
    ErrorBoundary,
    NSplit,
    AIControlPanel,
    Subtitle,
    NDialogProvider
  },
  setup() {
    const live2dViewer = ref(null)
    const live2dStore = useLive2DStore()
    const webSocketStore = useWebSocketStore()
    const themeStore = useThemeStore()
    const aiStore = useAIStore() // Use the new AI store


    // 主题相关
    const theme = computed(() => themeStore.isDark ? darkTheme : null)

    // 布局相关
    const showSettings = ref(true)
    const settingsCollapsed = ref(false)
    const activeKey = ref('model-selector')
    // 布局相关
    const INITIAL_SPLIT_SIZE = 0.3
    const COLLAPSED_SPLIT_SIZE_BUTTON = 0.02
    const COLLAPSED_SPLIT_SIZE_DRAG = 0.1 // Used when dragging to collapse
    const EXPANDED_SPLIT_SIZE = 0.3
    const COLLAPSE_THRESHOLD = 0.15
    const EXPAND_THRESHOLD = 0.2
    const RETRY_TIMEOUT_MS = 100

    const splitSize = ref(INITIAL_SPLIT_SIZE)

    // 菜单选项
    const menuOptions = [
      {
        label: '模型选择',
        key: 'model-selector',
        icon: () => h('span', '🎭')
      },
      {
        label: '模型设置',
        key: 'model-settings',
        icon: () => h('span', '⚙️')
      },
      {
        label: '画布设置',
        key: 'canvas-settings',
        icon: () => h('span', '🖼️')
      },
      {
        type: 'divider'
      },
      {
        label: 'AI 对话',
        key: 'chat-interface',
        icon: () => h('span', '💬')
      },
      {
        label: '服务器设置',
        key: 'server-settings',
        icon: () => h('span', '🖥️')
      },
      {
        label: '语音设置',
        key: 'voice-settings',
        icon: () => h('span', '🎤')
      }
    ]

    // 计算属性
    const currentPageTitle = computed(() => {
      const titles = {
        'model-selector': '模型选择',
        'model-settings': '模型设置',
        'canvas-settings': '画布设置',
        'chat-interface': 'AI对话',
        'server-settings': '服务器设置',
        'voice-settings': '语音设置'
      }
      return titles[activeKey.value] || '设置'
    })

    const currentComponent = computed(() => {
      const components = {
        'model-selector': 'ModelSelector',
        'model-settings': 'ModelSettings',
        'canvas-settings': 'CanvasSettings',
        'chat-interface': 'ChatInterface',
        'server-settings': 'ServerSettings',
        'voice-settings': 'VoiceSettings'
      }
      return components[activeKey.value]
    })

    const connectionBadgeType = computed(() => {
      return webSocketStore.isConnected ? 'success' : 'error'
    })

    const connectionStatusText = computed(() => {
      return webSocketStore.isConnected ? '已连接' : '未连接'
    })

    const aiStatus = computed(() => {
      // Map internal AI status to display text
      const statusMap = {
        'idle': '待机中',
        'thinking_speaking': '思考/说话中',
        'interrupted': '已中断',
        'loading': '加载中',
        'listening': '聆听中',
        'waiting': '等待中'
      };
      return statusMap[aiStore.currentAIStatus] || '未知状态';
    });

    const isPetMode = computed(() => {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('mode') === 'pet'
    })

    // 方法
    const toggleTheme = () => {
      themeStore.toggleTheme()
    }

    const getThemeIcon = () => {
      switch (themeStore.currentTheme) {
        case 'light': return '🌞'
        case 'dark': return '🌙'
        case 'auto': return '🌗'
        default: return '🌗'
      }
    }

    const toggleSettingsPanel = () => {
      settingsCollapsed.value = !settingsCollapsed.value
      splitSize.value = settingsCollapsed.value ? COLLAPSED_SPLIT_SIZE_BUTTON : EXPANDED_SPLIT_SIZE
    }

    const handleSplitSizeUpdate = (size) => {
      splitSize.value = size
      // 当拖动分割器使左侧面板小于COLLAPSE_THRESHOLD时，自动折叠
      if (size <= COLLAPSE_THRESHOLD && !settingsCollapsed.value) {
        settingsCollapsed.value = true
        splitSize.value = COLLAPSED_SPLIT_SIZE_DRAG
      }
      // 当拖动分割器使左侧面板大于EXPAND_THRESHOLD时，自动展开
      else if (size >= EXPAND_THRESHOLD && settingsCollapsed.value) {
        settingsCollapsed.value = false
        splitSize.value = EXPANDED_SPLIT_SIZE
      }
    }

    const handleMenuSelect = (key) => {
      activeKey.value = key
      // 如果在折叠状态下选择菜单项，自动展开设置面板
      if (settingsCollapsed.value) {
        settingsCollapsed.value = false
        splitSize.value = EXPANDED_SPLIT_SIZE
      }
    }

    const handleModelSelected = (modelData) => {
      console.log('模型选择:', modelData)
      if (live2dViewer.value) {
        live2dViewer.value.loadModel(modelData)
      }
    }

    const handleModelConfigure = (modelData) => {
      console.log('配置模型:', modelData)
      // live2dStore.setCurrentModel(modelData) // 移除此行，避免在切换到设置时重置模型
      activeKey.value = 'model-settings'
    }

    const handleBack = () => {
      activeKey.value = 'model-selector'
    }

    const handleSettingsChanged = (settings) => {
      console.log('设置已更改:', settings)
    }

    const handleComponentError = (errorInfo) => {
      console.error('组件错误:', errorInfo)
      if (activeKey.value === 'canvas-settings') {
        activeKey.value = 'model-selector'
      }
    }

    const handleComponentRetry = () => {
      console.log('组件重试')
      const currentKey = activeKey.value
      activeKey.value = ''
      setTimeout(() => {
        activeKey.value = currentKey
      }, RETRY_TIMEOUT_MS)
    }

    onMounted(() => {
      console.log('应用初始化完成')
      // 初始化主题
      themeStore.initTheme()

      if (isElectron() && !isPetMode.value) {
        // 如果是主窗口，监听模型变化并同步到桌宠窗口
        watch(() => live2dStore.currentModel, (newModel) => {
          if (newModel) {
            window.electronAPI?.send('sync-model-to-pet-mode', newModel)
          }
        })
      }
    })

    return {
      live2dViewer,
      live2dStore,
      theme,
      themeStore,
      showSettings,
      settingsCollapsed,
      activeKey,
      menuOptions,
      currentPageTitle,
      currentComponent,
      connectionBadgeType,
      connectionStatusText,
      aiStatus,
      webSocketStore,
      aiStore, // Expose aiStore
      splitSize,
      toggleTheme,
      getThemeIcon,
      toggleSettingsPanel,
      handleSplitSizeUpdate,
      handleMenuSelect,
      handleModelSelected,
      handleModelConfigure,
      handleBack,
      handleSettingsChanged,
      handleComponentError,
      handleComponentRetry,
      isPetMode
    }
  }
}
</script>
