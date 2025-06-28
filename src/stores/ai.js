import { defineStore } from 'pinia'

export const useAIStore = defineStore('ai', {
  state: () => ({
    aiStatus: 'idle', // 初始状态
  }),
  actions: {
    setAIStatus(status) {
      const validStatuses = ['idle', 'thinking_speaking', 'interrupted', 'loading', 'listening', 'waiting'];
      if (validStatuses.includes(status)) {
        this.aiStatus = status;
        console.log(`[AIStore] AI Status updated to: ${status}`);
      } else {
        console.warn(`[AIStore] Invalid AI status: ${status}. Status not updated.`);
      }
    },
  },
  getters: {
    currentAIStatus: (state) => state.aiStatus,
  },
});
