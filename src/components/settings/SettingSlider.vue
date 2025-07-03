<template>
  <n-form-item :label="label" label-placement="left" :style="formItemStyle">
    <n-space vertical style="width: 100%;" :size="spaceSize">
      <n-slider
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        @update:value="handleSliderUpdate"
        :tooltip="true"
        :style="sliderStyle"
      />
      <n-space justify="space-between" align="center" v-if="showMinMaxInput">
        <span style="font-size: 11px; color: var(--n-text-color-disabled);">{{ min }}</span>
        <n-input-number
          :value="modelValue"
          :min="min"
          :max="max"
          :step="step"
          size="tiny"
          @update:value="handleInputNumberUpdate"
          :style="inputNumberStyle"
        />
        <span style="font-size: 11px; color: var(--n-text-color-disabled);">{{ max }}</span>
      </n-space>
      <n-space v-if="showResetButton">
        <n-button @click="handleReset" size="small" secondary>
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </n-icon>
          </template>
          重置
        </n-button>
      </n-space>
    </n-space>
  </n-form-item>
</template>

<script>
import { NFormItem, NSlider, NInputNumber, NSpace, NButton, NIcon } from 'naive-ui'

export default {
  name: 'SettingSlider',
  components: {
    NFormItem,
    NSlider,
    NInputNumber,
    NSpace,
    NButton,
    NIcon
  },
  props: {
    label: {
      type: String,
      required: true
    },
    modelValue: {
      type: Number,
      required: true
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 1
    },
    step: {
      type: Number,
      default: 0.01
    },
    defaultValue: {
      type: Number,
      default: null
    },
    showMinMaxInput: {
      type: Boolean,
      default: true
    },
    showResetButton: {
      type: Boolean,
      default: false
    },
    formItemStyle: {
      type: Object,
      default: () => ({})
    },
    sliderStyle: {
      type: Object,
      default: () => ({})
    },
    inputNumberStyle: {
      type: Object,
      default: () => ({ width: '80px' })
    },
    spaceSize: {
      type: String,
      default: 'medium'
    },
    updater: {
      type: Function,
      default: null
    }
  },
  emits: ['update:modelValue', 'reset'],
  setup(props, { emit }) {
    const handleUpdate = (value) => {
      emit('update:modelValue', value)
      if (props.updater) {
        props.updater(value)
      }
    }

    const handleSliderUpdate = (value) => {
      handleUpdate(value)
    }

    const handleInputNumberUpdate = (value) => {
      handleUpdate(value)
    }

    const handleReset = () => {
      if (props.defaultValue !== null) {
        emit('update:modelValue', props.defaultValue)
      }
      emit('reset')
    }

    return {
      handleSliderUpdate,
      handleInputNumberUpdate,
      handleReset
    }
  }
}
</script>

<style scoped>
/* 可以根据需要添加局部样式 */
</style>
