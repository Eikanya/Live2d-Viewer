import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSubtitleStore = defineStore('subtitle', () => {
  const subtitleText = ref('')
  const showSubtitle = ref(true)

  const setSubtitleText = (text) => {
    subtitleText.value = text
  }

  const appendSubtitleText = (text) => {
    if (text) {
      // 如果当前有字幕，添加空格分隔
      if (subtitleText.value) {
        subtitleText.value += ' ' + text
      } else {
        subtitleText.value = text
      }
    }
  }

  const clearSubtitle = () => {
    subtitleText.value = ''
  }

  const toggleSubtitle = () => {
    showSubtitle.value = !showSubtitle.value
  }

  return {
    subtitleText,
    showSubtitle,
    setSubtitleText,
    appendSubtitleText,
    clearSubtitle,
    toggleSubtitle
  }
}) 