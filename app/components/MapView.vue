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
      <svg
        class="overlay"
        viewBox="0 0 1536 1024"
        preserveAspectRatio="xMidYMid meet"
      >
        <!-- 底色漸層 + 中國輪廓 clip -->
        <defs>
          <radialGradient id="paperBg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#2e2418" />
            <stop offset="100%" stop-color="#120c07" />
          </radialGradient>
          <filter id="landShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <!-- 畫布底色（中國輪廓外） -->
        <rect x="0" y="0" width="1536" height="1024" fill="url(#paperBg)" />

        <!-- 中國輪廓陰影（暈染感） -->
        <g :transform="chinaTransform" opacity="0.35" filter="url(#landShadow)">
          <g transform="translate(8 12)">
            <path v-for="p in allPaths" :key="'sh-' + p.key" :d="p.d" fill="#000" />
          </g>
        </g>

        <!-- 中國輪廓底色（中立時露出的土色） -->
        <g id="chinaBgGroup" ref="chinaBgRef" :transform="chinaTransform" class="china-bg">
          <path v-for="p in allPaths" :key="'bg-' + p.key" :d="p.d" fill="#4a3a28" />
        </g>

        <!-- 郡區塊（每郡 = 一個省份 path，可能多段） -->
        <g :transform="chinaTransform" class="regions">
          <g
            v-for="r in regions"
            :key="r.id"
            class="region-group"
            :class="{
              selected: r.id === store.selectedCountyId,
              source: dragFromId === r.id,
              droppable: isDragging && dragAdjacentSet.has(r.id),
              target: isDragging && dragTargetId === r.id && dragAdjacentSet.has(r.id),
              mine: r.ownerId === store.state?.playerFactionId,
              neutral: r.ownerId === 'neutral',
            }"
          >
            <path
              v-for="(d, i) in r.paths"
              :key="i"
              :d="d"
              :fill="r.fill"
              class="region"
            />
          </g>
        </g>

        <!-- 中國外框（金色省界） -->
        <g :transform="chinaTransform" class="china-outline">
          <path v-for="p in allPaths" :key="'ol-' + p.key" :d="p.d" fill="none" />
        </g>

        <!-- 鄰接連線（拖曳時顯示） -->
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

        <!-- 派兵軍隊（多小兵 + 中間兵數） -->
        <g class="waves">
          <g v-for="w in waves" :key="w.id" :class="{ fighting: w.phase === 'fighting' }">
            <!-- 小兵群 -->
            <circle
              v-for="(d, i) in w.dots"
              :key="i"
              :cx="w.x + d.dx"
              :cy="w.y + d.dy"
              :r="w.phase === 'fighting' ? 2.8 : 3.2"
              :fill="store.colorOf(w.ownerId)"
              class="soldier"
            />
            <!-- 中間兵數圓底 + 數字 -->
            <circle
              :cx="w.x"
              :cy="w.y"
              r="11"
              :fill="store.colorOf(w.ownerId)"
              stroke="#ffe070"
              :stroke-width="w.phase === 'fighting' ? 2.5 : 1.5"
            />
            <text
              :x="w.x"
              :y="w.y + 4"
              text-anchor="middle"
              class="wave-text"
            >{{ w.troops }}</text>
          </g>
        </g>

        <!-- 郡標記：郡名 + 兵力數字 + 首都★ -->
        <g class="markers">
          <g
            v-for="n in nodes"
            :key="n.id"
            class="marker"
            :class="{ neutral: n.ownerId === 'neutral' }"
          >
            <text
              :x="n.x"
              :y="n.y - 10"
              text-anchor="middle"
              class="county-name"
            >{{ n.name }}</text>
            <text
              :x="n.x"
              :y="n.y + 14"
              text-anchor="middle"
              class="troop-text"
              :class="{ neutral: n.ownerId === 'neutral' }"
            >{{ n.troops }}</text>
            <text
              v-if="n.isCapital"
              :x="n.x + 22"
              :y="n.y - 12"
              text-anchor="middle"
              class="capital-mark"
            >★</text>
          </g>
        </g>

        <!-- 州名大字（州幾何中心） -->
        <g class="state-labels">
          <text
            v-for="sl in stateLabels"
            :key="sl.id"
            :x="sl.x"
            :y="sl.y"
            text-anchor="middle"
            class="state-label"
          >{{ sl.name }}</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useGameStore } from '~/stores/game'
import { COUNTY_MAP, STATES } from '~/game/mapData'
import { STATE_PATHS, HAN_BBOX } from '~/game/chinaMap'

const store = useGameStore()
const containerRef = ref<HTMLDivElement | null>(null)
const chinaBgRef = ref<SVGGElement | null>(null)

// Han 範圍 bbox（local SVG 座標系，來自預先量測 STATE_PATHS 的 getBBox）
// 初始值取自 chinaMap.ts 的 HAN_BBOX；onMounted 會用真實 DOM 再量一次。
const chinaBBox = ref({ x: HAN_BBOX.x, y: HAN_BBOX.y, w: HAN_BBOX.w, h: HAN_BBOX.h })

// 把 Han bbox 以 contain 方式鋪滿 viewBox（留 pad 邊距）
const bboxT = computed(() => {
  const b = chinaBBox.value
  const pad = 40
  const availW = 1536 - pad * 2
  const availH = 1024 - pad * 2
  const scale = Math.min(availW / b.w, availH / b.h)
  const tx = pad + (availW - b.w * scale) / 2 - b.x * scale
  const ty = pad + (availH - b.h * scale) / 2 - b.y * scale
  return { scale, tx, ty }
})
const chinaTransform = computed(() => {
  const t = bboxT.value
  return `translate(${t.tx.toFixed(2)} ${t.ty.toFixed(2)}) scale(${t.scale.toFixed(4)})`
})

/** 郡座標：xPct/yPct 是 Han bbox 內的比例，轉成 viewBox 絕對座標 */
function countyVB(xPct: number, yPct: number) {
  const b = chinaBBox.value
  const t = bboxT.value
  const lx = b.x + xPct * b.w
  const ly = b.y + yPct * b.h
  return { x: lx * t.scale + t.tx, y: ly * t.scale + t.ty }
}

/** 展平所有省份 path（用於陰影 / 底色 / 外框三層重複渲染） */
const allPaths = computed(() => {
  const out: { key: string; d: string }[] = []
  for (const [code, paths] of Object.entries(STATE_PATHS)) {
    paths.forEach((d, i) => out.push({ key: `${code}_${i}`, d }))
  }
  return out
})

onMounted(async () => {
  await nextTick()
  // 14 州版：path 已 pre-bake transform，HAN_BBOX 直接從來源取，不再 runtime 量測
  // （之前 24 省版本是因為 path 沒 bake，需要量 transform 後的 g）
})

// --- 拖曳派兵狀態 ---
const dragFromId = ref<string | null>(null)
const dragTargetId = ref<string | null>(null)
const dragPointer = ref<{ x: number; y: number } | null>(null) // viewBox 座標
const isDragging = ref(false)
const pointerStart = { x: 0, y: 0 }
const DRAG_THRESHOLD = 8 // 移動超過 8px 才算拖曳，否則視為單純點擊

const W = 1536
const H = 1024
// 點擊/拖曳目標吸附半徑（viewBox 像素）；24 郡佈圖比較稀疏，放寬一點
const HIT_RADIUS = 110

// ---------- 區塊（用省份 path 直接當 region） ----------
const regions = computed(() => {
  if (!store.state) return []
  return store.counties.map((c) => {
    const cs = store.state!.counties[c.id]!
    const ownerId = cs.ownerId
    const paths = STATE_PATHS[c.provinceId] ?? []
    return {
      id: c.id,
      paths: paths as readonly string[],
      ownerId,
      // 中立透明（露出下層省份土色），勢力塊用飽和色
      fill: ownerId === 'neutral' ? 'transparent' : store.colorOf(ownerId),
    }
  })
})

const stateLabels = computed(() => {
  const counties = store.counties
  // 以「同州各郡座標的平均」為州名位置
  const acc = new Map<string, { sx: number; sy: number; n: number }>()
  for (const c of counties) {
    const p = countyVB(c.xPct, c.yPct)
    const row = acc.get(c.stateId) ?? { sx: 0, sy: 0, n: 0 }
    row.sx += p.x
    row.sy += p.y
    row.n += 1
    acc.set(c.stateId, row)
  }
  return STATES.map((s) => {
    const r = acc.get(s.id)
    if (!r || r.n === 0) return { id: s.id, name: s.name, x: 0, y: 0 }
    return { id: s.id, name: s.name, x: r.sx / r.n, y: r.sy / r.n }
  })
})

// ---------- 拖曳相關 ----------
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
  return countyVB(c.xPct, c.yPct)
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

/** 找最近郡節點；距離超過 HIT_RADIUS 回 null */
function pickCounty(cx: number, cy: number): string | null {
  const p = clientToViewBox(cx, cy)
  let best: string | null = null
  let bestD = Infinity
  for (const c of store.counties) {
    const q = countyVB(c.xPct, c.yPct)
    const dx = q.x - p.x
    const dy = q.y - p.y
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
  // 只有自家郡可當拖曳來源
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
    if (targetId && targetId !== dragFromId.value) {
      const def = COUNTY_MAP.get(dragFromId.value)
      if (def?.adjacent.includes(targetId)) {
        store.tapCounty(targetId)
      } else {
        store.deselect()
      }
    } else {
      store.deselect()
    }
  } else {
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

// ---------- 標記 / 波 ----------
const nodes = computed(() => {
  if (!store.state) return []
  return store.counties.map((c) => {
    const cs = store.state!.counties[c.id]!
    const p = countyVB(c.xPct, c.yPct)
    return {
      id: c.id,
      name: c.name,
      x: p.x,
      y: p.y,
      troops: cs.troops,
      ownerId: cs.ownerId,
      isCapital: !!c.isCapital,
    }
  })
})

/** 依 wave.id 生成固定散布的小兵 offset（穩定、不會每幀跳動） */
function waveDots(id: number, troops: number) {
  const n = Math.min(18, Math.max(2, Math.ceil(troops / 1.5)))
  const dots: { dx: number; dy: number }[] = []
  let seed = id * 9973 + 7
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const a = (seed / 0x7fffffff) * Math.PI * 2
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const r = 4 + (seed / 0x7fffffff) * 14
    dots.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r })
  }
  return dots
}

const waves = computed(() => {
  if (!store.state) return []
  return store.state.waves.map((w) => {
    const from = COUNTY_MAP.get(w.fromId)
    const to = COUNTY_MAP.get(w.toId)
    const phase = w.phase ?? 'moving'
    if (!from || !to) {
      return { id: w.id, x: 0, y: 0, troops: w.troops, ownerId: w.ownerId, phase, dots: [] }
    }
    // 交戰中的 wave 停在距目標 8% 處（不疊到目標中心文字）
    const p = phase === 'fighting' ? 0.92 : w.progress
    const xPct = from.xPct + (to.xPct - from.xPct) * p
    const yPct = from.yPct + (to.yPct - from.yPct) * p
    const { x, y } = countyVB(xPct, yPct)
    return {
      id: w.id,
      x,
      y,
      troops: w.troops,
      ownerId: w.ownerId,
      phase,
      dots: waveDots(w.id, w.troops),
    }
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
  background: #1a140d;
}
.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
/* 郡區塊 */
.region {
  transition: filter 0.2s ease, opacity 0.2s ease;
  stroke: rgba(0, 0, 0, 0.45);
  stroke-width: 0.8;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  /* 勢力色稍透，讓下層省份底色仍微透出 */
  opacity: 0.8;
}
.region-group.neutral .region {
  /* 中立透明，只露出底色；保留細郡界 */
  opacity: 0;
}
.region-group.mine .region {
  opacity: 0.92;
  filter: brightness(1.1) drop-shadow(0 0 4px rgba(255, 255, 255, 0.18));
}
.region-group.selected .region,
.region-group.source .region {
  stroke: #ffe070;
  stroke-width: 3;
  filter: brightness(1.15) drop-shadow(0 0 10px rgba(255, 224, 112, 0.8));
}
.region-group.droppable .region {
  stroke: #ffe070;
  stroke-width: 2.5;
  animation: pulseRegion 1s ease-in-out infinite;
}
.region-group.target .region {
  stroke: #ffe070;
  stroke-width: 4.5;
  filter: brightness(1.25) drop-shadow(0 0 14px rgba(255, 224, 112, 1));
}
@keyframes pulseRegion {
  0%, 100% { stroke-width: 1.5; opacity: 0.85; }
  50% { stroke-width: 3; opacity: 1; }
}

/* 中國外框（金色省界） */
.china-outline {
  fill: none;
  stroke: #d4af37;
  stroke-width: 2.2;
  stroke-opacity: 0.85;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.55));
}
.china-outline path {
  vector-effect: non-scaling-stroke;
}
/* 底色區塊（省份填色） */
.china-bg path {
  shape-rendering: geometricPrecision;
}

/* 小兵 */
.soldier {
  stroke: rgba(0, 0, 0, 0.85);
  stroke-width: 0.6;
}
.waves > g.fighting .soldier {
  animation: jitter 0.35s ease-in-out infinite alternate;
}
.waves > g.fighting > circle {
  animation: clashPulse 0.6s ease-in-out infinite;
}
@keyframes jitter {
  0% { transform: translate(0, 0); }
  100% { transform: translate(1.2px, -0.8px); }
}
@keyframes clashPulse {
  0%, 100% { stroke-opacity: 1; }
  50% { stroke-opacity: 0.4; }
}

.county-name {
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
  font-size: 18px;
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
/* 州名大字浮水印 */
.state-label {
  font-size: 42px;
  font-weight: 900;
  font-family: 'Noto Serif TC', serif;
  fill: rgba(255, 224, 112, 0.28);
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.5);
  stroke-width: 3px;
  pointer-events: none;
  letter-spacing: 10px;
}
.drag-line { opacity: 0.9; }
</style>
