<template>
  <div class="control-panel">
    <div class="tab">
      <div class="tab-btn-list">
        <div 
          class="tab-btn" 
          :class="{ 'btn-selecting': activeTab === 'models' }"
          @click="setActiveTab('models')"
        >
          <a>模型</a>
        </div>
        <div 
          class="tab-btn" 
          :class="{ 'btn-selecting': activeTab === 'canvas' }"
          @click="setActiveTab('canvas')"
        >
          <a>画布</a>
        </div>
      </div>
    </div>

    <!-- 模型选择面板 -->
    <div v-show="activeTab === 'models' && !showModelSettings" class="tab-content shown">
      <ModelSelector
        @model-selected="handleModelSelected"
        @model-configure="handleModelConfigure"
      />
    </div>

    <!-- 模型设置面板 -->
    <div v-show="activeTab === 'models' && showModelSettings" class="tab-content shown">
      <ModelSettings @back="handleBackFromSettings" />
    </div>

    <!-- 画布设置面板 -->
    <div v-show="activeTab === 'canvas'" class="tab-content shown">
      <CanvasSettings />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import ModelSelector from './ModelSelector.vue'
import ModelSettings from './ModelSettings.vue'
import CanvasSettings from './CanvasSettings.vue'
import { useLive2DStore } from '../stores/live2d'

export default {
  name: 'ControlPanel',
  components: {
    ModelSelector,
    ModelSettings,
    CanvasSettings
  },
  emits: ['model-selected'],
  setup(_, { emit }) {
    const live2dStore = useLive2DStore()
    const activeTab = ref('models')
    const showModelSettings = ref(false)

    const setActiveTab = (tab) => {
      activeTab.value = tab
      showModelSettings.value = false
    }

    const handleModelSelected = (modelData) => {
      if (live2dStore?.setCurrentModel) {
        live2dStore.setCurrentModel(modelData)
      }
      emit('model-selected', modelData)
    }

    const handleModelConfigure = (modelData) => {
      if (live2dStore?.setCurrentModel) {
        live2dStore.setCurrentModel(modelData)
      }
      showModelSettings.value = true
    }

    const handleBackFromSettings = () => {
      showModelSettings.value = false
    }

    return {
      activeTab,
      showModelSettings,
      setActiveTab,
      handleModelSelected,
      handleModelConfigure,
      handleBackFromSettings
    }
  }
}
</script>

<style scoped>
.control-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}
</style>
