<template>
  <div class="hud">
    <div class="left">
      <span class="time">{{ elapsedLabel }}</span>
      <button class="btn" @click="store.togglePause()">
        {{ store.state?.paused ? '▶ 繼續' : '⏸ 暫停' }}
      </button>
      <NuxtLink to="/" class="btn ghost">返回</NuxtLink>
    </div>
    <div class="center">
      <span
        v-for="f in store.factions"
        :key="f.id"
        class="owner-tag"
        :class="{ me: f.id === store.state?.playerFactionId }"
        :style="{ color: f.color }"
      >
        <i class="dot" :style="{ background: f.color }"></i>
        {{ f.name }} {{ store.ownerCounts[f.id] }}
      </span>
      <span class="owner-tag neutral">
        <i class="dot" style="background:#8a7a60"></i>
        中立 {{ store.ownerCounts.neutral }}
      </span>
    </div>
    <div class="right">
      <button class="btn icon" @click="bgm.toggleMute()" :title="bgm.muted.value ? '開啟音樂' : '關閉音樂'">
        {{ bgm.muted.value ? '🔇' : '🔊' }}
      </button>
      <input
        class="vol"
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="bgm.volume.value"
        @input="onVol"
        :disabled="bgm.muted.value"
      />
      <span class="hint">按住自家郡拖到鄰居派出一半</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { useBgm } from '~/composables/useBgm'

const store = useGameStore()
const bgm = useBgm()

// 遊戲時間：公元 184 年 1 月起（黃巾之亂），每 1 秒 = 1 個月
const START_YEAR = 184
const MS_PER_MONTH = 1000
const elapsedLabel = computed(() => {
  const ms = store.state?.elapsedMs ?? 0
  const totalMonths = Math.floor(ms / MS_PER_MONTH)
  const year = START_YEAR + Math.floor(totalMonths / 12)
  const month = (totalMonths % 12) + 1
  return `公元 ${year} 年 ${month} 月`
})

function onVol(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  bgm.setVolume(v)
}
</script>

<style scoped>
.hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(26, 21, 16, 0.9);
  border-bottom: 1px solid #3a2d20;
  gap: 16px;
  flex-wrap: wrap;
}
.left, .center, .right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.time {
  color: #d4af37;
  font-size: 16px;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
  min-width: 160px;
}
.btn {
  background: #2a2018;
  color: #e8dcc4;
  border: 1px solid #3a2d20;
  border-radius: 4px;
  padding: 6px 12px;
  text-decoration: none;
  font-size: 13px;
}
.btn:hover { background: #3a2d20; }
.btn.ghost { background: transparent; }
.owner-tag {
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
}
.owner-tag.me::after {
  content: '（你）';
  font-size: 11px;
  opacity: 0.7;
}
.owner-tag.neutral { color: #a89a7e; }
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.hint { color: #a89a7e; font-size: 12px; }
.btn.icon { padding: 6px 10px; font-size: 14px; }
.vol {
  width: 80px;
  accent-color: #d4af37;
}
.vol:disabled { opacity: 0.4; }
</style>
