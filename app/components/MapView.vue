<template>
  <div class="map-wrap">
    <div
      class="map-container"
      ref="containerRef"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerCancel"
    >
      <img :src="mapImg" alt="三國地圖" class="map-bg" draggable="false" />

      <svg
        class="overlay"
        viewBox="0 0 1536 1024"
        preserveAspectRatio="xMidYMid meet"
      >
        <!-- 鄰接連線（僅在拖曳時顯示，幫玩家理解誰與誰相鄰） -->
        <g v-if="isDragging && dragFromId" class="adj-lines">
          <line
            v-for="adjId in dragAdjacentList"
            :key="adjId"
            :x1="xyOf(dragFromId).x"
            :y1="xyOf(dragFromId).y"
            :x2="xyOf(adjId).x"
            :y2="xyOf(adjId).y"
            stroke="#ffe070"
            stroke-width="3"
            stroke-dasharray="8 6"
            opacity="0.55"
          />
        </g>

        <!-- 拖曳預覽線：來源 → 滑鼠 -->
        <line
          v-if="dragFromId && dragPointer && isDragging"
          :x1="xyOf(dragFromId).x"
          :y1="xyOf(dragFromId).y"
          :x2="dragPointer.x"
          :y2="dragPointer.y"
          :stroke="dragValid ? '#ffe070' : '#b73229'"
          stroke-width="6"
          stroke-dasharray="10 6"
          stroke-linecap="round"
          class="drag-line"
        />

        <!-- 派兵波 -->
        <g class="waves">
          <g v-for="w in waves" :key="w.id">
            <circle
              :cx="w.x"
              :cy="w.y"
              r="14"
              :fill="store.colorOf(w.ownerId)"
              stroke="#fff"
              stroke-width="2.5"
            />
            <text
              :x="w.x"
              :y="w.y + 5"
              text-anchor="middle"
              class="wave-text"
            >{{ w.troops }}</text>
          </g>
        </g>

        <!-- 州節點：大圓圈 + 兵力數字 -->
        <g class="markers">
          <g
            v-for="n in nodes"
            :key="n.id"
            class="marker"
            :class="{
              selected: n.id === store.selectedCountyId,
              source: dragFromId === n.id,
              droppable: isDragging && dragAdjacentSet.has(n.id),
              target: isDragging && dragTargetId === n.id && dragAdjacentSet.has(n.id),
              mine: n.ownerId === store.state?.playerFactionId,
              neutral: n.ownerId === 'neutral',
            }"
          >
            <circle
              :cx="n.x"
              :cy="n.y"
              :r="20"
              :fill="n.ownerId === 'neutral' ? '#d8c9a6' : n.color"
              stroke="#1a1510"
              stroke-width="2.5"
            />
            <text
              :x="n.x"
              :y="n.y - 24"
              text-anchor="middle"
              class="state-name"
            >{{ n.name }}</text>
            <text
              :x="n.x"
              :y="n.y + 6"
              text-anchor="middle"
              class="troop-text"
              :class="{ neutral: n.ownerId === 'neutral' }"
            >{{ n.troops }}</text>
            <text
              v-if="n.isCapital"
              :x="n.x + 16"
              :y="n.y - 18"
              text-anchor="middle"
              class="capital-mark"
            >★</text>
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import mapImg from '~/assets/map/china.png'
import { useGameStore } from '~/stores/game'
import { COUNTY_MAP } from '~/game/mapData'

const store = useGameStore()
const containerRef = ref<HTMLDivElement | null>(null)

// --- 拖曳派兵狀態 ---
const dragFromId = ref<string | null>(null)
const dragTargetId = ref<string | null>(null)
const dragPointer = ref<{ x: number; y: number } | null>(null) // viewBox 座標
const isDragging = ref(false)
const pointerStart = { x: 0, y: 0 }
const DRAG_THRESHOLD = 8 // 移動超過 8px 才算拖曳，否則視為單純點擊

const W = 1536
const H = 1024
// 點擊/拖曳目標吸附半徑（viewBox 像素）
const HIT_RADIUS = 40

const dragAdjacentSet = computed<Set<string>>(() => {
  if (!dragFromId.value) return new Set()
  const def = COUNTY_MAP.get(dragFromId.value)
  return new Set(def?.adjacent ?? [])
})

const dragAdjacentList = computed(() => [...dragAdjacentSet.value])

const dragValid = computed(() => {
  return !!dragTargetId.value && dragAdjacentSet.value.has(dragTargetId.value)
})

function xyOf(id: string) {
  const c = COUNTY_MAP.get(id)
  if (!c) return { x: 0, y: 0 }
  return { x: c.xPct * W, y: c.yPct * H }
}

/** clientX/Y → viewBox (1536×1024) */
function clientToViewBox(cx: number, cy: number) {
  const el = containerRef.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return {
    x: ((cx - rect.left) / rect.width) * W,
    y: ((cy - rect.top) / rect.height) * H,
  }
}

/** 找最近州節點；距離超過 HIT_RADIUS 回 null */
function pickCounty(cx: number, cy: number): string | null {
  const p = clientToViewBox(cx, cy)
  let best: string | null = null
  let bestD = Infinity
  for (const c of store.counties) {
    const dx = c.xPct * W - p.x
    const dy = c.yPct * H - p.y
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = c.id
    }
  }
  if (bestD > HIT_RADIUS * HIT_RADIUS) return null
  return best
}

function onPointerDown(e: PointerEvent) {
  pointerStart.x = e.clientX
  pointerStart.y = e.clientY
  const id = pickCounty(e.clientX, e.clientY)
  if (!id || !store.state) return
  const cs = store.state.counties[id]
  // 只有自家州可當拖曳來源
  if (cs && cs.ownerId === store.state.playerFactionId) {
    dragFromId.value = id
    dragPointer.value = clientToViewBox(e.clientX, e.clientY)
    store.selectedCountyId = id
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
}

function onPointerMove(e: PointerEvent) {
  if (dragFromId.value) {
    const dist = Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y)
    if (dist >= DRAG_THRESHOLD) isDragging.value = true
    if (isDragging.value) {
      dragPointer.value = clientToViewBox(e.clientX, e.clientY)
      dragTargetId.value = pickCounty(e.clientX, e.clientY)
    }
  }
}

function onPointerUp(e: PointerEvent) {
  const targetId = pickCounty(e.clientX, e.clientY)

  if (isDragging.value && dragFromId.value) {
    // 拖曳派兵：目標必須是來源的鄰接州
    if (targetId && targetId !== dragFromId.value) {
      const def = COUNTY_MAP.get(dragFromId.value)
      if (def?.adjacent.includes(targetId)) {
        // sel 已是 dragFromId → tapCounty 會走 sendHalf 路徑
        store.tapCounty(targetId)
      } else {
        store.deselect()
      }
    } else {
      store.deselect()
    }
  } else {
    // 當作單純點擊
    if (targetId) store.tapCounty(targetId)
    else store.deselect()
  }
  resetDrag()
}

function onPointerCancel() {
  if (dragFromId.value) store.deselect()
  resetDrag()
}

function resetDrag() {
  dragFromId.value = null
  dragTargetId.value = null
  dragPointer.value = null
  isDragging.value = false
}

// ---------- SVG 節點資料 ----------
const nodes = computed(() => {
  if (!store.state) return []
  return store.counties.map((c) => {
    const cs = store.state!.counties[c.id]!
    return {
      id: c.id,
      name: c.name,
      x: c.xPct * W,
      y: c.yPct * H,
      troops: cs.troops,
      ownerId: cs.ownerId,
      color: store.colorOf(cs.ownerId),
      isCapital: !!c.isCapital,
    }
  })
})

const waves = computed(() => {
  if (!store.state) return []
  return store.state.waves.map((w) => {
    const from = COUNTY_MAP.get(w.fromId)
    const to = COUNTY_MAP.get(w.toId)
    if (!from || !to) return { id: w.id, x: 0, y: 0, troops: w.troops, ownerId: w.ownerId }
    const x = (from.xPct + (to.xPct - from.xPct) * w.progress) * W
    const y = (from.yPct + (to.yPct - from.yPct) * w.progress) * H
    return { id: w.id, x, y, troops: w.troops, ownerId: w.ownerId }
  })
})
</script>

<style scoped>
.map-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 12px;
}
.map-container {
  position: relative;
  width: 100%;
  max-width: 1536px;
  aspect-ratio: 1536 / 1024;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
  border: 2px solid #3a2d20;
  border-radius: 4px;
  overflow: hidden;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}
.map-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.state-name {
  font-size: 13px;
  font-weight: 900;
  font-family: 'Noto Sans TC', sans-serif;
  fill: #ffe070;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.95);
  stroke-width: 3px;
  pointer-events: none;
}
.troop-text {
  font-size: 17px;
  font-weight: 900;
  font-family: 'Noto Sans TC', sans-serif;
  fill: #fff;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.95);
  stroke-width: 3.5px;
  pointer-events: none;
}
.troop-text.neutral {
  fill: #2a2018;
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 3px;
}
.wave-text {
  fill: #fff;
  font-size: 14px;
  font-weight: 900;
  pointer-events: none;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.85);
  stroke-width: 2.5px;
}
.capital-mark {
  font-size: 22px;
  fill: #ffd54a;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.9);
  stroke-width: 3px;
  pointer-events: none;
}
.marker.mine circle {
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.3));
}
.marker.selected circle,
.marker.source circle {
  stroke: #ffe070;
  stroke-width: 5;
  filter: drop-shadow(0 0 10px rgba(255, 224, 112, 0.9));
}
/* 拖曳中：可派去的鄰接州 */
.marker.droppable circle {
  stroke: #ffe070;
  stroke-width: 4;
  animation: pulseRing 0.9s ease-in-out infinite;
}
/* 拖曳中：滑鼠正指著的合法目標 */
.marker.target circle {
  stroke: #ffe070;
  stroke-width: 6;
  filter: drop-shadow(0 0 14px rgba(255, 224, 112, 1));
}
@keyframes pulseRing {
  0%, 100% { stroke-width: 3; }
  50% { stroke-width: 5; }
}
.drag-line { opacity: 0.9; }
</style>
