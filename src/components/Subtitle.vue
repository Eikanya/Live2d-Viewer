<template>
  <transition name="fade">
    <div 
      v-if="showSubtitle && subtitleText" 
      class="subtitle-container"
      :style="{
        bottom: `${position}%`,
        fontSize: `${fontSize}rem`,
        backgroundColor: `rgba(${backgroundColor}, ${opacity})`,
        color: textColor,
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px ${padding * 2}px`
      }"
    >
      <div class="subtitle-text" :style="{ textShadow: textShadow }">
        {{ subtitleText }}
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSubtitleStore } from '../stores/subtitle'
import { useSettingsStore } from '../stores/settings'

const subtitleStore = useSubtitleStore()
const settingsStore = useSettingsStore()

// 字幕文本和显示状态
const subtitleText = computed(() => subtitleStore.subtitleText)
const showSubtitle = computed(() => subtitleStore.showSubtitle)

// 字幕样式配置
const fontSize = computed(() => settingsStore.subtitleSettings.fontSize || 1.35)
const position = computed(() => settingsStore.subtitleSettings.position || 20)
const backgroundColor = computed(() => settingsStore.subtitleSettings.backgroundColor || '30, 30, 40')
const opacity = computed(() => settingsStore.subtitleSettings.opacity || 0.92)
const textColor = computed(() => settingsStore.subtitleSettings.textColor || '#fff')
const borderRadius = computed(() => settingsStore.subtitleSettings.borderRadius || 18)
const padding = computed(() => settingsStore.subtitleSettings.padding || 14)
const textShadow = computed(() => settingsStore.subtitleSettings.textShadow || '0 2px 4px rgba(0,0,0,0.2)')

// 自动清除字幕
let clearTimer = null

const clearSubtitleAfterDelay = () => {
  if (clearTimer) {
    clearTimeout(clearTimer)
  }
  
  if (settingsStore.subtitleSettings.autoClear && subtitleText.value) {
    clearTimer = setTimeout(() => {
      subtitleStore.clearSubtitle()
    }, settingsStore.subtitleSettings.clearDelay || 5000)
  }
}

// 监听字幕变化
watch(subtitleText, (newText) => {
  if (newText) {
    clearSubtitleAfterDelay()
  }
})

onMounted(() => {
  if (subtitleText.value) {
    clearSubtitleAfterDelay()
  }
})

onUnmounted(() => {
  if (clearTimer) {
    clearTimeout(clearTimer)
  }
})
</script>

<style scoped>
.subtitle-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  max-width: 80vw;
  min-width: 120px;
  text-align: center;
  pointer-events: none;
  user-select: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 24px 0 rgba(80,80,120,0.10);
}

.subtitle-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style> 