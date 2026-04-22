<template>
  <div class="editor">
    <div class="toolbar">
      <NuxtLink to="/" class="btn">← 返回主選單</NuxtLink>
      <span class="info">
        拖曳圓點到正確位置。共 <b>{{ counties.length }}</b> 郡，已調整 <b>{{ overrideCount }}</b> 個。
      </span>
      <button class="btn" @click="exportJSON">匯出 JSON</button>
      <button class="btn danger" @click="resetAll">重設全部</button>
    </div>

    <div
      class="map-container"
      ref="containerRef"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointerleave="onUp"
    >
      <img :src="mapImg" class="map-bg" draggable="false" />
      <svg class="overlay" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid meet">
        <g
          v-for="c in positions"
          :key="c.id"
          :class="{ dragging: draggingId === c.id, overridden: overrides[c.id] }"
          class="pin"
          @pointerdown.stop="onDown($event, c.id)"
        >
          <circle :cx="c.x" :cy="c.y" r="12" />
          <text :x="c.x" :y="c.y + 4" text-anchor="middle">{{ c.name }}</text>
        </g>
      </svg>
    </div>

    <!-- JSON 匯出對話框 -->
    <div v-if="jsonText" class="modal" @click="jsonText = ''">
      <div class="modal-card" @click.stop>
        <h3>座標 JSON（已複製到剪貼簿）</h3>
        <pre>{{ jsonText }}</pre>
        <button class="btn" @click="jsonText = ''">關閉</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import mapImg from '~/assets/map/china.png'
import { COUNTIES } from '~/game/mapData'

const W = 1536
const H = 1024
const containerRef = ref<HTMLDivElement | null>(null)
const counties = COUNTIES

/** 使用者覆寫：countyId → {xPct, yPct} */
const overrides = ref<Record<string, { xPct: number; yPct: number }>>({})
const draggingId = ref<string | null>(null)
const jsonText = ref('')

onMounted(() => {
  const raw = localStorage.getItem('county-overrides')
  if (raw) {
    try {
      overrides.value = JSON.parse(raw)
    } catch {
      overrides.value = {}
    }
  }
})

const overrideCount = computed(() => Object.keys(overrides.value).length)

const positions = computed(() =>
  counties.map((c) => {
    const o = overrides.value[c.id]
    const xPct = o?.xPct ?? c.xPct
    const yPct = o?.yPct ?? c.yPct
    return { id: c.id, name: c.name, x: xPct * W, y: yPct * H }
  }),
)

function saveOverrides() {
  localStorage.setItem('county-overrides', JSON.stringify(overrides.value))
}

function clientToPct(cx: number, cy: number) {
  const el = containerRef.value
  if (!el) return { xPct: 0, yPct: 0 }
  const rect = el.getBoundingClientRect()
  return {
    xPct: Math.max(0, Math.min(1, (cx - rect.left) / rect.width)),
    yPct: Math.max(0, Math.min(1, (cy - rect.top) / rect.height)),
  }
}

function onDown(e: PointerEvent, id: string) {
  draggingId.value = id
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!draggingId.value) return
  const { xPct, yPct } = clientToPct(e.clientX, e.clientY)
  overrides.value = {
    ...overrides.value,
    [draggingId.value]: { xPct, yPct },
  }
}

function onUp() {
  if (draggingId.value) {
    saveOverrides()
    draggingId.value = null
  }
}

async function exportJSON() {
  const obj: Record<string, { xPct: number; yPct: number }> = {}
  for (const c of counties) {
    const o = overrides.value[c.id]
    obj[c.id] = {
      xPct: +(o?.xPct ?? c.xPct).toFixed(4),
      yPct: +(o?.yPct ?? c.yPct).toFixed(4),
    }
  }
  const txt = JSON.stringify(obj, null, 2)
  jsonText.value = txt
  try {
    await navigator.clipboard.writeText(txt)
  } catch {
    /* ignore */
  }
}

function resetAll() {
  if (!confirm('確定要清除所有座標覆寫？')) return
  overrides.value = {}
  localStorage.removeItem('county-overrides')
}
</script>

<style scoped>
.editor {
  min-height: 100vh;
  background: #0f0b07;
  color: #e8dcc4;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #2a2018;
  border-bottom: 1px solid #3a2d20;
  flex-wrap: wrap;
}
.info { font-size: 13px; color: #a89a7e; }
.btn {
  background: #3a2d20;
  color: #e8dcc4;
  border: 1px solid #5a4a35;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
}
.btn:hover { background: #5a4a35; }
.btn.danger { background: #b73229; color: #fff; border-color: #b73229; }
.map-container {
  position: relative;
  width: 100%;
  max-width: 1536px;
  margin: 12px auto;
  aspect-ratio: 1536 / 1024;
  border: 2px solid #3a2d20;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}
.map-bg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
.pin { cursor: grab; }
.pin.dragging { cursor: grabbing; }
.pin circle {
  fill: #b73229;
  stroke: #fff;
  stroke-width: 2;
}
.pin.overridden circle { fill: #4a7c3a; }
.pin.dragging circle { fill: #ffe070; stroke: #000; }
.pin text {
  font-size: 12px;
  font-weight: 900;
  fill: #fff;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.95);
  stroke-width: 3px;
  pointer-events: none;
}
.modal {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  z-index: 10;
}
.modal-card {
  background: #2a2018;
  border: 2px solid #d4af37;
  padding: 20px 24px;
  max-width: 600px;
  max-height: 80vh;
  overflow: auto;
  border-radius: 6px;
}
.modal-card pre {
  background: #0f0b07;
  padding: 12px;
  max-height: 400px;
  overflow: auto;
  font-size: 12px;
  color: #a8ffa8;
}
</style>
