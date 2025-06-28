import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

// 导入优化工具
import { globalResourceManager } from './utils/resource-manager.js'
import { globalStateSyncManager } from './utils/live2d/state-sync-manager.js'

// 导入调试配置
import { initDebugConfig } from './config/debug.js'

// Naive UI
import {
  // 创建一个朴素的主题
  create,
  // 组件
  NConfigProvider,
  NLayout,
  NLayoutHeader,
  NLayoutSider,
  NLayoutContent,
  NMenu,
  NCard,
  NButton,
  NSelect,
  NSlider,
  NSwitch,
  NInputNumber,
  NColorPicker,
  NForm,
  NFormItem,
  NSpin,
  NMessageProvider,
  NModal,
  NPopconfirm,
  NGrid,
  NGridItem,
  NSpace,
  NDivider,
  NIcon,
  NTooltip,
  NCollapse,
  NCollapseItem,
  NTabs,
  NTabPane,
  NTag,
  NInput,
  NText,
  NAvatar,
  NBadge,
  NList,
  NListItem,
  NThing,
  NEmpty,
  NScrollbar,
  darkTheme
} from 'naive-ui'

const naive = create({
  components: [
    NConfigProvider,
    NLayout,
    NLayoutHeader,
    NLayoutSider,
    NLayoutContent,
    NMenu,
    NCard,
    NButton,
    NSelect,
    NSlider,
    NSwitch,
    NInputNumber,
    NColorPicker,
    NForm,
    NFormItem,
    NSpin,
    NMessageProvider,
    NModal,
    NPopconfirm,
    NGrid,
    NGridItem,
    NSpace,
    NDivider,
    NIcon,
    NTooltip,
    NCollapse,
    NCollapseItem,
    NTabs,
    NTabPane,
    NTag,
    NInput,
    NText,
    NAvatar,
    NBadge,
    NList,
    NListItem,
    NThing,
    NEmpty,
    NScrollbar
  ]
})

// 创建应用实例
const app = createApp(App)

// 使用 Pinia 状态管理
app.use(createPinia())

// 使用 Naive UI
app.use(naive)

// 挂载应用
app.mount('#app')

// 应用启动完成后的初始化
console.log('🚀 应用启动完成')
console.log('📊 资源管理器状态:', globalResourceManager.getResourceCount())

// 初始化调试配置
initDebugConfig()

// 在开发环境下默认启用 Live2D 调试模式
if (import.meta.env.DEV) {
  // 如果 localStorage 中没有设置，则默认启用 Live2D 调试
  if (!localStorage.getItem('DEBUG_LIVE2D')) {
    window.DEBUG_LIVE2D = true
    localStorage.setItem('DEBUG_LIVE2D', 'true')
    console.log('🔧 开发环境：已自动启用 Live2D 调试模式')
  }
}
// 在开发模式下暴露全局资源管理器
if (import.meta.env.DEV) {
  window.globalResourceManager = globalResourceManager
  window.globalStateSyncManager = globalStateSyncManager
  console.log('🔧 开发环境：已暴露全局管理器到window对象')
}
