<template>
  <n-space justify="space-between" align="center">
    <span>{{ label }}</span>
    <n-switch
      :value="modelValue"
      @update:value="handleSwitchUpdate"
    />
  </n-space>
</template>

<script>
import { NSwitch, NSpace } from 'naive-ui'

export default {
  name: 'SettingSwitch',
  components: {
    NSwitch,
    NSpace
  },
  props: {
    label: {
      type: String,
      required: true
    },
    modelValue: {
      type: Boolean,
      required: true
    },
    updater: {
      type: Function,
      default: null
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const handleSwitchUpdate = (value) => {
      emit('update:modelValue', value)
      if (props.updater) {
        props.updater(value)
      }
    }

    return {
      handleSwitchUpdate
    }
  }
}
</script>

<style scoped>
/* 可以根据需要添加局部样式 */
</style>
